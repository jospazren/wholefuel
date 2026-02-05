import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  WeeklyPlan,
  WeeklyTargets,
  DayOfWeek,
  MealSlot,
  MealInstance,
  Recipe,
  Macros,
  BaseIngredient,
  ShoppingItem,
  STRATEGY_MULTIPLIERS,
  DAYS_OF_WEEK,
  MEAL_SLOTS,
} from '@/types/meal';
import { baseIngredients as defaultIngredients } from '@/data/ingredients';
import { sampleRecipes as defaultRecipes } from '@/data/recipes';

interface MealPlanContextType {
  // Weekly plan
  weeklyPlan: WeeklyPlan;
  weeklyTargets: WeeklyTargets;
  setWeeklyTargets: (targets: WeeklyTargets) => void;
  addMealToSlot: (day: DayOfWeek, slot: MealSlot, recipe: Recipe) => void;
  moveMealToSlot: (fromDay: DayOfWeek, fromSlot: MealSlot, toDay: DayOfWeek, toSlot: MealSlot) => void;
  removeMealFromSlot: (day: DayOfWeek, slot: MealSlot) => void;
  updateMealInstance: (day: DayOfWeek, slot: MealSlot, updates: Partial<MealInstance>) => void;
  getDailyMacros: (day: DayOfWeek) => Macros;
  getWeeklyTotals: () => Macros;
  calculateTargets: (tdee: number, strategy: WeeklyTargets['strategy']) => { calories: number; protein: number; fat: number; carbs: number };
  
  // Ingredients
  ingredients: BaseIngredient[];
  addIngredient: (ingredient: BaseIngredient) => void;
  updateIngredient: (id: string, updates: Partial<BaseIngredient>) => void;
  deleteIngredient: (id: string) => void;
  
  // Recipes
  recipes: Recipe[];
  addRecipe: (recipe: Recipe) => void;
  updateRecipe: (id: string, updates: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  
  // Shopping list
  generateShoppingList: () => ShoppingItem[];
  
  // Helpers
  calculateMacrosFromIngredients: (ingredients: { ingredientId: string; amount: number }[]) => Macros;
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
  const [ingredients, setIngredients] = useState<BaseIngredient[]>(defaultIngredients);
  const [recipes, setRecipes] = useState<Recipe[]>(defaultRecipes);

  const calculateTargets = (tdee: number, strategy: WeeklyTargets['strategy']) => {
    const multiplier = STRATEGY_MULTIPLIERS[strategy];
    const calories = Math.round(tdee * multiplier);
    const protein = Math.round((calories * 0.30) / 4);
    const fat = Math.round((calories * 0.25) / 9);
    const carbs = Math.round((calories * 0.45) / 4);
    return { calories, protein, fat, carbs };
  };

  const calculateMacrosFromIngredients = (recipeIngredients: { ingredientId: string; amount: number }[]): Macros => {
    return recipeIngredients.reduce((totals, ing) => {
      const baseIng = ingredients.find(i => i.id === ing.ingredientId);
      if (baseIng) {
        const multiplier = ing.amount / 100;
        totals.calories += Math.round(baseIng.caloriesPer100g * multiplier);
        totals.protein += Math.round(baseIng.proteinPer100g * multiplier);
        totals.fat += Math.round(baseIng.fatPer100g * multiplier);
        totals.carbs += Math.round(baseIng.carbsPer100g * multiplier);
      }
      return totals;
    }, { calories: 0, protein: 0, fat: 0, carbs: 0 });
  };

  const setWeeklyTargets = (targets: WeeklyTargets) => {
    setWeeklyTargetsState(targets);
  };

  const addMealToSlot = (day: DayOfWeek, slot: MealSlot, recipe: Recipe) => {
    const mealInstance: MealInstance = {
      id: `${day}-${slot}-${Date.now()}`,
      recipeId: recipe.id,
      recipeName: recipe.name,
      ingredients: recipe.ingredients.map(ing => ({
        ingredientId: ing.ingredientId,
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
      })),
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

  const moveMealToSlot = (fromDay: DayOfWeek, fromSlot: MealSlot, toDay: DayOfWeek, toSlot: MealSlot) => {
    setWeeklyPlan((prev) => {
      const meal = prev[fromDay][fromSlot];
      if (!meal) return prev;
      
      // If dropping onto the same slot, do nothing
      if (fromDay === toDay && fromSlot === toSlot) return prev;
      
      const updated = { ...prev };
      
      // Update "from" day
      updated[fromDay] = { ...prev[fromDay], [fromSlot]: undefined };
      
      // Update "to" day (swap if occupied)
      const existingMeal = prev[toDay][toSlot];
      updated[toDay] = { ...updated[toDay], [toSlot]: meal };
      
      // If there was a meal in the target slot, move it to the source slot (swap)
      if (existingMeal) {
        updated[fromDay] = { ...updated[fromDay], [fromSlot]: existingMeal };
      }
      
      return updated;
    });
  };

  const updateMealInstance = (day: DayOfWeek, slot: MealSlot, updates: Partial<MealInstance>) => {
    setWeeklyPlan((prev) => {
      const currentMeal = prev[day][slot];
      if (!currentMeal) return prev;

      const updatedMeal = { ...currentMeal, ...updates };
      
      // Recalculate macros if ingredients changed
      if (updates.ingredients) {
        updatedMeal.customMacros = calculateMacrosFromIngredients(
          updates.ingredients.map(i => ({ ingredientId: i.ingredientId, amount: i.amount }))
        );
      }

      return {
        ...prev,
        [day]: {
          ...prev[day],
          [slot]: updatedMeal,
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

  // Ingredient CRUD
  const addIngredient = (ingredient: BaseIngredient) => {
    setIngredients(prev => [...prev, ingredient]);
  };

  const updateIngredient = (id: string, updates: Partial<BaseIngredient>) => {
    setIngredients(prev => prev.map(ing => ing.id === id ? { ...ing, ...updates } : ing));
  };

  const deleteIngredient = (id: string) => {
    setIngredients(prev => prev.filter(ing => ing.id !== id));
  };

  // Recipe CRUD
  const addRecipe = (recipe: Recipe) => {
    setRecipes(prev => [...prev, recipe]);
  };

  const updateRecipe = (id: string, updates: Partial<Recipe>) => {
    setRecipes(prev => prev.map(rec => rec.id === id ? { ...rec, ...updates } : rec));
  };

  const deleteRecipe = (id: string) => {
    setRecipes(prev => prev.filter(rec => rec.id !== id));
  };

  // Shopping list
  const generateShoppingList = (): ShoppingItem[] => {
    const itemMap = new Map<string, ShoppingItem>();

    DAYS_OF_WEEK.forEach(day => {
      MEAL_SLOTS.forEach(slot => {
        const meal = weeklyPlan[day][slot];
        if (meal) {
          meal.ingredients.forEach(ing => {
            const existing = itemMap.get(ing.ingredientId);
            if (existing) {
              existing.totalAmount += ing.amount * meal.servingMultiplier;
            } else {
              itemMap.set(ing.ingredientId, {
                ingredientId: ing.ingredientId,
                name: ing.name,
                totalAmount: ing.amount * meal.servingMultiplier,
                unit: ing.unit,
                purchased: false,
              });
            }
          });
        }
      });
    });

    return Array.from(itemMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  return (
    <MealPlanContext.Provider
      value={{
        weeklyPlan,
        weeklyTargets,
        setWeeklyTargets,
        addMealToSlot,
        moveMealToSlot,
        removeMealFromSlot,
        updateMealInstance,
        getDailyMacros,
        getWeeklyTotals,
        calculateTargets,
        ingredients,
        addIngredient,
        updateIngredient,
        deleteIngredient,
        recipes,
        addRecipe,
        updateRecipe,
        deleteRecipe,
        generateShoppingList,
        calculateMacrosFromIngredients,
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
