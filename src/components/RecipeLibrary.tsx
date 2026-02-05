import { useState } from 'react';
import { sampleRecipes } from '@/data/recipes';
import { Recipe } from '@/types/meal';
import { RecipeCard } from '@/components/RecipeCard';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';

const categories = ['all', 'breakfast', 'lunch', 'dinner', 'snack'] as const;

interface RecipeLibraryProps {
  onDragStart: (recipe: Recipe) => void;
  onDragEnd: () => void;
  className?: string;
}

export function RecipeLibrary({ onDragStart, onDragEnd, className }: RecipeLibraryProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<typeof categories[number]>('all');

  const filteredRecipes = sampleRecipes.filter((recipe) => {
    const matchesSearch = recipe.name.toLowerCase().includes(search.toLowerCase()) ||
      recipe.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || recipe.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className={cn('flex flex-col h-full bg-card rounded-xl border shadow-sm', className)}>
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
          <h3 className="font-display font-semibold text-lg">Recipe Library</h3>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer capitalize transition-all hover:scale-105',
                selectedCategory === cat && 'shadow-sm'
              )}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
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
  );
}
