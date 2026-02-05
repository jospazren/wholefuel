import { MealInstance, DayOfWeek, MealSlot } from '@/types/meal';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { cn } from '@/lib/utils';
import { Plus, X, Flame, Beef } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const { removeMealFromSlot } = useMealPlan();

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeMealFromSlot(day, slot);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    onMealDragStart?.(e);
  };

  return (
    <div
      className={cn(
        'h-full rounded border border-dashed transition-all duration-150 relative',
        'flex items-center justify-center group',
        isDragOver && 'border-primary bg-primary/10 border-solid',
        !meal && !isDragOver && 'border-border/40 hover:border-border hover:bg-muted/20',
        meal && 'border-transparent bg-muted/50 cursor-grab active:cursor-grabbing hover:bg-muted/70'
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={meal ? onEditClick : undefined}
      draggable={!!meal}
      onDragStart={meal ? handleDragStart : undefined}
    >
      {meal ? (
        <div className="w-full px-2 py-2 flex flex-col items-center justify-center text-center gap-1">
          <div className="flex items-start justify-between w-full">
            <span className="text-[10px] font-medium text-foreground line-clamp-2 leading-tight flex-1 text-center">
              {meal.recipeName}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity absolute top-1 right-1"
              onClick={handleRemove}
            >
              <X className="h-2.5 w-2.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1 text-[8px]">
            <span className="text-macro-calories font-medium">
              {Math.round(meal.customMacros.calories * meal.servingMultiplier)}
            </span>
            <span className="text-macro-protein">
              {Math.round(meal.customMacros.protein * meal.servingMultiplier)}P
            </span>
            <span className="text-macro-carbs">
              {Math.round(meal.customMacros.carbs * meal.servingMultiplier)}C
            </span>
            <span className="text-macro-fat">
              {Math.round(meal.customMacros.fat * meal.servingMultiplier)}F
            </span>
          </div>
        </div>
      ) : (
        <Plus className={cn(
          'h-3 w-3 text-muted-foreground/30 transition-all',
          isDragOver && 'text-primary scale-110'
        )} />
      )}
    </div>
  );
}
