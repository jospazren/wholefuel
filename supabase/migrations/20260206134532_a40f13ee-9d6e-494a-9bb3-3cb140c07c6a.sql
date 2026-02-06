-- Create ingredients table for user-specific ingredients
CREATE TABLE public.ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  calories_per_100g NUMERIC NOT NULL DEFAULT 0,
  protein_per_100g NUMERIC NOT NULL DEFAULT 0,
  fat_per_100g NUMERIC NOT NULL DEFAULT 0,
  carbs_per_100g NUMERIC NOT NULL DEFAULT 0,
  fiber_per_100g NUMERIC NOT NULL DEFAULT 0,
  sodium_per_100g NUMERIC NOT NULL DEFAULT 0,
  brand TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recipes table
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image TEXT,
  servings INTEGER NOT NULL DEFAULT 1,
  category TEXT NOT NULL DEFAULT 'main',
  total_calories NUMERIC NOT NULL DEFAULT 0,
  total_protein NUMERIC NOT NULL DEFAULT 0,
  total_fat NUMERIC NOT NULL DEFAULT 0,
  total_carbs NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recipe_ingredients junction table
CREATE TABLE public.recipe_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'g'
);

-- Create weekly_targets table
CREATE TABLE public.weekly_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  tdee NUMERIC NOT NULL DEFAULT 2000,
  strategy TEXT NOT NULL DEFAULT 'maintain',
  daily_calories NUMERIC NOT NULL DEFAULT 2000,
  protein NUMERIC NOT NULL DEFAULT 150,
  fat NUMERIC NOT NULL DEFAULT 65,
  carbs NUMERIC NOT NULL DEFAULT 200,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meal_plans table (stores meal instances per day/slot)
CREATE TABLE public.meal_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL,
  meal_slot TEXT NOT NULL,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  recipe_name TEXT NOT NULL,
  serving_multiplier NUMERIC NOT NULL DEFAULT 1,
  custom_calories NUMERIC NOT NULL DEFAULT 0,
  custom_protein NUMERIC NOT NULL DEFAULT 0,
  custom_fat NUMERIC NOT NULL DEFAULT 0,
  custom_carbs NUMERIC NOT NULL DEFAULT 0,
  ingredients_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_of_week, meal_slot)
);

-- Enable RLS on all tables
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies for ingredients
CREATE POLICY "Users can view their own ingredients" ON public.ingredients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own ingredients" ON public.ingredients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ingredients" ON public.ingredients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ingredients" ON public.ingredients FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for recipes
CREATE POLICY "Users can view their own recipes" ON public.recipes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own recipes" ON public.recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own recipes" ON public.recipes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own recipes" ON public.recipes FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for recipe_ingredients (access through recipe ownership)
CREATE POLICY "Users can view recipe ingredients" ON public.recipe_ingredients FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create recipe ingredients" ON public.recipe_ingredients FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update recipe ingredients" ON public.recipe_ingredients FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete recipe ingredients" ON public.recipe_ingredients FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND user_id = auth.uid())
);

-- RLS policies for weekly_targets
CREATE POLICY "Users can view their own targets" ON public.weekly_targets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own targets" ON public.weekly_targets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own targets" ON public.weekly_targets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own targets" ON public.weekly_targets FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for meal_plans
CREATE POLICY "Users can view their own meal plans" ON public.meal_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own meal plans" ON public.meal_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own meal plans" ON public.meal_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own meal plans" ON public.meal_plans FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON public.ingredients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_weekly_targets_updated_at BEFORE UPDATE ON public.weekly_targets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON public.meal_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();