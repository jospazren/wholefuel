

# WholeFuel Figma Redesign Implementation Plan

## Overview

This is a significant UI overhaul that changes the navigation pattern, calendar layout, color scheme, and adds the diet strategy selector to the meal plan header. The core data model and backend remain unchanged.

## Changes Summary

### 1. Navigation: Sidebar to Top Nav Bar
**Current**: Vertical collapsible sidebar with icon+text links
**New**: Horizontal top navigation bar with: WholeFuel brand (green), nav tabs (Meal Planner, Shopping List, Targets, Recipes, Ingredients), and right-aligned Settings + Sign Out

Files affected:
- `src/components/AppLayout.tsx` -- Replace sidebar layout with top nav bar
- `src/components/AppSidebar.tsx` -- Remove or repurpose
- `src/pages/Index.tsx` -- Adjust page layout (no sidebar wrapper needed)
- All page components that use `AppLayout`

### 2. Calendar Redesign: Grid to Day Columns
**Current**: Table-like grid with meal slot rows (Breakfast, Lunch, etc.) and day columns, plus a totals row
**New**: Each day is a vertical column showing:
- Day label (MON, TUE, etc.) at top
- 4 colored horizontal macro progress bars (calories=dark, protein=green, carbs=blue, fat=red) with numeric values
- Meal cards stacked vertically (recipe name + colored macro badges: K, P, C, F)
- "+ Add meal" text buttons for empty slots and at the bottom

Files affected:
- `src/components/WeeklyCalendar.tsx` -- Complete redesign to column-based layout
- `src/components/MealSlotCell.tsx` -- Redesign as a card with macro badges instead of grid cell

### 3. Meal Plan Header with Diet Strategy Selector
**Current**: Diet strategy is only on the Targets page
**New**: The meal plan header shows:
- Left: Calendar icon + "Meal Plan" title
- Center: Week navigation arrows + "This Week" label
- Right: Strategy dropdown, macro totals as colored badges (2716K, 110P, 497C, 32F), and a settings/filter icon

Files affected:
- `src/components/WeeklyCalendar.tsx` -- Add strategy dropdown and macro summary to header
- May add a new `StrategySelector` component

### 4. Color Scheme and Styling
**Current**: Black/white brutalist Material Design with hard shadows, 0 border-radius
**New**: Soft mint/green tinted background, rounded corners, softer shadows, colored macro badges

Files affected:
- `src/index.css` -- Update CSS variables for background tints, border-radius, shadows
- Various component styles

### 5. Recipe Library Panel Updates
**Current**: Has category filter pills (no "All" option), search, recipe cards
**New**: Adds an "All" filter button (highlighted green when active), same search and card layout but styled to match new theme

Files affected:
- `src/components/RecipeLibrary.tsx` -- Add "All" toggle button, style updates
- `src/components/RecipeCard.tsx` -- Match macro badge styling from Figma

### 6. Macro Progress Bars (New Component)
Each day column in the Figma shows 4 horizontal bars representing progress toward daily targets for calories, protein, carbs, and fat. This is a new visual element.

Files to create:
- `src/components/DayMacroBars.tsx` -- Horizontal progress bars per macro

---

## Technical Details

### Navigation Architecture Change
The `AppLayout` component currently wraps content with `SidebarProvider` and `AppSidebar`. This will be replaced with a simpler layout:

```text
+----------------------------------------------------------+
| WholeFuel | Meal Planner | Shopping List | Targets | ...  |
+----------------------------------------------------------+
|                     Page Content                          |
+----------------------------------------------------------+
```

The `AppSidebar` and sidebar-related UI components can remain installed but won't be used in the main layout.

### Calendar Column Layout
The current `WeeklyCalendar` uses a CSS grid with `grid-cols-[60px_repeat(7,1fr)]` for rows of meal slots. The new design flips this: each day is a column containing a vertical stack of meal cards.

The meal slots (m1, m3, m4, m5, m6, m7) still exist in the data model -- they just won't have visible labels. Each slot renders as a meal card or a "+ Add meal" button.

### Strategy Dropdown in Header
The strategy dropdown (Cut 10/20%, Maintain, Bulk 10/20%) currently lives in `WeeklyTargetsForm.tsx` on a dedicated Targets page. A compact version will be added to the `WeeklyCalendar` header. Changing the strategy here will recalculate daily calorie/macro targets using the existing `calculateTargets` function and persist via `setWeeklyTargets`.

### Macro Badge Styling
The Figma shows macro values as small colored rounded pills:
- Calories: dark/black background
- Protein: green
- Carbs: blue  
- Fat: orange/red

This pattern applies to both meal cards and the header summary.

### Implementation Sequence
1. Update CSS variables (colors, radius, backgrounds)
2. Replace sidebar navigation with horizontal top nav
3. Redesign the weekly calendar to column layout with macro bars
4. Add strategy selector dropdown to calendar header
5. Update recipe library styling (add "All" filter)
6. Update meal card/cell styling with colored macro badges

