import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Recipe, Macros } from '@/types/meal';
import { sampleRecipes as defaultRecipes } from '@/data/recipes';
import { useIngredients } from '@/contexts/IngredientsContext';

interface RecipesContextType {
  recipes: Recipe[];
  addRecipe: (recipe: Recipe) => void;
  updateRecipe: (id: string, updates: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  allTags: string[];
  renameTag: (oldName: string, newName: string) => Promise<void>;
  deleteTag: (tagName: string) => Promise<void>;
  calculateMacrosFromIngredients: (ingredients: { ingredientId: string; servingMultiplier: number }[]) => Macros;
  isLoading: boolean;
}

const RecipesContext = createContext<RecipesContextType | undefined>(undefined);

export function RecipesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const { ingredients } = useIngredients();
  const [recipes, setRecipes] = useState<Recipe[]>(defaultRecipes);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthPage = location.pathname === '/auth';

  useEffect(() => {
    if (user && !isAuthPage) {
      loadRecipes();
    } else if (!user) {
      setRecipes(defaultRecipes);
      setIsLoading(false);
    }
  }, [user, isAuthPage]);

  const loadRecipes = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const [recipesResult, tagsResult] = await Promise.all([
        supabase
          .from('recipes')
          .select('*, recipe_ingredients(*)')
          .eq('user_id', user.id),
        supabase
          .from('recipe_tags')
          .select('*')
          .eq('user_id', user.id),
      ]);

      const dbRecipes = recipesResult.data;
      const dbTags = tagsResult.data;

      if (dbRecipes && dbRecipes.length > 0) {
        const tagsByRecipe = new Map<string, string[]>();
        if (dbTags) {
          dbTags.forEach((t) => {
            const existing = tagsByRecipe.get(t.recipe_id) || [];
            existing.push(t.tag_name);
            tagsByRecipe.set(t.recipe_id, existing);
          });
        }

        const loadedRecipes: Recipe[] = dbRecipes.map(rec => {
          return {
            id: rec.id,
            name: rec.name,
            description: rec.description || '',
            image: rec.image || undefined,
            tags: tagsByRecipe.get(rec.id) || [],
            ingredients: (rec.recipe_ingredients || []).map((ri) => ({
              ingredientId: ri.ingredient_id,
              name: ri.name,
              servingMultiplier: Number(ri.serving_multiplier),
            })),
            totalMacros: {
              calories: Number(rec.total_calories),
              protein: Number(rec.total_protein),
              fat: Number(rec.total_fat),
              carbs: Number(rec.total_carbs),
            },
            instructions: rec.instructions || undefined,
            notes: rec.notes || undefined,
            link: rec.link || undefined,
          };
        });
        setRecipes(loadedRecipes);
      }
    } catch (error) {
      console.error('Error loading recipes:', error);
      toast.error('Failed to load recipes');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMacrosFromIngredients = useCallback((recipeIngredients: { ingredientId: string; servingMultiplier: number }[]): Macros => {
    return recipeIngredients.reduce((totals, ing) => {
      const baseIng = ingredients.find(i => i.id === ing.ingredientId);
      if (baseIng) {
        totals.calories += Math.round(baseIng.caloriesPerServing * ing.servingMultiplier);
        totals.protein += Math.round(baseIng.proteinPerServing * ing.servingMultiplier);
        totals.fat += Math.round(baseIng.fatPerServing * ing.servingMultiplier);
        totals.carbs += Math.round(baseIng.carbsPerServing * ing.servingMultiplier);
      }
      return totals;
    }, { calories: 0, protein: 0, fat: 0, carbs: 0 });
  }, [ingredients]);

  const addRecipe = async (recipe: Recipe) => {
    const previous = recipes;
    setRecipes(prev => [...prev, recipe]);

    if (!user) return;

    try {
    const { data: recipeData, error: recipeError } = await supabase.from('recipes').insert({
      user_id: user.id,
      name: recipe.name,
      description: recipe.description,
      image: recipe.image,
      category: recipe.tags?.[0] || null,
      total_calories: recipe.totalMacros.calories,
      total_protein: recipe.totalMacros.protein,
      total_fat: recipe.totalMacros.fat,
      total_carbs: recipe.totalMacros.carbs,
      instructions: recipe.instructions,
      notes: recipe.notes,
      link: recipe.link,
    }).select().single();

    if (recipeError || !recipeData) throw recipeError || new Error('No recipe data');

    if (recipe.ingredients.length > 0) {
      await supabase.from('recipe_ingredients').insert(
        recipe.ingredients.map(ing => ({
          recipe_id: recipeData.id,
          ingredient_id: ing.ingredientId,
          name: ing.name,
          serving_multiplier: ing.servingMultiplier,
        }))
      );
    }

    if (recipe.tags && recipe.tags.length > 0) {
      await supabase.from('recipe_tags').insert(
        recipe.tags.map(tag => ({
          recipe_id: recipeData.id,
          tag_name: tag,
          user_id: user.id,
        }))
      );
    }

    setRecipes(prev => prev.map(r =>
      r.id === recipe.id ? { ...r, id: recipeData.id } : r
    ));
    } catch {
      setRecipes(previous);
      toast.error('Failed to save recipe');
    }
  };

  const updateRecipe = async (id: string, updates: Partial<Recipe>) => {
    const previous = recipes;
    setRecipes(prev => prev.map(rec => rec.id === id ? { ...rec, ...updates } : rec));

    if (!user) return;

    try {
    const { error: recipeUpdateError } = await supabase.from('recipes').update({
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.image !== undefined && { image: updates.image }),
      ...(updates.tags !== undefined && { category: updates.tags?.[0] || null }),
      ...(updates.instructions !== undefined && { instructions: updates.instructions }),
      ...(updates.notes !== undefined && { notes: updates.notes }),
      ...(updates.link !== undefined && { link: updates.link }),
      ...(updates.totalMacros !== undefined && {
        total_calories: updates.totalMacros.calories,
        total_protein: updates.totalMacros.protein,
        total_fat: updates.totalMacros.fat,
        total_carbs: updates.totalMacros.carbs,
      }),
    }).eq('id', id).eq('user_id', user.id);
    if (recipeUpdateError) throw recipeUpdateError;

    if (updates.ingredients) {
      await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);
      if (updates.ingredients.length > 0) {
        await supabase.from('recipe_ingredients').insert(
          updates.ingredients.map(ing => ({
            recipe_id: id,
            ingredient_id: ing.ingredientId,
            name: ing.name,
            serving_multiplier: ing.servingMultiplier,
          }))
        );
      }
    }

    if (updates.tags !== undefined && user) {
      await supabase.from('recipe_tags').delete().eq('recipe_id', id);
      if (updates.tags.length > 0) {
        await supabase.from('recipe_tags').insert(
          updates.tags.map(tag => ({
            recipe_id: id,
            tag_name: tag,
            user_id: user.id,
          }))
        );
      }
    }
    } catch {
      setRecipes(previous);
      toast.error('Failed to update recipe');
    }
  };

  const deleteRecipe = async (id: string) => {
    const previous = recipes;
    setRecipes(prev => prev.filter(rec => rec.id !== id));

    if (!user) return;

    const { error } = await supabase.from('recipes').delete().eq('id', id).eq('user_id', user.id);
    if (error) {
      setRecipes(previous);
      toast.error('Failed to delete recipe');
    }
  };

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    recipes.forEach(r => r.tags?.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [recipes]);

  const renameTag = async (oldName: string, newName: string) => {
    const previous = recipes;
    setRecipes(prev => prev.map(r => ({
      ...r,
      tags: r.tags.map(t => t === oldName ? newName : t),
    })));

    if (!user) return;

    const { error } = await supabase
      .from('recipe_tags')
      .update({ tag_name: newName })
      .eq('tag_name', oldName)
      .eq('user_id', user.id);
    if (error) {
      setRecipes(previous);
      toast.error('Failed to rename tag');
    }
  };

  const deleteTag = async (tagName: string) => {
    const previous = recipes;
    setRecipes(prev => prev.map(r => ({
      ...r,
      tags: r.tags.filter(t => t !== tagName),
    })));

    if (!user) return;

    const { error } = await supabase
      .from('recipe_tags')
      .delete()
      .eq('tag_name', tagName)
      .eq('user_id', user.id);
    if (error) {
      setRecipes(previous);
      toast.error('Failed to delete tag');
    }
  };

  return (
    <RecipesContext.Provider
      value={{
        recipes,
        addRecipe,
        updateRecipe,
        deleteRecipe,
        allTags,
        renameTag,
        deleteTag,
        calculateMacrosFromIngredients,
        isLoading,
      }}
    >
      {children}
    </RecipesContext.Provider>
  );
}

export function useRecipes() {
  const context = useContext(RecipesContext);
  if (context === undefined) {
    throw new Error('useRecipes must be used within a RecipesProvider');
  }
  return context;
}
