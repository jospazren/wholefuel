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
        'h-16 rounded-md border border-dashed transition-all duration-200 relative',
        'flex items-center justify-center group',
        isDragOver && 'border-primary bg-primary/10 border-solid scale-[1.02]',
        !meal && !isDragOver && 'border-border/40 hover:border-border hover:bg-muted/20',
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
        <div className="w-full h-full px-1.5 py-1 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-0.5">
            <h5 className="text-[11px] font-medium text-foreground line-clamp-2 leading-tight flex-1 min-w-0">
              {meal.recipeName}
            </h5>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity"
              onClick={handleRemove}
            >
              <X className="h-2.5 w-2.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
            <span className="text-macro-calories font-medium">
              {Math.round(meal.customMacros.calories * meal.servingMultiplier)}
            </span>
            <span className="text-macro-protein">
              {Math.round(meal.customMacros.protein * meal.servingMultiplier)}P
            </span>
          </div>
        </div>
      ) : (
        <div className={cn(
          'text-muted-foreground/40 transition-all',
          isDragOver && 'text-primary scale-110'
        )}>
          <Plus className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}
