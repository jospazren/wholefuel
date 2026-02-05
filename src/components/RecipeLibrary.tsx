import { useState } from 'react';
import { sampleRecipes } from '@/data/recipes';
import { Recipe, RECIPE_CATEGORIES, CATEGORY_LABELS, RecipeCategory } from '@/types/meal';
import { RecipeCard } from '@/components/RecipeCard';
import { RecipeDetailSheet } from '@/components/RecipeDetailSheet';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch = recipe.name.toLowerCase().includes(search.toLowerCase()) ||
      recipe.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategories.size === 0 || selectedCategories.has(recipe.category);
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <div className={cn('flex flex-col h-full bg-card rounded-xl border shadow-sm', className)}>
      <div className="p-3 border-b space-y-3">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-primary" />
            <h3 className="font-display font-semibold text-sm">Recipe Library</h3>
          </div>
          
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-1.5">
            {RECIPE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full border transition-colors',
                  selectedCategories.has(cat)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                )}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1 p-2">
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
