# Diet Presets & Weekly Targets Redesign

## Overview
Replace the current fixed strategy system (Maintain/Cut/Bulk percentages) with user-defined **Diet Presets** that calculate macros based on body weight (g/kg) and TDEE multipliers. Each week in the meal planner, the user selects a preset + enters their weight and TDEE to compute daily targets.

---

## Data Model

### New table: `diet_presets`
| Column | Type | Description |
|---|---|---|
| id | UUID PK | |
| user_id | UUID | Owner |
| name | TEXT | e.g. "Maintenance", "Cut" |
| tdee_multiplier | NUMERIC | e.g. 1.0 = 100%, 0.85 = 85% |
| protein_per_kg | NUMERIC nullable | g/kg, null = "auto" |
| carbs_per_kg | NUMERIC nullable | g/kg, null = "auto" |
| fat_per_kg | NUMERIC nullable | g/kg, null = "auto" |
| created_at / updated_at | TIMESTAMPTZ | |

**Rule**: At most one macro can be "auto" (null). The auto macro fills remaining calories.

### Modify `weekly_targets`
- Add `preset_id` (UUID FK → diet_presets, nullable)
- Add `weight_kg` (NUMERIC, default 80)
- Keep existing columns (tdee, daily_calories, protein, fat, carbs) as cached computed values
- `strategy` column kept for backward compat but unused in UI

---

## Computation Logic

Given: preset, weight_kg, tdee
1. `calories = round(tdee × preset.tdee_multiplier)`
2. For each macro with a g/kg value: `macro_g = round(g_per_kg × weight_kg)`
3. Remaining calories = `calories - (protein_g × 4) - (carbs_g × 4) - (fat_g × 9)`
4. Auto macro: protein → /4, carbs → /4, fat → /9

---

## UI Changes

### 1. New Targets page (`/targets`)
- Header: "Diet Presets" + "+ Add Preset" button
- Preset cards (glassmorphic) showing: name, TDEE multiplier %, 3 macro cards (g/kg or "auto" + computed grams), delete button
- Add/Edit preset dialog: name, TDEE multiplier, each macro g/kg with auto toggle

### 2. Meal Plan header update
Replace strategy dropdown with:
- Preset dropdown (user's presets + "No Preset")
- Weight input: `[80] kg`
- TDEE input: `[2500] tdee`
- Macro badges show computed targets
- All saved per-week in weekly_targets

### 3. Navigation
- "Targets" nav item → `/targets` (currently points to `/settings`)

### 4. Settings cleanup
- Remove WeeklyTargetsForm from Settings page

---

## Implementation Steps

1. **DB migration**: Create `diet_presets` table + add columns to `weekly_targets`
2. **Types & context**: Add DietPreset type, update WeeklyTargets, add preset CRUD + computation
3. **Targets page**: New route + PresetCard + PresetEditorDialog
4. **Meal plan header**: Preset selector + weight/TDEE inputs
5. **Cleanup**: Remove old strategy UI, update nav URLs
