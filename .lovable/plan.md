

# Figma Alignment -- Pixel-Perfect Refinements

Based on the Figma CSS export, here are the exact design tokens and remaining gaps to fix.

## Key Design Tokens Extracted from Figma

### Background
- Page background: `linear-gradient(rgba(164,244,207,1), rgba(150,247,228,1))` -- a vivid mint-to-cyan gradient
- Three decorative blurred circles overlaid (green and blue gradient circles) for depth
- The current app background is too subtle; needs to be noticeably mint/cyan

### Macro Badge Colors (Tonal Style, NOT Solid)
The Figma uses **tonal badges** (light background + colored text), not solid colored backgrounds:
- **Calories (K)**: `background: rgba(98,116,142,0.1)`, `color: rgba(69,85,108,1)` -- slate/gray tonal
- **Protein (P)**: `background: rgba(0,153,102,0.1)`, `color: rgba(0,153,102,1)` -- green tonal
- **Carbs (C)**: `background: rgba(0,146,184,0.1)`, `color: rgba(0,146,184,1)` -- teal/cyan tonal
- **Fat (F)**: `background: rgba(255,105,0,0.1)`, `color: rgba(255,105,0,1)` -- orange tonal

This is a significant difference from the current solid white-on-color badges.

### Macro Progress Bar Gradients (Day Columns)
- **Calories**: `linear-gradient(rgba(69,85,108,1), rgba(98,116,142,1))` on `rgba(98,116,142,0.1)` track
- **Protein**: `linear-gradient(rgba(231,0,11,1), rgba(251,44,54,1))` on `rgba(0,153,102,0.1)` track -- RED gradient (not green!)
- **Carbs**: `linear-gradient(rgba(0,146,184,1), rgba(0,184,219,1))` on `rgba(0,146,184,0.1)` track
- **Fat**: `linear-gradient(rgba(255,105,0,1), rgba(255,137,4,1))` on `rgba(255,105,0,0.1)` track
- Bar height: 6px, fully rounded
- Numeric values shown to the right in bold 10px, colored to match

### Header Macro Badges (Pill Style)
- Same tonal colors as recipe badges but slightly larger (24px height, fully rounded pill)
- Font: Inter Medium, 11px

### Recipe Cards
- Background: `rgba(255,255,255,0.7)` -- semi-transparent white
- Border-radius: 16px
- Padding: 11px
- Recipe name: Inter Regular, 13px, `rgba(2,6,24,1)`
- Macro badge row: 10px font, tonal style (not solid)

### Recipe Panel (Left Sidebar)
- Panel background: `linear-gradient(rgba(255,255,255,0.5), rgba(236,253,245,0.2))` -- subtle white-to-mint
- Search bar: `rgba(255,255,255,0.6)` background, 16px rounded, shadow `0px 1px 2px rgba(0,0,0,0.1)`
- Category "All" button: gradient `linear-gradient(rgba(0,188,125,1), rgba(0,187,167,1))`, white text, green shadow
- Other category pills: `rgba(255,255,255,0.6)` background, gray text

### Meal Plan Card (Main Area)
- Card: `rgba(255,255,255,0.5)` background, 24px border-radius, green-tinted shadow `0px 8px 10px rgba(0,188,125,0.05)`
- Strategy dropdown: `rgba(255,255,255,0.6)`, 10px rounded, with chevron icon

### Day Column Cards (Meal Cards in Day Columns)
- Day label: Inter Bold, 11px, `rgba(106,114,130,1)`
- Meal card background: `rgba(255,255,255,0.7)`, 16px rounded
- Meal name: Inter Regular, 12px
- Meal macro badges: 9px font (slightly smaller than recipe cards), same tonal colors
- Empty slots: `rgba(255,255,255,0.2)` background, 16px rounded, with "+ Add meal" text in `rgba(106,114,130,1)`

### Navigation Bar
- Not visible in the exported CSS (it's at the very top, likely a separate frame). The nav bar is outside the main frame at y=0, 44px height.

---

## Changes to Implement

### 1. Update CSS Variables (`src/index.css`)
- Update `--background` to use the mint-cyan gradient
- Add new CSS variables for the exact Figma macro colors:
  - `--macro-calories: 69, 85, 108` (slate)
  - `--macro-protein: 0, 153, 102` (green) 
  - `--macro-carbs: 0, 146, 184` (teal)
  - `--macro-fat: 255, 105, 0` (orange)
- Add protein bar override color: `rgba(231,0,11,1)` (red gradient for the progress bar fill, while badge stays green)

### 2. Fix Macro Badges Everywhere -- Tonal Instead of Solid
**Current**: White text on solid colored background (e.g., white on green)
**Figma**: Colored text on light tinted background (e.g., green text on green/10%)

Files: `MealSlotCell.tsx`, `RecipeCard.tsx`, `WeeklyCalendar.tsx` (header badges)

### 3. Fix Progress Bars (`DayMacroBars.tsx`)
- Change bar height from `h-2` to `h-1.5` (6px)
- Use gradient fills instead of solid colors
- Protein bar uses RED gradient (not green) -- this is a key Figma detail
- Show numeric values in bold, matching color, to the right
- Track backgrounds use 10% opacity of the macro color

### 4. Fix Recipe Cards (`RecipeCard.tsx`)
- Background: `bg-white/70` instead of `bg-card`
- Border-radius: 16px (`rounded-2xl`)
- Remove the category badge from cards (not in Figma)
- Recipe name: 13px regular weight
- Macro badges: tonal style

### 5. Fix Recipe Library Panel (`RecipeLibrary.tsx`)
- Panel background: gradient from white/50 to ecfdf5/20 (mint tint)
- Search bar: white/60 background, fully rounded (16px), subtle shadow
- "All" button: green gradient background with white text and green shadow
- Other category pills: white/60 background

### 6. Fix Meal Plan Area (`WeeklyCalendar.tsx`)
- Main card: white/50 background, 24px rounded, green-tinted shadow
- Strategy dropdown: white/60 background, rounded
- Header macro badges: tonal pill style (fully rounded, 24px height)
- Day labels: bold 11px, gray color `rgba(106,114,130,1)`

### 7. Fix Day Column Meal Cards (`MealSlotCell.tsx`)
- Filled cards: white/70 background, 16px rounded
- Empty slots: white/20 background, 16px rounded, show "+ Add meal" text
- Macro badges: 9px tonal style

### 8. Fix Page Background (`AppLayout.tsx` or `Index.tsx`)
- Add the vivid mint-cyan gradient as the page background
- Optionally add the decorative blurred gradient circles for the "glassmorphism" effect

### 9. Navigation Bar Polish (`AppLayout.tsx`)
- Remove icons from nav tabs (text only)
- Add "Targets" as a separate tab
- Style active tab with the green gradient pill (matching the "All" button style)
- Nav bar itself: could use backdrop-blur with white/60 for the glass effect

---

## Technical Details

### Macro Color System Refactor
The biggest change is switching from solid-background badges to tonal badges. This affects 3 components. A shared `MacroBadge` component should be extracted or the existing one in `MealSlotCell` updated:

```text
Before: white text on bg-macro-protein (solid green)
After:  green text on bg-[rgba(0,153,102,0.1)] (tonal)
```

### Progress Bar Protein Color
The Figma shows the protein progress bar fill as RED (`rgba(231,0,11)`) while the protein badge color remains GREEN (`rgba(0,153,102)`). This is intentional -- bars use a "danger" gradient when at/over target. We should implement this: bars turn red when >= 100% of target.

### Glassmorphism Effect
The Figma uses semi-transparent backgrounds with backdrop-blur throughout. Key values:
- Panels: `bg-white/50` with `backdrop-blur-xl`
- Cards: `bg-white/70`
- Inputs/pills: `bg-white/60`

### Implementation Sequence
1. Update `index.css` -- background gradient and macro CSS variables
2. Create shared `MacroBadge` component with tonal styling
3. Update `DayMacroBars.tsx` -- gradients, bar height, bold numbers
4. Update `MealSlotCell.tsx` -- glassmorphism cards, tonal badges, empty state
5. Update `RecipeCard.tsx` -- remove category badge, tonal macro badges, white/70 bg
6. Update `RecipeLibrary.tsx` -- panel gradient, search styling, green "All" button
7. Update `WeeklyCalendar.tsx` -- glassmorphism card, tonal header badges, strategy dropdown
8. Update `AppLayout.tsx` -- nav tab polish, gradient background, blur nav bar

