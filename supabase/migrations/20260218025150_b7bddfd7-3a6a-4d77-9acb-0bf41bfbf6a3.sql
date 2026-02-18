
-- Create recipe_tags table
CREATE TABLE public.recipe_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  user_id UUID NOT NULL,
  UNIQUE(recipe_id, tag_name)
);

-- Enable RLS
ALTER TABLE public.recipe_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies (check recipe ownership)
CREATE POLICY "Users can view recipe tags"
ON public.recipe_tags FOR SELECT
USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_tags.recipe_id AND recipes.user_id = auth.uid()));

CREATE POLICY "Users can create recipe tags"
ON public.recipe_tags FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_tags.recipe_id AND recipes.user_id = auth.uid()));

CREATE POLICY "Users can update recipe tags"
ON public.recipe_tags FOR UPDATE
USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_tags.recipe_id AND recipes.user_id = auth.uid()));

CREATE POLICY "Users can delete recipe tags"
ON public.recipe_tags FOR DELETE
USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_tags.recipe_id AND recipes.user_id = auth.uid()));

-- Migrate existing categories to tags
INSERT INTO public.recipe_tags (recipe_id, tag_name, user_id)
SELECT id, category, user_id FROM public.recipes
WHERE category IS NOT NULL AND category != ''
ON CONFLICT DO NOTHING;
