

# Figma CSS Final Alignment

Comparing the extracted Figma CSS pixel-by-pixel against the current code reveals these remaining differences:

## 1. Protein Progress Bar: GREEN, Not Red

The biggest mistake in the current implementation. The Figma CSS shows:
- `.progress-bar-fill-protein`: `linear-gradient(to right, #096, #00bc7d)` -- this is a **green** gradient
- `.progress-bar-fill-over`: `linear-gradient(to right, #e7000b, #fb2c36)` -- red is **only** for when a macro exceeds its target

The current code always uses `from-red-600 to-red-500` for the protein bar. This needs to change to green, with red applied conditionally when actual > target.

File: `src/components/DayMacroBars.tsx`

## 2. Recipe Card Macro Row: Connected Band, Not Individual Pills

The Figma shows a **single connected row** of macro stats (`.nutrition-stats-container`):
- Container: `border-radius: 10px`, `overflow: clip`, flexbox with `flex: 1` children
- Each stat cell has its own tonal background color
- Dividers between cells are `border-right: 1px solid rgba(255,255,255,0.5)`
- Text: `font-size: 10px`, `font-weight: 500`, centered

The current `MacroBadgeRow` renders individual rounded pills. A new "band" variant is needed for recipe cards, while keeping the pill style for the header summary.

Files: `src/components/MacroBadge.tsx`, `src/components/RecipeCard.tsx`

## 3. Meal Card Badge Sizes

The Figma `.meal-item-stat-badge` uses:
- `padding: 4px 8px`
- `font-size: 11px`, `font-weight: 500`
- Fully rounded (`border-radius: 16777200px`)

The current "sm" size uses `text-[9px] px-1.5 py-0.5` which is too small. The meal card badges should use the same 11px size as the header badges.

File: `src/components/MealSlotCell.tsx` (change `size="sm"` to `size="md"`)

## 4. Meal Card Title Weight

Figma: `.meal-item-title` has `font-weight: 600` (semibold)
Current: `text-[12px] text-foreground` (default weight, ~400)

File: `src/components/MealSlotCell.tsx`

## 5. Day Column Card Background

Figma: `.day-card` has `background-image: linear-gradient(137deg, rgba(255,255,255,0.6), rgba(249,250,251,0.3))` with `border-radius: 16px` and `border: 1px solid rgba(255,255,255,0.5)`, plus `padding: 13px` and `gap: 12px`

Current: Day columns have no background/border -- they're just plain divs with `border-r border-white/20`.

Each day should be wrapped in a card-like container with the gradient background.

File: `src/components/WeeklyCalendar.tsx`

## 6. Background Blur Circles

The Figma uses specific green/teal gradients at 50% opacity with `blur: 64px`:
- Circle 1 (top-left): `linear-gradient(135deg, rgba(0,212,146,0.5), rgba(0,213,190,0.5))`
- Circle 2 (bottom-right): `linear-gradient(135deg, rgba(0,211,243,0.5), rgba(81,162,255,0.5))`
- Circle 3 (center-right): `linear-gradient(135deg, rgba(0,213,190,0.4), rgba(0,212,146,0.4))`

Current: Uses Tailwind color classes (`emerald-200`, `teal-400/40`, `cyan-400/50`) which are pastel/light, not the vivid greens from Figma.

File: `src/components/AppLayout.tsx`

## 7. Add Meal Button Styling

Figma: `.add-meal-button` is `color: #99A1AF`, `font-size: 13px`, `padding: 12px`, transparent background, no border. On hover: `color: #4a5565`.

Current: Uses `text-[11px]` and `glass-faint` (white/20 bg). Should be transparent with larger text and more padding.

File: `src/components/MealSlotCell.tsx`

## 8. Day Column Header Text Color

Figma: `.day-column-header-text` uses `color: #6a7282`, `font-weight: 700`, `font-size: 11px`, `letter-spacing: 0.3395px`

Current: `text-gray-500` which is close but the letter-spacing is missing as an explicit value.

File: `src/components/WeeklyCalendar.tsx` (minor -- add tracking)

---

## Technical Details

### Files to Modify

1. **`src/components/DayMacroBars.tsx`** -- Fix protein bar to green gradient (`from-[#096] to-[#00bc7d]`), add red override when actual > target for any macro
2. **`src/components/MacroBadge.tsx`** -- Add a "band" variant: a connected row with tonal background cells, dividers, and `rounded-[10px]` container
3. **`src/components/RecipeCard.tsx`** -- Use the new band variant for macro display
4. **`src/components/MealSlotCell.tsx`** -- Use `size="md"` badges, add `font-semibold` to meal title, fix empty slot to `text-[13px]` with transparent bg and `py-3`
5. **`src/components/WeeklyCalendar.tsx`** -- Add gradient background and border to each day column card, adjust spacing/padding to match `gap-12` and `padding: 13px`
6. **`src/components/AppLayout.tsx`** -- Replace decorative circle colors with exact Figma gradient values using inline styles

### Progress Bar Over-Target Logic
```text
if (actual > target) {
  fillClass = 'bg-gradient-to-r from-[#e7000b] to-[#fb2c36]'
  textClass = 'text-[#e7000b]'
} else {
  fillClass = normal gradient for that macro
  textClass = normal color for that macro
}
```

### Macro Band Component (New Variant)
```text
Container: flex, h-[19px], rounded-[10px], overflow-hidden
  Cell (calories): flex-1, bg-[rgba(98,116,142,0.1)], text-[#45556c], 10px medium, centered, right-border white/50
  Cell (protein): flex-1, bg-[rgba(0,153,102,0.1)], text-[#096], 10px medium, centered, right-border
  Cell (carbs): flex-1, bg-[rgba(0,146,184,0.1)], text-[#0092b8], 10px medium, centered, right-border
  Cell (fat): flex-1, bg-[rgba(255,105,0,0.1)], text-[#ff6900], 10px medium, centered, no right-border
```

### Implementation Sequence
1. Fix protein bar color and add over-target logic in DayMacroBars
2. Add MacroBand component for connected macro row
3. Update RecipeCard to use MacroBand
4. Fix MealSlotCell badge sizes, title weight, and empty state
5. Add day column card backgrounds in WeeklyCalendar
6. Fix decorative circle colors in AppLayout

