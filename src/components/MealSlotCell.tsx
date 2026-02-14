import { MealInstance, DayOfWeek, MealSlot } from '@/types/meal';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { cn } from '@/lib/utils';
import { Plus, X } from 'lucide-react';
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

function MacroBadge({ value, label, colorClass }: { value: number; label: string; colorClass: string }) {
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-semibold text-white', colorClass)}>
      {value}{label}
    </span>
  );
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

  if (!meal) {
    return (
      <div
        className={cn(
          'rounded-lg border border-dashed transition-all duration-150 py-2 px-2',
          'flex items-center justify-center',
          isDragOver && 'border-primary bg-primary/10 border-solid',
          !isDragOver && 'border-border/40 hover:border-border hover:bg-muted/30'
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <Plus className={cn(
          'h-3 w-3 text-muted-foreground/40',
          isDragOver && 'text-primary scale-110'
        )} />
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
        'rounded-lg bg-card border shadow-xs transition-all duration-150 relative group',
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
      <div className="px-2 py-1.5">
        <div className="flex items-start justify-between gap-1 mb-1">
          <span className="text-[11px] font-medium text-foreground line-clamp-2 leading-tight flex-1">
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
        <div className="flex flex-wrap gap-0.5">
          <MacroBadge value={cals} label="K" colorClass="bg-macro-calories" />
          <MacroBadge value={protein} label="P" colorClass="bg-macro-protein" />
          <MacroBadge value={carbs} label="C" colorClass="bg-macro-carbs" />
          <MacroBadge value={fat} label="F" colorClass="bg-macro-fat" />
        </div>
      </div>
    </div>
  );
}
