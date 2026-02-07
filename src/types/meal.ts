export interface Macros {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface BaseIngredient {
  id: string;
  name: string;
  // Per 100g values
  caloriesPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
  fiberPer100g: number;
  sodiumPer100g: number; // in mg
  brand?: string;
  category?: string;
  // Serving size
  servingDescription: string; // e.g., "1 can", "1 egg (60g)", "1 scoop (32g)"
  servingGrams: number; // weight in grams for the serving
}

export interface RecipeIngredient {
  ingredientId: string;
  name: string;
  amount: number; // in grams
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  image?: string;
  servings: number;
  ingredients: RecipeIngredient[];
  totalMacros: Macros;
  category: RecipeCategory;
  instructions?: string;
  link?: string;
}

export type RecipeCategory = 'breakfast' | 'main' | 'shake' | 'snack' | 'side' | 'dessert';

export const RECIPE_CATEGORIES: RecipeCategory[] = ['breakfast', 'main', 'shake', 'snack', 'side', 'dessert'];

export const CATEGORY_LABELS: Record<RecipeCategory, string> = {
  breakfast: 'Breakfast',
  main: 'Main',
  shake: 'Shake',
  snack: 'Snack',
  side: 'Side',
  dessert: 'Dessert',
};

export interface MealIngredient {
  ingredientId: string;
  name: string;
  amount: number;
  unit: string;
}

export interface MealInstance {
  id: string;
  recipeId: string;
  recipeName: string;
  ingredients: MealIngredient[];
  customMacros: Macros;
  servingMultiplier: number;
}

export interface DayPlan {
  m1?: MealInstance;
  m2?: MealInstance;
  m3?: MealInstance;
  m4?: MealInstance;
  m5?: MealInstance;
}

export interface WeeklyPlan {
  monday: DayPlan;
  tuesday: DayPlan;
  wednesday: DayPlan;
  thursday: DayPlan;
  friday: DayPlan;
  saturday: DayPlan;
  sunday: DayPlan;
}

export type DayOfWeek = keyof WeeklyPlan;
export type MealSlot = keyof DayPlan;

export interface WeeklyTargets {
  tdee: number;
  strategy: 'maintain' | 'cut10' | 'cut20' | 'bulk10' | 'bulk20';
  dailyCalories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export const STRATEGY_MULTIPLIERS = {
  maintain: 1.0,
  cut10: 0.9,
  cut20: 0.8,
  bulk10: 1.1,
  bulk20: 1.2,
} as const;

export const MEAL_SLOTS: MealSlot[] = ['m1', 'm2', 'm3', 'm4', 'm5'];
export const DAYS_OF_WEEK: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  m1: 'Breakfast',
  m2: 'Snack 1',
  m3: 'Lunch',
  m4: 'Snack 2',
  m5: 'Dinner',
};

export const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

export const DAY_FULL_LABELS: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export interface ShoppingItem {
  ingredientId: string;
  name: string;
  totalAmount: number;
  unit: string;
  purchased: boolean;
}
