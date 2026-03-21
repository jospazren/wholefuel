import {
  WeeklyPlan,
  WeeklyTargets,
  DayOfWeek,
  MealSlot,
  Meal,
  Macros,
  DAYS_OF_WEEK,
  MEAL_SLOTS,
  DAY_FULL_LABELS,
  BaseIngredient,
} from '@/types/meal';

const SLOT_LABELS: Record<MealSlot, string> = {
  m1: 'Breakfast',
  m2: 'Lunch',
  m3: 'Snack',
  m4: 'Dinner',
  m5: 'Extra 1',
  m6: 'Extra 2',
};

interface ExportOptions {
  weekStart: string;
  weeklyPlan: WeeklyPlan;
  weeklyTargets: WeeklyTargets;
  getMeal: (id: string) => Meal | undefined;
  getMealMacros: (meal: Meal) => Macros;
  ingredients: BaseIngredient[];
  presetName?: string;
}

export interface ExportSummary {
  totalMealsPlanned: number;
  totalMealsEstimated: number;
  daysWithData: number;
  daysEmpty: number;
}

export function getExportSummary(opts: ExportOptions): ExportSummary {
  let totalMealsPlanned = 0;
  let totalMealsEstimated = 0;
  const daysWithMeals = new Set<string>();

  DAYS_OF_WEEK.forEach(day => {
    MEAL_SLOTS.forEach(slot => {
      const assignment = opts.weeklyPlan[day][slot];
      if (assignment) {
        const meal = opts.getMeal(assignment.mealId);
        if (meal) {
          daysWithMeals.add(day);
          if (meal.type === 'estimated') totalMealsEstimated++;
          else totalMealsPlanned++;
        }
      }
    });
  });

  return {
    totalMealsPlanned,
    totalMealsEstimated,
    daysWithData: daysWithMeals.size,
    daysEmpty: 7 - daysWithMeals.size,
  };
}

export function buildExportJson(opts: ExportOptions): object {
  const { weekStart, weeklyPlan, weeklyTargets, getMeal, getMealMacros, ingredients, presetName } = opts;

  const ingredientMap = new Map<string, BaseIngredient>();
  ingredients.forEach(i => ingredientMap.set(i.id, i));

  const days: Record<string, unknown> = {};
  let totalMealsPlanned = 0;
  let totalMealsEstimated = 0;
  const weeklyMacroSums = { calories: 0, protein: 0, fat: 0, carbs: 0 };
  let daysWithData = 0;

  // Ingredient aggregation across the week
  const ingredientTotals = new Map<string, { name: string; serving: string; totalMultiplier: number }>();

  DAYS_OF_WEEK.forEach(day => {
    const meals: unknown[] = [];
    const dayTotals: Macros = { calories: 0, protein: 0, fat: 0, carbs: 0 };
    let dayHasData = false;

    MEAL_SLOTS.forEach(slot => {
      const assignment = weeklyPlan[day][slot];
      if (assignment) {
        const meal = getMeal(assignment.mealId);
        if (meal) {
          dayHasData = true;
          const macros = getMealMacros(meal);
          if (meal.type === 'estimated') totalMealsEstimated++;
          else totalMealsPlanned++;

          dayTotals.calories += macros.calories;
          dayTotals.protein += macros.protein;
          dayTotals.fat += macros.fat;
          dayTotals.carbs += macros.carbs;

          meals.push({
            slot: SLOT_LABELS[slot],
            name: meal.name,
            type: meal.type,
            macros: { calories: macros.calories, protein: macros.protein, fat: macros.fat, carbs: macros.carbs },
          });

          // Aggregate ingredients
          if (meal.type === 'planned') {
            meal.ingredients.forEach(ing => {
              const existing = ingredientTotals.get(ing.ingredientId);
              const ingData = ingredientMap.get(ing.ingredientId);
              if (existing) {
                existing.totalMultiplier += ing.servingMultiplier;
              } else {
                ingredientTotals.set(ing.ingredientId, {
                  name: ingData ? `${ingData.name}${ingData.brand ? ` (${ingData.brand})` : ''}` : ing.name,
                  serving: ingData?.servingDescription || '100g',
                  totalMultiplier: ing.servingMultiplier,
                });
              }
            });
          }
        } else {
          meals.push({ slot: SLOT_LABELS[slot], name: null, type: null, macros: null });
        }
      } else {
        meals.push({ slot: SLOT_LABELS[slot], name: null, type: null, macros: null });
      }
    });

    if (dayHasData) daysWithData++;

    weeklyMacroSums.calories += dayTotals.calories;
    weeklyMacroSums.protein += dayTotals.protein;
    weeklyMacroSums.fat += dayTotals.fat;
    weeklyMacroSums.carbs += dayTotals.carbs;

    days[day] = {
      meals,
      totals: dayTotals,
      vs_targets: {
        calories: dayTotals.calories - weeklyTargets.dailyCalories,
        protein: dayTotals.protein - weeklyTargets.protein,
        fat: dayTotals.fat - weeklyTargets.fat,
        carbs: dayTotals.carbs - weeklyTargets.carbs,
      },
    };
  });

  const avgDivisor = daysWithData || 1;
  const adherence = (actual: number, target: number) =>
    target > 0 ? Math.round((actual / (target * daysWithData)) * 1000) / 10 : 0;

  return {
    week: weekStart,
    targets: {
      weight_kg: weeklyTargets.weightKg,
      tdee: weeklyTargets.tdee,
      preset: presetName || null,
      daily_calories: weeklyTargets.dailyCalories,
      protein: weeklyTargets.protein,
      fat: weeklyTargets.fat,
      carbs: weeklyTargets.carbs,
    },
    days,
    weekly_summary: {
      avg_daily_calories: Math.round(weeklyMacroSums.calories / avgDivisor),
      avg_daily_protein: Math.round(weeklyMacroSums.protein / avgDivisor),
      total_meals_planned: totalMealsPlanned,
      total_meals_estimated: totalMealsEstimated,
      target_adherence_pct: {
        calories: adherence(weeklyMacroSums.calories, weeklyTargets.dailyCalories),
        protein: adherence(weeklyMacroSums.protein, weeklyTargets.protein),
        fat: adherence(weeklyMacroSums.fat, weeklyTargets.fat),
        carbs: adherence(weeklyMacroSums.carbs, weeklyTargets.carbs),
      },
    },
    ingredient_totals: Array.from(ingredientTotals.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ name, serving, totalMultiplier }) => ({
        name,
        serving,
        total_multiplier: Math.round(totalMultiplier * 100) / 100,
      })),
  };
}
