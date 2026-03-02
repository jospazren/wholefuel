import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';
import { startOfWeek, addWeeks, format, parseISO } from 'date-fns';
import {
  WeeklyPlan,
  WeeklyTargets,
  DayOfWeek,
  MealSlot,
  MealInstance,
  Recipe,
  Macros,
  ShoppingItem,
  DietPreset,
  STRATEGY_MULTIPLIERS,
  DAYS_OF_WEEK,
  MEAL_SLOTS,
} from '@/types/meal';
import { useIngredients } from '@/contexts/IngredientsContext';
import { useRecipes } from '@/contexts/RecipesContext';

// Helper to get the Monday of a given week
const getWeekStartDate = (date: Date = new Date()): string => {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return format(monday, 'yyyy-MM-dd');
};

// Persist the current week to localStorage
const WEEK_STORAGE_KEY = 'wholefuel-current-week';
const getSavedWeekStart = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(WEEK_STORAGE_KEY);
    if (saved) return saved;
  }
  return getWeekStartDate();
};
const saveWeekStart = (weekStart: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(WEEK_STORAGE_KEY, weekStart);
  }
};

interface MealPlanContextType {
  // Week navigation
  currentWeekStart: string;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToWeek: (date: Date) => void;
  getWeekLabel: () => string;

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

  // Diet Presets
  dietPresets: DietPreset[];
  addDietPreset: (preset: DietPreset) => void;
  updateDietPreset: (id: string, preset: DietPreset) => void;
  deleteDietPreset: (id: string) => void;

  // Shopping list
  generateShoppingList: () => ShoppingItem[];

  // Loading state
  isLoading: boolean;
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
  tdee: 2500,
  strategy: 'maintain',
  dailyCalories: 2500,
  protein: 150,
  fat: 67,
  carbs: 200,
  presetId: null,
  weightKg: 80,
};

const MealPlanContext = createContext<MealPlanContextType | undefined>(undefined);

export function MealPlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const { ingredients } = useIngredients();
  const { calculateMacrosFromIngredients } = useRecipes();
  const [currentWeekStart, setCurrentWeekStartInternal] = useState<string>(getSavedWeekStart());
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>(defaultWeeklyPlan);
  const [weeklyTargets, setWeeklyTargetsState] = useState<WeeklyTargets>(defaultTargets);
  const [dietPresets, setDietPresets] = useState<DietPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthPage = location.pathname === '/auth';

  const setCurrentWeekStart = useCallback((weekStart: string) => {
    setCurrentWeekStartInternal(weekStart);
    saveWeekStart(weekStart);
  }, []);

  const goToPreviousWeek = useCallback(() => {
    const current = parseISO(currentWeekStart);
    const previous = addWeeks(current, -1);
    setCurrentWeekStart(format(previous, 'yyyy-MM-dd'));
  }, [currentWeekStart, setCurrentWeekStart]);

  const goToNextWeek = useCallback(() => {
    const current = parseISO(currentWeekStart);
    const next = addWeeks(current, 1);
    setCurrentWeekStart(format(next, 'yyyy-MM-dd'));
  }, [currentWeekStart, setCurrentWeekStart]);

  const goToWeek = useCallback((date: Date) => {
    setCurrentWeekStart(getWeekStartDate(date));
  }, [setCurrentWeekStart]);

  const getWeekLabel = useCallback((): string => {
    const monday = parseISO(currentWeekStart);
    const sunday = addWeeks(monday, 1);
    sunday.setDate(sunday.getDate() - 1);

    const today = new Date();
    const thisWeekStart = getWeekStartDate(today);

    if (currentWeekStart === thisWeekStart) return 'This Week';

    const nextWeekStart = getWeekStartDate(addWeeks(today, 1));
    if (currentWeekStart === nextWeekStart) return 'Next Week';

    const lastWeekStart = getWeekStartDate(addWeeks(today, -1));
    if (currentWeekStart === lastWeekStart) return 'Last Week';

    return `${format(monday, 'MMM d')} - ${format(sunday, 'MMM d')}`;
  }, [currentWeekStart]);

  // Load week-specific data when week changes or user logs in
  useEffect(() => {
    if (user && !isAuthPage) {
      loadWeekData();
    } else if (!user) {
      setWeeklyPlan(defaultWeeklyPlan);
      setWeeklyTargetsState(defaultTargets);
      setDietPresets([]);
      setIsLoading(false);
    }
  }, [user, isAuthPage, currentWeekStart]);

  const loadWeekData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const [presetsResult, targetsResult, mealPlansResult] = await Promise.all([
        supabase
          .from('diet_presets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('weekly_targets')
          .select('*')
          .eq('user_id', user.id)
          .eq('week_start_date', currentWeekStart)
          .single(),
        supabase
          .from('meal_plans')
          .select('*')
          .eq('user_id', user.id)
          .eq('week_start_date', currentWeekStart),
      ]);

      // --- Process diet presets ---
      const dbPresets = presetsResult.data;
      if (dbPresets) {
        setDietPresets(dbPresets.map((p: any) => ({
          id: p.id,
          name: p.name,
          tdeeMultiplier: Number(p.tdee_multiplier),
          proteinPerKg: p.protein_per_kg != null ? Number(p.protein_per_kg) : null,
          carbsPerKg: p.carbs_per_kg != null ? Number(p.carbs_per_kg) : null,
          fatPerKg: p.fat_per_kg != null ? Number(p.fat_per_kg) : null,
        })));
      }

      // --- Process weekly targets (with fallback) ---
      const dbTargets = targetsResult.data;
      if (dbTargets) {
        setWeeklyTargetsState({
          tdee: Number(dbTargets.tdee),
          strategy: dbTargets.strategy as WeeklyTargets['strategy'],
          dailyCalories: Number(dbTargets.daily_calories),
          protein: Number(dbTargets.protein),
          fat: Number(dbTargets.fat),
          carbs: Number(dbTargets.carbs),
          presetId: (dbTargets as any).preset_id || null,
          weightKg: Number((dbTargets as any).weight_kg) || 80,
        });
      } else {
        const { data: latestTargets } = await supabase
          .from('weekly_targets')
          .select('*')
          .eq('user_id', user.id)
          .order('week_start_date', { ascending: false })
          .limit(1)
          .single();

        if (latestTargets) {
          setWeeklyTargetsState({
            tdee: Number(latestTargets.tdee),
            strategy: latestTargets.strategy as WeeklyTargets['strategy'],
            dailyCalories: Number(latestTargets.daily_calories),
            protein: Number(latestTargets.protein),
            fat: Number(latestTargets.fat),
            carbs: Number(latestTargets.carbs),
            presetId: (latestTargets as any).preset_id || null,
            weightKg: Number((latestTargets as any).weight_kg) || 80,
          });
        } else {
          setWeeklyTargetsState(defaultTargets);
        }
      }

      // --- Process meal plans ---
      const dbMealPlans = mealPlansResult.data;
      if (dbMealPlans && dbMealPlans.length > 0) {
        const loadedPlan: WeeklyPlan = {
          monday: {}, tuesday: {}, wednesday: {}, thursday: {},
          friday: {}, saturday: {}, sunday: {},
        };
        dbMealPlans.forEach(mp => {
          const day = mp.day_of_week as DayOfWeek;
          const slot = mp.meal_slot as MealSlot;
          loadedPlan[day][slot] = {
            id: mp.id,
            recipeId: mp.recipe_id || '',
            recipeName: mp.recipe_name,
            ingredients: (mp.ingredients_json as any) || [],
            customMacros: {
              calories: Number(mp.custom_calories),
              protein: Number(mp.custom_protein),
              fat: Number(mp.custom_fat),
              carbs: Number(mp.custom_carbs),
            },
            servingMultiplier: Number(mp.serving_multiplier),
          };
        });
        setWeeklyPlan(loadedPlan);
      } else {
        setWeeklyPlan({
          monday: {}, tuesday: {}, wednesday: {}, thursday: {},
          friday: {}, saturday: {}, sunday: {},
        });
      }
    } catch (error) {
      console.error('Error loading week data:', error);
      toast.error('Failed to load your data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTargets = (tdee: number, strategy: WeeklyTargets['strategy']) => {
    const multiplier = STRATEGY_MULTIPLIERS[strategy];
    const calories = Math.round(tdee * multiplier);
    const protein = Math.round((calories * 0.30) / 4);
    const fat = Math.round((calories * 0.25) / 9);
    const carbs = Math.round((calories * 0.45) / 4);
    return { calories, protein, fat, carbs };
  };

  const setWeeklyTargets = async (targets: WeeklyTargets) => {
    setWeeklyTargetsState(targets);

    if (!user) return;

    const { error } = await supabase
      .from('weekly_targets')
      .upsert({
        user_id: user.id,
        week_start_date: currentWeekStart,
        tdee: targets.tdee,
        strategy: targets.strategy,
        daily_calories: targets.dailyCalories,
        protein: targets.protein,
        fat: targets.fat,
        carbs: targets.carbs,
        preset_id: targets.presetId,
        weight_kg: targets.weightKg,
      } as any, { onConflict: 'user_id,week_start_date' });

    if (error) {
      console.error('Error saving targets:', error);
      toast.error('Failed to save targets');
    }
  };

  // Diet Preset CRUD
  const addDietPreset = async (preset: DietPreset) => {
    setDietPresets(prev => [...prev, preset]);

    if (!user) return;

    const { data, error } = await supabase
      .from('diet_presets')
      .insert({
        user_id: user.id,
        name: preset.name,
        tdee_multiplier: preset.tdeeMultiplier,
        protein_per_kg: preset.proteinPerKg,
        carbs_per_kg: preset.carbsPerKg,
        fat_per_kg: preset.fatPerKg,
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error adding preset:', error);
      toast.error('Failed to save preset');
    } else if (data) {
      setDietPresets(prev => prev.map(p => p.id === preset.id ? { ...p, id: data.id } : p));
    }
  };

  const updateDietPreset = async (id: string, preset: DietPreset) => {
    setDietPresets(prev => prev.map(p => p.id === id ? preset : p));

    if (!user) return;

    await supabase
      .from('diet_presets')
      .update({
        name: preset.name,
        tdee_multiplier: preset.tdeeMultiplier,
        protein_per_kg: preset.proteinPerKg,
        carbs_per_kg: preset.carbsPerKg,
        fat_per_kg: preset.fatPerKg,
      } as any)
      .eq('id', id)
      .eq('user_id', user.id);
  };

  const deleteDietPreset = async (id: string) => {
    setDietPresets(prev => prev.filter(p => p.id !== id));

    if (!user) return;

    await supabase
      .from('diet_presets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
  };

  const addMealToSlot = async (day: DayOfWeek, slot: MealSlot, recipe: Recipe) => {
    const mealInstance: MealInstance = {
      id: `${day}-${slot}-${Date.now()}`,
      recipeId: recipe.id,
      recipeName: recipe.name,
      ingredients: recipe.ingredients.map(ing => ({
        ingredientId: ing.ingredientId,
        name: ing.name,
        servingMultiplier: ing.servingMultiplier,
      })),
      customMacros: { ...recipe.totalMacros },
      servingMultiplier: 1,
    };

    setWeeklyPlan((prev) => ({
      ...prev,
      [day]: { ...prev[day], [slot]: mealInstance },
    }));

    if (!user) return;

    const { data, error } = await supabase
      .from('meal_plans')
      .upsert({
        user_id: user.id,
        week_start_date: currentWeekStart,
        day_of_week: day,
        meal_slot: slot,
        recipe_id: recipe.id,
        recipe_name: recipe.name,
        serving_multiplier: 1,
        custom_calories: recipe.totalMacros.calories,
        custom_protein: recipe.totalMacros.protein,
        custom_fat: recipe.totalMacros.fat,
        custom_carbs: recipe.totalMacros.carbs,
        ingredients_json: mealInstance.ingredients as unknown as Json,
      } as any, { onConflict: 'user_id,day_of_week,meal_slot,week_start_date' })
      .select()
      .single();

    if (error) {
      console.error('Error adding meal:', error);
      toast.error('Failed to save meal');
    } else if (data) {
      setWeeklyPlan((prev) => ({
        ...prev,
        [day]: { ...prev[day], [slot]: { ...mealInstance, id: data.id } },
      }));
    }
  };

  const removeMealFromSlot = async (day: DayOfWeek, slot: MealSlot) => {
    setWeeklyPlan((prev) => ({
      ...prev,
      [day]: { ...prev[day], [slot]: undefined },
    }));

    if (!user) return;

    const { error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('user_id', user.id)
      .eq('week_start_date', currentWeekStart)
      .eq('day_of_week', day)
      .eq('meal_slot', slot);

    if (error) {
      console.error('Error removing meal:', error);
    }
  };

  const moveMealToSlot = async (fromDay: DayOfWeek, fromSlot: MealSlot, toDay: DayOfWeek, toSlot: MealSlot) => {
    const sourceMeal = weeklyPlan[fromDay][fromSlot];
    const targetMeal = weeklyPlan[toDay][toSlot];

    if (!sourceMeal) return;
    if (fromDay === toDay && fromSlot === toSlot) return;

    setWeeklyPlan((prev) => {
      const updated = { ...prev };
      updated[fromDay] = { ...prev[fromDay], [fromSlot]: targetMeal };
      updated[toDay] = { ...prev[toDay], [toSlot]: sourceMeal };
      return updated;
    });

    if (!user) return;

    await supabase.from('meal_plans').delete()
      .eq('user_id', user.id)
      .eq('week_start_date', currentWeekStart)
      .eq('day_of_week', fromDay)
      .eq('meal_slot', fromSlot);

    await supabase.from('meal_plans').upsert({
      user_id: user.id,
      week_start_date: currentWeekStart,
      day_of_week: toDay,
      meal_slot: toSlot,
      recipe_id: sourceMeal.recipeId,
      recipe_name: sourceMeal.recipeName,
      serving_multiplier: sourceMeal.servingMultiplier,
      custom_calories: sourceMeal.customMacros.calories,
      custom_protein: sourceMeal.customMacros.protein,
      custom_fat: sourceMeal.customMacros.fat,
      custom_carbs: sourceMeal.customMacros.carbs,
      ingredients_json: sourceMeal.ingredients as unknown as Json,
    } as any, { onConflict: 'user_id,day_of_week,meal_slot,week_start_date' });

    if (targetMeal) {
      await supabase.from('meal_plans').upsert({
        user_id: user.id,
        week_start_date: currentWeekStart,
        day_of_week: fromDay,
        meal_slot: fromSlot,
        recipe_id: targetMeal.recipeId,
        recipe_name: targetMeal.recipeName,
        serving_multiplier: targetMeal.servingMultiplier,
        custom_calories: targetMeal.customMacros.calories,
        custom_protein: targetMeal.customMacros.protein,
        custom_fat: targetMeal.customMacros.fat,
        custom_carbs: targetMeal.customMacros.carbs,
        ingredients_json: targetMeal.ingredients as unknown as Json,
      } as any, { onConflict: 'user_id,day_of_week,meal_slot,week_start_date' });
    }
  };

  const updateMealInstance = async (day: DayOfWeek, slot: MealSlot, updates: Partial<MealInstance>) => {
    setWeeklyPlan((prev) => {
      const currentMeal = prev[day][slot];
      if (!currentMeal) return prev;

      const updatedMeal = { ...currentMeal, ...updates };

      if (updates.ingredients) {
        updatedMeal.customMacros = calculateMacrosFromIngredients(
          updates.ingredients.map(i => ({ ingredientId: i.ingredientId, servingMultiplier: i.servingMultiplier }))
        );
      }

      return {
        ...prev,
        [day]: { ...prev[day], [slot]: updatedMeal },
      };
    });

    if (!user) return;

    const currentMeal = weeklyPlan[day][slot];
    if (!currentMeal) return;

    const updatedMeal = { ...currentMeal, ...updates };
    if (updates.ingredients) {
      updatedMeal.customMacros = calculateMacrosFromIngredients(
        updates.ingredients.map(i => ({ ingredientId: i.ingredientId, servingMultiplier: i.servingMultiplier }))
      );
    }

    await supabase.from('meal_plans').update({
      recipe_name: updatedMeal.recipeName,
      serving_multiplier: updatedMeal.servingMultiplier,
      custom_calories: updatedMeal.customMacros.calories,
      custom_protein: updatedMeal.customMacros.protein,
      custom_fat: updatedMeal.customMacros.fat,
      custom_carbs: updatedMeal.customMacros.carbs,
      ingredients_json: updatedMeal.ingredients as unknown as Json,
    } as any)
      .eq('user_id', user.id)
      .eq('week_start_date', currentWeekStart)
      .eq('day_of_week', day)
      .eq('meal_slot', slot);
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

  const generateShoppingList = (): ShoppingItem[] => {
    const itemMap = new Map<string, ShoppingItem>();

    DAYS_OF_WEEK.forEach(day => {
      MEAL_SLOTS.forEach(slot => {
        const meal = weeklyPlan[day][slot];
        if (meal) {
          meal.ingredients.forEach(ing => {
            const ingData = ingredients.find(i => i.id === ing.ingredientId);
            const servingDescription = ingData?.servingDescription || '100g';
            const servingsNeeded = ing.servingMultiplier * meal.servingMultiplier;

            const existing = itemMap.get(ing.ingredientId);
            if (existing) {
              existing.totalServings += servingsNeeded;
            } else {
              itemMap.set(ing.ingredientId, {
                ingredientId: ing.ingredientId,
                name: ing.name,
                totalServings: servingsNeeded,
                servingDescription,
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
        currentWeekStart,
        goToPreviousWeek,
        goToNextWeek,
        goToWeek,
        getWeekLabel,
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
        dietPresets,
        addDietPreset,
        updateDietPreset,
        deleteDietPreset,
        generateShoppingList,
        isLoading,
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
