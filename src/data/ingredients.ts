import { BaseIngredient } from '@/types/meal';

export const baseIngredients: BaseIngredient[] = [
  // Proteins
  { id: 'chicken-breast', name: 'Chicken Breast', caloriesPer100g: 165, proteinPer100g: 31, fatPer100g: 3.6, carbsPer100g: 0, category: 'protein' },
  { id: 'salmon', name: 'Salmon Fillet', caloriesPer100g: 208, proteinPer100g: 20, fatPer100g: 13, carbsPer100g: 0, category: 'protein' },
  { id: 'beef-lean', name: 'Lean Beef', caloriesPer100g: 250, proteinPer100g: 26, fatPer100g: 15, carbsPer100g: 0, category: 'protein' },
  { id: 'turkey-breast', name: 'Turkey Breast', caloriesPer100g: 135, proteinPer100g: 30, fatPer100g: 1, carbsPer100g: 0, category: 'protein' },
  { id: 'eggs', name: 'Eggs (whole)', caloriesPer100g: 155, proteinPer100g: 13, fatPer100g: 11, carbsPer100g: 1.1, category: 'protein' },
  { id: 'tuna-canned', name: 'Tuna (canned)', caloriesPer100g: 116, proteinPer100g: 26, fatPer100g: 1, carbsPer100g: 0, category: 'protein' },
  { id: 'whey-protein', name: 'Whey Protein', caloriesPer100g: 400, proteinPer100g: 80, fatPer100g: 3.3, carbsPer100g: 10, category: 'protein', brand: 'Generic' },
  
  // Dairy
  { id: 'greek-yogurt', name: 'Greek Yogurt', caloriesPer100g: 59, proteinPer100g: 10, fatPer100g: 0.5, carbsPer100g: 3.6, category: 'dairy' },
  { id: 'cottage-cheese', name: 'Cottage Cheese (low-fat)', caloriesPer100g: 72, proteinPer100g: 11, fatPer100g: 1, carbsPer100g: 3, category: 'dairy' },
  { id: 'whole-milk', name: 'Whole Milk', caloriesPer100g: 61, proteinPer100g: 3.2, fatPer100g: 3.3, carbsPer100g: 4.8, category: 'dairy' },
  { id: 'almond-milk', name: 'Almond Milk (unsweetened)', caloriesPer100g: 13, proteinPer100g: 0.4, fatPer100g: 1, carbsPer100g: 0.5, category: 'dairy' },
  
  // Carbs
  { id: 'white-rice', name: 'White Rice (cooked)', caloriesPer100g: 130, proteinPer100g: 2.7, fatPer100g: 0.3, carbsPer100g: 28, category: 'carbs' },
  { id: 'brown-rice', name: 'Brown Rice (cooked)', caloriesPer100g: 112, proteinPer100g: 2.5, fatPer100g: 0.9, carbsPer100g: 23, category: 'carbs' },
  { id: 'pasta', name: 'Pasta (cooked)', caloriesPer100g: 131, proteinPer100g: 5, fatPer100g: 1.1, carbsPer100g: 25, category: 'carbs' },
  { id: 'rolled-oats', name: 'Rolled Oats', caloriesPer100g: 389, proteinPer100g: 17, fatPer100g: 7, carbsPer100g: 66, category: 'carbs' },
  { id: 'whole-wheat-bread', name: 'Whole Wheat Bread', caloriesPer100g: 247, proteinPer100g: 13, fatPer100g: 3, carbsPer100g: 41, category: 'carbs' },
  { id: 'sweet-potato', name: 'Sweet Potato (cooked)', caloriesPer100g: 86, proteinPer100g: 1.6, fatPer100g: 0.1, carbsPer100g: 20, category: 'carbs' },
  { id: 'quinoa', name: 'Quinoa (cooked)', caloriesPer100g: 120, proteinPer100g: 4.4, fatPer100g: 1.9, carbsPer100g: 21, category: 'carbs' },
  { id: 'granola', name: 'Granola', caloriesPer100g: 471, proteinPer100g: 10, fatPer100g: 20, carbsPer100g: 64, category: 'carbs' },
  
  // Fats
  { id: 'olive-oil', name: 'Olive Oil', caloriesPer100g: 884, proteinPer100g: 0, fatPer100g: 100, carbsPer100g: 0, category: 'fats' },
  { id: 'avocado', name: 'Avocado', caloriesPer100g: 160, proteinPer100g: 2, fatPer100g: 15, carbsPer100g: 9, category: 'fats' },
  { id: 'almonds', name: 'Almonds', caloriesPer100g: 579, proteinPer100g: 21, fatPer100g: 50, carbsPer100g: 22, category: 'fats' },
  { id: 'walnuts', name: 'Walnuts', caloriesPer100g: 654, proteinPer100g: 15, fatPer100g: 65, carbsPer100g: 14, category: 'fats' },
  { id: 'cashews', name: 'Cashews', caloriesPer100g: 553, proteinPer100g: 18, fatPer100g: 44, carbsPer100g: 30, category: 'fats' },
  { id: 'peanut-butter', name: 'Peanut Butter', caloriesPer100g: 588, proteinPer100g: 25, fatPer100g: 50, carbsPer100g: 20, category: 'fats' },
  { id: 'chia-seeds', name: 'Chia Seeds', caloriesPer100g: 486, proteinPer100g: 17, fatPer100g: 31, carbsPer100g: 42, category: 'fats' },
  
  // Vegetables
  { id: 'broccoli', name: 'Broccoli', caloriesPer100g: 34, proteinPer100g: 2.8, fatPer100g: 0.4, carbsPer100g: 7, category: 'vegetables' },
  { id: 'spinach', name: 'Spinach', caloriesPer100g: 23, proteinPer100g: 2.9, fatPer100g: 0.4, carbsPer100g: 3.6, category: 'vegetables' },
  { id: 'mixed-greens', name: 'Mixed Greens', caloriesPer100g: 20, proteinPer100g: 2, fatPer100g: 0.3, carbsPer100g: 3, category: 'vegetables' },
  { id: 'bell-peppers', name: 'Bell Peppers', caloriesPer100g: 31, proteinPer100g: 1, fatPer100g: 0.3, carbsPer100g: 6, category: 'vegetables' },
  { id: 'tomatoes', name: 'Tomatoes', caloriesPer100g: 18, proteinPer100g: 0.9, fatPer100g: 0.2, carbsPer100g: 3.9, category: 'vegetables' },
  { id: 'lettuce', name: 'Lettuce', caloriesPer100g: 15, proteinPer100g: 1, fatPer100g: 0.2, carbsPer100g: 3, category: 'vegetables' },
  
  // Fruits
  { id: 'banana', name: 'Banana', caloriesPer100g: 89, proteinPer100g: 1.1, fatPer100g: 0.3, carbsPer100g: 23, category: 'fruits' },
  { id: 'mixed-berries', name: 'Mixed Berries', caloriesPer100g: 57, proteinPer100g: 0.7, fatPer100g: 0.3, carbsPer100g: 14, category: 'fruits' },
  { id: 'apple', name: 'Apple', caloriesPer100g: 52, proteinPer100g: 0.3, fatPer100g: 0.2, carbsPer100g: 14, category: 'fruits' },
  { id: 'pineapple', name: 'Pineapple', caloriesPer100g: 50, proteinPer100g: 0.5, fatPer100g: 0.1, carbsPer100g: 13, category: 'fruits' },
  
  // Other
  { id: 'honey', name: 'Honey', caloriesPer100g: 304, proteinPer100g: 0.3, fatPer100g: 0, carbsPer100g: 82, category: 'other' },
  { id: 'hummus', name: 'Hummus', caloriesPer100g: 166, proteinPer100g: 8, fatPer100g: 10, carbsPer100g: 14, category: 'other' },
  { id: 'tomato-sauce', name: 'Tomato Sauce', caloriesPer100g: 29, proteinPer100g: 1.3, fatPer100g: 0.2, carbsPer100g: 6, category: 'other' },
  { id: 'tortilla-wrap', name: 'Whole Wheat Tortilla', caloriesPer100g: 310, proteinPer100g: 9, fatPer100g: 8, carbsPer100g: 50, category: 'other' },
];
