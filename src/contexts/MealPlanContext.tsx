import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  WeeklyPlan,
  WeeklyTargets,
  DayOfWeek,
  MealSlot,
  MealInstance,
  Recipe,
  Macros,
  STRATEGY_MULTIPLIERS,
  DAYS_OF_WEEK,
} from '@/types/meal';

interface MealPlanContextType {
  weeklyPlan: WeeklyPlan;
  weeklyTargets: WeeklyTargets;
  setWeeklyTargets: (targets: WeeklyTargets) => void;
  addMealToSlot: (day: DayOfWeek, slot: MealSlot, recipe: Recipe) => void;
  removeMealFromSlot: (day: DayOfWeek, slot: MealSlot) => void;
  updateMealInstance: (day: DayOfWeek, slot: MealSlot, updates: Partial<MealInstance>) => void;
  getDailyMacros: (day: DayOfWeek) => Macros;
  getWeeklyTotals: () => Macros;
  calculateTargets: (tdee: number, strategy: WeeklyTargets['strategy']) => { calories: number; protein: number; fat: number; carbs: number };
}

const defaultWeeklyPlan: WeeklyPlan = {
  monday: {},
  tuesday: {},
  wednesday: {},
  thursday: {},
  friday: {},
  saturday: {},
  sunday: {},
};

const defaultTargets: WeeklyTargets = {
  tdee: 2000,
  strategy: 'maintain',
  dailyCalories: 2000,
  protein: 150,
  fat: 67,
  carbs: 200,
};

const MealPlanContext = createContext<MealPlanContextType | undefined>(undefined);

export function MealPlanProvider({ children }: { children: ReactNode }) {
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>(defaultWeeklyPlan);
  const [weeklyTargets, setWeeklyTargetsState] = useState<WeeklyTargets>(defaultTargets);

  const calculateTargets = (tdee: number, strategy: WeeklyTargets['strategy']) => {
    const multiplier = STRATEGY_MULTIPLIERS[strategy];
    const calories = Math.round(tdee * multiplier);
    // Default macro split: 30% protein, 25% fat, 45% carbs
    const protein = Math.round((calories * 0.30) / 4); // 4 cal per gram
    const fat = Math.round((calories * 0.25) / 9); // 9 cal per gram
    const carbs = Math.round((calories * 0.45) / 4); // 4 cal per gram
    return { calories, protein, fat, carbs };
  };

  const setWeeklyTargets = (targets: WeeklyTargets) => {
    setWeeklyTargetsState(targets);
  };

  const addMealToSlot = (day: DayOfWeek, slot: MealSlot, recipe: Recipe) => {
    const mealInstance: MealInstance = {
      id: `${day}-${slot}-${Date.now()}`,
      recipeId: recipe.id,
      recipeName: recipe.name,
      ingredients: JSON.parse(JSON.stringify(recipe.ingredients)),
      customMacros: { ...recipe.totalMacros },
      servingMultiplier: 1,
    };

    setWeeklyPlan((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [slot]: mealInstance,
      },
    }));
  };

  const removeMealFromSlot = (day: DayOfWeek, slot: MealSlot) => {
    setWeeklyPlan((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [slot]: undefined,
      },
    }));
  };

  const updateMealInstance = (day: DayOfWeek, slot: MealSlot, updates: Partial<MealInstance>) => {
    setWeeklyPlan((prev) => {
      const currentMeal = prev[day][slot];
      if (!currentMeal) return prev;

      return {
        ...prev,
        [day]: {
          ...prev[day],
          [slot]: { ...currentMeal, ...updates },
        },
      };
    });
  };

  const getDailyMacros = (day: DayOfWeek): Macros => {
    const dayPlan = weeklyPlan[day];
    const totals: Macros = { calories: 0, protein: 0, fat: 0, carbs: 0 };

    Object.values(dayPlan).forEach((meal) => {
      if (meal) {
        totals.calories += meal.customMacros.calories * meal.servingMultiplier;
        totals.protein += meal.customMacros.protein * meal.servingMultiplier;
        totals.fat += meal.customMacros.fat * meal.servingMultiplier;
        totals.carbs += meal.customMacros.carbs * meal.servingMultiplier;
      }
    });

    return {
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein),
      fat: Math.round(totals.fat),
      carbs: Math.round(totals.carbs),
    };
  };

  const getWeeklyTotals = (): Macros => {
    const totals: Macros = { calories: 0, protein: 0, fat: 0, carbs: 0 };

    DAYS_OF_WEEK.forEach((day) => {
      const dailyMacros = getDailyMacros(day);
      totals.calories += dailyMacros.calories;
      totals.protein += dailyMacros.protein;
      totals.fat += dailyMacros.fat;
      totals.carbs += dailyMacros.carbs;
    });

    return totals;
  };

  return (
    <MealPlanContext.Provider
      value={{
        weeklyPlan,
        weeklyTargets,
        setWeeklyTargets,
        addMealToSlot,
        removeMealFromSlot,
        updateMealInstance,
        getDailyMacros,
        getWeeklyTotals,
        calculateTargets,
      }}
    >
      {children}
    </MealPlanContext.Provider>
  );
}

export function useMealPlan() {
  const context = useContext(MealPlanContext);
  if (context === undefined) {
    throw new Error('useMealPlan must be used within a MealPlanProvider');
  }
  return context;
}
