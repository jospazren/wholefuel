
# Refactor: Store Serving Multiplier Instead of Grams

## Problem
Currently, recipe ingredients store amounts in grams, and the UI displays serving multipliers (e.g., ×0.5, ×2). This causes precision issues:
- User types `0.5` (serving multiplier) for garlic (3g serving)
- System converts to grams: `0.5 × 3 = 1.5g`, rounds to `2g`
- UI recalculates multiplier: `2g ÷ 3g = 0.67`
- Value "jumps" from 0.5 to 0.67

## Solution
Store the **serving multiplier** directly instead of converting to grams. Gram calculations will only happen when needed (for macros and shopping lists).

---

## Changes Overview

### 1. Database Schema
Rename the `amount` column to `serving_multiplier` in `recipe_ingredients` table:

```sql
ALTER TABLE recipe_ingredients 
  RENAME COLUMN amount TO serving_multiplier;
```

### 2. Type Definitions
Update `RecipeIngredient` in `src/types/meal.ts`:
- Replace `amount: number` (grams) with `servingMultiplier: number`
- Remove `unit` field (no longer needed since multiplier is unitless)

### 3. Frontend Components

**RecipesPage.tsx**:
- Store/read `servingMultiplier` directly instead of converting from grams
- Update the input to bind directly to the multiplier value
- Simplify `handleMultiplierChange` to set the value directly

### 4. Context & Data Layer

**MealPlanContext.tsx**:
- Update `calculateMacrosFromIngredients` to use multiplier directly:
  ```typescript
  const multiplier = ing.servingMultiplier;
  totals.calories += baseIng.caloriesPerServing * multiplier;
  ```
- Update recipe loading/saving to use `serving_multiplier` column
- Update shopping list generation to calculate grams on-the-fly:
  ```typescript
  const grams = ing.servingMultiplier * ingredientServingGrams;
  ```

### 5. MCP Server

**supabase/functions/mcp-server/index.ts**:
- Update all tools (`create_recipe`, `edit_recipe`, `bulk_create_recipes`, `list_recipes`) to use `serving_multiplier`
- Update macro calculations to multiply by the multiplier directly
- Update input schema descriptions from "Amount in grams" to "Serving multiplier (e.g., 1.0 for one serving, 0.5 for half)"

---

## Data Migration
Existing data will need conversion. The migration will:
1. Rename the column
2. Convert existing gram values to multipliers by dividing by the ingredient's `serving_grams`

```sql
-- First rename the column
ALTER TABLE recipe_ingredients RENAME COLUMN amount TO serving_multiplier;

-- Then update existing values: convert grams to multiplier
UPDATE recipe_ingredients ri
SET serving_multiplier = ri.serving_multiplier / COALESCE(
  (SELECT i.serving_grams FROM ingredients i WHERE i.id = ri.ingredient_id),
  100
);
```

---

## Technical Details

### Macro Calculation (before → after)
```typescript
// BEFORE: amount is grams
const multiplier = ing.amount / baseIng.servingGrams;
totals.calories += baseIng.caloriesPerServing * multiplier;

// AFTER: servingMultiplier is the multiplier directly
totals.calories += baseIng.caloriesPerServing * ing.servingMultiplier;
```

### Shopping List (grams calculated on-the-fly)
```typescript
// BEFORE
totalAmount: ing.amount * meal.servingMultiplier

// AFTER: need ingredient's servingGrams
const ingData = ingredientMap.get(ing.ingredientId);
const gramsPerServing = ingData?.servingGrams || 100;
totalAmount: ing.servingMultiplier * gramsPerServing * meal.servingMultiplier
```

### Files to Update
1. `supabase/migrations/` – new migration file
2. `src/types/meal.ts` – update `RecipeIngredient` type
3. `src/pages/RecipesPage.tsx` – simplify multiplier handling
4. `src/contexts/MealPlanContext.tsx` – update calculations and DB operations
5. `src/data/recipes.ts` – update `calculateRecipeMacros` helper
6. `supabase/functions/mcp-server/index.ts` – update all recipe tools
