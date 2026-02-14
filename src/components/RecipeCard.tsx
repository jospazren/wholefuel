import { Recipe, CATEGORY_LABELS, RecipeCategory } from '@/types/meal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RecipeCardProps {
  recipe: Recipe;
  variant?: 'default' | 'compact' | 'dragging';
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onClick?: () => void;
  className?: string;
}

const categoryColors: Record<RecipeCategory, string> = {
  breakfast: 'bg-category-breakfast/10 text-category-breakfast border-category-breakfast/30',
  main: 'bg-category-lunch/10 text-category-lunch border-category-lunch/30',
  shake: 'bg-macro-protein/10 text-macro-protein border-macro-protein/30',
  snack: 'bg-category-snack/10 text-category-snack border-category-snack/30',
  side: 'bg-muted text-muted-foreground border-muted-foreground/30',
  dessert: 'bg-category-dinner/10 text-category-dinner border-category-dinner/30',
};

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
    <Card
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        'cursor-grab active:cursor-grabbing transition-all duration-150',
        'hover:bg-muted/30 hover:shadow-sm',
        isDragging && 'opacity-50 rotate-1 scale-105 shadow-lg',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <CardContent className="px-2.5 py-2">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h4 className="text-sm font-medium text-foreground truncate flex-1">
            {recipe.name}
          </h4>
          <Badge variant="outline" className={cn('shrink-0 text-[9px] px-1 py-0 h-4', categoryColors[recipe.category])}>
            {CATEGORY_LABELS[recipe.category]}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold text-white bg-macro-calories">
            {recipe.totalMacros.calories}K
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold text-white bg-macro-protein">
            {recipe.totalMacros.protein}P
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold text-white bg-macro-carbs">
            {recipe.totalMacros.carbs}C
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold text-white bg-macro-fat">
            {recipe.totalMacros.fat}F
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
