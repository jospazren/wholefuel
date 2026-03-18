import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { BaseIngredient } from '@/types/meal';
import { Tables } from '@/integrations/supabase/types';
import { baseIngredients as defaultIngredients } from '@/data/ingredients';

const PAGE_SIZE = 50;

interface IngredientsContextType {
  /** Full ingredient list — used by recipe/meal dropdowns */
  ingredients: BaseIngredient[];
  /** Paginated + searchable subset for the browse page */
  browseIngredients: BaseIngredient[];
  browseTotal: number;
  browseQuery: string;
  setBrowseQuery: (q: string) => void;
  loadMoreBrowse: () => void;
  hasMoreBrowse: boolean;
  isBrowseLoading: boolean;
  addIngredient: (ingredient: BaseIngredient) => void;
  updateIngredient: (id: string, updates: Partial<BaseIngredient>) => void;
  deleteIngredient: (id: string) => void;
  isLoading: boolean;
}

const IngredientsContext = createContext<IngredientsContextType | undefined>(undefined);

function mapDbIngredient(ing: Tables<'ingredients'>): BaseIngredient {
  return {
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
  };
}

export function IngredientsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [ingredients, setIngredients] = useState<BaseIngredient[]>(defaultIngredients);
  const [isLoading, setIsLoading] = useState(true);

  // Browse state (paginated, server-searched)
  const [browseIngredients, setBrowseIngredients] = useState<BaseIngredient[]>([]);
  const [browseTotal, setBrowseTotal] = useState(0);
  const [browseQuery, setBrowseQueryRaw] = useState('');
  const [browseOffset, setBrowseOffset] = useState(0);
  const [isBrowseLoading, setIsBrowseLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const isAuthPage = location.pathname === '/auth';

  useEffect(() => {
    if (user && !isAuthPage) {
      loadIngredients();
    } else if (!user) {
      setIngredients(defaultIngredients);
      setBrowseIngredients([]);
      setIsLoading(false);
    }
  }, [user, isAuthPage]);

  // Server-side search with debounce
  const fetchBrowsePage = useCallback(async (query: string, offset: number, append: boolean) => {
    if (!user) return;
    setIsBrowseLoading(true);
    try {
      let q = supabase
        .from('ingredients')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('name');

      if (query.trim()) {
        q = q.ilike('name', `%${query.trim()}%`);
      }

      const { data, count, error } = await q.range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;

      const mapped = (data || []).map(mapDbIngredient);
      if (append) {
        setBrowseIngredients(prev => [...prev, ...mapped]);
      } else {
        setBrowseIngredients(mapped);
      }
      setBrowseTotal(count ?? 0);
      setBrowseOffset(offset + mapped.length);
    } catch (err) {
      console.error('Error fetching browse page:', err);
    } finally {
      setIsBrowseLoading(false);
    }
  }, [user]);

  // When query changes, debounce and reset
  const setBrowseQuery = useCallback((q: string) => {
    setBrowseQueryRaw(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setBrowseOffset(0);
      fetchBrowsePage(q, 0, false);
    }, 300);
  }, [fetchBrowsePage]);

  // Initial browse load after ingredients load
  useEffect(() => {
    if (user && !isAuthPage && !isLoading) {
      fetchBrowsePage(browseQuery, 0, false);
    }
  }, [user, isAuthPage, isLoading]);

  const loadMoreBrowse = useCallback(() => {
    fetchBrowsePage(browseQuery, browseOffset, true);
  }, [fetchBrowsePage, browseQuery, browseOffset]);

  const hasMoreBrowse = browseOffset < browseTotal;

  const loadIngredients = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data: dbIngredients } = await supabase
        .from('ingredients')
        .select('*')
        .eq('user_id', user.id);

      if (dbIngredients && dbIngredients.length > 0) {
        setIngredients(dbIngredients.map(mapDbIngredient));
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
      setIngredients(data.map(mapDbIngredient));
    }
  };

  const syncBrowse = (updater: (prev: BaseIngredient[]) => BaseIngredient[]) => {
    setBrowseIngredients(updater);
  };

  const addIngredient = async (ingredient: BaseIngredient) => {
    const previous = ingredients;
    setIngredients(prev => [...prev, ingredient]);
    syncBrowse(prev => [...prev, ingredient]);

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
      syncBrowse(() => previous);
      console.error('Error adding ingredient:', error);
      toast.error('Failed to save ingredient');
    } else if (data) {
      const swap = (prev: BaseIngredient[]) =>
        prev.map(ing => ing.id === ingredient.id ? { ...ing, id: data.id } : ing);
      setIngredients(swap);
      syncBrowse(swap);
    }
  };

  const updateIngredient = async (id: string, updates: Partial<BaseIngredient>) => {
    const previous = ingredients;
    const updater = (prev: BaseIngredient[]) =>
      prev.map(ing => ing.id === id ? { ...ing, ...updates } : ing);
    setIngredients(updater);
    syncBrowse(updater);

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
      syncBrowse(() => previous);
      toast.error('Failed to update ingredient');
    }
  };

  const deleteIngredient = async (id: string) => {
    const previous = ingredients;
    const filterer = (prev: BaseIngredient[]) => prev.filter(ing => ing.id !== id);
    setIngredients(filterer);
    syncBrowse(filterer);

    if (!user) return;

    const { error } = await supabase.from('ingredients').delete().eq('id', id).eq('user_id', user.id);
    if (error) {
      setIngredients(previous);
      syncBrowse(() => previous);
      toast.error('Failed to delete ingredient');
    }
  };

  return (
    <IngredientsContext.Provider
      value={{
        ingredients,
        browseIngredients,
        browseTotal,
        browseQuery,
        setBrowseQuery,
        loadMoreBrowse,
        hasMoreBrowse,
        isBrowseLoading,
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
