-- Rename the amount column to serving_multiplier
ALTER TABLE recipe_ingredients RENAME COLUMN amount TO serving_multiplier;

-- Convert existing gram values to multipliers by dividing by ingredient's serving_grams
UPDATE recipe_ingredients ri
SET serving_multiplier = ri.serving_multiplier / COALESCE(
  (SELECT i.serving_grams FROM ingredients i WHERE i.id = ri.ingredient_id),
  100
);