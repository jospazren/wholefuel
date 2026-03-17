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

  const isAuthPage = location.pathname === '/auth';

  useEffect(() => {
    if (user && !isAuthPage) {
      loadIngredients();
    } else if (!user) {
      setIngredients(defaultIngredients);
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
        const loadedIngredients: BaseIngredient[] = dbIngredients.map(ing => ({
          id: ing.id,
          name: ing.name,
          caloriesPerServing: Number(ing.calories_per_serving),
          proteinPerServing: Number(ing.protein_per_serving),
          fatPerServing: Number(ing.fat_per_serving),
          carbsPerServing: Number(ing.carbs_per_serving),
          fiberPerServing: Number(ing.fiber_per_serving),
          sodiumPerServing: Number(ing.sodium_per_serving),
          brand: ing.brand || undefined,
          category: ing.category || undefined,
          servingDescription: ing.serving_description || '100g',
          servingGrams: Number(ing.serving_grams) || 100,
        }));
        setIngredients(loadedIngredients);
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
      serving_description: ing.servingDescription,
      serving_grams: ing.servingGrams,
    }));

    const { data, error } = await supabase
      .from('ingredients')
      .insert(ingredientsToInsert)
      .select();

    if (error) {
      console.error('Error seeding ingredients:', error);
      return;
    }

    if (data) {
      const loadedIngredients: BaseIngredient[] = data.map(ing => ({
        id: ing.id,
        name: ing.name,
        caloriesPerServing: Number(ing.calories_per_serving),
        proteinPerServing: Number(ing.protein_per_serving),
        fatPerServing: Number(ing.fat_per_serving),
        carbsPerServing: Number(ing.carbs_per_serving),
        fiberPerServing: Number(ing.fiber_per_serving),
        sodiumPerServing: Number(ing.sodium_per_serving),
        brand: ing.brand || undefined,
        category: ing.category || undefined,
        servingDescription: ing.serving_description || '100g',
        servingGrams: Number(ing.serving_grams) || 100,
      }));
      setIngredients(loadedIngredients);
    }
  };

  const addIngredient = async (ingredient: BaseIngredient) => {
    const previous = ingredients;
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
    }).select().single();

    if (error) {
      setIngredients(previous);
      console.error('Error adding ingredient:', error);
      toast.error('Failed to save ingredient');
    } else if (data) {
      setIngredients(prev => prev.map(ing =>
        ing.id === ingredient.id ? { ...ing, id: data.id } : ing
      ));
    }
  };

  const updateIngredient = async (id: string, updates: Partial<BaseIngredient>) => {
    const previous = ingredients;
    setIngredients(prev => prev.map(ing => ing.id === id ? { ...ing, ...updates } : ing));

    if (!user) return;

    const { error: updateError } = await supabase.from('ingredients').update({
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.caloriesPerServing !== undefined && { calories_per_serving: updates.caloriesPerServing }),
      ...(updates.proteinPerServing !== undefined && { protein_per_serving: updates.proteinPerServing }),
      ...(updates.fatPerServing !== undefined && { fat_per_serving: updates.fatPerServing }),
      ...(updates.carbsPerServing !== undefined && { carbs_per_serving: updates.carbsPerServing }),
      ...(updates.fiberPerServing !== undefined && { fiber_per_serving: updates.fiberPerServing }),
      ...(updates.sodiumPerServing !== undefined && { sodium_per_serving: updates.sodiumPerServing }),
      ...(updates.brand !== undefined && { brand: updates.brand }),
      ...(updates.category !== undefined && { category: updates.category }),
      ...(updates.servingDescription !== undefined && { serving_description: updates.servingDescription }),
      ...(updates.servingGrams !== undefined && { serving_grams: updates.servingGrams }),
    }).eq('id', id).eq('user_id', user.id);
    if (updateError) {
      setIngredients(previous);
      toast.error('Failed to update ingredient');
    }
  };

  const deleteIngredient = async (id: string) => {
    const previous = ingredients;
    setIngredients(prev => prev.filter(ing => ing.id !== id));

    if (!user) return;

    const { error } = await supabase.from('ingredients').delete().eq('id', id).eq('user_id', user.id);
    if (error) {
      setIngredients(previous);
      toast.error('Failed to delete ingredient');
    }
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
