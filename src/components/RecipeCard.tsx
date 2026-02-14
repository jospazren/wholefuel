import { Recipe } from '@/types/meal';
import { cn } from '@/lib/utils';
import { MacroBadgeRow } from '@/components/MacroBadge';

interface RecipeCardProps {
  recipe: Recipe;
  variant?: 'default' | 'compact' | 'dragging';
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onClick?: () => void;
  className?: string;
}

export function RecipeCard({
  recipe,
  variant = 'default',
  onDragStart,
  onDragEnd,
  onClick,
  className,
}: RecipeCardProps) {
  const isDragging = variant === 'dragging';

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        'glass-card rounded-2xl p-2.5 cursor-grab active:cursor-grabbing transition-all duration-150',
        'hover:bg-white/80 hover:shadow-sm',
        isDragging && 'opacity-50 rotate-1 scale-105 shadow-lg',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <h4 className="text-[13px] text-foreground truncate mb-1.5">
        {recipe.name}
      </h4>
      <MacroBadgeRow
        calories={recipe.totalMacros.calories}
        protein={recipe.totalMacros.protein}
        carbs={recipe.totalMacros.carbs}
        fat={recipe.totalMacros.fat}
        size="sm"
      />
    </div>
  );
}
