import { useState } from 'react';
import { MealInstance, DayOfWeek, MealSlot, Recipe } from '@/types/meal';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { useRecipes } from '@/contexts/RecipesContext';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MacroBand } from '@/components/MacroBadge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

interface MealSlotCellProps {
  day: DayOfWeek;
  slot: MealSlot;
  meal?: MealInstance;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onEditClick: () => void;
  onMealDragStart?: (e: React.DragEvent) => void;
}

export function MealSlotCell({
  day,
  slot,
  meal,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onEditClick,
  onMealDragStart,
}: MealSlotCellProps) {
  const { removeMealFromSlot, addMealToSlot } = useMealPlan();
  const { recipes } = useRecipes();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeMealFromSlot(day, slot);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    onMealDragStart?.(e);
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    addMealToSlot(day, slot, recipe);
    setPopoverOpen(false);
  };

  if (!meal) {
    return (
      <div
        className={cn(
          'rounded-2xl transition-all duration-150 px-2 min-h-[60px]',
          'flex items-center justify-center',
          isDragOver && 'border-primary bg-primary/10 border border-solid',
          !isDragOver && 'hover:bg-white/20'
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                'text-[13px] font-medium',
                isDragOver ? 'text-primary' : 'text-[#99A1AF] hover:text-[#4a5565]'
              )}
              type="button"
            >
              + Add meal
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0 z-50 bg-popover" align="start">
            <Command>
              <CommandInput placeholder="Search recipes..." />
              <CommandList>
                <CommandEmpty>No recipes found.</CommandEmpty>
                <CommandGroup>
                  {recipes.map((recipe) => (
                    <CommandItem
                      key={recipe.id}
                      value={recipe.name}
                      onSelect={() => handleSelectRecipe(recipe)}
                    >
                      <span className="truncate">{recipe.name}</span>
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

  const cals = Math.round(meal.customMacros.calories * meal.servingMultiplier);
  const protein = Math.round(meal.customMacros.protein * meal.servingMultiplier);
  const carbs = Math.round(meal.customMacros.carbs * meal.servingMultiplier);
  const fat = Math.round(meal.customMacros.fat * meal.servingMultiplier);

  return (
    <div
      className={cn(
        'rounded-2xl glass-card transition-all duration-150 relative group min-h-[60px]',
        'cursor-grab active:cursor-grabbing hover:shadow-sm',
        isDragOver && 'border-primary bg-primary/10'
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onEditClick}
      draggable
      onDragStart={handleDragStart}
    >
      <div className="px-2.5 py-2">
        <div className="flex items-start justify-between gap-1 mb-1.5">
          <span className="text-[12px] font-semibold text-foreground line-clamp-2 leading-tight flex-1">
            {meal.recipeName}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity"
            onClick={handleRemove}
          >
            <X className="h-2.5 w-2.5" />
          </Button>
        </div>
        <MacroBand calories={cals} protein={protein} carbs={carbs} fat={fat} />
      </div>
    </div>
  );
}
