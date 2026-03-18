

## Phase A: Estimated Meals

### What changes

**1. Database migration** -- Add 5 columns to `meals` table:
- `type TEXT NOT NULL DEFAULT 'planned'` (values: `'planned'` or `'estimated'`)
- `est_calories NUMERIC DEFAULT NULL`
- `est_protein NUMERIC DEFAULT NULL`
- `est_fat NUMERIC DEFAULT NULL`
- `est_carbs NUMERIC DEFAULT NULL`

**2. TypeScript types** (`src/types/meal.ts`) -- Extend the `Meal` interface:
```typescript
export interface Meal {
  id: string;
  name: string;
  type: 'planned' | 'estimated';
  sourceRecipeId: string | null;
  ingredients: MealIngredient[];
  estCalories?: number;
  estProtein?: number;
  estFat?: number;
  estCarbs?: number;
}
```

**3. MealsContext** (`src/contexts/MealsContext.tsx`):
- **`loadMeals`**: Map the new DB columns into Meal objects
- **`getMealMacros`**: If `meal.type === 'estimated'`, return the `est_*` fields directly instead of computing from ingredients
- **`createEstimatedMeal`**: New function -- inserts a meal with `type: 'estimated'` and the four macro estimates, no `meal_ingredients`
- **`updateMeal`**: Support updating `est_*` fields for estimated meals
- Export the new function in context type

**4. UI: Add Estimated Meal to Calendar** (`src/components/MealSlotCell.tsx`):
- In the "+ Add meal" popover, add a second option/tab: "Quick estimate" alongside "From recipe"
- Quick estimate shows a small form: name + calories + protein + fat + carbs
- Submitting calls `createEstimatedMeal` then `addMealToSlot`

**5. Visual distinction**: Estimated meals in `MealSlotCell` get a subtle dashed border or italic name to differentiate from planned meals.

**6. Shopping list exclusion**: Estimated meals (no `meal_ingredients`) are already naturally excluded from shopping aggregation since it iterates `meal.ingredients` -- no code change needed.

### Technical details

- `getMealMacros` branching:
```typescript
if (meal.type === 'estimated') {
  return {
    calories: meal.estCalories ?? 0,
    protein: meal.estProtein ?? 0,
    fat: meal.estFat ?? 0,
    carbs: meal.estCarbs ?? 0,
  };
}
// ... existing ingredient-based calculation
```

- The `MealEditSheet` will need a conditional render: if estimated, show editable macro fields; if planned, show ingredient editor as today.

