

## Unified Tag System and Global Tag Management

### Overview
Replace the single `category` field on recipes with a flexible `tags` array, and add a "Manage Tags" modal for global tag CRUD. Tags are user-defined strings (e.g. "Breakfast", "Main", "High Protein", "Quick") that can be assigned to multiple recipes.

### Database Changes

1. **New `recipe_tags` table** (many-to-many between recipes and tags):
   - `id` (uuid, PK)
   - `recipe_id` (uuid, FK to recipes)
   - `tag_name` (text) -- stores the tag string directly on the join row
   - `user_id` (uuid) -- for RLS
   - Unique constraint on `(recipe_id, tag_name)`
   - RLS policies mirroring recipe_ingredients (check recipe ownership via recipes table)

2. **No separate `tags` table needed** -- tags are derived as `SELECT DISTINCT tag_name FROM recipe_tags WHERE user_id = ...`. This keeps things simple; the "Manage Tags" modal queries distinct tags and their counts.

3. The `category` column on `recipes` stays in the DB for now (no destructive migration) but is **ignored in code**. Existing categories will be migrated into `recipe_tags` rows via a one-time migration SQL.

### Data Migration (in the same migration file)
```text
For each existing recipe, insert a row into recipe_tags
with tag_name = recipes.category and the same user_id.
```

### Type Changes (`src/types/meal.ts`)
- Add `tags: string[]` to `Recipe` interface
- Keep `category` as optional/deprecated for backward compat
- Remove `RECIPE_CATEGORIES`, `CATEGORY_LABELS`, `RecipeCategory` exports (or mark deprecated)

### Context Changes (`src/contexts/MealPlanContext.tsx`)
- Load tags per recipe: join `recipe_tags` when loading recipes, populate `tags[]`
- On recipe save: delete old `recipe_tags` for that recipe, insert new ones
- Expose helpers: `getAllTags(): string[]` (distinct), `renameTag(old, new)`, `deleteTag(name)` -- these do bulk updates on `recipe_tags`

### Recipes Page (`src/pages/RecipesPage.tsx`)
- Filter bar: replace category checkboxes with tag-based toggle buttons (like screenshot: "All", "Breakfast", "Main", "Shake", etc.)
- "Manage Tags" button in header (settings icon)

### Manage Tags Modal (new component `src/components/ManageTagsDialog.tsx`)
- Input + "Add" button to create a new tag
- List of existing tags, each showing:
  - Tag name with colored badge
  - Recipe count (e.g. "6 recipes")
  - Edit (pencil) icon -- inline rename
  - Delete (trash) icon -- removes tag from all recipes
- Rename propagates: updates all `recipe_tags` rows with old name to new name
- Delete propagates: deletes all `recipe_tags` rows with that name

### Recipe Editor Changes (`src/components/RecipeEditorDialog.tsx`)
- Replace category dropdown with a tags section (as shown in screenshot 3):
  - Display all available tags as toggle chips (colored when selected)
  - "Create new tag..." input + "Add Tag" button inline
  - Selected tags are saved to `recipe_tags`
- The `onSave` callback changes: `category` replaced by `tags: string[]`
- Remove the `formCategory` state, add `formTags: string[]`

### Recipe Card Changes (`src/pages/RecipesPage.tsx`)
- Show tags as small badges below macros instead of single category badge
- Filter logic: if any selected filter tag is in the recipe's tags array, show it

### Meal Plan Integration
- `MealSlotCell` and `MealEditSheet` currently reference `category` -- update to use tags or remove category dependency
- The `RecipeLibrary` sidebar (used in planner) filter also switches to tags

### Files to Create
- `src/components/ManageTagsDialog.tsx`

### Files to Modify
- `supabase/migrations/` (new migration)
- `src/types/meal.ts`
- `src/contexts/MealPlanContext.tsx`
- `src/pages/RecipesPage.tsx`
- `src/components/RecipeEditorDialog.tsx`
- `src/components/RecipeLibrary.tsx`
- `src/components/MealSlotCell.tsx` (if it uses category)
- `src/components/MealEditSheet.tsx` (if it uses category)

