ALTER TABLE public.meals
  ADD COLUMN type text NOT NULL DEFAULT 'planned',
  ADD COLUMN est_calories numeric DEFAULT NULL,
  ADD COLUMN est_protein numeric DEFAULT NULL,
  ADD COLUMN est_fat numeric DEFAULT NULL,
  ADD COLUMN est_carbs numeric DEFAULT NULL;