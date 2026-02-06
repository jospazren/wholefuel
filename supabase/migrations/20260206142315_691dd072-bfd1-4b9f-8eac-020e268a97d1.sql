-- Add instructions and link columns to recipes table
ALTER TABLE public.recipes 
ADD COLUMN instructions TEXT,
ADD COLUMN link TEXT;