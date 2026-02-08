import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';
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
  tdee: 2000,
  strategy: 'maintain',
  dailyCalories: 2000,
  protein: 150,
  fat: 67,
  carbs: 200,
};

const MealPlanContext = createContext<MealPlanContextType | undefined>(undefined);

export function MealPlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>(defaultWeeklyPlan);
  const [weeklyTargets, setWeeklyTargetsState] = useState<WeeklyTargets>(defaultTargets);
  const [ingredients, setIngredients] = useState<BaseIngredient[]>(defaultIngredients);
  const [recipes, setRecipes] = useState<Recipe[]>(defaultRecipes);
  const [isLoading, setIsLoading] = useState(true);
  const [dbIngredientMap, setDbIngredientMap] = useState<Map<string, string>>(new Map());
  const [dbRecipeMap, setDbRecipeMap] = useState<Map<string, string>>(new Map());

  // Skip data loading on auth page
  const isAuthPage = location.pathname === '/auth';

  // Load user data from database when user logs in
  useEffect(() => {
    if (user && !isAuthPage) {
      loadUserData();
    } else if (!user) {
      // Reset to defaults when logged out
      setIngredients(defaultIngredients);
      setRecipes(defaultRecipes);
      setWeeklyPlan(defaultWeeklyPlan);
      setWeeklyTargetsState(defaultTargets);
      setDbIngredientMap(new Map());
      setDbRecipeMap(new Map());
      setIsLoading(false);
    }
  }, [user, isAuthPage]);

  const loadUserData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Load ingredients
      const { data: dbIngredients } = await supabase
        .from('ingredients')
        .select('*')
        .eq('user_id', user.id);

      if (dbIngredients && dbIngredients.length > 0) {
        const ingredientMap = new Map<string, string>();
        const loadedIngredients: BaseIngredient[] = dbIngredients.map(ing => {
          ingredientMap.set(ing.id, ing.id);
          return {
            id: ing.id,
            name: ing.name,
            caloriesPerServing: Number((ing as any).calories_per_serving),
            proteinPerServing: Number((ing as any).protein_per_serving),
            fatPerServing: Number((ing as any).fat_per_serving),
            carbsPerServing: Number((ing as any).carbs_per_serving),
            fiberPerServing: Number((ing as any).fiber_per_serving),
            sodiumPerServing: Number((ing as any).sodium_per_serving),
            brand: ing.brand || undefined,
            category: ing.category || undefined,
            servingDescription: (ing as any).serving_description || '100g',
            servingGrams: Number((ing as any).serving_grams) || 100,
          };
        });
        setIngredients(loadedIngredients);
        setDbIngredientMap(ingredientMap);
      } else {
        // First time user - seed with default ingredients
        await seedDefaultIngredients();
      }

      // Load recipes
      const { data: dbRecipes } = await supabase
        .from('recipes')
        .select('*, recipe_ingredients(*)')
        .eq('user_id', user.id);

      if (dbRecipes && dbRecipes.length > 0) {
        const recipeMap = new Map<string, string>();
        const loadedRecipes: Recipe[] = dbRecipes.map(rec => {
          recipeMap.set(rec.id, rec.id);
          return {
            id: rec.id,
            name: rec.name,
            description: rec.description || '',
            image: rec.image || undefined,
            servings: rec.servings,
            category: rec.category as Recipe['category'],
            ingredients: (rec.recipe_ingredients || []).map((ri: any) => ({
              ingredientId: ri.ingredient_id,
              name: ri.name,
              amount: Number(ri.amount),
              unit: ri.unit,
            })),
            totalMacros: {
              calories: Number(rec.total_calories),
              protein: Number(rec.total_protein),
              fat: Number(rec.total_fat),
              carbs: Number(rec.total_carbs),
            },
            instructions: (rec as any).instructions || undefined,
            link: (rec as any).link || undefined,
          };
        });
        setRecipes(loadedRecipes);
        setDbRecipeMap(recipeMap);
      }

      // Load weekly targets
      const { data: dbTargets } = await supabase
        .from('weekly_targets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (dbTargets) {
        setWeeklyTargetsState({
          tdee: Number(dbTargets.tdee),
          strategy: dbTargets.strategy as WeeklyTargets['strategy'],
          dailyCalories: Number(dbTargets.daily_calories),
          protein: Number(dbTargets.protein),
          fat: Number(dbTargets.fat),
          carbs: Number(dbTargets.carbs),
        });
      }

      // Load meal plans
      const { data: dbMealPlans } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user.id);

      if (dbMealPlans && dbMealPlans.length > 0) {
        const loadedPlan: WeeklyPlan = { ...defaultWeeklyPlan };
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
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load your data');
    } finally {
      setIsLoading(false);
    }
  };

  const seedDefaultIngredients = async () => {
    if (!user) return;
    
    const ingredientMap = new Map<string, string>();
    const ingredientsToInsert = defaultIngredients.map(ing => ({
      user_id: user.id,
      name: ing.name,
      calories_per_serving: ing.caloriesPerServing,
      protein_per_serving: ing.proteinPerServing,
      fat_per_serving: ing.fatPerServing,
      carbs_per_serving: ing.carbsPerServing,
      fiber_per_serving: ing.fiberPerServing,
      sodium_per_serving: ing.sodiumPerServing,
      brand: ing.brand,
      category: ing.category,
    }));

    const { data, error } = await supabase
      .from('ingredients')
      .insert(ingredientsToInsert as any)
      .select();

    if (error) {
      console.error('Error seeding ingredients:', error);
      return;
    }

    if (data) {
      const loadedIngredients: BaseIngredient[] = data.map(ing => {
        ingredientMap.set(ing.id, ing.id);
        return {
          id: ing.id,
          name: ing.name,
          caloriesPerServing: Number((ing as any).calories_per_serving),
          proteinPerServing: Number((ing as any).protein_per_serving),
          fatPerServing: Number((ing as any).fat_per_serving),
          carbsPerServing: Number((ing as any).carbs_per_serving),
          fiberPerServing: Number((ing as any).fiber_per_serving),
          sodiumPerServing: Number((ing as any).sodium_per_serving),
          brand: ing.brand || undefined,
          category: ing.category || undefined,
          servingDescription: (ing as any).serving_description || '100g',
          servingGrams: Number((ing as any).serving_grams) || 100,
        };
      });
      setIngredients(loadedIngredients);
      setDbIngredientMap(ingredientMap);
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

  const calculateMacrosFromIngredients = useCallback((recipeIngredients: { ingredientId: string; amount: number }[]): Macros => {
    return recipeIngredients.reduce((totals, ing) => {
      const baseIng = ingredients.find(i => i.id === ing.ingredientId);
      if (baseIng) {
        const multiplier = ing.amount / baseIng.servingGrams;
        totals.calories += Math.round(baseIng.caloriesPerServing * multiplier);
        totals.protein += Math.round(baseIng.proteinPerServing * multiplier);
        totals.fat += Math.round(baseIng.fatPerServing * multiplier);
        totals.carbs += Math.round(baseIng.carbsPerServing * multiplier);
      }
      return totals;
    }, { calories: 0, protein: 0, fat: 0, carbs: 0 });
  }, [ingredients]);

  const setWeeklyTargets = async (targets: WeeklyTargets) => {
    setWeeklyTargetsState(targets);
    
    if (!user) return;

    const { error } = await supabase
      .from('weekly_targets')
      .upsert({
        user_id: user.id,
        tdee: targets.tdee,
        strategy: targets.strategy,
        daily_calories: targets.dailyCalories,
        protein: targets.protein,
        fat: targets.fat,
        carbs: targets.carbs,
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Error saving targets:', error);
      toast.error('Failed to save targets');
    }
  };

  const addMealToSlot = async (day: DayOfWeek, slot: MealSlot, recipe: Recipe) => {
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

    if (!user) return;

    const { data, error } = await supabase
      .from('meal_plans')
      .upsert({
        user_id: user.id,
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
      } as any, { onConflict: 'user_id,day_of_week,meal_slot' })
      .select()
      .single();

    if (error) {
      console.error('Error adding meal:', error);
      toast.error('Failed to save meal');
    } else if (data) {
      // Update the meal instance with the database ID
      setWeeklyPlan((prev) => ({
        ...prev,
        [day]: {
          ...prev[day],
          [slot]: { ...mealInstance, id: data.id },
        },
      }));
    }
  };

  const removeMealFromSlot = async (day: DayOfWeek, slot: MealSlot) => {
    setWeeklyPlan((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [slot]: undefined,
      },
    }));

    if (!user) return;

    const { error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('user_id', user.id)
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

    // Delete source, upsert to target, optionally upsert swap
    await supabase.from('meal_plans').delete().eq('user_id', user.id).eq('day_of_week', fromDay).eq('meal_slot', fromSlot);
    
    await supabase.from('meal_plans').upsert({
      user_id: user.id,
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
    } as any, { onConflict: 'user_id,day_of_week,meal_slot' });

    if (targetMeal) {
      await supabase.from('meal_plans').upsert({
        user_id: user.id,
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
      } as any, { onConflict: 'user_id,day_of_week,meal_slot' });
    }
  };

  const updateMealInstance = async (day: DayOfWeek, slot: MealSlot, updates: Partial<MealInstance>) => {
    setWeeklyPlan((prev) => {
      const currentMeal = prev[day][slot];
      if (!currentMeal) return prev;

      const updatedMeal = { ...currentMeal, ...updates };
      
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

    if (!user) return;

    const currentMeal = weeklyPlan[day][slot];
    if (!currentMeal) return;

    const updatedMeal = { ...currentMeal, ...updates };
    if (updates.ingredients) {
      updatedMeal.customMacros = calculateMacrosFromIngredients(
        updates.ingredients.map(i => ({ ingredientId: i.ingredientId, amount: i.amount }))
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
    } as any).eq('user_id', user.id).eq('day_of_week', day).eq('meal_slot', slot);
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
  const addIngredient = async (ingredient: BaseIngredient) => {
    setIngredients(prev => [...prev, ingredient]);

    if (!user) return;

    const { data, error } = await supabase.from('ingredients').insert({
      user_id: user.id,
      name: ingredient.name,
      calories_per_serving: ingredient.caloriesPerServing,
      protein_per_serving: ingredient.proteinPerServing,
      fat_per_serving: ingredient.fatPerServing,
      carbs_per_serving: ingredient.carbsPerServing,
      fiber_per_serving: ingredient.fiberPerServing,
      sodium_per_serving: ingredient.sodiumPerServing,
      brand: ingredient.brand,
      category: ingredient.category,
      serving_description: ingredient.servingDescription,
      serving_grams: ingredient.servingGrams,
    } as any).select().single();

    if (error) {
      console.error('Error adding ingredient:', error);
      toast.error('Failed to save ingredient');
    } else if (data) {
      // Replace temp ID with database ID
      setIngredients(prev => prev.map(ing => 
        ing.id === ingredient.id ? { ...ing, id: data.id } : ing
      ));
    }
  };

  const updateIngredient = async (id: string, updates: Partial<BaseIngredient>) => {
    setIngredients(prev => prev.map(ing => ing.id === id ? { ...ing, ...updates } : ing));

    if (!user) return;

    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.caloriesPerServing !== undefined) dbUpdates.calories_per_serving = updates.caloriesPerServing;
    if (updates.proteinPerServing !== undefined) dbUpdates.protein_per_serving = updates.proteinPerServing;
    if (updates.fatPerServing !== undefined) dbUpdates.fat_per_serving = updates.fatPerServing;
    if (updates.carbsPerServing !== undefined) dbUpdates.carbs_per_serving = updates.carbsPerServing;
    if (updates.fiberPerServing !== undefined) dbUpdates.fiber_per_serving = updates.fiberPerServing;
    if (updates.sodiumPerServing !== undefined) dbUpdates.sodium_per_serving = updates.sodiumPerServing;
    if (updates.brand !== undefined) dbUpdates.brand = updates.brand;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.servingDescription !== undefined) dbUpdates.serving_description = updates.servingDescription;
    if (updates.servingGrams !== undefined) dbUpdates.serving_grams = updates.servingGrams;

    await supabase.from('ingredients').update(dbUpdates as any).eq('id', id).eq('user_id', user.id);
  };

  const deleteIngredient = async (id: string) => {
    setIngredients(prev => prev.filter(ing => ing.id !== id));

    if (!user) return;

    await supabase.from('ingredients').delete().eq('id', id).eq('user_id', user.id);
  };

  // Recipe CRUD
  const addRecipe = async (recipe: Recipe) => {
    setRecipes(prev => [...prev, recipe]);

    if (!user) return;

    const { data: recipeData, error: recipeError } = await supabase.from('recipes').insert({
      user_id: user.id,
      name: recipe.name,
      description: recipe.description,
      image: recipe.image,
      servings: recipe.servings,
      category: recipe.category,
      total_calories: recipe.totalMacros.calories,
      total_protein: recipe.totalMacros.protein,
      total_fat: recipe.totalMacros.fat,
      total_carbs: recipe.totalMacros.carbs,
      instructions: recipe.instructions,
      link: recipe.link,
    } as any).select().single();

    if (recipeError || !recipeData) {
      console.error('Error adding recipe:', recipeError);
      toast.error('Failed to save recipe');
      return;
    }

    // Insert recipe ingredients
    if (recipe.ingredients.length > 0) {
      await supabase.from('recipe_ingredients').insert(
        recipe.ingredients.map(ing => ({
          recipe_id: recipeData.id,
          ingredient_id: ing.ingredientId,
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
        }))
      );
    }

    // Update local state with database ID
    setRecipes(prev => prev.map(r => 
      r.id === recipe.id ? { ...r, id: recipeData.id } : r
    ));
  };

  const updateRecipe = async (id: string, updates: Partial<Recipe>) => {
    setRecipes(prev => prev.map(rec => rec.id === id ? { ...rec, ...updates } : rec));

    if (!user) return;

    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.image !== undefined) dbUpdates.image = updates.image;
    if (updates.servings !== undefined) dbUpdates.servings = updates.servings;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.instructions !== undefined) dbUpdates.instructions = updates.instructions;
    if (updates.link !== undefined) dbUpdates.link = updates.link;
    if (updates.totalMacros !== undefined) {
      dbUpdates.total_calories = updates.totalMacros.calories;
      dbUpdates.total_protein = updates.totalMacros.protein;
      dbUpdates.total_fat = updates.totalMacros.fat;
      dbUpdates.total_carbs = updates.totalMacros.carbs;
    }

    await supabase.from('recipes').update(dbUpdates).eq('id', id).eq('user_id', user.id);

    // Update recipe ingredients if provided
    if (updates.ingredients) {
      await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);
      if (updates.ingredients.length > 0) {
        await supabase.from('recipe_ingredients').insert(
          updates.ingredients.map(ing => ({
            recipe_id: id,
            ingredient_id: ing.ingredientId,
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit,
          }))
        );
      }
    }
  };

  const deleteRecipe = async (id: string) => {
    setRecipes(prev => prev.filter(rec => rec.id !== id));

    if (!user) return;

    await supabase.from('recipes').delete().eq('id', id).eq('user_id', user.id);
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
