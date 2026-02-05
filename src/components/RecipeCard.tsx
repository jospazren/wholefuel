import { Recipe } from '@/types/meal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Flame, Beef, Wheat, Droplet, GripVertical } from 'lucide-react';

interface RecipeCardProps {
  recipe: Recipe;
  variant?: 'default' | 'compact' | 'dragging';
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  className?: string;
}

const categoryColors = {
  breakfast: 'bg-category-breakfast/10 text-category-breakfast border-category-breakfast/30',
  lunch: 'bg-category-lunch/10 text-category-lunch border-category-lunch/30',
  dinner: 'bg-category-dinner/10 text-category-dinner border-category-dinner/30',
  snack: 'bg-category-snack/10 text-category-snack border-category-snack/30',
};

export function RecipeCard({
  recipe,
  variant = 'default',
  onDragStart,
  onDragEnd,
  className,
}: RecipeCardProps) {
  const isCompact = variant === 'compact';
  const isDragging = variant === 'dragging';

  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'cursor-grab active:cursor-grabbing transition-all duration-200 group',
        'hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5',
        isDragging && 'opacity-50 rotate-2 scale-105 shadow-lg',
        className
      )}
    >
      <CardContent className={cn('p-3', isCompact && 'p-2')}>
        <div className="flex items-start gap-2">
          <div className="mt-0.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className={cn('font-semibold text-foreground truncate', isCompact ? 'text-sm' : 'text-base')}>
                {recipe.name}
              </h4>
              <Badge variant="outline" className={cn('shrink-0 text-[10px] px-1.5 py-0', categoryColors[recipe.category])}>
                {recipe.category}
              </Badge>
            </div>
            
            {!isCompact && (
              <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                {recipe.description}
              </p>
            )}

            <div className="flex items-center gap-3 text-xs">
              <MacroChip icon={<Flame className="h-3 w-3" />} value={recipe.totalMacros.calories} color="text-macro-calories" />
              <MacroChip icon={<Beef className="h-3 w-3" />} value={recipe.totalMacros.protein} color="text-macro-protein" />
              <MacroChip icon={<Wheat className="h-3 w-3" />} value={recipe.totalMacros.carbs} color="text-macro-carbs" />
              <MacroChip icon={<Droplet className="h-3 w-3" />} value={recipe.totalMacros.fat} color="text-macro-fat" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MacroChip({ icon, value, color }: { icon: React.ReactNode; value: number; color: string }) {
  return (
    <span className={cn('flex items-center gap-0.5 font-medium', color)}>
      {icon}
      {Math.round(value)}
    </span>
  );
}
