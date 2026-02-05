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
        'h-14 rounded border border-dashed transition-all duration-150 relative',
        'flex items-center group',
        isDragOver && 'border-primary bg-primary/10 border-solid',
        !meal && !isDragOver && 'border-border/40 hover:border-border hover:bg-muted/20 justify-center',
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
        <div className="w-full h-full px-1 py-0.5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-medium text-foreground line-clamp-2 leading-tight flex-1">
              {meal.recipeName}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity -mt-0.5 -mr-0.5"
              onClick={handleRemove}
            >
              <X className="h-2 w-2" />
            </Button>
          </div>
          <div className="flex items-center gap-1 text-[9px]">
            <span className="text-macro-calories font-medium">
              {Math.round(meal.customMacros.calories * meal.servingMultiplier)}
            </span>
            <span className="text-macro-protein">
              {Math.round(meal.customMacros.protein * meal.servingMultiplier)}P
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
