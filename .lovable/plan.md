

# MCP Server for WholeFuel Meal Planner

This plan creates an MCP (Model Context Protocol) server as a backend function that allows you to interact with your meal planning app through Claude Desktop or other MCP-compatible clients.

---

## What You'll Be Able to Do

Once implemented, you can ask Claude things like:
- "What dishes do I have in my menu?"
- "Add a new ingredient: chicken breast with 165 cal, 31g protein..."
- "Show me my meal plan for this week"
- "What's on my shopping list?"
- "Create a new dish called 'Protein Smoothie'..."

---

## Architecture Overview

```text
+------------------+      HTTPS       +-------------------+
|  Claude Desktop  | <--------------> |  MCP Edge Function |
|  (MCP Client)    |                  |  (mcp-lite + Hono) |
+------------------+                  +--------+----------+
                                               |
                                               | Supabase Client
                                               v
                                      +--------+----------+
                                      |   Database (RLS)  |
                                      |  - recipes        |
                                      |  - ingredients    |
                                      |  - meal_plans     |
                                      +-------------------+
```

---

## MCP Tools to Implement

| Tool Name | Description |
|-----------|-------------|
| `list_recipes` | Get all dishes/recipes with their ingredients and macros |
| `create_recipe` | Create a new dish with name, category, servings, and ingredients |
| `list_ingredients` | Get all available ingredients with nutritional data |
| `create_ingredient` | Add a new ingredient with per-100g macro values |
| `list_meal_plan` | Get the current week's meal plan |
| `add_meal_to_plan` | Add a dish to a specific day and meal slot |
| `remove_meal_from_plan` | Remove a meal from a day/slot |
| `get_shopping_list` | Generate aggregated shopping list from current plan |
| `get_weekly_targets` | Get user's calorie/macro targets |

---

## Technical Details

### 1. Edge Function Structure

Create a single MCP server function using mcp-lite and Hono:

**File:** `supabase/functions/mcp-server/index.ts`

The function will:
- Use `StreamableHttpTransport` for MCP communication
- Validate JWT tokens for user authentication
- Query database using Supabase client with user context

### 2. Authentication

The MCP server requires authentication. Users will need to:
1. Get their auth token from the app (we'll add a settings option)
2. Configure Claude Desktop with the MCP server URL and token

### 3. Database Mapping

| MCP Data | Database Table | Key Columns |
|----------|----------------|-------------|
| Recipes | `recipes` + `recipe_ingredients` | name, category, servings, macros |
| Ingredients | `ingredients` | name, macros per 100g |
| Meal Plan | `meal_plans` | day_of_week, meal_slot, recipe_id |
| Targets | `weekly_targets` | tdee, daily_calories, protein, fat, carbs |

### 4. Tool Input Schemas

**create_recipe:**
```text
{
  name: string (required)
  category: "breakfast" | "main" | "shake" | "snack" | "side" | "dessert"
  servings: number
  instructions?: string
  link?: string
  ingredients: Array<{ ingredient_id: string, amount: number, unit: string }>
}
```

**create_ingredient:**
```text
{
  name: string (required)
  calories_per_100g: number
  protein_per_100g: number
  fat_per_100g: number
  carbs_per_100g: number
  fiber_per_100g?: number
  sodium_per_100g?: number
  brand?: string
  category?: string
}
```

**add_meal_to_plan:**
```text
{
  day: "monday" | "tuesday" | ... | "sunday"
  slot: "m1" | "m2" | "m3" | "m4" | "m5"
  recipe_id: string
}
```

### 5. Config Updates

Add to `supabase/config.toml`:
```toml
[functions.mcp-server]
verify_jwt = false
```

### 6. UI Addition (Optional)

Add a section in Settings page to:
- Display the MCP server URL
- Show/copy the user's auth token for configuring Claude Desktop

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/mcp-server/index.ts` | Create - Main MCP server with all tools |
| `supabase/functions/mcp-server/deno.json` | Create - Deno config with mcp-lite dependency |
| `supabase/config.toml` | Modify - Add function config |
| `src/pages/SettingsPage.tsx` | Modify - Add MCP connection info section |

---

## Implementation Order

1. Create `deno.json` with mcp-lite dependency
2. Create the MCP server edge function with all tools
3. Update `config.toml` with function settings
4. Add MCP connection info to Settings page
5. Test with Claude Desktop

---

## Claude Desktop Configuration

After deployment, configure Claude Desktop's `claude_desktop_config.json`:

```text
{
  "mcpServers": {
    "wholefuel": {
      "url": "https://wmtyrdchsqitequtyosm.supabase.co/functions/v1/mcp-server",
      "headers": {
        "Authorization": "Bearer YOUR_AUTH_TOKEN"
      }
    }
  }
}
```

---

## Security Notes

- All database queries use RLS policies (user_id = auth.uid())
- JWT token validation happens in the edge function
- No admin/service role access - users only see their own data
- Input validation using Zod schemas for all tool inputs

