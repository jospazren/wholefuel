

# Figma CSS Alignment -- Final Polish

## What's Already Working
The layout, navigation, glassmorphism panels, and overall structure are correct. The remaining differences are about exact color values and a few styling details.

## Changes Needed

### 1. Macro Badge Colors -- Switch to Standard Tailwind Colors
The Figma uses standard Tailwind color utilities, not custom HSL variables. The current `MacroBadge` uses custom `bg-macro-*/10` and `text-macro-*` classes. These need to change to:

- **Calories**: `bg-slate-500/10` + `text-slate-600`
- **Protein**: `bg-emerald-600/10` + `text-emerald-600`
- **Carbs**: `bg-cyan-600/10` + `text-cyan-600`
- **Fat**: `bg-orange-500/10` + `text-orange-500`

File: `src/components/MacroBadge.tsx`

### 2. Macro Progress Bar Gradients -- Match Figma Exactly
The Figma CSS shows these gradient fills for the day column bars:

- **Calories**: `from-slate-600 to-slate-500` on `bg-slate-500/10` track
- **Protein**: `from-red-600 to-red-500` on `bg-emerald-600/10` track (red bar, green badge)
- **Carbs**: `from-cyan-600 to-cyan-500` on `bg-cyan-600/10` track
- **Fat**: `from-orange-500 to-orange-400` on `bg-orange-500/10` track

The numeric values use: `text-slate-600`, `text-red-600`, `text-cyan-600`, `text-orange-500` respectively.

File: `src/components/DayMacroBars.tsx`

### 3. Add Decorative Background Gradient Circles
The Figma has three large blurred gradient circles behind the content for depth:
- Circle 1: `from-emerald-200 via-teal-200 to-cyan-200` at top-left, `w-96 h-96 blur-3xl opacity-40`
- Circle 2: `from-teal-400/40 to-emerald-400/50` at bottom-right
- Circle 3: `from-cyan-400/50 to-blue-400/50` at center-right

File: `src/components/AppLayout.tsx` or `src/pages/Index.tsx`

### 4. Remove Custom Macro CSS Variables from index.css
Clean up the now-unused custom `--macro-*` and `--bar-*-from/to` HSL variables since we're switching to standard Tailwind colors.

File: `src/index.css`

### 5. Minor Typography Adjustments
From the Figma CSS, recipe card name uses `text-slate-950` (very dark, not just `text-foreground`). Day labels use `text-gray-500` and `uppercase tracking-wide`.

Files: `src/components/RecipeCard.tsx`, `src/components/WeeklyCalendar.tsx`

### 6. Recipe Panel Header
The Figma shows the brand text in the panel header using a gradient text effect: `bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent` for "WholeFuel" style branding on the "Menu" label.

File: `src/components/RecipeLibrary.tsx`

---

## Technical Details

### Files to Modify
1. `src/components/MacroBadge.tsx` -- Replace custom color classes with standard Tailwind slate/emerald/cyan/orange utilities
2. `src/components/DayMacroBars.tsx` -- Switch from inline style gradients to Tailwind gradient classes; use red for protein bar
3. `src/index.css` -- Remove unused custom `--macro-*` and `--bar-*` CSS variables
4. `src/components/AppLayout.tsx` -- Add decorative blurred gradient circles behind content
5. `src/components/RecipeCard.tsx` -- Use `text-slate-950` for recipe name
6. `src/components/RecipeLibrary.tsx` -- Minor typography/branding polish
7. `src/components/WeeklyCalendar.tsx` -- Day label styling: `text-gray-500 uppercase tracking-wide`

### Implementation Sequence
1. Update MacroBadge with Tailwind color classes
2. Update DayMacroBars with correct gradient classes and red protein bar
3. Add decorative background circles
4. Minor typography fixes
5. Clean up unused CSS variables

