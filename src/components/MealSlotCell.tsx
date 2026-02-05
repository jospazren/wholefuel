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
}: MealSlotCellProps) {
  const { removeMealFromSlot } = useMealPlan();

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeMealFromSlot(day, slot);
  };

  return (
    <div
      className={cn(
        'h-20 rounded-lg border-2 border-dashed transition-all duration-200 relative',
        'flex items-center justify-center p-1.5 group',
        isDragOver && 'border-primary bg-primary/10 border-solid scale-[1.02]',
        !meal && !isDragOver && 'border-border/50 hover:border-border hover:bg-muted/30',
        meal && 'border-transparent bg-card shadow-sm border-solid cursor-pointer hover:shadow-md hover:bg-muted/30'
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={meal ? onEditClick : undefined}
    >
      {meal ? (
        <div className="w-full h-full p-2 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-1">
            <h5 className="text-xs font-medium text-foreground line-clamp-2 leading-tight">
              {meal.recipeName}
            </h5>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0 -mt-1 -mr-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity"
              onClick={handleRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5 text-macro-calories">
              <Flame className="h-2.5 w-2.5" />
              {Math.round(meal.customMacros.calories * meal.servingMultiplier)}
            </span>
            <span className="flex items-center gap-0.5 text-macro-protein">
              <Beef className="h-2.5 w-2.5" />
              {Math.round(meal.customMacros.protein * meal.servingMultiplier)}g
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
