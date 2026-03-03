import { useState } from 'react';
import { MealInstance, DayOfWeek, MealSlot, Recipe } from '@/types/meal';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { useRecipes } from '@/contexts/RecipesContext';
import { RecipeEditorDialog, RecipeEditorMode } from '@/components/RecipeEditorDialog';

interface MealEditSheetProps {
  meal: MealInstance | null;
  day: DayOfWeek | null;
  slot: MealSlot | null;
  open: boolean;
  onClose: () => void;
}

export function MealEditSheet({ meal, day, slot, open, onClose }: MealEditSheetProps) {
  const { updateMealInstance, removeMealFromSlot } = useMealPlan();
  const { recipes, calculateMacrosFromIngredients } = useRecipes();

  if (!meal || !day || !slot) return null;

  // Build a pseudo-recipe from the meal instance for the editor
  const linkedRecipe = recipes.find(r => r.id === meal.recipeId);
  const pseudoRecipe: Recipe = {
    id: meal.recipeId,
    name: meal.recipeName,
    description: '',
    servings: 1,
    category: (linkedRecipe?.category as string) || 'main',
    tags: linkedRecipe?.tags || [],
    ingredients: meal.ingredients.map(i => ({
      ingredientId: i.ingredientId,
      name: i.name,
      servingMultiplier: i.servingMultiplier,
    })),
    totalMacros: meal.customMacros,
    instructions: linkedRecipe?.instructions,
    notes: linkedRecipe?.notes,
    link: linkedRecipe?.link,
  };

  const handleDelete = () => {
    removeMealFromSlot(day, slot);
    onClose();
  };

  const mode: RecipeEditorMode = {
    type: 'editMeal',
    recipe: pseudoRecipe,
    onDelete: handleDelete,
  };

  const handleSave = (data: { name: string; ingredients: any[] }) => {
    updateMealInstance(day, slot, {
      recipeName: data.name,
      ingredients: data.ingredients,
    });
    onClose();
  };

  return (
    <RecipeEditorDialog
      mode={mode}
      open={open}
      onClose={onClose}
      onSave={handleSave}
    />
  );
}
