
# Rename "Recipes" to "Menu" + Add Instructions & Link Fields

This plan covers renaming the "Recipes" section to "Menu" throughout the app and adding new fields (`instructions` and `link`) to dishes for better recipe documentation.

---

## Overview

### Changes at a Glance
- **Rename**: "Recipes" becomes "Menu" in navigation, page titles, and UI labels
- **New Fields**: Add `instructions` (text) and `link` (URL) fields to recipes
- **Database**: Add two new columns to the `recipes` table
- **UI Updates**: Display instructions and link in the recipe detail views

---

## What You'll See

### Navigation
- Sidebar will show "Menu" instead of "Recipes"
- The recipes page URL stays `/recipes` for simplicity (no breaking changes)

### Recipe/Dish Forms
- New "Instructions" textarea for step-by-step preparation
- New "Link" input field for external recipe URLs

### Recipe Details
- Instructions displayed below ingredients
- Clickable link to external sources when provided

---

## Technical Details

### 1. Database Migration
Add two nullable columns to the `recipes` table:
- `instructions` (TEXT) - for preparation steps
- `link` (TEXT) - for external URLs

### 2. Type Definitions
Update `src/types/meal.ts`:
```text
interface Recipe {
  ...
  instructions?: string;  // NEW
  link?: string;          // NEW
}
```

### 3. Files to Update

| File | Change |
|------|--------|
| `src/components/AppSidebar.tsx` | Rename "Recipes" → "Menu" in nav |
| `src/types/meal.ts` | Add `instructions` and `link` to Recipe interface |
| `src/pages/RecipesPage.tsx` | Update title to "Menu", add form fields for instructions/link |
| `src/components/RecipeLibrary.tsx` | Update header to "Menu" or "Dishes" |
| `src/components/RecipeDetailSheet.tsx` | Display instructions and link |
| `src/contexts/MealPlanContext.tsx` | Handle new fields in CRUD operations |
| `src/data/recipes.ts` | Add sample instructions to default recipes |

### 4. UI Components

**Recipe Form (Add/Edit Dialog)**
- Add "Instructions" textarea with multi-line support
- Add "Link" input with URL placeholder
- Both fields optional

**Recipe Detail Sheet**
- Show "Instructions" section when present
- Show clickable link with external icon when URL provided

---

## Implementation Order

1. Database migration (add columns)
2. Update TypeScript types
3. Update MealPlanContext for new fields
4. Update RecipesPage form with new inputs
5. Update RecipeDetailSheet to display new data
6. Rename navigation and page titles
7. Update RecipeLibrary header
8. Add sample instructions to default recipes

---

## Notes
- The route path `/recipes` remains unchanged to avoid complexity
- All changes are backward-compatible (new fields are optional)
- Existing recipes will work without instructions or links
