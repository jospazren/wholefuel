

## Plan: Fix Build Errors + Revolut-inspired Visual Redesign

### Part 1: Fix Build Errors (prerequisite)

There are three categories of errors:

**A. Stale database types** — The `meals` and `meal_ingredients` tables exist in the database but the auto-generated TypeScript types haven't been refreshed. This causes all the `MealsContext.tsx` errors (`'meals' is not assignable to parameter of type 'never'`). A no-op migration will trigger a types regeneration.

**B. Missing `MealInstance` export** — `WeeklyCalendar.tsx` imports `MealInstance` from `@/types/meal`, but that type doesn't exist. Remove the import.

**C. `category` property on `Recipe`** — `RecipeLibrary.tsx` and `RecipesPage.tsx` set `category` on Recipe objects, but the `Recipe` interface in `meal.ts` doesn't include it. Remove `category` from those object literals (tags already replaced it).

### Part 2: Revolut-Inspired Redesign

Based on the Mobbin reference, shift from the current mint-green glassmorphism to a clean, minimal Revolut-style aesthetic:

**Color system:**
- Primary: `#009688` (teal)
- Secondary green: `#009960`  
- Secondary blue: `#0096B3`
- Background: pure white `#FFFFFF`
- Cards: white with very subtle borders, no glassmorphism
- Text: near-black for primary, gray for secondary

**Design language changes:**
- Remove gradient background — use flat white/light gray
- Remove glassmorphism effects (backdrop blur, semi-transparent surfaces)
- Clean card style: white background, thin `1px` border, subtle shadow
- Typography: keep Inter, increase contrast, reduce decorative elements
- Minimal sidebar with simple icon + text rows
- Pill-shaped action buttons (outlined, not filled)
- Reduce border-radius from 12px to 8-10px for a more structured feel
- Cleaner spacing and more whitespace

**Files to update:**
- `src/index.css` — New CSS variables, remove glass utilities, flat background
- `tailwind.config.ts` — Update color tokens
- `src/components/AppLayout.tsx` — Remove gradient/glass styling
- `src/components/AppSidebar.tsx` — Cleaner sidebar
- Navigation and card components — Align with minimal style

