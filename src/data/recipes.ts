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

export const sampleRecipes: Recipe[] = [
  {
    id: 'greek-yogurt-parfait',
    name: 'Greek Yogurt Parfait',
    description: 'Creamy yogurt with berries and granola',
    servings: 1,
    category: 'breakfast',
    ingredients: [
      { ingredientId: 'greek-yogurt', name: 'Greek Yogurt', amount: 200, unit: 'g' },
      { ingredientId: 'mixed-berries', name: 'Mixed Berries', amount: 100, unit: 'g' },
      { ingredientId: 'granola', name: 'Granola', amount: 40, unit: 'g' },
    ],
    totalMacros: { calories: 363, protein: 28, fat: 10, carbs: 46 },
  },
  {
    id: 'avocado-toast',
    name: 'Avocado Toast with Eggs',
    description: 'Whole grain toast with smashed avocado and eggs',
    servings: 1,
    category: 'breakfast',
    ingredients: [
      { ingredientId: 'whole-wheat-bread', name: 'Whole Wheat Bread', amount: 60, unit: 'g' },
      { ingredientId: 'avocado', name: 'Avocado', amount: 100, unit: 'g' },
      { ingredientId: 'eggs', name: 'Eggs', amount: 100, unit: 'g' },
    ],
    totalMacros: { calories: 463, protein: 21, fat: 27, carbs: 39 },
  },
  {
    id: 'overnight-oats',
    name: 'Overnight Oats',
    description: 'Creamy oats with honey and chia seeds',
    servings: 1,
    category: 'breakfast',
    ingredients: [
      { ingredientId: 'rolled-oats', name: 'Rolled Oats', amount: 80, unit: 'g' },
      { ingredientId: 'whole-milk', name: 'Whole Milk', amount: 200, unit: 'ml' },
      { ingredientId: 'honey', name: 'Honey', amount: 20, unit: 'g' },
      { ingredientId: 'chia-seeds', name: 'Chia Seeds', amount: 15, unit: 'g' },
    ],
    totalMacros: { calories: 580, protein: 22, fat: 16, carbs: 84 },
  },
  {
    id: 'grilled-chicken-salad',
    name: 'Grilled Chicken Salad',
    description: 'Fresh greens with grilled chicken breast',
    servings: 1,
    category: 'main',
    ingredients: [
      { ingredientId: 'chicken-breast', name: 'Chicken Breast', amount: 150, unit: 'g' },
      { ingredientId: 'mixed-greens', name: 'Mixed Greens', amount: 100, unit: 'g' },
      { ingredientId: 'olive-oil', name: 'Olive Oil', amount: 15, unit: 'ml' },
      { ingredientId: 'tomatoes', name: 'Cherry Tomatoes', amount: 100, unit: 'g' },
    ],
    totalMacros: { calories: 418, protein: 50, fat: 21, carbs: 7 },
  },
  {
    id: 'salmon-rice-bowl',
    name: 'Salmon Rice Bowl',
    description: 'Baked salmon with brown rice and vegetables',
    servings: 1,
    category: 'main',
    ingredients: [
      { ingredientId: 'salmon', name: 'Salmon Fillet', amount: 150, unit: 'g' },
      { ingredientId: 'brown-rice', name: 'Brown Rice (cooked)', amount: 150, unit: 'g' },
      { ingredientId: 'broccoli', name: 'Broccoli', amount: 100, unit: 'g' },
    ],
    totalMacros: { calories: 514, protein: 36, fat: 22, carbs: 42 },
  },
  {
    id: 'beef-stir-fry',
    name: 'Beef Stir Fry',
    description: 'Lean beef with mixed vegetables and rice',
    servings: 1,
    category: 'main',
    ingredients: [
      { ingredientId: 'beef-lean', name: 'Lean Beef', amount: 150, unit: 'g' },
      { ingredientId: 'bell-peppers', name: 'Bell Peppers', amount: 100, unit: 'g' },
      { ingredientId: 'white-rice', name: 'White Rice (cooked)', amount: 150, unit: 'g' },
    ],
    totalMacros: { calories: 601, protein: 43, fat: 24, carbs: 52 },
  },
  {
    id: 'pasta-tuna',
    name: 'Pasta with Tuna',
    description: 'Quick protein-packed pasta dish',
    servings: 1,
    category: 'main',
    ingredients: [
      { ingredientId: 'pasta', name: 'Pasta (cooked)', amount: 200, unit: 'g' },
      { ingredientId: 'tuna-canned', name: 'Tuna (canned)', amount: 150, unit: 'g' },
      { ingredientId: 'olive-oil', name: 'Olive Oil', amount: 10, unit: 'ml' },
      { ingredientId: 'tomato-sauce', name: 'Tomato Sauce', amount: 50, unit: 'g' },
    ],
    totalMacros: { calories: 540, protein: 51, fat: 12, carbs: 54 },
  },
  {
    id: 'turkey-wrap',
    name: 'Turkey Wrap',
    description: 'Lean turkey with veggies in a whole wheat wrap',
    servings: 1,
    category: 'main',
    ingredients: [
      { ingredientId: 'turkey-breast', name: 'Turkey Breast', amount: 100, unit: 'g' },
      { ingredientId: 'tortilla-wrap', name: 'Whole Wheat Tortilla', amount: 50, unit: 'g' },
      { ingredientId: 'hummus', name: 'Hummus', amount: 30, unit: 'g' },
      { ingredientId: 'lettuce', name: 'Lettuce', amount: 50, unit: 'g' },
    ],
    totalMacros: { calories: 397, protein: 40, fat: 11, carbs: 35 },
  },
  {
    id: 'protein-shake',
    name: 'Protein Shake',
    description: 'Whey protein with banana and almond milk',
    servings: 1,
    category: 'shake',
    ingredients: [
      { ingredientId: 'whey-protein', name: 'Whey Protein', amount: 30, unit: 'g' },
      { ingredientId: 'banana', name: 'Banana', amount: 100, unit: 'g' },
      { ingredientId: 'almond-milk', name: 'Almond Milk', amount: 250, unit: 'ml' },
    ],
    totalMacros: { calories: 242, protein: 26, fat: 4, carbs: 27 },
  },
  {
    id: 'peanut-butter-shake',
    name: 'PB Banana Shake',
    description: 'Rich and creamy post-workout shake',
    servings: 1,
    category: 'shake',
    ingredients: [
      { ingredientId: 'whey-protein', name: 'Whey Protein', amount: 30, unit: 'g' },
      { ingredientId: 'banana', name: 'Banana', amount: 100, unit: 'g' },
      { ingredientId: 'peanut-butter', name: 'Peanut Butter', amount: 20, unit: 'g' },
      { ingredientId: 'whole-milk', name: 'Whole Milk', amount: 200, unit: 'ml' },
    ],
    totalMacros: { calories: 451, protein: 35, fat: 18, carbs: 41 },
  },
  {
    id: 'mixed-nuts',
    name: 'Mixed Nuts',
    description: 'A handful of almonds, walnuts, and cashews',
    servings: 1,
    category: 'snack',
    ingredients: [
      { ingredientId: 'almonds', name: 'Almonds', amount: 20, unit: 'g' },
      { ingredientId: 'walnuts', name: 'Walnuts', amount: 15, unit: 'g' },
      { ingredientId: 'cashews', name: 'Cashews', amount: 15, unit: 'g' },
    ],
    totalMacros: { calories: 296, protein: 10, fat: 27, carbs: 13 },
  },
  {
    id: 'cottage-cheese-bowl',
    name: 'Cottage Cheese Bowl',
    description: 'Low-fat cottage cheese with pineapple',
    servings: 1,
    category: 'snack',
    ingredients: [
      { ingredientId: 'cottage-cheese', name: 'Cottage Cheese', amount: 200, unit: 'g' },
      { ingredientId: 'pineapple', name: 'Pineapple', amount: 80, unit: 'g' },
    ],
    totalMacros: { calories: 184, protein: 23, fat: 3, carbs: 17 },
  },
  {
    id: 'apple-peanut-butter',
    name: 'Apple with PB',
    description: 'Sliced apple with peanut butter',
    servings: 1,
    category: 'snack',
    ingredients: [
      { ingredientId: 'apple', name: 'Apple', amount: 150, unit: 'g' },
      { ingredientId: 'peanut-butter', name: 'Peanut Butter', amount: 20, unit: 'g' },
    ],
    totalMacros: { calories: 196, protein: 5, fat: 10, carbs: 24 },
  },
  {
    id: 'steamed-broccoli',
    name: 'Steamed Broccoli',
    description: 'Simple side of steamed broccoli with olive oil',
    servings: 1,
    category: 'side',
    ingredients: [
      { ingredientId: 'broccoli', name: 'Broccoli', amount: 150, unit: 'g' },
      { ingredientId: 'olive-oil', name: 'Olive Oil', amount: 5, unit: 'ml' },
    ],
    totalMacros: { calories: 95, protein: 4, fat: 5, carbs: 11 },
  },
  {
    id: 'quinoa-salad',
    name: 'Quinoa Side Salad',
    description: 'Light quinoa salad with vegetables',
    servings: 1,
    category: 'side',
    ingredients: [
      { ingredientId: 'quinoa', name: 'Quinoa (cooked)', amount: 100, unit: 'g' },
      { ingredientId: 'tomatoes', name: 'Tomatoes', amount: 50, unit: 'g' },
      { ingredientId: 'olive-oil', name: 'Olive Oil', amount: 10, unit: 'ml' },
    ],
    totalMacros: { calories: 226, protein: 6, fat: 12, carbs: 25 },
  },
];
