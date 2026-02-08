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

// Helper to create service role client (for API key validation)
function createServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

// Simple hash function for API key validation
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Global auth context store - set before each request, used by tool handlers
let currentAuthContext: { userId: string; supabase: ReturnType<typeof createClient> } | null = null;

// Helper to get current auth context (for tool handlers)
function getCurrentAuth(): { userId: string; supabase: ReturnType<typeof createClient> } | null {
  return currentAuthContext;
}

// Helper to set current auth context (called before processing request)
function setCurrentAuth(auth: { userId: string; supabase: ReturnType<typeof createClient> } | null) {
  currentAuthContext = auth;
}

// Helper to validate auth - supports both JWT and API keys
async function validateAuth(authHeader: string | null): Promise<{ userId: string; supabase: ReturnType<typeof createClient> } | null> {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Check if it's an API key (starts with "wf_")
  if (token.startsWith('wf_')) {
    return await validateApiKey(token);
  }

  // Otherwise, treat as JWT
  const supabase = createAuthClient(authHeader);
  const { data, error } = await supabase.auth.getUser(token);
  
  if (error || !data?.user) {
    return null;
  }

  return { userId: data.user.id, supabase };
}

// Validate API key and return user context
async function validateApiKey(apiKey: string): Promise<{ userId: string; supabase: ReturnType<typeof createClient> } | null> {
  const serviceClient = createServiceClient();
  const keyHash = await hashApiKey(apiKey);

  // Look up the API key
  const { data: keyData, error } = await serviceClient
    .from('mcp_api_keys')
    .select('id, user_id, expires_at, revoked_at')
    .eq('key_hash', keyHash)
    .single();

  if (error || !keyData) {
    return null;
  }

  // Check if revoked
  if (keyData.revoked_at) {
    return null;
  }

  // Check if expired
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return null;
  }

  // Update last_used_at (fire and forget)
  serviceClient
    .from('mcp_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyData.id)
    .then(() => {});

  // Create a client that acts as this user
  // We use the service role but scope queries to this user
  const userSupabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  return { userId: keyData.user_id, supabase: userSupabase };
}

// Create MCP server
const mcpServer = new McpServer({
  name: "wholefuel-mcp",
  version: "1.0.0",
});

// Tool: List all recipes
mcpServer.tool("list_recipes", {
  description: "Get all dishes/recipes with their ingredients and macro information",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
  handler: async () => {
    const auth = getCurrentAuth();
    if (!auth) {
      return { content: [{ type: "text", text: "Unauthorized: Please provide a valid auth token" }] };
    }

    const { data: recipes, error } = await auth.supabase
      .from('recipes')
      .select(`
        id, name, category, servings, instructions, link,
        total_calories, total_protein, total_fat, total_carbs,
        recipe_ingredients (
          id, name, serving_multiplier, ingredient_id
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
mcpServer.tool("create_recipe", {
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
            serving_multiplier: { type: "number", description: "Serving multiplier (e.g., 1.0 for one serving, 0.5 for half)" },
          },
          required: ["ingredient_id", "serving_multiplier"]
        },
        description: "List of ingredients with serving multipliers"
      }
    },
    required: ["name", "category", "servings", "ingredients"],
  },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) {
      return { content: [{ type: "text", text: "Unauthorized: Please provide a valid auth token" }] };
    }

    const { name, category, servings, instructions, link, ingredients } = input as {
      name: string;
      category: string;
      servings: number;
      instructions?: string;
      link?: string;
      ingredients: Array<{ ingredient_id: string; serving_multiplier: number }>;
    };

    // First, get ingredient details to calculate macros and names
    const ingredientIds = ingredients.map(i => i.ingredient_id);
    const { data: ingredientData, error: ingredientError } = await auth.supabase
      .from('ingredients')
      .select('id, name, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving, serving_grams')
      .in('id', ingredientIds);

    if (ingredientError || !ingredientData) {
      return { content: [{ type: "text", text: `Error fetching ingredients: ${ingredientError?.message}` }] };
    }

    // Calculate total macros - servingMultiplier is the multiplier directly
    let totalCalories = 0, totalProtein = 0, totalFat = 0, totalCarbs = 0;
    const ingredientMap = new Map(ingredientData.map(i => [i.id, i]));

    for (const ing of ingredients) {
      const data = ingredientMap.get(ing.ingredient_id);
      if (data) {
        totalCalories += data.calories_per_serving * ing.serving_multiplier;
        totalProtein += data.protein_per_serving * ing.serving_multiplier;
        totalFat += data.fat_per_serving * ing.serving_multiplier;
        totalCarbs += data.carbs_per_serving * ing.serving_multiplier;
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
      serving_multiplier: ing.serving_multiplier,
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

// Tool: Bulk create recipes
mcpServer.tool("bulk_create_recipes", {
  description: "Create multiple recipes at once with their ingredients. Each recipe must reference existing ingredient IDs.",
  inputSchema: {
    type: "object",
    properties: {
      recipes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Name of the recipe" },
            category: { 
              type: "string", 
              enum: ["breakfast", "main", "shake", "snack", "side", "dessert"],
              description: "Category of the recipe"
            },
            servings: { type: "number", description: "Number of servings" },
            instructions: { type: "string", description: "Preparation instructions (optional)" },
            link: { type: "string", description: "Link to recipe source (optional)" },
            ingredients: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  ingredient_id: { type: "string", description: "UUID of the ingredient" },
                  serving_multiplier: { type: "number", description: "Serving multiplier (e.g., 1.0 for one serving, 0.5 for half)" },
                },
                required: ["ingredient_id", "serving_multiplier"]
              },
              description: "List of ingredients with serving multipliers"
            }
          },
          required: ["name", "category", "servings", "ingredients"]
        },
        description: "Array of recipes to create"
      }
    },
    required: ["recipes"],
  },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) {
      return { content: [{ type: "text", text: "Unauthorized: Please provide a valid auth token" }] };
    }

    const { recipes } = input as {
      recipes: Array<{
        name: string;
        category: string;
        servings: number;
        instructions?: string;
        link?: string;
        ingredients: Array<{ ingredient_id: string; serving_multiplier: number }>;
      }>;
    };

    if (!recipes || recipes.length === 0) {
      return { content: [{ type: "text", text: "Error: No recipes provided" }] };
    }

    // Collect all unique ingredient IDs
    const allIngredientIds = new Set<string>();
    for (const recipe of recipes) {
      for (const ing of recipe.ingredients) {
        allIngredientIds.add(ing.ingredient_id);
      }
    }

    // Fetch all ingredient data at once
    const { data: ingredientData, error: ingredientError } = await auth.supabase
      .from('ingredients')
      .select('id, name, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving, serving_grams')
      .in('id', Array.from(allIngredientIds));

    if (ingredientError) {
      return { content: [{ type: "text", text: `Error fetching ingredients: ${ingredientError.message}` }] };
    }

    const ingredientMap = new Map(ingredientData?.map(i => [i.id, i]) || []);

    const createdRecipes: string[] = [];
    const errors: string[] = [];

    for (const recipe of recipes) {
      // Calculate macros for this recipe - servingMultiplier is the multiplier directly
      let totalCalories = 0, totalProtein = 0, totalFat = 0, totalCarbs = 0;
      
      for (const ing of recipe.ingredients) {
        const data = ingredientMap.get(ing.ingredient_id);
        if (data) {
          totalCalories += data.calories_per_serving * ing.serving_multiplier;
          totalProtein += data.protein_per_serving * ing.serving_multiplier;
          totalFat += data.fat_per_serving * ing.serving_multiplier;
          totalCarbs += data.carbs_per_serving * ing.serving_multiplier;
        }
      }

      // Create the recipe
      const { data: createdRecipe, error: recipeError } = await auth.supabase
        .from('recipes')
        .insert({
          name: recipe.name,
          category: recipe.category,
          servings: recipe.servings,
          instructions: recipe.instructions || null,
          link: recipe.link || null,
          user_id: auth.userId,
          total_calories: Math.round(totalCalories),
          total_protein: Math.round(totalProtein),
          total_fat: Math.round(totalFat),
          total_carbs: Math.round(totalCarbs),
        })
        .select()
        .single();

      if (recipeError || !createdRecipe) {
        errors.push(`"${recipe.name}": ${recipeError?.message || 'Unknown error'}`);
        continue;
      }

      // Add recipe ingredients
      const recipeIngredients = recipe.ingredients.map(ing => ({
        recipe_id: createdRecipe.id,
        ingredient_id: ing.ingredient_id,
        name: ingredientMap.get(ing.ingredient_id)?.name || 'Unknown',
        serving_multiplier: ing.serving_multiplier,
      }));

      const { error: ingredientsInsertError } = await auth.supabase
        .from('recipe_ingredients')
        .insert(recipeIngredients);

      if (ingredientsInsertError) {
        errors.push(`"${recipe.name}" ingredients: ${ingredientsInsertError.message}`);
      } else {
        createdRecipes.push(recipe.name);
      }
    }

    let message = `Successfully created ${createdRecipes.length} recipe(s)`;
    if (createdRecipes.length > 0) {
      message += `: ${createdRecipes.join(', ')}`;
    }
    if (errors.length > 0) {
      message += `\nErrors (${errors.length}): ${errors.join('; ')}`;
    }

    return {
      content: [{
        type: "text",
        text: message
      }]
    };
  },
});

// Tool: Delete a recipe
mcpServer.tool("delete_recipe", {
  description: "Delete a recipe by ID. Will fail if the recipe is currently used in the meal plan.",
  inputSchema: {
    type: "object",
    properties: {
      recipe_id: { type: "string", description: "UUID of the recipe to delete" },
    },
    required: ["recipe_id"],
  },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) {
      return { content: [{ type: "text", text: "Unauthorized: Please provide a valid auth token" }] };
    }

    const { recipe_id } = input as { recipe_id: string };

    // Check if recipe exists
    const { data: recipe, error: fetchError } = await auth.supabase
      .from('recipes')
      .select('id, name')
      .eq('id', recipe_id)
      .single();

    if (fetchError || !recipe) {
      return { content: [{ type: "text", text: `Error: Recipe not found` }] };
    }

    // Check if recipe is used in meal plan
    const { data: usedIn, error: usageError } = await auth.supabase
      .from('meal_plans')
      .select('id, day_of_week, meal_slot')
      .eq('recipe_id', recipe_id);

    if (usageError) {
      return { content: [{ type: "text", text: `Error checking recipe usage: ${usageError.message}` }] };
    }

    if (usedIn && usedIn.length > 0) {
      const slots = usedIn.map(m => `${m.day_of_week} ${m.meal_slot}`).join(', ');
      return { content: [{ type: "text", text: `Cannot delete "${recipe.name}": currently scheduled in meal plan at: ${slots}` }] };
    }

    // Delete recipe ingredients first (cascade)
    const { error: ingredientsDeleteError } = await auth.supabase
      .from('recipe_ingredients')
      .delete()
      .eq('recipe_id', recipe_id);

    if (ingredientsDeleteError) {
      return { content: [{ type: "text", text: `Error deleting recipe ingredients: ${ingredientsDeleteError.message}` }] };
    }

    // Delete the recipe
    const { error: deleteError } = await auth.supabase
      .from('recipes')
      .delete()
      .eq('id', recipe_id);

    if (deleteError) {
      return { content: [{ type: "text", text: `Error deleting recipe: ${deleteError.message}` }] };
    }

    return {
      content: [{
        type: "text",
        text: `Successfully deleted recipe "${recipe.name}" and its ingredients`
      }]
    };
  },
});

// Tool: Bulk delete recipes
mcpServer.tool("bulk_delete_recipes", {
  description: "Delete multiple recipes by their IDs. Skips recipes that are currently used in the meal plan and reports which ones were skipped.",
  inputSchema: {
    type: "object",
    properties: {
      recipe_ids: { 
        type: "array", 
        items: { type: "string" },
        description: "Array of recipe UUIDs to delete" 
      },
    },
    required: ["recipe_ids"],
  },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) {
      return { content: [{ type: "text", text: "Unauthorized: Please provide a valid auth token" }] };
    }

    const { recipe_ids } = input as { recipe_ids: string[] };
    
    if (!recipe_ids || recipe_ids.length === 0) {
      return { content: [{ type: "text", text: "Error: No recipe IDs provided" }] };
    }

    // Get all recipes to delete
    const { data: recipes, error: fetchError } = await auth.supabase
      .from('recipes')
      .select('id, name')
      .in('id', recipe_ids);

    if (fetchError) {
      return { content: [{ type: "text", text: `Error fetching recipes: ${fetchError.message}` }] };
    }

    if (!recipes || recipes.length === 0) {
      return { content: [{ type: "text", text: "Error: No matching recipes found" }] };
    }

    // Check which recipes are used in meal plans
    const { data: usedRecipes, error: usageError } = await auth.supabase
      .from('meal_plans')
      .select('recipe_id, day_of_week, meal_slot')
      .in('recipe_id', recipe_ids);

    if (usageError) {
      return { content: [{ type: "text", text: `Error checking recipe usage: ${usageError.message}` }] };
    }

    const usedRecipeIds = new Set(usedRecipes?.map(m => m.recipe_id) || []);
    const recipesToDelete = recipes.filter(r => !usedRecipeIds.has(r.id));
    const skippedRecipes = recipes.filter(r => usedRecipeIds.has(r.id));

    if (recipesToDelete.length === 0) {
      return { 
        content: [{ 
          type: "text", 
          text: `Cannot delete any recipes: all ${skippedRecipes.length} recipe(s) are currently used in the meal plan` 
        }] 
      };
    }

    const idsToDelete = recipesToDelete.map(r => r.id);

    // Delete recipe ingredients first (cascade)
    const { error: ingredientsDeleteError } = await auth.supabase
      .from('recipe_ingredients')
      .delete()
      .in('recipe_id', idsToDelete);

    if (ingredientsDeleteError) {
      return { content: [{ type: "text", text: `Error deleting recipe ingredients: ${ingredientsDeleteError.message}` }] };
    }

    // Delete the recipes
    const { error: deleteError } = await auth.supabase
      .from('recipes')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      return { content: [{ type: "text", text: `Error deleting recipes: ${deleteError.message}` }] };
    }

    const deletedNames = recipesToDelete.map(r => r.name).join(', ');
    const skippedNames = skippedRecipes.map(r => r.name).join(', ');
    
    let message = `Successfully deleted ${recipesToDelete.length} recipe(s): ${deletedNames}`;
    if (skippedRecipes.length > 0) {
      message += `\nSkipped ${skippedRecipes.length} recipe(s) in use: ${skippedNames}`;
    }

    return {
      content: [{
        type: "text",
        text: message
      }]
    };
  },
});

// Tool: Edit/update a recipe
mcpServer.tool("edit_recipe", {
  description: "Update an existing recipe. Can modify name, category, servings, instructions, link, and/or replace the ingredients list. Only provided fields will be updated.",
  inputSchema: {
    type: "object",
    properties: {
      recipe_id: { type: "string", description: "UUID of the recipe to update" },
      name: { type: "string", description: "New name for the recipe (optional)" },
      category: { 
        type: "string", 
        enum: ["breakfast", "main", "shake", "snack", "side", "dessert"],
        description: "New category for the recipe (optional)"
      },
      servings: { type: "number", description: "New number of servings (optional)" },
      instructions: { type: "string", description: "New preparation instructions (optional, use empty string to clear)" },
      link: { type: "string", description: "New link to recipe source (optional, use empty string to clear)" },
      ingredients: {
        type: "array",
        items: {
          type: "object",
          properties: {
            ingredient_id: { type: "string", description: "UUID of the ingredient" },
            serving_multiplier: { type: "number", description: "Serving multiplier (e.g., 1.0 for one serving, 0.5 for half)" },
          },
          required: ["ingredient_id", "serving_multiplier"]
        },
        description: "New list of ingredients (optional - if provided, replaces all existing ingredients)"
      }
    },
    required: ["recipe_id"],
  },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) {
      return { content: [{ type: "text", text: "Unauthorized: Please provide a valid auth token" }] };
    }

    const { recipe_id, name, category, servings, instructions, link, ingredients } = input as {
      recipe_id: string;
      name?: string;
      category?: string;
      servings?: number;
      instructions?: string;
      link?: string;
      ingredients?: Array<{ ingredient_id: string; serving_multiplier: number }>;
    };

    // Check if recipe exists
    const { data: existingRecipe, error: fetchError } = await auth.supabase
      .from('recipes')
      .select('id, name, user_id')
      .eq('id', recipe_id)
      .single();

    if (fetchError || !existingRecipe) {
      return { content: [{ type: "text", text: `Error: Recipe not found` }] };
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (servings !== undefined) updateData.servings = servings;
    if (instructions !== undefined) updateData.instructions = instructions || null;
    if (link !== undefined) updateData.link = link || null;

    // If ingredients are provided, recalculate macros
    if (ingredients && ingredients.length > 0) {
      const ingredientIds = ingredients.map(i => i.ingredient_id);
      const { data: ingredientData, error: ingredientError } = await auth.supabase
        .from('ingredients')
        .select('id, name, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving, serving_grams')
        .in('id', ingredientIds);

      if (ingredientError || !ingredientData) {
        return { content: [{ type: "text", text: `Error fetching ingredients: ${ingredientError?.message}` }] };
      }

      // Calculate new total macros - servingMultiplier is the multiplier directly
      let totalCalories = 0, totalProtein = 0, totalFat = 0, totalCarbs = 0;
      const ingredientMap = new Map(ingredientData.map(i => [i.id, i]));

      for (const ing of ingredients) {
        const data = ingredientMap.get(ing.ingredient_id);
        if (data) {
          totalCalories += data.calories_per_serving * ing.serving_multiplier;
          totalProtein += data.protein_per_serving * ing.serving_multiplier;
          totalFat += data.fat_per_serving * ing.serving_multiplier;
          totalCarbs += data.carbs_per_serving * ing.serving_multiplier;
        }
      }

      updateData.total_calories = Math.round(totalCalories);
      updateData.total_protein = Math.round(totalProtein);
      updateData.total_fat = Math.round(totalFat);
      updateData.total_carbs = Math.round(totalCarbs);

      // Delete existing ingredients
      const { error: deleteIngredientsError } = await auth.supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', recipe_id);

      if (deleteIngredientsError) {
        return { content: [{ type: "text", text: `Error removing old ingredients: ${deleteIngredientsError.message}` }] };
      }

      // Insert new ingredients
      const recipeIngredients = ingredients.map(ing => ({
        recipe_id: recipe_id,
        ingredient_id: ing.ingredient_id,
        name: ingredientMap.get(ing.ingredient_id)?.name || 'Unknown',
        serving_multiplier: ing.serving_multiplier,
      }));

      const { error: insertIngredientsError } = await auth.supabase
        .from('recipe_ingredients')
        .insert(recipeIngredients);

      if (insertIngredientsError) {
        return { content: [{ type: "text", text: `Error adding new ingredients: ${insertIngredientsError.message}` }] };
      }
    }

    // Update the recipe if there are fields to update
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await auth.supabase
        .from('recipes')
        .update(updateData)
        .eq('id', recipe_id);

      if (updateError) {
        return { content: [{ type: "text", text: `Error updating recipe: ${updateError.message}` }] };
      }
    }

    const updatedFields = Object.keys(updateData).length > 0 
      ? Object.keys(updateData).join(', ') 
      : 'no fields';
    const ingredientsMsg = ingredients ? `, replaced ${ingredients.length} ingredient(s)` : '';

    return {
      content: [{
        type: "text",
        text: `Successfully updated recipe "${name || existingRecipe.name}": ${updatedFields}${ingredientsMsg}`
      }]
    };
  },
});

// Tool: List all ingredients
mcpServer.tool("list_ingredients", {
  description: "Get all available ingredients with nutritional data (per 100g)",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
  handler: async () => {
    const auth = getCurrentAuth();
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
mcpServer.tool("create_ingredient", {
  description: "Add a new ingredient with per-serving macro values and serving size info",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Name of the ingredient" },
      calories_per_serving: { type: "number", description: "Calories per serving" },
      protein_per_serving: { type: "number", description: "Protein in grams per serving" },
      fat_per_serving: { type: "number", description: "Fat in grams per serving" },
      carbs_per_serving: { type: "number", description: "Carbohydrates in grams per serving" },
      fiber_per_serving: { type: "number", description: "Fiber in grams per serving" },
      sodium_per_serving: { type: "number", description: "Sodium in mg per serving" },
      brand: { type: "string", description: "Brand name (optional)" },
      category: { type: "string", description: "Category (optional)" },
      serving_description: { type: "string", description: "Serving description (e.g., '1 egg (60g)', '1 can', '1 scoop (32g)')" },
      serving_grams: { type: "number", description: "Weight in grams for the serving size (default: 100)" },
    },
    required: ["name", "calories_per_serving", "protein_per_serving", "fat_per_serving", "carbs_per_serving"],
  },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) {
      return { content: [{ type: "text", text: "Unauthorized: Please provide a valid auth token" }] };
    }

    const { 
      name, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving,
      fiber_per_serving, sodium_per_serving, brand, category, serving_description, serving_grams
    } = input as {
      name: string;
      calories_per_serving: number;
      protein_per_serving: number;
      fat_per_serving: number;
      carbs_per_serving: number;
      fiber_per_serving?: number;
      sodium_per_serving?: number;
      brand?: string;
      category?: string;
      serving_description?: string;
      serving_grams?: number;
    };

    const { data: ingredient, error } = await auth.supabase
      .from('ingredients')
      .insert({
        name,
        calories_per_serving,
        protein_per_serving,
        fat_per_serving,
        carbs_per_serving,
        fiber_per_serving: fiber_per_serving || 0,
        sodium_per_serving: sodium_per_serving || 0,
        brand: brand || null,
        category: category || null,
        serving_description: serving_description || '100g',
        serving_grams: serving_grams || 100,
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
        text: `Successfully created ingredient "${name}" with serving "${serving_description || '100g'}". ID: ${ingredient.id}`
      }]
    };
  },
});

// Tool: Bulk create ingredients
mcpServer.tool("bulk_create_ingredients", {
  description: "Create multiple ingredients at once with per-serving macro values and serving info. Returns a summary of created ingredients.",
  inputSchema: {
    type: "object",
    properties: {
      ingredients: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Name of the ingredient" },
            calories_per_serving: { type: "number", description: "Calories per serving" },
            protein_per_serving: { type: "number", description: "Protein in grams per serving" },
            fat_per_serving: { type: "number", description: "Fat in grams per serving" },
            carbs_per_serving: { type: "number", description: "Carbohydrates in grams per serving" },
            fiber_per_serving: { type: "number", description: "Fiber in grams per serving (optional)" },
            sodium_per_serving: { type: "number", description: "Sodium in mg per serving (optional)" },
            brand: { type: "string", description: "Brand name (optional)" },
            category: { type: "string", description: "Category (optional)" },
            serving_description: { type: "string", description: "Serving description (e.g., '1 egg (60g)', '1 can', '1 scoop (32g)')" },
            serving_grams: { type: "number", description: "Weight in grams for the serving size (default: 100)" },
          },
          required: ["name", "calories_per_serving", "protein_per_serving", "fat_per_serving", "carbs_per_serving"],
        },
        description: "Array of ingredients to create"
      }
    },
    required: ["ingredients"],
  },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) {
      return { content: [{ type: "text", text: "Unauthorized: Please provide a valid auth token" }] };
    }

    const { ingredients } = input as {
      ingredients: Array<{
        name: string;
        calories_per_serving: number;
        protein_per_serving: number;
        fat_per_serving: number;
        carbs_per_serving: number;
        fiber_per_serving?: number;
        sodium_per_serving?: number;
        brand?: string;
        category?: string;
        serving_description?: string;
        serving_grams?: number;
      }>;
    };

    if (!ingredients || ingredients.length === 0) {
      return { content: [{ type: "text", text: "Error: No ingredients provided" }] };
    }

    const toInsert = ingredients.map(ing => ({
      name: ing.name,
      calories_per_serving: ing.calories_per_serving,
      protein_per_serving: ing.protein_per_serving,
      fat_per_serving: ing.fat_per_serving,
      carbs_per_serving: ing.carbs_per_serving,
      fiber_per_serving: ing.fiber_per_serving || 0,
      sodium_per_serving: ing.sodium_per_serving || 0,
      brand: ing.brand || null,
      category: ing.category || null,
      serving_description: ing.serving_description || '100g',
      serving_grams: ing.serving_grams || 100,
      user_id: auth.userId,
    }));

    const { data: created, error } = await auth.supabase
      .from('ingredients')
      .insert(toInsert)
      .select('id, name');

    if (error) {
      return { content: [{ type: "text", text: `Error creating ingredients: ${error.message}` }] };
    }

    const createdNames = created?.map(i => i.name).join(', ') || '';
    return {
      content: [{
        type: "text",
        text: `Successfully created ${created?.length || 0} ingredient(s): ${createdNames}`
      }]
    };
  },
});

// Tool: Delete an ingredient
mcpServer.tool("delete_ingredient", {
  description: "Delete an ingredient by ID. Will fail if the ingredient is used in any recipes.",
  inputSchema: {
    type: "object",
    properties: {
      ingredient_id: { type: "string", description: "UUID of the ingredient to delete" },
    },
    required: ["ingredient_id"],
  },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) {
      return { content: [{ type: "text", text: "Unauthorized: Please provide a valid auth token" }] };
    }

    const { ingredient_id } = input as { ingredient_id: string };

    // Check if ingredient exists
    const { data: ingredient, error: fetchError } = await auth.supabase
      .from('ingredients')
      .select('id, name')
      .eq('id', ingredient_id)
      .single();

    if (fetchError || !ingredient) {
      return { content: [{ type: "text", text: `Error: Ingredient not found` }] };
    }

    // Check if ingredient is used in any recipes
    const { data: usedIn, error: usageError } = await auth.supabase
      .from('recipe_ingredients')
      .select('recipe_id, recipes!inner(name)')
      .eq('ingredient_id', ingredient_id);

    if (usageError) {
      return { content: [{ type: "text", text: `Error checking ingredient usage: ${usageError.message}` }] };
    }

    if (usedIn && usedIn.length > 0) {
      const recipeNames = usedIn.map((r: { recipes: { name: string } }) => r.recipes.name).join(', ');
      return { content: [{ type: "text", text: `Cannot delete "${ingredient.name}": used in recipes: ${recipeNames}` }] };
    }

    // Delete the ingredient
    const { error: deleteError } = await auth.supabase
      .from('ingredients')
      .delete()
      .eq('id', ingredient_id);

    if (deleteError) {
      return { content: [{ type: "text", text: `Error deleting ingredient: ${deleteError.message}` }] };
    }

    return {
      content: [{
        type: "text",
        text: `Successfully deleted ingredient "${ingredient.name}"`
      }]
    };
  },
});

// Tool: Bulk delete ingredients
mcpServer.tool("bulk_delete_ingredients", {
  description: "Delete multiple ingredients by their IDs. Skips ingredients that are used in any recipes and reports which ones were skipped.",
  inputSchema: {
    type: "object",
    properties: {
      ingredient_ids: { 
        type: "array", 
        items: { type: "string" },
        description: "Array of ingredient UUIDs to delete" 
      },
    },
    required: ["ingredient_ids"],
  },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) {
      return { content: [{ type: "text", text: "Unauthorized: Please provide a valid auth token" }] };
    }

    const { ingredient_ids } = input as { ingredient_ids: string[] };
    
    if (!ingredient_ids || ingredient_ids.length === 0) {
      return { content: [{ type: "text", text: "Error: No ingredient IDs provided" }] };
    }

    // Get all ingredients to delete
    const { data: ingredients, error: fetchError } = await auth.supabase
      .from('ingredients')
      .select('id, name')
      .in('id', ingredient_ids);

    if (fetchError) {
      return { content: [{ type: "text", text: `Error fetching ingredients: ${fetchError.message}` }] };
    }

    if (!ingredients || ingredients.length === 0) {
      return { content: [{ type: "text", text: "Error: No matching ingredients found" }] };
    }

    // Check which ingredients are used in recipes
    const { data: usedIngredients, error: usageError } = await auth.supabase
      .from('recipe_ingredients')
      .select('ingredient_id')
      .in('ingredient_id', ingredient_ids);

    if (usageError) {
      return { content: [{ type: "text", text: `Error checking ingredient usage: ${usageError.message}` }] };
    }

    const usedIngredientIds = new Set(usedIngredients?.map(r => r.ingredient_id) || []);
    const ingredientsToDelete = ingredients.filter(i => !usedIngredientIds.has(i.id));
    const skippedIngredients = ingredients.filter(i => usedIngredientIds.has(i.id));

    if (ingredientsToDelete.length === 0) {
      return { 
        content: [{ 
          type: "text", 
          text: `Cannot delete any ingredients: all ${skippedIngredients.length} ingredient(s) are used in recipes` 
        }] 
      };
    }

    const idsToDelete = ingredientsToDelete.map(i => i.id);

    // Delete the ingredients
    const { error: deleteError } = await auth.supabase
      .from('ingredients')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      return { content: [{ type: "text", text: `Error deleting ingredients: ${deleteError.message}` }] };
    }

    const deletedNames = ingredientsToDelete.map(i => i.name).join(', ');
    const skippedNames = skippedIngredients.map(i => i.name).join(', ');
    
    let message = `Successfully deleted ${ingredientsToDelete.length} ingredient(s): ${deletedNames}`;
    if (skippedIngredients.length > 0) {
      message += `\nSkipped ${skippedIngredients.length} ingredient(s) in use: ${skippedNames}`;
    }

    return {
      content: [{
        type: "text",
        text: message
      }]
    };
  },
});

// Helper to get Monday of current week
function getWeekStartDate(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// Tool: List meal plan
mcpServer.tool("list_meal_plan", {
  description: "Get the meal plan for a specific week. Defaults to current week.",
  inputSchema: {
    type: "object",
    properties: {
      week_start_date: { 
        type: "string", 
        description: "ISO date string of the Monday of the week (e.g., '2026-02-03'). Defaults to current week."
      },
    },
    required: [],
  },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) {
      return { content: [{ type: "text", text: "Unauthorized: Please provide a valid auth token" }] };
    }

    const { week_start_date = getWeekStartDate() } = input as { week_start_date?: string };

    const { data: mealPlan, error } = await auth.supabase
      .from('meal_plans')
      .select(`
        id, day_of_week, meal_slot, recipe_name, serving_multiplier,
        custom_calories, custom_protein, custom_fat, custom_carbs,
        recipe_id, ingredients_json, week_start_date
      `)
      .eq('week_start_date', week_start_date)
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
        text: JSON.stringify({ week_start_date, meals: sortedGrouped }, null, 2)
      }]
    };
  },
});

// Tool: Add meal to plan
mcpServer.tool("add_meal_to_plan", {
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
      week_start_date: { 
        type: "string", 
        description: "ISO date string of the Monday of the week (e.g., '2026-02-03'). Defaults to current week."
      },
    },
    required: ["day", "slot", "recipe_id"],
  },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) {
      return { content: [{ type: "text", text: "Unauthorized: Please provide a valid auth token" }] };
    }

    const { day, slot, recipe_id, serving_multiplier = 1, week_start_date = getWeekStartDate() } = input as {
      day: string;
      slot: string;
      recipe_id: string;
      serving_multiplier?: number;
      week_start_date?: string;
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
      .eq('week_start_date', week_start_date)
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
          text: `Updated ${day} ${slot} (week ${week_start_date}) with "${recipe.name}" (${serving_multiplier}x serving)`
        }]
      };
    }

    // Insert new
    const { error: insertError } = await auth.supabase
      .from('meal_plans')
      .insert({
        user_id: auth.userId,
        week_start_date,
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
        text: `Added "${recipe.name}" to ${day} ${slot} (week ${week_start_date}, ${serving_multiplier}x serving)`
      }]
    };
  },
});

// Tool: Remove meal from plan
mcpServer.tool("remove_meal_from_plan", {
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
      week_start_date: { 
        type: "string", 
        description: "ISO date string of the Monday of the week (e.g., '2026-02-03'). Defaults to current week."
      },
    },
    required: ["day", "slot"],
  },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) {
      return { content: [{ type: "text", text: "Unauthorized: Please provide a valid auth token" }] };
    }

    const { day, slot, week_start_date = getWeekStartDate() } = input as { day: string; slot: string; week_start_date?: string };

    const { data: deleted, error } = await auth.supabase
      .from('meal_plans')
      .delete()
      .eq('week_start_date', week_start_date)
      .eq('day_of_week', day)
      .eq('meal_slot', slot)
      .select()
      .single();

    if (error || !deleted) {
      return { content: [{ type: "text", text: `No meal found at ${day} ${slot} (week ${week_start_date})` }] };
    }

    return {
      content: [{
        type: "text",
        text: `Removed "${deleted.recipe_name}" from ${day} ${slot} (week ${week_start_date})`
      }]
    };
  },
});

// Tool: Get shopping list
mcpServer.tool("get_shopping_list", {
  description: "Generate aggregated shopping list from a specific week's meal plan",
  inputSchema: {
    type: "object",
    properties: {
      week_start_date: { 
        type: "string", 
        description: "ISO date string of the Monday of the week (e.g., '2026-02-03'). Defaults to current week."
      },
    },
    required: [],
  },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) {
      return { content: [{ type: "text", text: "Unauthorized: Please provide a valid auth token" }] };
    }

    const { week_start_date = getWeekStartDate() } = input as { week_start_date?: string };

    // Get all meals with their recipes for the specified week
    const { data: mealPlan, error: mealError } = await auth.supabase
      .from('meal_plans')
      .select('recipe_id, serving_multiplier, ingredients_json')
      .eq('week_start_date', week_start_date);

    if (mealError) {
      return { content: [{ type: "text", text: `Error fetching meal plan: ${mealError.message}` }] };
    }

    // Get recipe IDs
    const recipeIds = [...new Set(mealPlan?.filter(m => m.recipe_id).map(m => m.recipe_id))];

    if (recipeIds.length === 0) {
      return { content: [{ type: "text", text: `No recipes in meal plan for week ${week_start_date}. Shopping list is empty.` }] };
    }

    // Get recipe ingredients
    const { data: recipeIngredients, error: ingredientsError } = await auth.supabase
      .from('recipe_ingredients')
      .select('recipe_id, name, serving_multiplier, ingredient_id')
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

    // Get ingredient data to look up serving sizes
    const ingredientIds = [...new Set(recipeIngredients?.map(ri => ri.ingredient_id) || [])];
    const { data: ingredientData } = await auth.supabase
      .from('ingredients')
      .select('id, serving_grams')
      .in('id', ingredientIds);
    const ingredientDataMap = new Map(ingredientData?.map(i => [i.id, i]) || []);

    // Aggregate ingredients - calculate grams from serving_multiplier
    const aggregated: Record<string, { name: string; amount: number; unit: string }> = {};

    for (const meal of mealPlan || []) {
      if (!meal.recipe_id) continue;

      const recipe = recipesMap.get(meal.recipe_id);
      if (!recipe) continue;

      const mealMultiplier = (meal.serving_multiplier || 1) / recipe.servings;

      for (const ing of recipeIngredients?.filter(i => i.recipe_id === meal.recipe_id) || []) {
        const key = ing.name;
        const ingData = ingredientDataMap.get(ing.ingredient_id);
        const gramsPerServing = ingData?.serving_grams || 100;
        // Calculate grams: ingredient's serving_multiplier × its serving size × meal multiplier
        const grams = ing.serving_multiplier * gramsPerServing * mealMultiplier;
        
        if (!aggregated[key]) {
          aggregated[key] = { name: ing.name, amount: 0, unit: 'g' };
        }
        aggregated[key].amount += grams;
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
        text: JSON.stringify({ week_start_date, items: shoppingList }, null, 2)
      }]
    };
  },
});

// Tool: Get weekly targets
mcpServer.tool("get_weekly_targets", {
  description: "Get user's calorie and macro targets for a specific week",
  inputSchema: {
    type: "object",
    properties: {
      week_start_date: { 
        type: "string", 
        description: "ISO date string of the Monday of the week (e.g., '2026-02-03'). Defaults to current week."
      },
    },
    required: [],
  },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) {
      return { content: [{ type: "text", text: "Unauthorized: Please provide a valid auth token" }] };
    }

    const { week_start_date = getWeekStartDate() } = input as { week_start_date?: string };

    const { data: targets, error } = await auth.supabase
      .from('weekly_targets')
      .select('*')
      .eq('week_start_date', week_start_date)
      .single();

    if (error) {
      // Try to get the most recent targets as fallback
      const { data: latestTargets } = await auth.supabase
        .from('weekly_targets')
        .select('*')
        .order('week_start_date', { ascending: false })
        .limit(1)
        .single();

      if (latestTargets) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ 
              ...latestTargets, 
              note: `No targets set for week ${week_start_date}. Showing most recent targets from ${latestTargets.week_start_date}.` 
            }, null, 2)
          }]
        };
      }

      return { content: [{ type: "text", text: `No targets set for week ${week_start_date}. Default values assumed.` }] };
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify(targets, null, 2)
      }]
    };
  },
});

// HTTP transport - bind to server
const transport = new StreamableHttpTransport();
const httpHandler = transport.bind(mcpServer);

// Handle CORS preflight
app.options('/*', (c) => {
  return new Response(null, { headers: corsHeaders });
});

// Handle all MCP requests with pre-validated auth
app.all('/*', async (c) => {
  const authHeader = c.req.header('Authorization');
  
  // Parse request body to check the method
  const clonedReq = c.req.raw.clone();
  let body: { method?: string; id?: string | number } | null = null;
  try {
    body = await clonedReq.json();
  } catch {
    // Not JSON, proceed without parsing
  }

  // For tools/call and other tool operations, require auth at request level
  const requiresAuth = body?.method === 'tools/call' || 
                       body?.method === 'tools/list' ||
                       body?.method === 'resources/list' ||
                       body?.method === 'resources/read';
  
  if (requiresAuth) {
    const auth = await validateAuth(authHeader ?? null);
    if (!auth) {
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id: body?.id ?? null,
        error: { code: -32001, message: "Unauthorized: Invalid or missing authentication" }
      }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Set global auth context before processing request
    setCurrentAuth(auth);
    
    try {
      const response = await httpHandler(c.req.raw);
      
      // Add CORS headers to response
      const newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        newHeaders.set(key, value);
      });
      
      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      });
    } finally {
      // Clear auth context after request
      setCurrentAuth(null);
    }
  }
  
  // For non-auth-required methods (initialize, ping), pass through
  const response = await httpHandler(c.req.raw);
  
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
