import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { BaseIngredient } from '@/types/meal';
import { baseIngredients as defaultIngredients } from '@/data/ingredients';

interface IngredientsContextType {
  ingredients: BaseIngredient[];
  addIngredient: (ingredient: BaseIngredient) => void;
  updateIngredient: (id: string, updates: Partial<BaseIngredient>) => void;
  deleteIngredient: (id: string) => void;
  isLoading: boolean;
}

const IngredientsContext = createContext<IngredientsContextType | undefined>(undefined);

export function IngredientsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [ingredients, setIngredients] = useState<BaseIngredient[]>(defaultIngredients);
  const [isLoading, setIsLoading] = useState(true);
  const [dbIngredientMap, setDbIngredientMap] = useState<Map<string, string>>(new Map());

  const isAuthPage = location.pathname === '/auth';

  useEffect(() => {
    if (user && !isAuthPage) {
      loadIngredients();
    } else if (!user) {
      setIngredients(defaultIngredients);
      setDbIngredientMap(new Map());
      setIsLoading(false);
    }
  }, [user, isAuthPage]);

  const loadIngredients = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
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
        await seedDefaultIngredients();
      }
    } catch (error) {
      console.error('Error loading ingredients:', error);
      toast.error('Failed to load ingredients');
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

  return (
    <IngredientsContext.Provider
      value={{
        ingredients,
        addIngredient,
        updateIngredient,
        deleteIngredient,
        isLoading,
      }}
    >
      {children}
    </IngredientsContext.Provider>
  );
}

export function useIngredients() {
  const context = useContext(IngredientsContext);
  if (context === undefined) {
    throw new Error('useIngredients must be used within an IngredientsProvider');
  }
  return context;
}
