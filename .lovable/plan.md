
# Plan: Change Shopping List to Serving Multiples

## Overview
Update the shopping list to display items as multiples of their serving size (e.g., "2.5 × 1 egg" or "3 × 100g") instead of calculated gram totals. This makes the list more intuitive since users already define ingredients with serving descriptions.

## Changes

### 1. Update ShoppingItem Type
**File:** `src/types/meal.ts`
- Change `totalAmount` to `totalServings` (a serving multiplier)
- Add `servingDescription` to display what one serving is
- Remove `unit` field (no longer needed)

```
interface ShoppingItem {
  ingredientId: string;
  name: string;
  totalServings: number;        // was totalAmount
  servingDescription: string;   // e.g., "1 egg (60g)", "100g"
  purchased: boolean;
}
```

### 2. Update generateShoppingList Function
**File:** `src/contexts/MealPlanContext.tsx`
- Sum up serving multipliers instead of calculating grams
- Include the ingredient's `servingDescription` in each item

### 3. Update Shopping Page Display
**File:** `src/pages/ShoppingPage.tsx`
- Change display from "500 g" to "2.5 × 100g" format
- Update the editable input to modify `totalServings`
- Remove the `formatAmount` gram/kg conversion logic

### 4. Remove Serving Weight Field from Ingredients
**File:** `src/pages/IngredientsPage.tsx`
- Remove the "Serving Weight (g)" input field from the form
- Keep `servingDescription` as it's still useful for display

### 5. Database Migration (Optional)
The `serving_grams` column can remain in the database with its default value of 100 for backward compatibility. No migration is strictly required, but the UI will no longer expose this field.

---

## Technical Details

### ShoppingItem Type Change
```typescript
// Before
export interface ShoppingItem {
  ingredientId: string;
  name: string;
  totalAmount: number;
  unit: string;
  purchased: boolean;
}

// After
export interface ShoppingItem {
  ingredientId: string;
  name: string;
  totalServings: number;
  servingDescription: string;
  purchased: boolean;
}
```

### generateShoppingList Logic Change
```typescript
// Before: calculates grams
const gramsNeeded = ing.servingMultiplier * gramsPerServing * meal.servingMultiplier;

// After: sums serving multipliers
const servingsNeeded = ing.servingMultiplier * meal.servingMultiplier;
```

### Display Format Examples
| Before | After |
|--------|-------|
| Eggs: 360 g | Eggs: 6 × 1 egg (60g) |
| Chicken Breast: 1.2 kg | Chicken Breast: 12 × 100g |
| Olive Oil: 45 g | Olive Oil: 3 × 1 tbsp (15g) |

### Files Changed
1. `src/types/meal.ts` - Update ShoppingItem interface
2. `src/contexts/MealPlanContext.tsx` - Update generateShoppingList
3. `src/pages/ShoppingPage.tsx` - Update display and input handling
4. `src/pages/IngredientsPage.tsx` - Remove servingGrams field from form
