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
      className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing shrink-0 touch-none"
        type="button"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      
      {/* Ingredient name selector - searchable */}
      <Popover open={openPopover} onOpenChange={onPopoverChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={openPopover}
            className="flex-1 min-w-0 h-8 justify-between font-normal"
          >
            <span className="truncate">
              {ingredient.name}
              {brand && <span className="text-muted-foreground"> [{brand}]</span>}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
      <div className="shrink-0 w-20">
        <Input
          type="text"
          inputMode="decimal"
          value={Math.round(ingredient.servingMultiplier * 100) / 100}
          onChange={e => onMultiplierChange(e.target.value)}
          className="w-16 h-8 text-center text-sm px-1"
        />
      </div>
      
      {/* Serving info */}
      <span className="w-24 text-sm text-muted-foreground text-left shrink-0 truncate" title={ingredientInfo.serving}>
        {ingredientInfo.serving}
      </span>
      
      {/* Per-ingredient macros - fixed widths, left aligned */}
      <span className="w-12 text-sm text-macro-calories text-left shrink-0">{ingredientInfo.calories}</span>
      <span className="w-10 text-sm text-macro-protein text-left shrink-0">{ingredientInfo.protein}</span>
      <span className="w-10 text-sm text-macro-carbs text-left shrink-0">{ingredientInfo.carbs}</span>
      <span className="w-10 text-sm text-macro-fat text-left shrink-0">{ingredientInfo.fat}</span>
      
      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
        onClick={onRemove}
        type="button"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
