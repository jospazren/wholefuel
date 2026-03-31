// ============================================================
// WholeFuel Data Model
// ============================================================
// Three tiers, each independently editable:
//
//   Ingredients  → building blocks with per-serving nutrition data
//   Recipes      → templates: ingredient × multiplier combinations
//   Meals        → instances derived from a recipe, independently editable
//
// Servings are an INGREDIENT-LEVEL concept only.
// Each ingredient has a serving size (e.g. "100g", "1 tbsp", "1 egg").
// A recipe/meal is defined by ingredients × multiplier of serving size.
// There are no recipe-level or meal-level serving concepts.
// ============================================================

export interface Macros {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface BaseIngredient {
  id: string;
  name: string;
  caloriesPerServing: number;
  proteinPerServing: number;
  fatPerServing: number;
  carbsPerServing: number;
  fiberPerServing: number;
  sodiumPerServing: number;
  brand?: string;
  category?: string;
  servingDescription: string;
  servingGrams: number;
}

export interface RecipeIngredient {
  ingredientId: string;
  name: string;
  servingMultiplier: number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  image?: string;
  ingredients: RecipeIngredient[];
  totalMacros: Macros;
  tags: string[];
  instructions?: string;
  notes?: string;
  link?: string;
}

export interface MealIngredient {
  ingredientId: string;
  name: string;
  servingMultiplier: number;
}

export type MealType = 'planned' | 'estimated';

export interface Meal {
  id: string;
  name: string;
  type: MealType;
  sourceRecipeId: string | null;
  ingredients: MealIngredient[];
  estCalories?: number;
  estProtein?: number;
  estFat?: number;
  estCarbs?: number;
  createdAt?: string;
}

export interface MealSlotAssignment {
  id: string;
  mealId: string;
}

// Alias for component compatibility
export type MealSlotEntry = MealSlotAssignment;

export interface DayPlan {
  m1?: MealSlotAssignment;
  m2?: MealSlotAssignment;
  m3?: MealSlotAssignment;
  m4?: MealSlotAssignment;
  m5?: MealSlotAssignment;
  m6?: MealSlotAssignment;
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

export type MacroMode = 'g_per_kg' | 'pct_of_calories';

export interface DietPreset {
  id: string;
  name: string;
  tdeeMultiplier: number;
  proteinPerKg: number | null;
  carbsPerKg: number | null;
  fatPerKg: number | null;
  macroMode: MacroMode;
  proteinPct: number | null;
  carbsPct: number | null;
  fatPct: number | null;
}

export type PerDayCalories = {
  monday: number | null;
  tuesday: number | null;
  wednesday: number | null;
  thursday: number | null;
  friday: number | null;
  saturday: number | null;
  sunday: number | null;
};

export interface WeeklyTargets {
  tdee: number;
  strategy: 'maintain' | 'cut10' | 'cut20' | 'bulk10' | 'bulk20';
  dailyCalories: number;
  protein: number;
  fat: number;
  carbs: number;
  presetId: string | null;
  weightKg: number;
  perDayCalories: PerDayCalories;
}

/** Get the effective calorie target for a specific day */
export function getEffectiveCalories(targets: WeeklyTargets, day: DayOfWeek): number {
  return targets.perDayCalories[day] ?? targets.dailyCalories;
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

export const MEAL_SLOTS: MealSlot[] = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];
export const DAYS_OF_WEEK: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

export const DAY_FULL_LABELS: Record<DayOfWeek, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday',
  friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
};

export interface ShoppingItem {
  ingredientId: string;
  name: string;
  totalServings: number;
  servingDescription: string;
  purchased: boolean;
}
