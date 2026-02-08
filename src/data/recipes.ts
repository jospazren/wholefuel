import { Recipe, RecipeIngredient, Macros, BaseIngredient } from '@/types/meal';
import { baseIngredients } from './ingredients';

// Helper to calculate macros from ingredients
export function calculateRecipeMacros(ingredients: RecipeIngredient[], ingredientDb: BaseIngredient[]): Macros {
  return ingredients.reduce((totals, ing) => {
    const baseIng = ingredientDb.find(i => i.id === ing.ingredientId);
    if (baseIng) {
      // servingMultiplier is the multiplier directly (e.g., 1.0 = one serving, 0.5 = half)
      totals.calories += Math.round(baseIng.caloriesPerServing * ing.servingMultiplier);
      totals.protein += Math.round(baseIng.proteinPerServing * ing.servingMultiplier);
      totals.fat += Math.round(baseIng.fatPerServing * ing.servingMultiplier);
      totals.carbs += Math.round(baseIng.carbsPerServing * ing.servingMultiplier);
    }
    return totals;
  }, { calories: 0, protein: 0, fat: 0, carbs: 0 });
}

export const sampleRecipes: Recipe[] = [];
