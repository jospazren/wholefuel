import { useState } from 'react';
import { MealSlotEntry, DayOfWeek, MealSlot, Recipe } from '@/types/meal';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { useRecipes } from '@/contexts/RecipesContext';
import { useMeals } from '@/contexts/MealsContext';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MacroBand } from '@/components/MacroBadge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MealSlotCellProps {
  day: DayOfWeek;
  slot: MealSlot;
  meal?: MealSlotEntry;
  isDragOver: boolean;
  isDuplicateTarget?: boolean;
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
  isDuplicateTarget,
  onDragOver,
  onDragLeave,
  onDrop,
  onEditClick,
  onMealDragStart,
}: MealSlotCellProps) {
  const { removeMealFromSlot, addMealToSlot, addEstimatedMealToSlot } = useMealPlan();
  const { recipes } = useRecipes();
  const { getMeal, getMealMacros } = useMeals();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [estName, setEstName] = useState('');
  const [estCalories, setEstCalories] = useState('');
  const [estProtein, setEstProtein] = useState('');
  const [estFat, setEstFat] = useState('');
  const [estCarbs, setEstCarbs] = useState('');

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

  const resetEstForm = () => {
    setEstName('');
    setEstCalories('');
    setEstProtein('');
    setEstFat('');
    setEstCarbs('');
  };

  const handleSubmitEstimate = async () => {
    if (!estName.trim()) return;
    await addEstimatedMealToSlot(day, slot, {
      name: estName.trim(),
      estCalories: Number(estCalories) || 0,
      estProtein: Number(estProtein) || 0,
      estFat: Number(estFat) || 0,
      estCarbs: Number(estCarbs) || 0,
    });
    resetEstForm();
    setPopoverOpen(false);
  };

  // Look up the actual meal data
  const mealData = meal ? getMeal(meal.mealId) : undefined;

  if (!meal || !mealData) {
    // In duplicate mode, show a clickable target
    if (isDuplicateTarget) {
      return (
        <div
          className={cn(
            'rounded-2xl transition-all duration-150 px-2 min-h-[60px]',
            'flex items-center justify-center cursor-pointer',
            'border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60'
          )}
          onClick={onEditClick}
        >
          <span className="text-[13px] font-medium text-primary">
            Place here
          </span>
        </div>
      );
    }

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
        <Popover open={popoverOpen} onOpenChange={(open) => { setPopoverOpen(open); if (!open) resetEstForm(); }}>
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
          <PopoverContent className="w-[260px] p-0 z-50 bg-popover" align="start">
            <Tabs defaultValue="recipe" className="w-full">
              <TabsList className="w-full grid grid-cols-2 rounded-none border-b border-border bg-transparent h-9">
                <TabsTrigger value="recipe" className="text-xs rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">Recipe</TabsTrigger>
                <TabsTrigger value="estimate" className="text-xs rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">Estimate</TabsTrigger>
              </TabsList>
              <TabsContent value="recipe" className="mt-0">
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
              </TabsContent>
              <TabsContent value="estimate" className="mt-0 p-3 space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <Input
                    value={estName}
                    onChange={(e) => setEstName(e.target.value)}
                    placeholder="e.g. Lunch out"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Calories</Label>
                    <Input type="number" value={estCalories} onChange={(e) => setEstCalories(e.target.value)} className="h-8 text-xs" placeholder="0" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Protein</Label>
                    <Input type="number" value={estProtein} onChange={(e) => setEstProtein(e.target.value)} className="h-8 text-xs" placeholder="0" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fat</Label>
                    <Input type="number" value={estFat} onChange={(e) => setEstFat(e.target.value)} className="h-8 text-xs" placeholder="0" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Carbs</Label>
                    <Input type="number" value={estCarbs} onChange={(e) => setEstCarbs(e.target.value)} className="h-8 text-xs" placeholder="0" />
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={handleSubmitEstimate}
                  disabled={!estName.trim()}
                >
                  Add estimate
                </Button>
              </TabsContent>
            </Tabs>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  const isEstimated = mealData.type === 'estimated';
  const macros = getMealMacros(mealData);

  return (
    <div
      className={cn(
        'rounded-xl bg-card border transition-all duration-150 relative group min-h-[60px]',
        'cursor-grab active:cursor-grabbing hover:shadow-sm',
        isEstimated ? 'border-dashed border-muted-foreground/40' : 'border-border',
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
          <span className={cn(
            'text-[12px] font-semibold text-foreground line-clamp-2 leading-tight flex-1',
            isEstimated && 'italic'
          )}>
            {mealData.name}
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
        <MacroBand calories={macros?.calories ?? 0} protein={macros?.protein ?? 0} carbs={macros?.carbs ?? 0} fat={macros?.fat ?? 0} />
      </div>
    </div>
  );
}