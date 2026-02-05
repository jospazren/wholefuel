export interface Macros {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface Ingredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
  macrosPerUnit: Macros;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  image?: string;
  servings: number;
  ingredients: Ingredient[];
  totalMacros: Macros;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface MealInstance {
  id: string;
  recipeId: string;
  recipeName: string;
  ingredients: Ingredient[];
  customMacros: Macros;
  servingMultiplier: number;
}

export interface DayPlan {
  breakfast?: MealInstance;
  snack1?: MealInstance;
  lunch?: MealInstance;
  snack2?: MealInstance;
  dinner?: MealInstance;
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

export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner'];
export const DAYS_OF_WEEK: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  snack1: 'Snack',
  lunch: 'Lunch',
  snack2: 'Snack',
  dinner: 'Dinner',
};
