import { useState, useMemo } from 'react';
import { BaseIngredient } from '@/types/meal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IngredientSelectorProps {
  ingredients: BaseIngredient[];
  usedIngredientIds: string[];
  onSelect: (ingredientId: string) => void;
}

const INGREDIENT_CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'protein', label: 'Protein' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'carbs', label: 'Carbs' },
  { value: 'fats', label: 'Fats' },
  { value: 'vegetables', label: 'Vegetables' },
  { value: 'fruits', label: 'Fruits' },
  { value: 'other', label: 'Other' },
];

export function IngredientSelector({ ingredients, usedIngredientIds, onSelect }: IngredientSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const availableIngredients = useMemo(() => {
    return ingredients.filter(ing => {
      // Exclude already used
      if (usedIngredientIds.includes(ing.id)) return false;
      
      // Filter by category
      if (selectedCategory !== 'all' && ing.category !== selectedCategory) return false;
      
      // Filter by search
      if (searchQuery && !ing.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      return true;
    });
  }, [ingredients, usedIngredientIds, selectedCategory, searchQuery]);

  const handleSelect = (ingredientId: string) => {
    onSelect(ingredientId);
    setSearchQuery('');
  };

  return (
    <div className="space-y-3">
      {/* Category Filter Chips */}
      <div className="flex flex-wrap gap-1.5">
        {INGREDIENT_CATEGORIES.map((cat) => (
          <Badge
            key={cat.value}
            variant={selectedCategory === cat.value ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer text-xs transition-colors',
              selectedCategory === cat.value
                ? 'bg-primary hover:bg-primary/90'
                : 'hover:bg-muted'
            )}
            onClick={() => setSelectedCategory(cat.value)}
          >
            {cat.label}
          </Badge>
        ))}
      </div>

      {/* Search + Select */}
      <div className="flex items-center gap-2">
        <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-8 text-sm"
          />
        </div>
      </div>

      {/* Ingredient Select */}
      {availableIngredients.length > 0 ? (
        <Select onValueChange={handleSelect}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder={`Select ingredient (${availableIngredients.length} available)`} />
          </SelectTrigger>
          <SelectContent>
            {availableIngredients.map((ing) => (
              <SelectItem key={ing.id} value={ing.id}>
                <div className="flex items-center gap-2">
                  <span>{ing.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({ing.caloriesPer100g} cal/100g)
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">
          {searchQuery || selectedCategory !== 'all'
            ? 'No matching ingredients found'
            : 'All ingredients have been added'}
        </p>
      )}
    </div>
  );
}
