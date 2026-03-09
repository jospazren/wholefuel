import { Recipe } from '@/types/meal';
import { cn } from '@/lib/utils';
import { MacroBand } from '@/components/MacroBadge';

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
        'bg-card border border-border rounded-xl p-2.5 cursor-grab active:cursor-grabbing transition-all duration-150',
        'hover:shadow-sm',
        'w-[199px] h-[66.5px] box-border',
        isDragging && 'opacity-50 rotate-1 scale-105 shadow-lg',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <h4 className="text-[13px] text-slate-950 truncate mb-1.5">
        {recipe.name}
      </h4>
      <MacroBand
        calories={recipe.totalMacros?.calories ?? 0}
        protein={recipe.totalMacros?.protein ?? 0}
        carbs={recipe.totalMacros?.carbs ?? 0}
        fat={recipe.totalMacros?.fat ?? 0}
      />
    </div>
  );
}
