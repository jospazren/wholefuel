export interface Macros {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface BaseIngredient {
  id: string;
  name: string;
  // Per serving values
  caloriesPerServing: number;
  proteinPerServing: number;
  fatPerServing: number;
  carbsPerServing: number;
  fiberPerServing: number;
  sodiumPerServing: number; // in mg
  brand?: string;
  category?: string;
  // Serving size
  servingDescription: string; // e.g., "1 can", "1 egg (60g)", "1 scoop (32g)"
  servingGrams: number; // weight in grams for the serving
}

export interface RecipeIngredient {
  ingredientId: string;
  name: string;
  servingMultiplier: number; // multiplier for ingredient's serving size (e.g., 1.0 = one serving, 0.5 = half serving)
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  image?: string;
  servings: number;
  ingredients: RecipeIngredient[];
  totalMacros: Macros;
  /** @deprecated Use tags instead */
  category: string;
  tags: string[];
  instructions?: string;
  notes?: string;
  link?: string;
}

/** @deprecated Use tags system instead */
export type RecipeCategory = string;

/** @deprecated Use tags system instead */
export const RECIPE_CATEGORIES: string[] = ['breakfast', 'main', 'shake', 'snack', 'side', 'dessert'];

/** @deprecated Use tags system instead */
export const CATEGORY_LABELS: Record<string, string> = {
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
  servingMultiplier: number;
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
  m3?: MealInstance;
  m4?: MealInstance;
  m5?: MealInstance;
  m6?: MealInstance;
  m7?: MealInstance;
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

export interface DietPreset {
  id: string;
  name: string;
  tdeeMultiplier: number; // e.g. 1.0 = 100%, 0.85 = 85%
  proteinPerKg: number | null; // g/kg, null = "auto"
  carbsPerKg: number | null;
  fatPerKg: number | null;
}

export interface WeeklyTargets {
  tdee: number;
  strategy: 'maintain' | 'cut10' | 'cut20' | 'bulk10' | 'bulk20';
  dailyCalories: number;
  protein: number;
  fat: number;
  carbs: number;
  presetId: string | null;
  weightKg: number;
}

export const STRATEGY_MULTIPLIERS = {
  maintain: 1.0,
  cut10: 0.9,
  cut20: 0.8,
  bulk10: 1.1,
  bulk20: 1.2,
} as const;

export function computeTargetsFromPreset(
  preset: DietPreset,
  weightKg: number,
  tdee: number
): { dailyCalories: number; protein: number; carbs: number; fat: number } {
  const dailyCalories = Math.round(tdee * preset.tdeeMultiplier);

  const proteinG = preset.proteinPerKg != null ? Math.round(preset.proteinPerKg * weightKg) : null;
  const carbsG = preset.carbsPerKg != null ? Math.round(preset.carbsPerKg * weightKg) : null;
  const fatG = preset.fatPerKg != null ? Math.round(preset.fatPerKg * weightKg) : null;

  // Calculate the auto macro from remaining calories
  const usedCalories =
    (proteinG != null ? proteinG * 4 : 0) +
    (carbsG != null ? carbsG * 4 : 0) +
    (fatG != null ? fatG * 9 : 0);
  const remainingCalories = Math.max(0, dailyCalories - usedCalories);

  return {
    dailyCalories,
    protein: proteinG ?? Math.round(remainingCalories / 4),
    carbs: carbsG ?? Math.round(remainingCalories / 4),
    fat: fatG ?? Math.round(remainingCalories / 9),
  };
}

export const MEAL_SLOTS: MealSlot[] = ['m1', 'm3', 'm4', 'm5', 'm6', 'm7'];
export const DAYS_OF_WEEK: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  m1: 'Breakfast',
  m3: 'Lunch',
  m4: 'Snack',
  m5: 'Dinner',
  m6: 'Extra 1',
  m7: 'Extra 2',
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
  totalServings: number;
  servingDescription: string;
  purchased: boolean;
}
