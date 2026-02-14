import { useState } from 'react';
import { Recipe, RECIPE_CATEGORIES, CATEGORY_LABELS, RecipeCategory } from '@/types/meal';
import { RecipeCard } from '@/components/RecipeCard';
import { RecipeDetailSheet } from '@/components/RecipeDetailSheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMealPlan } from '@/contexts/MealPlanContext';

interface RecipeLibraryProps {
  onDragStart: (recipe: Recipe) => void;
  onDragEnd: () => void;
  className?: string;
}

export function RecipeLibrary({ onDragStart, onDragEnd, className }: RecipeLibraryProps) {
  const { recipes } = useMealPlan();
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<RecipeCategory>>(new Set());
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const toggleCategory = (category: RecipeCategory) => {
    const newSet = new Set(selectedCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setSelectedCategories(newSet);
  };

  const clearCategories = () => {
    setSelectedCategories(new Set());
  };

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch = recipe.name.toLowerCase().includes(search.toLowerCase()) ||
      recipe.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategories.size === 0 || selectedCategories.has(recipe.category);
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <div
        className={cn(
          'flex flex-col h-full overflow-hidden',
          className
        )}
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

          {/* Category Filters */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={clearCategories}
              className={cn(
                'text-[10px] px-2.5 py-1 rounded-full font-medium transition-all',
                selectedCategories.size === 0
                  ? 'text-white shadow-md'
                  : 'glass-subtle text-muted-foreground hover:bg-white/70'
              )}
              style={selectedCategories.size === 0 ? {
                background: 'linear-gradient(135deg, rgba(0,188,125,1), rgba(0,187,167,1))',
                boxShadow: '0 4px 12px rgba(0,188,125,0.3)',
              } : undefined}
            >
              All
            </button>
            {RECIPE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={cn(
                  'text-[10px] px-2.5 py-1 rounded-full font-medium transition-all',
                  selectedCategories.has(cat)
                    ? 'text-white shadow-md'
                    : 'glass-subtle text-muted-foreground hover:bg-white/70'
                )}
                style={selectedCategories.has(cat) ? {
                  background: 'linear-gradient(135deg, rgba(0,188,125,1), rgba(0,187,167,1))',
                  boxShadow: '0 4px 12px rgba(0,188,125,0.3)',
                } : undefined}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1 px-2 pb-2">
          <div className="space-y-1.5">
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
                onClick={() => setSelectedRecipe(recipe)}
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

      <RecipeDetailSheet 
        recipe={selectedRecipe} 
        open={!!selectedRecipe} 
        onClose={() => setSelectedRecipe(null)} 
      />
    </>
  );
}
