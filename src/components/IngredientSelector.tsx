import { useState, useMemo, useRef } from 'react';
import { BaseIngredient } from '@/types/meal';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
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
  const [open, setOpen] = useState(false);

  const availableIngredients = useMemo(() => {
    return ingredients.filter(ing => {
      // Exclude already used
      if (usedIngredientIds.includes(ing.id)) return false;
      
      // Filter by category
      if (selectedCategory !== 'all' && ing.category !== selectedCategory) return false;
      
      return true;
    });
  }, [ingredients, usedIngredientIds, selectedCategory]);

  const handleSelect = (ingredientId: string) => {
    onSelect(ingredientId);
    setOpen(false);
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

      {/* Unified Search + Select */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-start gap-2 h-9 text-sm font-normal"
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Search & add ingredient ({availableIngredients.length} available)
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search ingredients..." />
            <CommandList>
              <CommandEmpty>No ingredient found.</CommandEmpty>
              <CommandGroup>
                {availableIngredients.map((ing) => (
                  <CommandItem
                    key={ing.id}
                    value={ing.name}
                    onSelect={() => handleSelect(ing.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{ing.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {ing.caloriesPerServing} cal/{ing.servingDescription || 'serving'}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
