-- Add serving size fields to ingredients table
ALTER TABLE public.ingredients
ADD COLUMN serving_description text DEFAULT '100g',
ADD COLUMN serving_grams numeric NOT NULL DEFAULT 100;

-- Add comment for clarity
COMMENT ON COLUMN public.ingredients.serving_description IS 'Human-readable serving description (e.g., "1 can", "1 egg", "1 scoop (32g)")';
COMMENT ON COLUMN public.ingredients.serving_grams IS 'Weight in grams for the standard serving size';