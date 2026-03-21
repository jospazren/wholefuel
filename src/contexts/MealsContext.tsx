import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Meal, MealIngredient, Macros, Recipe, BaseIngredient, MealType } from '@/types/meal';
import { useIngredients } from '@/contexts/IngredientsContext';

interface EstimatedMealData {
  name: string;
  estCalories: number;
  estProtein: number;
  estFat: number;
  estCarbs: number;
}

interface MealsContextType {
  meals: Map<string, Meal>;
  getMeal: (id: string) => Meal | undefined;
  createMealFromRecipe: (recipe: Recipe) => Promise<Meal | null>;
  createEstimatedMeal: (data: EstimatedMealData) => Promise<Meal | null>;
  duplicateMeal: (id: string) => Promise<Meal | null>;
  updateMeal: (id: string, updates: Partial<Pick<Meal, 'name' | 'ingredients' | 'estCalories' | 'estProtein' | 'estFat' | 'estCarbs'>>) => Promise<void>;
  adjustMealPortion: (id: string, multiplier: number) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;
  getMealMacros: (meal: Meal) => Macros;
  isLoading: boolean;
}

const MealsContext = createContext<MealsContextType | undefined>(undefined);

export function MealsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const { ingredients } = useIngredients();
  const [meals, setMeals] = useState<Map<string, Meal>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const isAuthPage = location.pathname === '/auth';

  useEffect(() => {
    if (user && !isAuthPage) {
      loadMeals();
    } else if (!user) {
      setMeals(new Map());
      setIsLoading(false);
    }
  }, [user, isAuthPage]);

  const loadMeals = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data: dbMeals, error } = await supabase
        .from('meals')
        .select('*, meal_ingredients(*)')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading meals:', error);
        toast.error('Failed to load meals');
        return;
      }

      if (dbMeals) {
        const mealsMap = new Map<string, Meal>();
        dbMeals.forEach((m) => {
          mealsMap.set(m.id, {
            id: m.id,
            name: m.name,
            type: (m.type as MealType) || 'planned',
            sourceRecipeId: m.source_recipe_id || null,
            ingredients: (m.meal_ingredients || []).map((mi) => ({
              ingredientId: mi.ingredient_id,
              name: mi.name,
              servingMultiplier: Number(mi.serving_multiplier),
            })),
            estCalories: m.est_calories != null ? Number(m.est_calories) : undefined,
            estProtein: m.est_protein != null ? Number(m.est_protein) : undefined,
            estFat: m.est_fat != null ? Number(m.est_fat) : undefined,
            estCarbs: m.est_carbs != null ? Number(m.est_carbs) : undefined,
          });
        });
        setMeals(mealsMap);
      }
    } catch (error) {
      console.error('Error loading meals:', error);
      toast.error('Failed to load meals');
    } finally {
      setIsLoading(false);
    }
  };

  const getMeal = useCallback((id: string): Meal | undefined => {
    return meals.get(id);
  }, [meals]);

  // Memoized ingredient lookup map for O(1) access
  const ingredientMap = useMemo(() => {
    const map = new Map<string, BaseIngredient>();
    ingredients.forEach(i => map.set(i.id, i));
    return map;
  }, [ingredients]);

  const getMealMacros = useCallback((meal: Meal): Macros => {
    if (meal.type === 'estimated') {
      return {
        calories: meal.estCalories ?? 0,
        protein: meal.estProtein ?? 0,
        fat: meal.estFat ?? 0,
        carbs: meal.estCarbs ?? 0,
      };
    }

    return meal.ingredients.reduce((totals, ing) => {
      const baseIng = ingredientMap.get(ing.ingredientId);
      if (baseIng) {
        totals.calories += Math.round(baseIng.caloriesPerServing * ing.servingMultiplier);
        totals.protein += Math.round(baseIng.proteinPerServing * ing.servingMultiplier);
        totals.fat += Math.round(baseIng.fatPerServing * ing.servingMultiplier);
        totals.carbs += Math.round(baseIng.carbsPerServing * ing.servingMultiplier);
      }
      return totals;
    }, { calories: 0, protein: 0, fat: 0, carbs: 0 });
  }, [ingredientMap]);

  const createMealFromRecipe = async (recipe: Recipe): Promise<Meal | null> => {
    if (!user) return null;

    const { data: mealData, error: mealError } = await supabase
      .from('meals')
      .insert({
        user_id: user.id,
        source_recipe_id: recipe.id,
        name: recipe.name,
        type: 'planned',
      })
      .select()
      .single();

    if (mealError || !mealData) {
      console.error('Error creating meal:', mealError);
      toast.error('Failed to create meal');
      return null;
    }

    if (recipe.ingredients.length > 0) {
      const { error: ingError } = await supabase
        .from('meal_ingredients')
        .insert(
          recipe.ingredients.map(ing => ({
            meal_id: mealData.id,
            ingredient_id: ing.ingredientId,
            name: ing.name,
            serving_multiplier: ing.servingMultiplier,
          }))
        );

      if (ingError) {
        console.error('Error creating meal ingredients:', ingError);
      }
    }

    const meal: Meal = {
      id: mealData.id,
      name: recipe.name,
      type: 'planned',
      sourceRecipeId: recipe.id,
      ingredients: recipe.ingredients.map(ing => ({
        ingredientId: ing.ingredientId,
        name: ing.name,
        servingMultiplier: ing.servingMultiplier,
      })),
    };

    setMeals(prev => {
      const next = new Map(prev);
      next.set(meal.id, meal);
      return next;
    });

    return meal;
  };

  const createEstimatedMeal = async (data: EstimatedMealData): Promise<Meal | null> => {
    if (!user) return null;

    const { data: mealData, error } = await supabase
      .from('meals')
      .insert({
        user_id: user.id,
        name: data.name,
        type: 'estimated',
        est_calories: data.estCalories,
        est_protein: data.estProtein,
        est_fat: data.estFat,
        est_carbs: data.estCarbs,
        source_recipe_id: null,
      })
      .select()
      .single();

    if (error || !mealData) {
      console.error('Error creating estimated meal:', error);
      toast.error('Failed to create estimated meal');
      return null;
    }

    const meal: Meal = {
      id: mealData.id,
      name: data.name,
      type: 'estimated',
      sourceRecipeId: null,
      ingredients: [],
      estCalories: data.estCalories,
      estProtein: data.estProtein,
      estFat: data.estFat,
      estCarbs: data.estCarbs,
    };

    setMeals(prev => {
      const next = new Map(prev);
      next.set(meal.id, meal);
      return next;
    });

    return meal;
  };

  const updateMeal = async (id: string, updates: Partial<Pick<Meal, 'name' | 'ingredients' | 'estCalories' | 'estProtein' | 'estFat' | 'estCarbs'>>) => {
    const previousMeals = meals;
    setMeals(prev => {
      const next = new Map(prev);
      const existing = next.get(id);
      if (existing) {
        next.set(id, { ...existing, ...updates });
      }
      return next;
    });

    if (!user) return;

    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.estCalories !== undefined) dbUpdates.est_calories = updates.estCalories;
      if (updates.estProtein !== undefined) dbUpdates.est_protein = updates.estProtein;
      if (updates.estFat !== undefined) dbUpdates.est_fat = updates.estFat;
      if (updates.estCarbs !== undefined) dbUpdates.est_carbs = updates.estCarbs;

      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase.from('meals').update(dbUpdates).eq('id', id);
        if (error) throw error;
      }

      if (updates.ingredients) {
        await supabase.from('meal_ingredients').delete().eq('meal_id', id);
        if (updates.ingredients.length > 0) {
          const { error } = await supabase.from('meal_ingredients').insert(
            updates.ingredients.map(ing => ({
              meal_id: id,
              ingredient_id: ing.ingredientId,
              name: ing.name,
              serving_multiplier: ing.servingMultiplier,
            }))
          );
          if (error) throw error;
        }
      }
    } catch {
      setMeals(previousMeals);
      toast.error('Failed to update meal');
    }
  };

  const adjustMealPortion = async (id: string, multiplier: number) => {
    const meal = meals.get(id);
    if (!meal || meal.type !== 'planned' || multiplier <= 0) return;

    const updatedIngredients = meal.ingredients.map(ing => ({
      ...ing,
      servingMultiplier: Math.round(ing.servingMultiplier * multiplier * 100) / 100,
    }));

    await updateMeal(id, { ingredients: updatedIngredients });
  };

  const duplicateMeal = async (id: string): Promise<Meal | null> => {
    const original = meals.get(id);
    if (!original || !user) return null;

    const { data: mealData, error: mealError } = await supabase
      .from('meals')
      .insert({
        user_id: user.id,
        source_recipe_id: original.sourceRecipeId,
        name: original.name,
        type: original.type,
        est_calories: original.estCalories ?? null,
        est_protein: original.estProtein ?? null,
        est_fat: original.estFat ?? null,
        est_carbs: original.estCarbs ?? null,
      })
      .select()
      .single();

    if (mealError || !mealData) {
      toast.error('Failed to duplicate meal');
      return null;
    }

    if (original.ingredients.length > 0) {
      const { error: ingError } = await supabase
        .from('meal_ingredients')
        .insert(original.ingredients.map(ing => ({
          meal_id: mealData.id,
          ingredient_id: ing.ingredientId,
          name: ing.name,
          serving_multiplier: ing.servingMultiplier,
        })));
      if (ingError) console.error('Error duplicating meal ingredients:', ingError);
    }

    const cloned: Meal = {
      ...original,
      id: mealData.id,
    };

    setMeals(prev => {
      const next = new Map(prev);
      next.set(cloned.id, cloned);
      return next;
    });

    return cloned;
  };

  const deleteMeal = async (id: string) => {
    const previousMeals = meals;
    setMeals(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });

    if (!user) return;

    const { error } = await supabase.from('meals').delete().eq('id', id);
    if (error) {
      setMeals(previousMeals);
      toast.error('Failed to delete meal');
    }
  };

  return (
    <MealsContext.Provider
      value={{
        meals,
        getMeal,
        createMealFromRecipe,
        createEstimatedMeal,
        duplicateMeal,
        updateMeal,
        adjustMealPortion,
        deleteMeal,
        getMealMacros,
        isLoading,
      }}
    >
      {children}
    </MealsContext.Provider>
  );
}

export function useMeals() {
  const context = useContext(MealsContext);
  if (context === undefined) {
    throw new Error('useMeals must be used within a MealsProvider');
  }
  return context;
}