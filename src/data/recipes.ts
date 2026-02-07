import { Recipe, RecipeIngredient, Macros, BaseIngredient } from '@/types/meal';
import { baseIngredients } from './ingredients';

// Helper to calculate macros from ingredients
export function calculateRecipeMacros(ingredients: RecipeIngredient[], ingredientDb: BaseIngredient[]): Macros {
  return ingredients.reduce((totals, ing) => {
    const baseIng = ingredientDb.find(i => i.id === ing.ingredientId);
    if (baseIng) {
      const multiplier = ing.amount / 100;
      totals.calories += Math.round(baseIng.caloriesPer100g * multiplier);
      totals.protein += Math.round(baseIng.proteinPer100g * multiplier);
      totals.fat += Math.round(baseIng.fatPer100g * multiplier);
      totals.carbs += Math.round(baseIng.carbsPer100g * multiplier);
    }
    return totals;
  }, { calories: 0, protein: 0, fat: 0, carbs: 0 });
}

export const sampleRecipes: Recipe[] = [];
