import { Hono } from "hono";
import { McpServer, StreamableHttpTransport } from "mcp-lite";
import { createClient } from "@supabase/supabase-js";
import { AsyncLocalStorage } from "node:async_hooks";
import type { Database, IngredientMacros, CreateIngredientInput } from "./types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const app = new Hono();

function createAuthClient(authHeader: string) {
  return createClient<Database>(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
}

function createServiceClient() {
  return createClient<Database>(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

type AuthContext = { userId: string; supabase: ReturnType<typeof createClient<Database>> };
const authStorage = new AsyncLocalStorage<AuthContext>();
function getCurrentAuth() { return authStorage.getStore() ?? null; }

async function validateAuth(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');
  if (token.startsWith('wf_')) return await validateApiKey(token);
  const supabase = createAuthClient(authHeader);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return { userId: data.user.id, supabase };
}

async function validateApiKey(apiKey: string) {
  const serviceClient = createServiceClient();
  const keyHash = await hashApiKey(apiKey);
  const { data: keyData, error } = await serviceClient
    .from('mcp_api_keys')
    .select('id, user_id, expires_at, revoked_at')
    .eq('key_hash', keyHash)
    .single();
  if (error || !keyData || keyData.revoked_at) return null;
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) return null;
  serviceClient.from('mcp_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyData.id).then(() => {});
  const userSupabase = createClient<Database>(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  return { userId: keyData.user_id, supabase: userSupabase };
}

function getWeekStartDate(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

const mcpServer = new McpServer({ name: "wholefuel-mcp", version: "2.0.0" });

// Helper: write tags for a recipe
async function writeRecipeTags(supabase: ReturnType<typeof createClient>, recipeId: string, tags: string[], userId: string) {
  await supabase.from('recipe_tags').delete().eq('recipe_id', recipeId);
  if (tags.length > 0) {
    await supabase.from('recipe_tags').insert(tags.map(tag => ({ recipe_id: recipeId, tag_name: tag, user_id: userId })));
  }
}

// Helper: calculate macros from ingredients
function calcMacros(ingredients: Array<{ ingredient_id: string; serving_multiplier: number }>, ingredientMap: Map<string, IngredientMacros>) {
  let cal = 0, pro = 0, fat = 0, carb = 0;
  for (const ing of ingredients) {
    const d = ingredientMap.get(ing.ingredient_id);
    if (d) {
      cal += d.calories_per_serving * ing.serving_multiplier;
      pro += d.protein_per_serving * ing.serving_multiplier;
      fat += d.fat_per_serving * ing.serving_multiplier;
      carb += d.carbs_per_serving * ing.serving_multiplier;
    }
  }
  return { cal: Math.round(cal), pro: Math.round(pro), fat: Math.round(fat), carb: Math.round(carb) };
}

// ========== RECIPE TOOLS ==========

mcpServer.tool("list_recipes", {
  description: "Get all dishes/recipes with their ingredients, macros, and tags",
  inputSchema: { type: "object", properties: {}, required: [] },
  handler: async () => {
    const auth = getCurrentAuth();
    if (!auth) return { content: [{ type: "text", text: "Unauthorized" }] };
    const { data: recipes, error } = await auth.supabase
      .from('recipes')
      .select('id, name, category, instructions, link, notes, total_calories, total_protein, total_fat, total_carbs, recipe_ingredients(id, name, serving_multiplier, ingredient_id)')
      .eq('user_id', auth.userId)
      .order('name');
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    const ids = recipes?.map(r => r.id) || [];
    let tagMap: Record<string, string[]> = {};
    if (ids.length > 0) {
      const { data: tags } = await auth.supabase.from('recipe_tags').select('recipe_id, tag_name').in('recipe_id', ids);
      if (tags) for (const t of tags) { if (!tagMap[t.recipe_id]) tagMap[t.recipe_id] = []; tagMap[t.recipe_id].push(t.tag_name); }
    }
    const enriched = recipes?.map(r => ({ ...r, tags: tagMap[r.id] || [] }));
    return { content: [{ type: "text", text: JSON.stringify(enriched, null, 2) }] };
  },
});

mcpServer.tool("create_recipe", {
  description: "Create a new dish with ingredients. Macros auto-calculated. Use tags instead of category.",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Name of the recipe" },
      tags: { type: "array", items: { type: "string" }, description: "Tags (e.g., ['pasta', 'functional'])" },
      instructions: { type: "string", description: "Preparation instructions" },
      link: { type: "string", description: "Recipe source link" },
      notes: { type: "string", description: "Additional notes" },
      ingredients: { type: "array", items: { type: "object", properties: { ingredient_id: { type: "string" }, serving_multiplier: { type: "number" } }, required: ["ingredient_id", "serving_multiplier"] }, description: "Ingredients with serving multipliers" }
    },
    required: ["name", "ingredients"],
  },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) return { content: [{ type: "text", text: "Unauthorized" }] };
    const { name, tags, instructions, link, notes, ingredients } = input as { name: string; tags?: string[]; instructions?: string; link?: string; notes?: string; ingredients: Array<{ ingredient_id: string; serving_multiplier: number }>; };
    const ids = ingredients.map(i => i.ingredient_id);
    const { data: ingData, error: ingErr } = await auth.supabase.from('ingredients').select('id, name, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving').in('id', ids);
    if (ingErr || !ingData) return { content: [{ type: "text", text: `Error fetching ingredients: ${ingErr?.message}` }] };
    const iMap = new Map(ingData.map(i => [i.id, i]));
    const m = calcMacros(ingredients, iMap);
    const { data: recipe, error: rErr } = await auth.supabase.from('recipes').insert({ name, category: tags?.[0] || null, instructions: instructions || null, link: link || null, notes: notes || null, user_id: auth.userId, total_calories: m.cal, total_protein: m.pro, total_fat: m.fat, total_carbs: m.carb }).select().single();
    if (rErr || !recipe) return { content: [{ type: "text", text: `Error creating recipe: ${rErr?.message}` }] };
    await auth.supabase.from('recipe_ingredients').insert(ingredients.map(ing => ({ recipe_id: recipe.id, ingredient_id: ing.ingredient_id, name: iMap.get(ing.ingredient_id)?.name || 'Unknown', serving_multiplier: ing.serving_multiplier })));
    if (tags && tags.length > 0) await writeRecipeTags(auth.supabase, recipe.id, tags, auth.userId);
    return { content: [{ type: "text", text: `Created recipe "${name}" (${ingredients.length} ingredients). ID: ${recipe.id}` }] };
  },
});

mcpServer.tool("bulk_create_recipes", {
  description: "Create multiple recipes at once. Each must reference existing ingredient IDs.",
  inputSchema: {
    type: "object",
    properties: {
      recipes: { type: "array", items: { type: "object", properties: { name: { type: "string" }, tags: { type: "array", items: { type: "string" } }, instructions: { type: "string" }, link: { type: "string" }, notes: { type: "string" }, ingredients: { type: "array", items: { type: "object", properties: { ingredient_id: { type: "string" }, serving_multiplier: { type: "number" } }, required: ["ingredient_id", "serving_multiplier"] } } }, required: ["name", "ingredients"] } }
    },
    required: ["recipes"],
  },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) return { content: [{ type: "text", text: "Unauthorized" }] };
    const { recipes } = input as { recipes: Array<{ name: string; tags?: string[]; instructions?: string; link?: string; notes?: string; ingredients: Array<{ ingredient_id: string; serving_multiplier: number }> }> };
    if (!recipes?.length) return { content: [{ type: "text", text: "No recipes provided" }] };
    const allIds = new Set<string>();
    for (const r of recipes) for (const i of r.ingredients) allIds.add(i.ingredient_id);
    const { data: ingData, error: ingErr } = await auth.supabase.from('ingredients').select('id, name, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving').in('id', Array.from(allIds));
    if (ingErr) return { content: [{ type: "text", text: `Error: ${ingErr.message}` }] };
    const iMap = new Map(ingData?.map(i => [i.id, i]) || []);
    const ok: string[] = [], errs: string[] = [];
    for (const r of recipes) {
      const m = calcMacros(r.ingredients, iMap);
      const { data: cr, error: re } = await auth.supabase.from('recipes').insert({ name: r.name, category: r.tags?.[0] || null, instructions: r.instructions || null, link: r.link || null, notes: r.notes || null, user_id: auth.userId, total_calories: m.cal, total_protein: m.pro, total_fat: m.fat, total_carbs: m.carb }).select().single();
      if (re || !cr) { errs.push(`"${r.name}": ${re?.message}`); continue; }
      await auth.supabase.from('recipe_ingredients').insert(r.ingredients.map(i => ({ recipe_id: cr.id, ingredient_id: i.ingredient_id, name: iMap.get(i.ingredient_id)?.name || 'Unknown', serving_multiplier: i.serving_multiplier })));
      if (r.tags?.length) await writeRecipeTags(auth.supabase, cr.id, r.tags, auth.userId);
      ok.push(r.name);
    }
    let msg = `Created ${ok.length} recipe(s)`;
    if (ok.length) msg += `: ${ok.join(', ')}`;
    if (errs.length) msg += `\nErrors: ${errs.join('; ')}`;
    return { content: [{ type: "text", text: msg }] };
  },
});

mcpServer.tool("delete_recipe", {
  description: "Delete a recipe by ID. Meals derived from it keep their ingredients.",
  inputSchema: { type: "object", properties: { recipe_id: { type: "string" } }, required: ["recipe_id"] },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) return { content: [{ type: "text", text: "Unauthorized" }] };
    const { recipe_id } = input as { recipe_id: string };
    const { data: r } = await auth.supabase.from('recipes').select('id, name').eq('id', recipe_id).eq('user_id', auth.userId).single();
    if (!r) return { content: [{ type: "text", text: "Recipe not found" }] };
    await auth.supabase.from('recipe_tags').delete().eq('recipe_id', recipe_id);
    await auth.supabase.from('recipe_ingredients').delete().eq('recipe_id', recipe_id);
    const { error } = await auth.supabase.from('recipes').delete().eq('id', recipe_id);
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: `Deleted recipe "${r.name}"` }] };
  },
});

mcpServer.tool("bulk_delete_recipes", {
  description: "Delete multiple recipes by ID",
  inputSchema: { type: "object", properties: { recipe_ids: { type: "array", items: { type: "string" } } }, required: ["recipe_ids"] },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) return { content: [{ type: "text", text: "Unauthorized" }] };
    const { recipe_ids } = input as { recipe_ids: string[] };
    if (!recipe_ids?.length) return { content: [{ type: "text", text: "No IDs provided" }] };
    const { data: rs } = await auth.supabase.from('recipes').select('id, name').in('id', recipe_ids).eq('user_id', auth.userId);
    if (!rs?.length) return { content: [{ type: "text", text: "No matching recipes" }] };
    const ids = rs.map(r => r.id);
    await auth.supabase.from('recipe_tags').delete().in('recipe_id', ids);
    await auth.supabase.from('recipe_ingredients').delete().in('recipe_id', ids);
    await auth.supabase.from('recipes').delete().in('id', ids);
    return { content: [{ type: "text", text: `Deleted ${rs.length} recipe(s): ${rs.map(r => r.name).join(', ')}` }] };
  },
});

mcpServer.tool("edit_recipe", {
  description: "Update a recipe. Only provided fields are changed. Provide ingredients to replace all.",
  inputSchema: {
    type: "object",
    properties: {
      recipe_id: { type: "string" }, name: { type: "string" },
      tags: { type: "array", items: { type: "string" } },
      instructions: { type: "string" }, link: { type: "string" }, notes: { type: "string" },
      ingredients: { type: "array", items: { type: "object", properties: { ingredient_id: { type: "string" }, serving_multiplier: { type: "number" } }, required: ["ingredient_id", "serving_multiplier"] } }
    },
    required: ["recipe_id"],
  },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) return { content: [{ type: "text", text: "Unauthorized" }] };
    const { recipe_id, name, tags, instructions, link, notes, ingredients } = input as { recipe_id: string; name?: string; tags?: string[]; instructions?: string; link?: string; notes?: string; ingredients?: Array<{ ingredient_id: string; serving_multiplier: number }> };
    const { data: existing } = await auth.supabase.from('recipes').select('id, name').eq('id', recipe_id).eq('user_id', auth.userId).single();
    if (!existing) return { content: [{ type: "text", text: "Recipe not found" }] };
    const upd: Record<string, unknown> = {};
    if (name !== undefined) upd.name = name;
    if (instructions !== undefined) upd.instructions = instructions || null;
    if (link !== undefined) upd.link = link || null;
    if (notes !== undefined) upd.notes = notes || null;
    if (tags !== undefined) upd.category = tags[0] || null;
    if (ingredients?.length) {
      const ids = ingredients.map(i => i.ingredient_id);
      const { data: ingData } = await auth.supabase.from('ingredients').select('id, name, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving').in('id', ids);
      const iMap = new Map(ingData?.map(i => [i.id, i]) || []);
      const m = calcMacros(ingredients, iMap);
      upd.total_calories = m.cal; upd.total_protein = m.pro; upd.total_fat = m.fat; upd.total_carbs = m.carb;
      await auth.supabase.from('recipe_ingredients').delete().eq('recipe_id', recipe_id);
      await auth.supabase.from('recipe_ingredients').insert(ingredients.map(i => ({ recipe_id, ingredient_id: i.ingredient_id, name: iMap.get(i.ingredient_id)?.name || 'Unknown', serving_multiplier: i.serving_multiplier })));
    }
    if (tags !== undefined) await writeRecipeTags(auth.supabase, recipe_id, tags, auth.userId);
    if (Object.keys(upd).length) await auth.supabase.from('recipes').update(upd).eq('id', recipe_id);
    return { content: [{ type: "text", text: `Updated recipe "${name || existing.name}"` }] };
  },
});

// ========== INGREDIENT TOOLS ==========

mcpServer.tool("list_ingredients", {
  description: "Get all available ingredients with nutritional data per serving",
  inputSchema: { type: "object", properties: {}, required: [] },
  handler: async () => {
    const auth = getCurrentAuth();
    if (!auth) return { content: [{ type: "text", text: "Unauthorized" }] };
    const { data, error } = await auth.supabase.from('ingredients').select('*').eq('user_id', auth.userId).order('name');
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

mcpServer.tool("create_ingredient", {
  description: "Add a new ingredient with per-serving macro values and serving size info",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string" }, calories_per_serving: { type: "number" }, protein_per_serving: { type: "number" },
      fat_per_serving: { type: "number" }, carbs_per_serving: { type: "number" }, fiber_per_serving: { type: "number" },
      sodium_per_serving: { type: "number" }, brand: { type: "string" }, category: { type: "string" },
      serving_description: { type: "string", description: "e.g. '1 egg (60g)', '1 can', '100g'" },
      serving_grams: { type: "number", description: "Weight in grams for the serving size (default: 100)" },
    },
    required: ["name", "calories_per_serving", "protein_per_serving", "fat_per_serving", "carbs_per_serving"],
  },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) return { content: [{ type: "text", text: "Unauthorized" }] };
    const p = input as CreateIngredientInput;
    const { data, error } = await auth.supabase.from('ingredients').insert({
      name: p.name, calories_per_serving: p.calories_per_serving, protein_per_serving: p.protein_per_serving,
      fat_per_serving: p.fat_per_serving, carbs_per_serving: p.carbs_per_serving,
      fiber_per_serving: p.fiber_per_serving || 0, sodium_per_serving: p.sodium_per_serving || 0,
      brand: p.brand || null, category: p.category || null,
      serving_description: p.serving_description || '100g', serving_grams: p.serving_grams || 100,
      user_id: auth.userId,
    }).select().single();
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: `Created ingredient "${p.name}" (${p.serving_description || '100g'}). ID: ${data.id}` }] };
  },
});

mcpServer.tool("bulk_create_ingredients", {
  description: "Create multiple ingredients at once",
  inputSchema: {
    type: "object",
    properties: {
      ingredients: { type: "array", items: { type: "object", properties: { name: { type: "string" }, calories_per_serving: { type: "number" }, protein_per_serving: { type: "number" }, fat_per_serving: { type: "number" }, carbs_per_serving: { type: "number" }, fiber_per_serving: { type: "number" }, sodium_per_serving: { type: "number" }, brand: { type: "string" }, category: { type: "string" }, serving_description: { type: "string" }, serving_grams: { type: "number" } }, required: ["name", "calories_per_serving", "protein_per_serving", "fat_per_serving", "carbs_per_serving"] } }
    },
    required: ["ingredients"],
  },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) return { content: [{ type: "text", text: "Unauthorized" }] };
    const { ingredients } = input as { ingredients: CreateIngredientInput[] };
    if (!ingredients?.length) return { content: [{ type: "text", text: "No ingredients provided" }] };
    const rows = ingredients.map(i => ({ name: i.name, calories_per_serving: i.calories_per_serving, protein_per_serving: i.protein_per_serving, fat_per_serving: i.fat_per_serving, carbs_per_serving: i.carbs_per_serving, fiber_per_serving: i.fiber_per_serving || 0, sodium_per_serving: i.sodium_per_serving || 0, brand: i.brand || null, category: i.category || null, serving_description: i.serving_description || '100g', serving_grams: i.serving_grams || 100, user_id: auth.userId }));
    const { data, error } = await auth.supabase.from('ingredients').insert(rows).select('id, name');
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: `Created ${data?.length || 0} ingredient(s): ${data?.map(i => i.name).join(', ')}` }] };
  },
});

mcpServer.tool("delete_ingredient", {
  description: "Delete an ingredient by ID. Fails if used in recipes.",
  inputSchema: { type: "object", properties: { ingredient_id: { type: "string" } }, required: ["ingredient_id"] },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) return { content: [{ type: "text", text: "Unauthorized" }] };
    const { ingredient_id } = input as { ingredient_id: string };
    const { data: ing } = await auth.supabase.from('ingredients').select('id, name').eq('id', ingredient_id).eq('user_id', auth.userId).single();
    if (!ing) return { content: [{ type: "text", text: "Ingredient not found" }] };
    const { data: used } = await auth.supabase.from('recipe_ingredients').select('recipe_id').eq('ingredient_id', ingredient_id);
    if (used?.length) return { content: [{ type: "text", text: `Cannot delete "${ing.name}": used in ${used.length} recipe(s)` }] };
    const { error } = await auth.supabase.from('ingredients').delete().eq('id', ingredient_id);
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: `Deleted ingredient "${ing.name}"` }] };
  },
});

mcpServer.tool("bulk_delete_ingredients", {
  description: "Delete multiple ingredients by ID. Skips any used in recipes.",
  inputSchema: { type: "object", properties: { ingredient_ids: { type: "array", items: { type: "string" } } }, required: ["ingredient_ids"] },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) return { content: [{ type: "text", text: "Unauthorized" }] };
    const { ingredient_ids } = input as { ingredient_ids: string[] };
    if (!ingredient_ids?.length) return { content: [{ type: "text", text: "No IDs provided" }] };
    const { data: ings } = await auth.supabase.from('ingredients').select('id, name').in('id', ingredient_ids).eq('user_id', auth.userId);
    if (!ings?.length) return { content: [{ type: "text", text: "No matching ingredients" }] };
    const { data: used } = await auth.supabase.from('recipe_ingredients').select('ingredient_id').in('ingredient_id', ings.map(i => i.id));
    const usedIds = new Set(used?.map(u => u.ingredient_id) || []);
    const toDelete = ings.filter(i => !usedIds.has(i.id));
    const skipped = ings.filter(i => usedIds.has(i.id));
    if (toDelete.length) await auth.supabase.from('ingredients').delete().in('id', toDelete.map(i => i.id));
    let msg = `Deleted ${toDelete.length} ingredient(s)`;
    if (toDelete.length) msg += `: ${toDelete.map(i => i.name).join(', ')}`;
    if (skipped.length) msg += `\nSkipped (in use): ${skipped.map(i => i.name).join(', ')}`;
    return { content: [{ type: "text", text: msg }] };
  },
});

// ========== MEAL TOOLS (NEW) ==========

mcpServer.tool("list_meals", {
  description: "List all meals for the user. Meals are instances derived from recipes, independently editable.",
  inputSchema: {
    type: "object",
    properties: {
      source_recipe_id: { type: "string", description: "Filter by source recipe ID (optional)" }
    },
    required: [],
  },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) return { content: [{ type: "text", text: "Unauthorized" }] };
    const { source_recipe_id } = input as { source_recipe_id?: string };
    let query = auth.supabase.from('meals').select('id, name, source_recipe_id, created_at, meal_ingredients(id, ingredient_id, name, serving_multiplier)').eq('user_id', auth.userId).order('created_at', { ascending: false });
    if (source_recipe_id) query = query.eq('source_recipe_id', source_recipe_id);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

mcpServer.tool("edit_meal", {
  description: "Update a meal's name or ingredients. Does NOT affect the source recipe.",
  inputSchema: {
    type: "object",
    properties: {
      meal_id: { type: "string", description: "UUID of the meal" },
      name: { type: "string", description: "New name (optional)" },
      ingredients: { type: "array", items: { type: "object", properties: { ingredient_id: { type: "string" }, serving_multiplier: { type: "number" } }, required: ["ingredient_id", "serving_multiplier"] }, description: "New ingredients (optional, replaces all)" }
    },
    required: ["meal_id"],
  },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) return { content: [{ type: "text", text: "Unauthorized" }] };
    const { meal_id, name, ingredients } = input as { meal_id: string; name?: string; ingredients?: Array<{ ingredient_id: string; serving_multiplier: number }> };
    const { data: meal } = await auth.supabase.from('meals').select('id, name').eq('id', meal_id).eq('user_id', auth.userId).single();
    if (!meal) return { content: [{ type: "text", text: "Meal not found" }] };
    if (name !== undefined) await auth.supabase.from('meals').update({ name }).eq('id', meal_id);
    if (ingredients) {
      const ids = ingredients.map(i => i.ingredient_id);
      const { data: ingData } = await auth.supabase.from('ingredients').select('id, name').in('id', ids);
      const nameMap = new Map(ingData?.map(i => [i.id, i.name]) || []);
      await auth.supabase.from('meal_ingredients').delete().eq('meal_id', meal_id);
      if (ingredients.length) {
        await auth.supabase.from('meal_ingredients').insert(ingredients.map(i => ({ meal_id, ingredient_id: i.ingredient_id, name: nameMap.get(i.ingredient_id) || 'Unknown', serving_multiplier: i.serving_multiplier })));
      }
    }
    return { content: [{ type: "text", text: `Updated meal "${name || meal.name}"` }] };
  },
});

mcpServer.tool("delete_meal", {
  description: "Delete a meal by ID. Removes it from any calendar slots too.",
  inputSchema: { type: "object", properties: { meal_id: { type: "string" } }, required: ["meal_id"] },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) return { content: [{ type: "text", text: "Unauthorized" }] };
    const { meal_id } = input as { meal_id: string };
    const { data: meal } = await auth.supabase.from('meals').select('id, name').eq('id', meal_id).eq('user_id', auth.userId).single();
    if (!meal) return { content: [{ type: "text", text: "Meal not found" }] };
    const { error } = await auth.supabase.from('meals').delete().eq('id', meal_id);
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: `Deleted meal "${meal.name}"` }] };
  },
});

// ========== MEAL PLAN TOOLS ==========

mcpServer.tool("list_meal_plan", {
  description: "Get the meal plan for a specific week. Shows meals assigned to each day/slot with their ingredients and computed macros.",
  inputSchema: {
    type: "object",
    properties: { week_start_date: { type: "string", description: "Monday date (e.g., '2026-02-03'). Defaults to current week." } },
    required: [],
  },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) return { content: [{ type: "text", text: "Unauthorized" }] };
    const { week_start_date = getWeekStartDate() } = input as { week_start_date?: string };

    const { data: plans, error } = await auth.supabase
      .from('meal_plans')
      .select('id, day_of_week, meal_slot, meal_id, meals(id, name, source_recipe_id, meal_ingredients(ingredient_id, name, serving_multiplier))')
      .eq('user_id', auth.userId)
      .eq('week_start_date', week_start_date)
      .order('day_of_week')
      .order('meal_slot');

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };

    const allIngIds = new Set<string>();
    for (const p of plans || []) {
      const meal = (p as any).meals;
      if (meal?.meal_ingredients) {
        for (const mi of meal.meal_ingredients) allIngIds.add(mi.ingredient_id);
      }
    }

    let ingMap = new Map<string, any>();
    if (allIngIds.size > 0) {
      const { data: ings } = await auth.supabase.from('ingredients').select('id, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving').in('id', Array.from(allIngIds));
      if (ings) ingMap = new Map(ings.map(i => [i.id, i]));
    }

    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const grouped: Record<string, any[]> = {};
    for (const p of plans || []) {
      const meal = (p as any).meals;
      let macros = { calories: 0, protein: 0, fat: 0, carbs: 0 };
      if (meal?.meal_ingredients) {
        for (const mi of meal.meal_ingredients) {
          const ing = ingMap.get(mi.ingredient_id);
          if (ing) {
            macros.calories += Math.round(ing.calories_per_serving * mi.serving_multiplier);
            macros.protein += Math.round(ing.protein_per_serving * mi.serving_multiplier);
            macros.fat += Math.round(ing.fat_per_serving * mi.serving_multiplier);
            macros.carbs += Math.round(ing.carbs_per_serving * mi.serving_multiplier);
          }
        }
      }
      if (!grouped[p.day_of_week]) grouped[p.day_of_week] = [];
      grouped[p.day_of_week].push({
        slot: p.meal_slot,
        meal_id: p.meal_id,
        meal_name: meal?.name || 'Unknown',
        source_recipe_id: meal?.source_recipe_id || null,
        macros,
        ingredients: meal?.meal_ingredients || [],
      });
    }

    const sorted: Record<string, any> = {};
    for (const d of dayOrder) if (grouped[d]) sorted[d] = grouped[d];

    return { content: [{ type: "text", text: JSON.stringify({ week_start_date, meals: sorted }, null, 2) }] };
  },
});

mcpServer.tool("add_meal_to_plan", {
  description: "Add a recipe to a day/slot. Creates a meal entity (copy of recipe ingredients) and assigns it. Slots: m1-m6 (6 positions per day).",
  inputSchema: {
    type: "object",
    properties: {
      day: { type: "string", enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] },
      slot: { type: "string", enum: ["m1", "m2", "m3", "m4", "m5", "m6"], description: "Meal slot (m1-m6, 6 positions per day)" },
      recipe_id: { type: "string", description: "UUID of the recipe to add" },
      week_start_date: { type: "string", description: "Monday date. Defaults to current week." },
    },
    required: ["day", "slot", "recipe_id"],
  },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) return { content: [{ type: "text", text: "Unauthorized" }] };
    const { day, slot, recipe_id, week_start_date = getWeekStartDate() } = input as { day: string; slot: string; recipe_id: string; week_start_date?: string };

    const { data: recipe, error: rErr } = await auth.supabase
      .from('recipes')
      .select('id, name, recipe_ingredients(ingredient_id, name, serving_multiplier)')
      .eq('id', recipe_id)
      .eq('user_id', auth.userId)
      .single();

    if (rErr || !recipe) return { content: [{ type: "text", text: "Recipe not found" }] };

    const { data: meal, error: mErr } = await auth.supabase
      .from('meals')
      .insert({ user_id: auth.userId, source_recipe_id: recipe.id, name: recipe.name })
      .select()
      .single();

    if (mErr || !meal) return { content: [{ type: "text", text: `Error creating meal: ${mErr?.message}` }] };

    const recipeIngs = (recipe as any).recipe_ingredients || [];
    if (recipeIngs.length > 0) {
      await auth.supabase.from('meal_ingredients').insert(
        recipeIngs.map((ri: any) => ({
          meal_id: meal.id,
          ingredient_id: ri.ingredient_id,
          name: ri.name,
          serving_multiplier: ri.serving_multiplier,
        }))
      );
    }

    const { data: existing } = await auth.supabase
      .from('meal_plans')
      .select('id, meal_id')
      .eq('user_id', auth.userId)
      .eq('week_start_date', week_start_date)
      .eq('day_of_week', day)
      .eq('meal_slot', slot)
      .single();

    if (existing) {
      await auth.supabase.from('meals').delete().eq('id', existing.meal_id);
      await auth.supabase.from('meal_plans').update({ meal_id: meal.id }).eq('id', existing.id);
    } else {
      await auth.supabase.from('meal_plans').insert({
        user_id: auth.userId,
        week_start_date,
        day_of_week: day,
        meal_slot: slot,
        meal_id: meal.id,
      });
    }

    return { content: [{ type: "text", text: `Added "${recipe.name}" to ${day} ${slot} (week ${week_start_date})` }] };
  },
});

mcpServer.tool("remove_meal_from_plan", {
  description: "Remove a meal from a specific day and slot",
  inputSchema: {
    type: "object",
    properties: {
      day: { type: "string", enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] },
      slot: { type: "string", enum: ["m1", "m2", "m3", "m4", "m5", "m6"] },
      week_start_date: { type: "string", description: "Monday date. Defaults to current week." },
    },
    required: ["day", "slot"],
  },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) return { content: [{ type: "text", text: "Unauthorized" }] };
    const { day, slot, week_start_date = getWeekStartDate() } = input as { day: string; slot: string; week_start_date?: string };

    const { data: plan } = await auth.supabase
      .from('meal_plans')
      .select('id, meal_id')
      .eq('user_id', auth.userId)
      .eq('week_start_date', week_start_date)
      .eq('day_of_week', day)
      .eq('meal_slot', slot)
      .single();

    if (!plan) return { content: [{ type: "text", text: `No meal at ${day} ${slot} (week ${week_start_date})` }] };

    const { data: meal } = await auth.supabase.from('meals').select('name').eq('id', plan.meal_id).single();

    await auth.supabase.from('meal_plans').delete().eq('id', plan.id);
    await auth.supabase.from('meals').delete().eq('id', plan.meal_id);

    return { content: [{ type: "text", text: `Removed "${meal?.name || 'Unknown'}" from ${day} ${slot} (week ${week_start_date})` }] };
  },
});

// ========== SHOPPING LIST ==========

mcpServer.tool("get_shopping_list", {
  description: "Generate aggregated shopping list from a week's meal plan. Quantities in grams.",
  inputSchema: {
    type: "object",
    properties: { week_start_date: { type: "string", description: "Monday date. Defaults to current week." } },
    required: [],
  },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) return { content: [{ type: "text", text: "Unauthorized" }] };
    const { week_start_date = getWeekStartDate() } = input as { week_start_date?: string };

    const { data: plans, error } = await auth.supabase
      .from('meal_plans')
      .select('meal_id, meals(meal_ingredients(ingredient_id, name, serving_multiplier))')
      .eq('user_id', auth.userId)
      .eq('week_start_date', week_start_date);

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };

    const allIngIds = new Set<string>();
    for (const p of plans || []) {
      const meal = (p as any).meals;
      if (meal?.meal_ingredients) for (const mi of meal.meal_ingredients) allIngIds.add(mi.ingredient_id);
    }

    if (allIngIds.size === 0) return { content: [{ type: "text", text: `No meals in plan for week ${week_start_date}. Shopping list is empty.` }] };

    const { data: ingData } = await auth.supabase.from('ingredients').select('id, serving_grams').in('id', Array.from(allIngIds));
    const ingGrams = new Map(ingData?.map(i => [i.id, Number(i.serving_grams) || 100]) || []);

    const agg: Record<string, { name: string; grams: number }> = {};
    for (const p of plans || []) {
      const meal = (p as any).meals;
      if (!meal?.meal_ingredients) continue;
      for (const mi of meal.meal_ingredients) {
        const gramsPerServing = ingGrams.get(mi.ingredient_id) || 100;
        const grams = mi.serving_multiplier * gramsPerServing;
        if (!agg[mi.name]) agg[mi.name] = { name: mi.name, grams: 0 };
        agg[mi.name].grams += grams;
      }
    }

    const list = Object.values(agg).map(i => ({ name: i.name, amount: Math.round(i.grams), unit: 'g' })).sort((a, b) => a.name.localeCompare(b.name));
    return { content: [{ type: "text", text: JSON.stringify({ week_start_date, items: list }, null, 2) }] };
  },
});

// ========== TARGETS ==========

mcpServer.tool("get_weekly_targets", {
  description: "Get calorie and macro targets for a specific week",
  inputSchema: {
    type: "object",
    properties: { week_start_date: { type: "string", description: "Monday date. Defaults to current week." } },
    required: [],
  },
  handler: async (input: unknown) => {
    const auth = getCurrentAuth();
    if (!auth) return { content: [{ type: "text", text: "Unauthorized" }] };
    const { week_start_date = getWeekStartDate() } = input as { week_start_date?: string };
    const { data, error } = await auth.supabase.from('weekly_targets').select('*').eq('user_id', auth.userId).eq('week_start_date', week_start_date).single();
    if (error) {
      const { data: latest } = await auth.supabase.from('weekly_targets').select('*').eq('user_id', auth.userId).order('week_start_date', { ascending: false }).limit(1).single();
      if (latest) return { content: [{ type: "text", text: JSON.stringify({ ...latest, note: `No targets for week ${week_start_date}. Showing latest from ${latest.week_start_date}.` }, null, 2) }] };
      return { content: [{ type: "text", text: `No targets set for week ${week_start_date}.` }] };
    }
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

// ========== HTTP HANDLER ==========

const transport = new StreamableHttpTransport();
const httpHandler = transport.bind(mcpServer);

app.options('/*', (c) => new Response(null, { headers: corsHeaders }));

app.all('/*', async (c) => {
  const authHeader = c.req.header('Authorization');
  const clonedReq = c.req.raw.clone();
  let body: { method?: string; id?: string | number } | null = null;
  try { body = await clonedReq.json(); } catch {}

  const requiresAuth = body?.method === 'tools/call' || body?.method === 'tools/list' || body?.method === 'resources/list' || body?.method === 'resources/read';

  if (requiresAuth) {
    const auth = await validateAuth(authHeader ?? null);
    if (!auth) {
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: body?.id ?? null, error: { code: -32001, message: "Unauthorized" } }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return await authStorage.run(auth, async () => {
      const response = await httpHandler(c.req.raw);
      const newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
      return new Response(response.body, { status: response.status, headers: newHeaders });
    });
  }

  const response = await httpHandler(c.req.raw);
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
  return new Response(response.body, { status: response.status, headers: newHeaders });
});

Deno.serve(app.fetch);
