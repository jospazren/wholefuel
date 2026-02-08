-- Rename nutrition columns from *_per_100g to *_per_serving
ALTER TABLE public.ingredients RENAME COLUMN calories_per_100g TO calories_per_serving;
ALTER TABLE public.ingredients RENAME COLUMN protein_per_100g TO protein_per_serving;
ALTER TABLE public.ingredients RENAME COLUMN fat_per_100g TO fat_per_serving;
ALTER TABLE public.ingredients RENAME COLUMN carbs_per_100g TO carbs_per_serving;
ALTER TABLE public.ingredients RENAME COLUMN fiber_per_100g TO fiber_per_serving;
ALTER TABLE public.ingredients RENAME COLUMN sodium_per_100g TO sodium_per_serving;