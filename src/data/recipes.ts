import { Recipe, RecipeIngredient, Macros, BaseIngredient } from '@/types/meal';
import { baseIngredients } from './ingredients';

// Helper to calculate macros from ingredients
export function calculateRecipeMacros(ingredients: RecipeIngredient[], ingredientDb: BaseIngredient[]): Macros {
  return ingredients.reduce((totals, ing) => {
    const baseIng = ingredientDb.find(i => i.id === ing.ingredientId);
    if (baseIng) {
      const multiplier = ing.amount / baseIng.servingGrams;
      totals.calories += Math.round(baseIng.caloriesPerServing * multiplier);
      totals.protein += Math.round(baseIng.proteinPerServing * multiplier);
      totals.fat += Math.round(baseIng.fatPerServing * multiplier);
      totals.carbs += Math.round(baseIng.carbsPerServing * multiplier);
    }
    return totals;
  }, { calories: 0, protein: 0, fat: 0, carbs: 0 });
}

export const sampleRecipes: Recipe[] = [];
