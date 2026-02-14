import { MealInstance, DayOfWeek, MealSlot } from '@/types/meal';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MacroBadgeRow } from '@/components/MacroBadge';

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
        <span className={cn(
          'text-[13px] font-medium',
          isDragOver ? 'text-primary' : 'text-[#99A1AF] hover:text-[#4a5565]'
        )}>
          + Add meal
        </span>
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
        <MacroBadgeRow calories={cals} protein={protein} carbs={carbs} fat={fat} size="md" />
      </div>
    </div>
  );
}
