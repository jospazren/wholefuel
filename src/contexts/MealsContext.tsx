import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Meal, MealIngredient, Macros, Recipe, BaseIngredient } from '@/types/meal';
import { useIngredients } from '@/contexts/IngredientsContext';

interface MealsContextType {
  meals: Map<string, Meal>;
  getMeal: (id: string) => Meal | undefined;
  createMealFromRecipe: (recipe: Recipe) => Promise<Meal | null>;
  updateMeal: (id: string, updates: Partial<Pick<Meal, 'name' | 'ingredients'>>) => Promise<void>;
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
            sourceRecipeId: m.source_recipe_id || null,
            ingredients: (m.meal_ingredients || []).map((mi) => ({
              ingredientId: mi.ingredient_id,
              name: mi.name,
              servingMultiplier: Number(mi.serving_multiplier),
            })),
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

  const updateMeal = async (id: string, updates: Partial<Pick<Meal, 'name' | 'ingredients'>>) => {
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
      if (updates.name !== undefined) {
        const { error } = await supabase.from('meals').update({ name: updates.name }).eq('id', id);
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
        updateMeal,
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
