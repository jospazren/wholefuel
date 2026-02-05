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
        'h-10 rounded border border-dashed transition-all duration-150 relative',
        'flex items-center group',
        isDragOver && 'border-primary bg-primary/10 border-solid',
        !meal && !isDragOver && 'border-border/40 hover:border-border hover:bg-muted/20 justify-center',
        meal && 'border-border/30 bg-muted/40 border-solid cursor-grab active:cursor-grabbing hover:bg-muted/60'
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={meal ? onEditClick : undefined}
      draggable={!!meal}
      onDragStart={meal ? handleDragStart : undefined}
    >
      {meal ? (
        <div className="w-full px-1.5 flex items-center justify-between gap-1">
          <span className="text-[10px] font-medium text-foreground truncate flex-1">
            {meal.recipeName}
          </span>
          <div className="flex items-center gap-1 text-[9px] shrink-0">
            <span className="text-macro-calories font-medium">
              {Math.round(meal.customMacros.calories * meal.servingMultiplier)}
            </span>
            <span className="text-macro-protein">
              {Math.round(meal.customMacros.protein * meal.servingMultiplier)}P
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity -mr-0.5"
            onClick={handleRemove}
          >
            <X className="h-2.5 w-2.5" />
          </Button>
        </div>
      ) : (
        <Plus className={cn(
          'h-3.5 w-3.5 text-muted-foreground/40 transition-all',
          isDragOver && 'text-primary scale-110'
        )} />
      )}
    </div>
  );
}
