import { Hono } from "hono";
import { McpServer, StreamableHttpTransport } from "mcp-lite";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const app = new Hono();

// Helper to create authenticated Supabase client
function createAuthClient(authHeader: string) {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
}

// Helper to validate auth and get user ID
async function validateAuth(authHeader: string | null): Promise<{ userId: string; supabase: ReturnType<typeof createClient> } | null> {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const supabase = createAuthClient(authHeader);
  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getUser(token);
  
  if (error || !data?.user) {
    return null;
  }

  return { userId: data.user.id, supabase };
}

// Create MCP server
const mcpServer = new McpServer({
  name: "wholefuel-mcp",
  version: "1.0.0",
});

// Tool: List all recipes
mcpServer.tool({
  name: "list_recipes",
  description: "Get all dishes/recipes with their ingredients and macro information",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
  handler: async (_input, context) => {
    const auth = await validateAuth(context?.headers?.authorization);
    if (!auth) {
      return { content: [{ type: "text", text: "Unauthorized: Please provide a valid auth token" }] };
    }

    const { data: recipes, error } = await auth.supabase
      .from('recipes')
      .select(`
        id, name, category, servings, instructions, link,
        total_calories, total_protein, total_fat, total_carbs,
        recipe_ingredients (
          id, name, amount, unit, ingredient_id
        )
      `)
      .order('name');

    if (error) {
      return { content: [{ type: "text", text: `Error fetching recipes: ${error.message}` }] };
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify(recipes, null, 2)
      }]
    };
  },
});

// Tool: Create a new recipe
mcpServer.tool({
  name: "create_recipe",
  description: "Create a new dish with name, category, servings, and ingredients",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Name of the recipe" },
      category: { 
        type: "string", 
        enum: ["breakfast", "main", "shake", "snack", "side", "dessert"],
        description: "Category of the recipe"
      },
      servings: { type: "number", description: "Number of servings" },
      instructions: { type: "string", description: "Preparation instructions" },
      link: { type: "string", description: "Link to recipe source" },
      ingredients: {
        type: "array",
        items: {
          type: "object",
          properties: {
            ingredient_id: { type: "string", description: "UUID of the ingredient" },
            amount: { type: "number", description: "Amount in grams" },
            unit: { type: "string", description: "Unit of measurement (default: g)" }
          },
          required: ["ingredient_id", "amount"]
        },
        description: "List of ingredients with amounts"
      }
    },
    required: ["name", "category", "servings", "ingredients"],
  },
  handler: async (input, context) => {
    const auth = await validateAuth(context?.headers?.authorization);
    if (!auth) {
      return { content: [{ type: "text", text: "Unauthorized: Please provide a valid auth token" }] };
    }

    const { name, category, servings, instructions, link, ingredients } = input as {
      name: string;
      category: string;
      servings: number;
      instructions?: string;
      link?: string;
      ingredients: Array<{ ingredient_id: string; amount: number; unit?: string }>;
    };

    // First, get ingredient details to calculate macros and names
    const ingredientIds = ingredients.map(i => i.ingredient_id);
    const { data: ingredientData, error: ingredientError } = await auth.supabase
      .from('ingredients')
      .select('id, name, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g')
      .in('id', ingredientIds);

    if (ingredientError || !ingredientData) {
      return { content: [{ type: "text", text: `Error fetching ingredients: ${ingredientError?.message}` }] };
    }

    // Calculate total macros
    let totalCalories = 0, totalProtein = 0, totalFat = 0, totalCarbs = 0;
    const ingredientMap = new Map(ingredientData.map(i => [i.id, i]));

    for (const ing of ingredients) {
      const data = ingredientMap.get(ing.ingredient_id);
      if (data) {
        const multiplier = ing.amount / 100;
        totalCalories += data.calories_per_100g * multiplier;
        totalProtein += data.protein_per_100g * multiplier;
        totalFat += data.fat_per_100g * multiplier;
        totalCarbs += data.carbs_per_100g * multiplier;
      }
    }

    // Create the recipe
    const { data: recipe, error: recipeError } = await auth.supabase
      .from('recipes')
      .insert({
        name,
        category,
        servings,
        instructions: instructions || null,
        link: link || null,
        user_id: auth.userId,
        total_calories: Math.round(totalCalories),
        total_protein: Math.round(totalProtein),
        total_fat: Math.round(totalFat),
        total_carbs: Math.round(totalCarbs),
      })
      .select()
      .single();

    if (recipeError || !recipe) {
      return { content: [{ type: "text", text: `Error creating recipe: ${recipeError?.message}` }] };
    }

    // Add recipe ingredients
    const recipeIngredients = ingredients.map(ing => ({
      recipe_id: recipe.id,
      ingredient_id: ing.ingredient_id,
      name: ingredientMap.get(ing.ingredient_id)?.name || 'Unknown',
      amount: ing.amount,
      unit: ing.unit || 'g',
    }));

    const { error: ingredientsError } = await auth.supabase
      .from('recipe_ingredients')
      .insert(recipeIngredients);

    if (ingredientsError) {
      return { content: [{ type: "text", text: `Recipe created but error adding ingredients: ${ingredientsError.message}` }] };
    }

    return {
      content: [{
        type: "text",
        text: `Successfully created recipe "${name}" with ${ingredients.length} ingredients. ID: ${recipe.id}`
      }]
    };
  },
});

// Tool: List all ingredients
mcpServer.tool({
  name: "list_ingredients",
  description: "Get all available ingredients with nutritional data (per 100g)",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
  handler: async (_input, context) => {
    const auth = await validateAuth(context?.headers?.authorization);
    if (!auth) {
      return { content: [{ type: "text", text: "Unauthorized: Please provide a valid auth token" }] };
    }

    const { data: ingredients, error } = await auth.supabase
      .from('ingredients')
      .select('*')
      .order('name');

    if (error) {
      return { content: [{ type: "text", text: `Error fetching ingredients: ${error.message}` }] };
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify(ingredients, null, 2)
      }]
    };
  },
});

// Tool: Create a new ingredient
mcpServer.tool({
  name: "create_ingredient",
  description: "Add a new ingredient with per-100g macro values",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Name of the ingredient" },
      calories_per_100g: { type: "number", description: "Calories per 100g" },
      protein_per_100g: { type: "number", description: "Protein in grams per 100g" },
      fat_per_100g: { type: "number", description: "Fat in grams per 100g" },
      carbs_per_100g: { type: "number", description: "Carbohydrates in grams per 100g" },
      fiber_per_100g: { type: "number", description: "Fiber in grams per 100g" },
      sodium_per_100g: { type: "number", description: "Sodium in mg per 100g" },
      brand: { type: "string", description: "Brand name (optional)" },
      category: { type: "string", description: "Category (optional)" },
    },
    required: ["name", "calories_per_100g", "protein_per_100g", "fat_per_100g", "carbs_per_100g"],
  },
  handler: async (input, context) => {
    const auth = await validateAuth(context?.headers?.authorization);
    if (!auth) {
      return { content: [{ type: "text", text: "Unauthorized: Please provide a valid auth token" }] };
    }

    const { 
      name, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g,
      fiber_per_100g, sodium_per_100g, brand, category 
    } = input as {
      name: string;
      calories_per_100g: number;
      protein_per_100g: number;
      fat_per_100g: number;
      carbs_per_100g: number;
      fiber_per_100g?: number;
      sodium_per_100g?: number;
      brand?: string;
      category?: string;
    };

    const { data: ingredient, error } = await auth.supabase
      .from('ingredients')
      .insert({
        name,
        calories_per_100g,
        protein_per_100g,
        fat_per_100g,
        carbs_per_100g,
        fiber_per_100g: fiber_per_100g || 0,
        sodium_per_100g: sodium_per_100g || 0,
        brand: brand || null,
        category: category || null,
        user_id: auth.userId,
      })
      .select()
      .single();

    if (error) {
      return { content: [{ type: "text", text: `Error creating ingredient: ${error.message}` }] };
    }

    return {
      content: [{
        type: "text",
        text: `Successfully created ingredient "${name}". ID: ${ingredient.id}`
      }]
    };
  },
});

// Tool: List meal plan
mcpServer.tool({
  name: "list_meal_plan",
  description: "Get the current week's meal plan with all scheduled meals",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
  handler: async (_input, context) => {
    const auth = await validateAuth(context?.headers?.authorization);
    if (!auth) {
      return { content: [{ type: "text", text: "Unauthorized: Please provide a valid auth token" }] };
    }

    const { data: mealPlan, error } = await auth.supabase
      .from('meal_plans')
      .select(`
        id, day_of_week, meal_slot, recipe_name, serving_multiplier,
        custom_calories, custom_protein, custom_fat, custom_carbs,
        recipe_id, ingredients_json
      `)
      .order('day_of_week')
      .order('meal_slot');

    if (error) {
      return { content: [{ type: "text", text: `Error fetching meal plan: ${error.message}` }] };
    }

    // Group by day for easier reading
    const grouped: Record<string, typeof mealPlan> = {};
    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const meal of mealPlan || []) {
      if (!grouped[meal.day_of_week]) {
        grouped[meal.day_of_week] = [];
      }
      grouped[meal.day_of_week].push(meal);
    }

    const sortedGrouped: Record<string, typeof mealPlan> = {};
    for (const day of dayOrder) {
      if (grouped[day]) {
        sortedGrouped[day] = grouped[day];
      }
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify(sortedGrouped, null, 2)
      }]
    };
  },
});

// Tool: Add meal to plan
mcpServer.tool({
  name: "add_meal_to_plan",
  description: "Add a dish to a specific day and meal slot (m1-m5)",
  inputSchema: {
    type: "object",
    properties: {
      day: { 
        type: "string", 
        enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
        description: "Day of the week"
      },
      slot: { 
        type: "string", 
        enum: ["m1", "m2", "m3", "m4", "m5"],
        description: "Meal slot (m1 = breakfast, m2-m5 = subsequent meals)"
      },
      recipe_id: { type: "string", description: "UUID of the recipe to add" },
      serving_multiplier: { type: "number", description: "Serving multiplier (default: 1)" },
    },
    required: ["day", "slot", "recipe_id"],
  },
  handler: async (input, context) => {
    const auth = await validateAuth(context?.headers?.authorization);
    if (!auth) {
      return { content: [{ type: "text", text: "Unauthorized: Please provide a valid auth token" }] };
    }

    const { day, slot, recipe_id, serving_multiplier = 1 } = input as {
      day: string;
      slot: string;
      recipe_id: string;
      serving_multiplier?: number;
    };

    // Get recipe details
    const { data: recipe, error: recipeError } = await auth.supabase
      .from('recipes')
      .select('name, total_calories, total_protein, total_fat, total_carbs, servings')
      .eq('id', recipe_id)
      .single();

    if (recipeError || !recipe) {
      return { content: [{ type: "text", text: `Error: Recipe not found` }] };
    }

    // Check if slot already has a meal
    const { data: existing } = await auth.supabase
      .from('meal_plans')
      .select('id')
      .eq('day_of_week', day)
      .eq('meal_slot', slot)
      .single();

    if (existing) {
      // Update existing
      const { error: updateError } = await auth.supabase
        .from('meal_plans')
        .update({
          recipe_id,
          recipe_name: recipe.name,
          serving_multiplier,
          custom_calories: recipe.total_calories / recipe.servings * serving_multiplier,
          custom_protein: recipe.total_protein / recipe.servings * serving_multiplier,
          custom_fat: recipe.total_fat / recipe.servings * serving_multiplier,
          custom_carbs: recipe.total_carbs / recipe.servings * serving_multiplier,
        })
        .eq('id', existing.id);

      if (updateError) {
        return { content: [{ type: "text", text: `Error updating meal: ${updateError.message}` }] };
      }

      return {
        content: [{
          type: "text",
          text: `Updated ${day} ${slot} with "${recipe.name}" (${serving_multiplier}x serving)`
        }]
      };
    }

    // Insert new
    const { error: insertError } = await auth.supabase
      .from('meal_plans')
      .insert({
        user_id: auth.userId,
        day_of_week: day,
        meal_slot: slot,
        recipe_id,
        recipe_name: recipe.name,
        serving_multiplier,
        custom_calories: recipe.total_calories / recipe.servings * serving_multiplier,
        custom_protein: recipe.total_protein / recipe.servings * serving_multiplier,
        custom_fat: recipe.total_fat / recipe.servings * serving_multiplier,
        custom_carbs: recipe.total_carbs / recipe.servings * serving_multiplier,
      });

    if (insertError) {
      return { content: [{ type: "text", text: `Error adding meal: ${insertError.message}` }] };
    }

    return {
      content: [{
        type: "text",
        text: `Added "${recipe.name}" to ${day} ${slot} (${serving_multiplier}x serving)`
      }]
    };
  },
});

// Tool: Remove meal from plan
mcpServer.tool({
  name: "remove_meal_from_plan",
  description: "Remove a meal from a specific day and slot",
  inputSchema: {
    type: "object",
    properties: {
      day: { 
        type: "string", 
        enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
        description: "Day of the week"
      },
      slot: { 
        type: "string", 
        enum: ["m1", "m2", "m3", "m4", "m5"],
        description: "Meal slot"
      },
    },
    required: ["day", "slot"],
  },
  handler: async (input, context) => {
    const auth = await validateAuth(context?.headers?.authorization);
    if (!auth) {
      return { content: [{ type: "text", text: "Unauthorized: Please provide a valid auth token" }] };
    }

    const { day, slot } = input as { day: string; slot: string };

    const { data: deleted, error } = await auth.supabase
      .from('meal_plans')
      .delete()
      .eq('day_of_week', day)
      .eq('meal_slot', slot)
      .select()
      .single();

    if (error || !deleted) {
      return { content: [{ type: "text", text: `No meal found at ${day} ${slot}` }] };
    }

    return {
      content: [{
        type: "text",
        text: `Removed "${deleted.recipe_name}" from ${day} ${slot}`
      }]
    };
  },
});

// Tool: Get shopping list
mcpServer.tool({
  name: "get_shopping_list",
  description: "Generate aggregated shopping list from the current meal plan",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
  handler: async (_input, context) => {
    const auth = await validateAuth(context?.headers?.authorization);
    if (!auth) {
      return { content: [{ type: "text", text: "Unauthorized: Please provide a valid auth token" }] };
    }

    // Get all meals with their recipes
    const { data: mealPlan, error: mealError } = await auth.supabase
      .from('meal_plans')
      .select('recipe_id, serving_multiplier, ingredients_json');

    if (mealError) {
      return { content: [{ type: "text", text: `Error fetching meal plan: ${mealError.message}` }] };
    }

    // Get recipe IDs
    const recipeIds = [...new Set(mealPlan?.filter(m => m.recipe_id).map(m => m.recipe_id))];

    if (recipeIds.length === 0) {
      return { content: [{ type: "text", text: "No recipes in meal plan. Shopping list is empty." }] };
    }

    // Get recipe ingredients
    const { data: recipeIngredients, error: ingredientsError } = await auth.supabase
      .from('recipe_ingredients')
      .select('recipe_id, name, amount, unit, ingredient_id')
      .in('recipe_id', recipeIds);

    if (ingredientsError) {
      return { content: [{ type: "text", text: `Error fetching ingredients: ${ingredientsError.message}` }] };
    }

    // Get recipes for servings info
    const { data: recipes } = await auth.supabase
      .from('recipes')
      .select('id, servings')
      .in('id', recipeIds);

    const recipesMap = new Map(recipes?.map(r => [r.id, r]) || []);

    // Aggregate ingredients
    const aggregated: Record<string, { name: string; amount: number; unit: string }> = {};

    for (const meal of mealPlan || []) {
      if (!meal.recipe_id) continue;

      const recipe = recipesMap.get(meal.recipe_id);
      if (!recipe) continue;

      const multiplier = (meal.serving_multiplier || 1) / recipe.servings;

      for (const ing of recipeIngredients?.filter(i => i.recipe_id === meal.recipe_id) || []) {
        const key = `${ing.name}-${ing.unit}`;
        if (!aggregated[key]) {
          aggregated[key] = { name: ing.name, amount: 0, unit: ing.unit };
        }
        aggregated[key].amount += ing.amount * multiplier;
      }
    }

    // Sort and format
    const shoppingList = Object.values(aggregated)
      .map(item => ({
        ...item,
        amount: Math.round(item.amount)
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      content: [{
        type: "text",
        text: JSON.stringify(shoppingList, null, 2)
      }]
    };
  },
});

// Tool: Get weekly targets
mcpServer.tool({
  name: "get_weekly_targets",
  description: "Get user's calorie and macro targets",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
  handler: async (_input, context) => {
    const auth = await validateAuth(context?.headers?.authorization);
    if (!auth) {
      return { content: [{ type: "text", text: "Unauthorized: Please provide a valid auth token" }] };
    }

    const { data: targets, error } = await auth.supabase
      .from('weekly_targets')
      .select('*')
      .single();

    if (error) {
      return { content: [{ type: "text", text: `No targets set. Default values assumed.` }] };
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify(targets, null, 2)
      }]
    };
  },
});

// HTTP transport
const transport = new StreamableHttpTransport();

// Handle CORS preflight
app.options('/*', (c) => {
  return new Response(null, { headers: corsHeaders });
});

// Handle all MCP requests
app.all('/*', async (c) => {
  const response = await transport.handleRequest(c.req.raw, mcpServer);
  
  // Add CORS headers to response
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  
  return new Response(response.body, {
    status: response.status,
    headers: newHeaders,
  });
});

Deno.serve(app.fetch);
