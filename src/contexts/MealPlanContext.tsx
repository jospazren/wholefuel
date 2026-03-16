import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { startOfWeek, addWeeks, format, parseISO } from 'date-fns';
import {
  WeeklyPlan,
  WeeklyTargets,
  DayOfWeek,
  MealSlot,
  MealSlotAssignment,
  Recipe,
  Macros,
  ShoppingItem,
  DietPreset,
  STRATEGY_MULTIPLIERS,
  DAYS_OF_WEEK,
  MEAL_SLOTS,
} from '@/types/meal';
import { useIngredients } from '@/contexts/IngredientsContext';
import { useMeals } from '@/contexts/MealsContext';

const getWeekStartDate = (date: Date = new Date()): string => {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return format(monday, 'yyyy-MM-dd');
};

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
  currentWeekStart: string;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToWeek: (date: Date) => void;
  getWeekLabel: () => string;

  weeklyPlan: WeeklyPlan;
  weeklyTargets: WeeklyTargets;
  setWeeklyTargets: (targets: WeeklyTargets) => void;
  addMealToSlot: (day: DayOfWeek, slot: MealSlot, recipe: Recipe) => void;
  moveMealToSlot: (fromDay: DayOfWeek, fromSlot: MealSlot, toDay: DayOfWeek, toSlot: MealSlot) => void;
  removeMealFromSlot: (day: DayOfWeek, slot: MealSlot) => void;
  getDailyMacros: (day: DayOfWeek) => Macros;
  getWeeklyTotals: () => Macros;
  calculateTargets: (tdee: number, strategy: WeeklyTargets['strategy']) => { calories: number; protein: number; fat: number; carbs: number };

  dietPresets: DietPreset[];
  addDietPreset: (preset: DietPreset) => void;
  updateDietPreset: (id: string, preset: DietPreset) => void;
  deleteDietPreset: (id: string) => void;

  generateShoppingList: () => ShoppingItem[];

  isLoading: boolean;
}

const defaultWeeklyPlan: WeeklyPlan = {
  monday: {}, tuesday: {}, wednesday: {}, thursday: {},
  friday: {}, saturday: {}, sunday: {},
};

const defaultTargets: WeeklyTargets = {
  tdee: 2500, strategy: 'maintain', dailyCalories: 2500,
  protein: 150, fat: 67, carbs: 200, presetId: null, weightKg: 80,
};

const MealPlanContext = createContext<MealPlanContextType | undefined>(undefined);

export function MealPlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const { ingredients } = useIngredients();
  const { getMeal, getMealMacros, createMealFromRecipe, deleteMeal: deleteMealEntity } = useMeals();
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
    setCurrentWeekStart(format(addWeeks(current, -1), 'yyyy-MM-dd'));
  }, [currentWeekStart, setCurrentWeekStart]);

  const goToNextWeek = useCallback(() => {
    const current = parseISO(currentWeekStart);
    setCurrentWeekStart(format(addWeeks(current, 1), 'yyyy-MM-dd'));
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

      // Process diet presets
      if (presetsResult.data) {
        setDietPresets(presetsResult.data.map((p) => ({
          id: p.id, name: p.name,
          tdeeMultiplier: Number(p.tdee_multiplier),
          proteinPerKg: p.protein_per_kg != null ? Number(p.protein_per_kg) : null,
          carbsPerKg: p.carbs_per_kg != null ? Number(p.carbs_per_kg) : null,
          fatPerKg: p.fat_per_kg != null ? Number(p.fat_per_kg) : null,
        })));
      }

      // Process weekly targets
      if (targetsResult.data) {
        const dt = targetsResult.data;
        setWeeklyTargetsState({
          tdee: Number(dt.tdee),
          strategy: dt.strategy as WeeklyTargets['strategy'],
          dailyCalories: Number(dt.daily_calories),
          protein: Number(dt.protein),
          fat: Number(dt.fat),
          carbs: Number(dt.carbs),
          presetId: dt.preset_id || null,
          weightKg: Number(dt.weight_kg) || 80,
        });
      } else {
        // Fallback to most recent targets
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
            presetId: latestTargets.preset_id || null,
            weightKg: Number(latestTargets.weight_kg) || 80,
          });
        } else {
          setWeeklyTargetsState(defaultTargets);
        }
      }

      // Process meal plans — now just scheduling rows with meal_id
      const dbMealPlans = mealPlansResult.data;
      if (dbMealPlans && dbMealPlans.length > 0) {
        const loadedPlan: WeeklyPlan = {
          monday: {}, tuesday: {}, wednesday: {}, thursday: {},
          friday: {}, saturday: {}, sunday: {},
        };
        dbMealPlans.forEach((mp) => {
          const day = mp.day_of_week as DayOfWeek;
          const slot = mp.meal_slot as MealSlot;
          loadedPlan[day][slot] = {
            id: mp.id,
            mealId: mp.meal_id,
          };
        });
        setWeeklyPlan(loadedPlan);
      } else {
        setWeeklyPlan(defaultWeeklyPlan);
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
    return {
      calories,
      protein: Math.round((calories * 0.30) / 4),
      fat: Math.round((calories * 0.25) / 9),
      carbs: Math.round((calories * 0.45) / 4),
    };
  };

  const setWeeklyTargets = async (targets: WeeklyTargets) => {
    const previousTargets = weeklyTargets;
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
      }, { onConflict: 'user_id,week_start_date' });

    if (error) {
      setWeeklyTargetsState(previousTargets);
      console.error('Error saving targets:', error);
      toast.error('Failed to save targets');
    }
  };

  // Diet Preset CRUD
  const addDietPreset = async (preset: DietPreset) => {
    const previousPresets = dietPresets;
    setDietPresets(prev => [...prev, preset]);
    if (!user) return;
    const { data, error } = await supabase.from('diet_presets').insert({
      user_id: user.id, name: preset.name,
      tdee_multiplier: preset.tdeeMultiplier,
      protein_per_kg: preset.proteinPerKg,
      carbs_per_kg: preset.carbsPerKg,
      fat_per_kg: preset.fatPerKg,
    }).select().single();
    if (error) {
      setDietPresets(previousPresets);
      toast.error('Failed to save preset');
    } else if (data) { setDietPresets(prev => prev.map(p => p.id === preset.id ? { ...p, id: data.id } : p)); }
  };

  const updateDietPreset = async (id: string, preset: DietPreset) => {
    const previousPresets = dietPresets;
    setDietPresets(prev => prev.map(p => p.id === id ? preset : p));
    if (!user) return;
    const { error } = await supabase.from('diet_presets').update({
      name: preset.name, tdee_multiplier: preset.tdeeMultiplier,
      protein_per_kg: preset.proteinPerKg, carbs_per_kg: preset.carbsPerKg, fat_per_kg: preset.fatPerKg,
    }).eq('id', id).eq('user_id', user.id);
    if (error) {
      setDietPresets(previousPresets);
      toast.error('Failed to update preset');
    }
  };

  const deleteDietPreset = async (id: string) => {
    const previousPresets = dietPresets;
    setDietPresets(prev => prev.filter(p => p.id !== id));
    if (!user) return;
    const { error } = await supabase.from('diet_presets').delete().eq('id', id).eq('user_id', user.id);
    if (error) {
      setDietPresets(previousPresets);
      toast.error('Failed to delete preset');
    }
  };

  // Meal scheduling
  const addMealToSlot = async (day: DayOfWeek, slot: MealSlot, recipe: Recipe) => {
    const previousPlan = weeklyPlan;
    // Create a meal entity from the recipe
    const meal = await createMealFromRecipe(recipe);
    if (!meal) return;

    const assignment: MealSlotAssignment = {
      id: `${day}-${slot}-${Date.now()}`,
      mealId: meal.id,
    };

    setWeeklyPlan(prev => ({
      ...prev,
      [day]: { ...prev[day], [slot]: assignment },
    }));

    if (!user) return;

    const { data, error } = await supabase
      .from('meal_plans')
      .upsert({
        user_id: user.id,
        week_start_date: currentWeekStart,
        day_of_week: day,
        meal_slot: slot,
        meal_id: meal.id,
      }, { onConflict: 'user_id,day_of_week,meal_slot,week_start_date' })
      .select()
      .single();

    if (error) {
      setWeeklyPlan(previousPlan);
      await deleteMealEntity(meal.id);
      console.error('Error adding meal to slot:', error);
      toast.error('Failed to save meal');
    } else if (data) {
      setWeeklyPlan(prev => ({
        ...prev,
        [day]: { ...prev[day], [slot]: { id: data.id, mealId: meal.id } },
      }));
    }
  };

  const removeMealFromSlot = async (day: DayOfWeek, slot: MealSlot) => {
    const assignment = weeklyPlan[day][slot];
    const previousPlan = weeklyPlan;

    setWeeklyPlan(prev => ({
      ...prev,
      [day]: { ...prev[day], [slot]: undefined },
    }));

    if (!user) return;

    try {
      const { error } = await supabase.from('meal_plans').delete()
        .eq('user_id', user.id)
        .eq('week_start_date', currentWeekStart)
        .eq('day_of_week', day)
        .eq('meal_slot', slot);
      if (error) throw error;

      // Also delete the meal entity (it was created for this slot)
      if (assignment) {
        await deleteMealEntity(assignment.mealId);
      }
    } catch {
      setWeeklyPlan(previousPlan);
      toast.error('Failed to remove meal');
    }
  };

  const moveMealToSlot = async (fromDay: DayOfWeek, fromSlot: MealSlot, toDay: DayOfWeek, toSlot: MealSlot) => {
    const sourceAssignment = weeklyPlan[fromDay][fromSlot];
    const targetAssignment = weeklyPlan[toDay][toSlot];

    if (!sourceAssignment) return;
    if (fromDay === toDay && fromSlot === toSlot) return;

    const previousPlan = weeklyPlan;

    setWeeklyPlan(prev => {
      const updated = { ...prev };
      updated[fromDay] = { ...prev[fromDay], [fromSlot]: targetAssignment };
      updated[toDay] = { ...prev[toDay], [toSlot]: sourceAssignment };
      return updated;
    });

    if (!user) return;

    try {
      const { error: deleteError } = await supabase.from('meal_plans').delete()
        .eq('user_id', user.id)
        .eq('week_start_date', currentWeekStart)
        .eq('day_of_week', fromDay)
        .eq('meal_slot', fromSlot);
      if (deleteError) throw deleteError;

      const { error: upsertError } = await supabase.from('meal_plans').upsert({
        user_id: user.id,
        week_start_date: currentWeekStart,
        day_of_week: toDay,
        meal_slot: toSlot,
        meal_id: sourceAssignment.mealId,
      }, { onConflict: 'user_id,day_of_week,meal_slot,week_start_date' });
      if (upsertError) throw upsertError;

      if (targetAssignment) {
        const { error: swapError } = await supabase.from('meal_plans').upsert({
          user_id: user.id,
          week_start_date: currentWeekStart,
          day_of_week: fromDay,
          meal_slot: fromSlot,
          meal_id: targetAssignment.mealId,
        }, { onConflict: 'user_id,day_of_week,meal_slot,week_start_date' });
        if (swapError) throw swapError;
      }
    } catch {
      setWeeklyPlan(previousPlan);
      toast.error('Failed to move meal');
    }
  };

  // Macro calculations — computed from meal ingredients
  const getDailyMacros = (day: DayOfWeek): Macros => {
    const dayPlan = weeklyPlan[day];
    const totals: Macros = { calories: 0, protein: 0, fat: 0, carbs: 0 };

    Object.values(dayPlan).forEach((assignment) => {
      if (assignment) {
        const meal = getMeal(assignment.mealId);
        if (meal) {
          const macros = getMealMacros(meal);
          totals.calories += macros.calories;
          totals.protein += macros.protein;
          totals.fat += macros.fat;
          totals.carbs += macros.carbs;
        }
      }
    });

    return totals;
  };

  const getWeeklyTotals = (): Macros => {
    const totals: Macros = { calories: 0, protein: 0, fat: 0, carbs: 0 };
    DAYS_OF_WEEK.forEach(day => {
      const daily = getDailyMacros(day);
      totals.calories += daily.calories;
      totals.protein += daily.protein;
      totals.fat += daily.fat;
      totals.carbs += daily.carbs;
    });
    return totals;
  };

  // Shopping list — computed from meal ingredients
  const generateShoppingList = (): ShoppingItem[] => {
    const itemMap = new Map<string, ShoppingItem>();

    DAYS_OF_WEEK.forEach(day => {
      MEAL_SLOTS.forEach(slot => {
        const assignment = weeklyPlan[day][slot];
        if (assignment) {
          const meal = getMeal(assignment.mealId);
          if (meal) {
            meal.ingredients.forEach(ing => {
              const ingData = ingredients.find(i => i.id === ing.ingredientId);
              const servingDescription = ingData?.servingDescription || '100g';

              const existing = itemMap.get(ing.ingredientId);
              if (existing) {
                existing.totalServings += ing.servingMultiplier;
              } else {
                itemMap.set(ing.ingredientId, {
                  ingredientId: ing.ingredientId,
                  name: ing.name,
                  totalServings: ing.servingMultiplier,
                  servingDescription,
                  purchased: false,
                });
              }
            });
          }
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
