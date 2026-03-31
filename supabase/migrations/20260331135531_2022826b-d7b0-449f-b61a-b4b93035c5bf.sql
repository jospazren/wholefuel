
-- Part A: Add per-day calorie override columns to weekly_targets
ALTER TABLE public.weekly_targets
  ADD COLUMN calories_monday NUMERIC DEFAULT NULL,
  ADD COLUMN calories_tuesday NUMERIC DEFAULT NULL,
  ADD COLUMN calories_wednesday NUMERIC DEFAULT NULL,
  ADD COLUMN calories_thursday NUMERIC DEFAULT NULL,
  ADD COLUMN calories_friday NUMERIC DEFAULT NULL,
  ADD COLUMN calories_saturday NUMERIC DEFAULT NULL,
  ADD COLUMN calories_sunday NUMERIC DEFAULT NULL;

-- Part B: Add percentage-based macro columns to diet_presets
ALTER TABLE public.diet_presets
  ADD COLUMN macro_mode TEXT NOT NULL DEFAULT 'g_per_kg',
  ADD COLUMN protein_pct NUMERIC DEFAULT NULL,
  ADD COLUMN carbs_pct NUMERIC DEFAULT NULL,
  ADD COLUMN fat_pct NUMERIC DEFAULT NULL;
