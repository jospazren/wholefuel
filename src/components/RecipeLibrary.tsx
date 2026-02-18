import { useState } from 'react';
import { Recipe } from '@/types/meal';
import { RecipeCard } from '@/components/RecipeCard';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { RecipeEditorDialog, RecipeEditorMode } from '@/components/RecipeEditorDialog';

interface RecipeLibraryProps {
  onDragStart: (recipe: Recipe) => void;
  onDragEnd: () => void;
  className?: string;
}

export function RecipeLibrary({ onDragStart, onDragEnd, className }: RecipeLibraryProps) {
  const { recipes, allTags, updateRecipe, calculateMacrosFromIngredients } = useMealPlan();
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [editorMode, setEditorMode] = useState<RecipeEditorMode | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);

  const toggleTag = (tag: string) => {
    const newSet = new Set(selectedTags);
    if (newSet.has(tag)) newSet.delete(tag);
    else newSet.add(tag);
    setSelectedTags(newSet);
  };

  const clearTags = () => {
    setSelectedTags(new Set());
  };

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch = recipe.name.toLowerCase().includes(search.toLowerCase()) ||
      recipe.description.toLowerCase().includes(search.toLowerCase());
    const matchesTags = selectedTags.size === 0 || recipe.tags.some(t => selectedTags.has(t));
    return matchesSearch && matchesTags;
  });

  const handleRecipeClick = (recipe: Recipe) => {
    setEditorMode({ type: 'editRecipe', recipe });
    setEditingRecipeId(recipe.id);
    setEditorOpen(true);
  };

  const handleEditorSave = (data: { name: string; tags: string[]; ingredients: any[]; instructions?: string; notes?: string; link?: string }) => {
    if (!editingRecipeId) return;
    const macros = calculateMacrosFromIngredients(data.ingredients.map(i => ({
      ingredientId: i.ingredientId,
      servingMultiplier: i.servingMultiplier,
    })));
    updateRecipe(editingRecipeId, {
      name: data.name,
      category: data.tags[0] || 'main',
      tags: data.tags,
      ingredients: data.ingredients,
      totalMacros: macros,
      instructions: data.instructions,
      notes: data.notes,
      link: data.link,
    });
    setEditorOpen(false);
    setEditorMode(null);
    setEditingRecipeId(null);
  };

  return (
    <>
      <div
        className={cn(
          'flex flex-col h-full overflow-hidden',
          className
        )}
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(236,253,245,0.2) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search recipes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm rounded-2xl glass-subtle border-0 shadow-sm"
            />
          </div>

          {/* Tag Filters */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={clearTags}
              className={cn(
                'text-[10px] px-2.5 py-1 rounded-full font-medium transition-all',
                selectedTags.size === 0
                  ? 'text-primary-foreground shadow-md bg-primary'
                  : 'glass-subtle text-muted-foreground hover:bg-white/70'
              )}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn(
                  'text-[10px] px-2.5 py-1 rounded-full font-medium transition-all',
                  selectedTags.has(tag)
                    ? 'text-primary-foreground shadow-md bg-primary'
                    : 'glass-subtle text-muted-foreground hover:bg-white/70'
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1 px-2 pb-2">
          <div className="space-y-1.5 flex flex-col items-center">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                variant="compact"
                onDragStart={(e) => {
                  e.dataTransfer.setData('recipe', JSON.stringify(recipe));
                  onDragStart(recipe);
                }}
                onDragEnd={onDragEnd}
                onClick={() => handleRecipeClick(recipe)}
              />
            ))}
            {filteredRecipes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <UtensilsCrossed className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recipes found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Unified Editor Dialog */}
      <RecipeEditorDialog
        mode={editorMode}
        open={editorOpen}
        onClose={() => { setEditorOpen(false); setEditorMode(null); setEditingRecipeId(null); }}
        onSave={handleEditorSave}
      />
    </>
  );
}
