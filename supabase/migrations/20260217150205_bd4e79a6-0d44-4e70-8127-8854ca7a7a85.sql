
-- Create diet_presets table
CREATE TABLE public.diet_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  tdee_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  protein_per_kg NUMERIC,
  carbs_per_kg NUMERIC,
  fat_per_kg NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diet_presets ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own presets" ON public.diet_presets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own presets" ON public.diet_presets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own presets" ON public.diet_presets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own presets" ON public.diet_presets FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_diet_presets_updated_at
  BEFORE UPDATE ON public.diet_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add columns to weekly_targets
ALTER TABLE public.weekly_targets ADD COLUMN preset_id UUID REFERENCES public.diet_presets(id) ON DELETE SET NULL;
ALTER TABLE public.weekly_targets ADD COLUMN weight_kg NUMERIC NOT NULL DEFAULT 80;
