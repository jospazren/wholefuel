-- Phase 2: Introduce meals entity, remap slots, clean up schema
-- 
-- This migration:
--   1. Creates meals + meal_ingredients tables with RLS
--   2. Migrates existing meal_plans data into meals
--   3. Remaps slot values from m1/m3/m4/m5/m6/m7 to m1-m6 (sequential)
--   4. Strips meal_plans to a thin scheduling table (user, week, day, slot -> meal_id)
--   5. Cleans up dead/deprecated columns
--
-- The data model after this migration:
--   ingredients  -> building blocks with per-serving nutrition
--   recipes      -> templates (ingredient x multiplier), never modified by calendar usage
--   meals        -> instances derived from a recipe, independently editable
--   meal_plans   -> scheduling: assigns a meal to (week, day, slot)

-- ============================================================
-- 1. Create meals and meal_ingredients tables
-- ============================================================

CREATE TABLE public.meals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.meal_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  serving_multiplier NUMERIC NOT NULL DEFAULT 1
);

-- Enable RLS
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_ingredients ENABLE ROW LEVEL SECURITY;

-- RLS policies for meals (user-scoped, same pattern as other tables)
CREATE POLICY "Users can view their own meals" ON public.meals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own meals" ON public.meals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own meals" ON public.meals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own meals" ON public.meals FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for meal_ingredients (access through meal ownership)
CREATE POLICY "Users can view meal ingredients" ON public.meal_ingredients FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.meals WHERE id = meal_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create meal ingredients" ON public.meal_ingredients FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.meals WHERE id = meal_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update meal ingredients" ON public.meal_ingredients FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.meals WHERE id = meal_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete meal ingredients" ON public.meal_ingredients FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.meals WHERE id = meal_id AND user_id = auth.uid())
);

-- Updated_at trigger for meals
CREATE TRIGGER update_meals_updated_at BEFORE UPDATE ON public.meals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_meals_user_id ON public.meals (user_id);
CREATE INDEX idx_meal_ingredients_meal_id ON public.meal_ingredients (meal_id);

-- ============================================================
-- 2. Add meal_id column to meal_plans (before data migration)
-- ============================================================

ALTER TABLE public.meal_plans ADD COLUMN meal_id UUID REFERENCES public.meals(id) ON DELETE CASCADE;

-- ============================================================
-- 3. Migrate existing meal_plans data into meals
-- ============================================================
-- For each meal_plans row:
--   a. Create a meal in meals table
--   b. Parse ingredients_json and insert into meal_ingredients
--   c. Link meal_plans.meal_id to the new meal

DO $$
DECLARE
  mp RECORD;
  new_meal_id UUID;
  ing RECORD;
BEGIN
  FOR mp IN SELECT * FROM public.meal_plans LOOP
    -- Create the meal
    INSERT INTO public.meals (user_id, source_recipe_id, name)
    VALUES (mp.user_id, mp.recipe_id, mp.recipe_name)
    RETURNING id INTO new_meal_id;

    -- Parse ingredients_json and insert into meal_ingredients
    IF mp.ingredients_json IS NOT NULL AND jsonb_array_length(mp.ingredients_json) > 0 THEN
      FOR ing IN SELECT * FROM jsonb_array_elements(mp.ingredients_json) AS elem LOOP
        -- Only insert if ingredient still exists (referential safety)
        INSERT INTO public.meal_ingredients (meal_id, ingredient_id, name, serving_multiplier)
        SELECT
          new_meal_id,
          (ing.elem->>'ingredientId')::UUID,
          COALESCE(ing.elem->>'name', 'Unknown'),
          COALESCE((ing.elem->>'servingMultiplier')::NUMERIC, 1)
        WHERE EXISTS (
          SELECT 1 FROM public.ingredients WHERE id = (ing.elem->>'ingredientId')::UUID
        );
      END LOOP;
    END IF;

    -- Link meal_plans row to the new meal
    UPDATE public.meal_plans SET meal_id = new_meal_id WHERE id = mp.id;
  END LOOP;
END $$;

-- ============================================================
-- 4. Remap slot values to m1-m6 (sequential)
-- ============================================================
-- Old slots: m1, m3, m4, m5, m6, m7 (frontend skipped m2)
-- MCP also may have written m2 values
-- New slots: m1, m2, m3, m4, m5, m6 (sequential, no labels)
--
-- Strategy: remap to temp values first to avoid unique constraint violations,
-- then apply final values. Handle MCP m2 collisions gracefully.

-- Step 1: Move all non-m1 slots to temp values
UPDATE public.meal_plans SET meal_slot = 'tmp_m6' WHERE meal_slot = 'm7';
UPDATE public.meal_plans SET meal_slot = 'tmp_m5' WHERE meal_slot = 'm6';
UPDATE public.meal_plans SET meal_slot = 'tmp_m4' WHERE meal_slot = 'm5';
UPDATE public.meal_plans SET meal_slot = 'tmp_m3' WHERE meal_slot = 'm4';
UPDATE public.meal_plans SET meal_slot = 'tmp_m2' WHERE meal_slot = 'm3';
-- m1 stays as m1

-- Handle any m2 values from MCP (these were invisible in old frontend)
UPDATE public.meal_plans SET meal_slot = 'tmp_m2_mcp' WHERE meal_slot = 'm2';

-- Step 2: Apply final values
UPDATE public.meal_plans SET meal_slot = 'm2' WHERE meal_slot = 'tmp_m2';
UPDATE public.meal_plans SET meal_slot = 'm3' WHERE meal_slot = 'tmp_m3';
UPDATE public.meal_plans SET meal_slot = 'm4' WHERE meal_slot = 'tmp_m4';
UPDATE public.meal_plans SET meal_slot = 'm5' WHERE meal_slot = 'tmp_m5';
UPDATE public.meal_plans SET meal_slot = 'm6' WHERE meal_slot = 'tmp_m6';

-- Step 3: Handle MCP m2 values
-- If the new m2 slot is already occupied (from old m3->m2), delete the MCP orphan
DELETE FROM public.meal_plans WHERE meal_slot = 'tmp_m2_mcp'
  AND EXISTS (
    SELECT 1 FROM public.meal_plans mp2
    WHERE mp2.user_id = meal_plans.user_id
    AND mp2.week_start_date = meal_plans.week_start_date
    AND mp2.day_of_week = meal_plans.day_of_week
    AND mp2.meal_slot = 'm2'
  );
-- If no collision, remap the MCP m2 to m2
UPDATE public.meal_plans SET meal_slot = 'm2' WHERE meal_slot = 'tmp_m2_mcp';

-- ============================================================
-- 5. Strip meal_plans to scheduling-only table
-- ============================================================

ALTER TABLE public.meal_plans DROP COLUMN recipe_id;
ALTER TABLE public.meal_plans DROP COLUMN recipe_name;
ALTER TABLE public.meal_plans DROP COLUMN serving_multiplier;
ALTER TABLE public.meal_plans DROP COLUMN custom_calories;
ALTER TABLE public.meal_plans DROP COLUMN custom_protein;
ALTER TABLE public.meal_plans DROP COLUMN custom_fat;
ALTER TABLE public.meal_plans DROP COLUMN custom_carbs;
ALTER TABLE public.meal_plans DROP COLUMN ingredients_json;

-- Make meal_id NOT NULL now that all rows have been migrated
ALTER TABLE public.meal_plans ALTER COLUMN meal_id SET NOT NULL;

-- Add composite index for the most common query pattern
CREATE INDEX idx_meal_plans_user_week ON public.meal_plans (user_id, week_start_date);

-- ============================================================
-- 6. Schema cleanup
-- ============================================================

-- Drop dead unit column from recipe_ingredients (never read/written, always 'g')
ALTER TABLE public.recipe_ingredients DROP COLUMN IF EXISTS unit;

-- Make recipes.category nullable (deprecated in favor of recipe_tags)
ALTER TABLE public.recipes ALTER COLUMN category DROP NOT NULL;
ALTER TABLE public.recipes ALTER COLUMN category DROP DEFAULT;
