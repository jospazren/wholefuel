-- Drop the old unique constraint that doesn't include week_start_date
ALTER TABLE public.meal_plans DROP CONSTRAINT IF EXISTS meal_plans_user_id_day_of_week_meal_slot_key;

-- Create new unique constraint including week_start_date
ALTER TABLE public.meal_plans 
ADD CONSTRAINT meal_plans_user_week_day_slot_unique 
UNIQUE (user_id, week_start_date, day_of_week, meal_slot);