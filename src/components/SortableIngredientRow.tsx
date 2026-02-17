import { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { RecipeIngredient, BaseIngredient } from '@/types/meal';

interface SortableIngredientRowProps {
  ingredient: RecipeIngredient;
  index: number;
  ingredientInfo: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    serving: string;
  };
  ingredientDb: BaseIngredient[];
  sortedIngredientDb: BaseIngredient[];
  formIngredients: RecipeIngredient[];
  openPopover: boolean;
  onPopoverChange: (open: boolean) => void;
  onMultiplierChange: (value: string) => void;
  onSwap: (newIngredientId: string) => void;
  onRemove: () => void;
}

export function SortableIngredientRow({
  ingredient,
  index,
  ingredientInfo,
  ingredientDb,
  sortedIngredientDb,
  formIngredients,
  openPopover,
  onPopoverChange,
  onMultiplierChange,
  onSwap,
  onRemove,
}: SortableIngredientRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ingredient.ingredientId + '-' + index });

  // Local state for input to allow typing decimal points
  const [localValue, setLocalValue] = useState(
    String(Math.round(ingredient.servingMultiplier * 100) / 100)
  );

  // Sync local value when prop changes (e.g., from external update)
  useEffect(() => {
    setLocalValue(String(Math.round(ingredient.servingMultiplier * 100) / 100));
  }, [ingredient.servingMultiplier]);

  const handleInputChange = (value: string) => {
    const normalized = value.replace(',', '.');
    setLocalValue(normalized);
    const num = parseFloat(normalized);
    if (!isNaN(num) && num >= 0) {
      onMultiplierChange(normalized);
    }
  };

  const handleBlur = () => {
    const num = parseFloat(localValue);
    if (isNaN(num) || num < 0) {
      setLocalValue(String(Math.round(ingredient.servingMultiplier * 100) / 100));
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const brand = ingredientDb.find(i => i.id === ingredient.ingredientId)?.brand;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 py-2.5 border-b border-border/30 last:border-b-0"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0 touch-none"
        type="button"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      
      {/* Ingredient name selector */}
      <Popover open={openPopover} onOpenChange={onPopoverChange}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={openPopover}
            className="flex-1 min-w-0 h-8 justify-start font-normal px-0 hover:bg-transparent"
          >
            <span className="truncate text-sm font-medium text-emerald-700 dark:text-emerald-400">
              {ingredient.name}
              {brand && <span className="text-muted-foreground font-normal"> [{brand}]</span>}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search ingredients..." />
            <CommandList>
              <CommandEmpty>No ingredient found.</CommandEmpty>
              <CommandGroup>
                {sortedIngredientDb
                  .filter(i => i.id === ingredient.ingredientId || !formIngredients.some(fi => fi.ingredientId === i.id))
                  .map(i => (
                    <CommandItem
                      key={i.id}
                      value={`${i.name} ${i.brand || ''}`}
                      onSelect={() => {
                        onSwap(i.id);
                        onPopoverChange(false);
                      }}
                    >
                      {i.name}{i.brand && <span className="text-muted-foreground"> [{i.brand}]</span>}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Serving multiplier input */}
      <div className="shrink-0 w-14">
        <Input
          type="text"
          inputMode="decimal"
          value={localValue}
          onChange={e => handleInputChange(e.target.value)}
          onBlur={handleBlur}
          className="w-14 h-8 text-center text-sm px-1 border-0 bg-transparent font-semibold text-emerald-700 dark:text-emerald-400"
        />
      </div>
      {/* Serving description */}
      <span className="w-20 shrink-0 text-[11px] text-muted-foreground truncate text-left" title={ingredientInfo.serving}>
        {ingredientInfo.serving}
      </span>
      
      {/* Per-ingredient macros - centered with colored backgrounds */}
      <span className="w-14 text-center shrink-0 text-sm py-1 rounded-md bg-slate-500/5 text-slate-600">{ingredientInfo.calories}</span>
      <span className="w-11 text-center shrink-0 text-sm py-1 rounded-md bg-emerald-600/5 text-emerald-600 font-medium">{ingredientInfo.protein}</span>
      <span className="w-11 text-center shrink-0 text-sm py-1 rounded-md bg-cyan-600/5 text-cyan-600 font-medium">{ingredientInfo.carbs}</span>
      <span className="w-11 text-center shrink-0 text-sm py-1 rounded-md bg-orange-500/5 text-orange-500 font-medium">{ingredientInfo.fat}</span>
      
      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground/40 hover:text-destructive shrink-0"
        onClick={onRemove}
        type="button"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
