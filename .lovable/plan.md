
# Mobile UI for WholeFuel

## Overview

Add responsive mobile support across the app: a hamburger menu for navigation, and a single-day swipeable view for the meal planner (no recipe sidebar on mobile).

## Changes

### 1. AppLayout -- Hamburger Menu (Mobile Nav)

On screens below 768px (`useIsMobile`):
- Hide the horizontal nav tabs and the right-side Settings/Sign Out links
- Show a hamburger icon (Menu) to the right of the WholeFuel brand
- Tapping it opens a full-height Drawer (from the left) containing:
  - The nav items as a vertical list (Meal Planner, Recipes, Ingredients, Shopping List, Targets)
  - A divider, then Settings and Sign Out at the bottom
  - Active route highlighted with the same green gradient pill style
  - Drawer closes on nav item click

### 2. Index Page -- Hide Recipe Sidebar on Mobile

- On mobile, force `sidebarOpen = false` and hide the sidebar toggle button
- The meal planner takes full width with no sidebar

### 3. WeeklyCalendar -- Single Day View on Mobile

On mobile, replace the 7-column grid with a single-day view:
- Show one day at a time with the day name prominent
- Left/right day navigation arrows (or horizontal swipe between days using state)
- Day header shows the day label (e.g., "Monday") with macro summary bars beneath
- Below that, the vertical stack of 6 meal slots -- same as desktop but full width
- The top header simplifies: hide the sidebar toggle, show week nav and strategy selector in a compact layout
- Week navigation pill stays centered; strategy selector moves below or into a compact row

### 4. Header Simplification on Mobile

The WeeklyCalendar header on mobile:
- Row 1: Week navigation pill (centered) with view settings icon
- Row 2: Day selector -- day name with left/right chevrons to switch days
- Strategy selector accessible via the existing settings/filter button or shown inline if space permits
- Hide MacroBadgeRow (already hidden via `hidden md:block`)

## Technical Details

**Files to modify:**
- `src/components/AppLayout.tsx` -- Add mobile hamburger menu using Drawer component, conditionally render desktop vs mobile nav
- `src/pages/Index.tsx` -- Use `useIsMobile()` to disable sidebar on mobile
- `src/components/WeeklyCalendar.tsx` -- Add `useIsMobile()`, track `selectedDay` state, render single-day view on mobile with day navigation

**New state in WeeklyCalendar:**
- `selectedDay: DayOfWeek` (default: current day of week or 'monday')
- Navigation functions to go to previous/next day, wrapping around the week

**Dependencies:** No new dependencies needed. Uses existing `useIsMobile`, `Drawer`, and UI components.
