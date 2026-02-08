-- Add week_start_date to meal_plans (date of the Monday of that week)
ALTER TABLE public.meal_plans 
ADD COLUMN week_start_date date NOT NULL DEFAULT (date_trunc('week', CURRENT_DATE)::date);

-- Add week_start_date to weekly_targets to make targets per-week
ALTER TABLE public.weekly_targets 
ADD COLUMN week_start_date date;

-- Update existing meal_plans to use the current week's Monday
UPDATE public.meal_plans 
SET week_start_date = date_trunc('week', CURRENT_DATE)::date;

-- Update existing weekly_targets to use the current week's Monday
UPDATE public.weekly_targets 
SET week_start_date = date_trunc('week', CURRENT_DATE)::date;

-- Make week_start_date NOT NULL after setting defaults
ALTER TABLE public.weekly_targets 
ALTER COLUMN week_start_date SET NOT NULL,
ALTER COLUMN week_start_date SET DEFAULT (date_trunc('week', CURRENT_DATE)::date);

-- Create unique constraint so each user has one target row per week
ALTER TABLE public.weekly_targets 
ADD CONSTRAINT weekly_targets_user_week_unique UNIQUE (user_id, week_start_date);

-- Create index for faster lookups
CREATE INDEX idx_meal_plans_user_week ON public.meal_plans (user_id, week_start_date);
CREATE INDEX idx_weekly_targets_user_week ON public.weekly_targets (user_id, week_start_date);