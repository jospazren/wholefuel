import { Recipe, CATEGORY_LABELS } from '@/types/meal';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Flame, Beef, Wheat, Droplet, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecipeDetailSheetProps {
  recipe: Recipe | null;
  open: boolean;
  onClose: () => void;
}

const categoryColors = {
  breakfast: 'bg-category-breakfast/10 text-category-breakfast border-category-breakfast/30',
  main: 'bg-category-lunch/10 text-category-lunch border-category-lunch/30',
  shake: 'bg-macro-protein/10 text-macro-protein border-macro-protein/30',
  snack: 'bg-category-snack/10 text-category-snack border-category-snack/30',
  side: 'bg-muted text-muted-foreground border-muted-foreground/30',
  dessert: 'bg-category-dinner/10 text-category-dinner border-category-dinner/30',
};

export function RecipeDetailSheet({ recipe, open, onClose }: RecipeDetailSheetProps) {
  if (!recipe) return null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className={cn('text-xs', categoryColors[recipe.category])}>
              {CATEGORY_LABELS[recipe.category]}
            </Badge>
          </div>
          <SheetTitle className="text-xl">{recipe.name}</SheetTitle>
          <SheetDescription>{recipe.description}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Macro Summary */}
          <div className="grid grid-cols-4 gap-3">
            <MacroCard icon={<Flame className="h-4 w-4" />} label="Calories" value={recipe.totalMacros.calories} unit="kcal" colorClass="text-macro-calories bg-macro-calories/10" />
            <MacroCard icon={<Beef className="h-4 w-4" />} label="Protein" value={recipe.totalMacros.protein} unit="g" colorClass="text-macro-protein bg-macro-protein/10" />
            <MacroCard icon={<Wheat className="h-4 w-4" />} label="Carbs" value={recipe.totalMacros.carbs} unit="g" colorClass="text-macro-carbs bg-macro-carbs/10" />
            <MacroCard icon={<Droplet className="h-4 w-4" />} label="Fat" value={recipe.totalMacros.fat} unit="g" colorClass="text-macro-fat bg-macro-fat/10" />
          </div>

          <Separator />

          {/* Ingredients */}
          <div>
            <h4 className="font-semibold text-foreground mb-3">Ingredients</h4>
            <div className="space-y-2">
              {recipe.ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-foreground">{ing.name}</span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {ing.amount} {ing.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          {recipe.instructions && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold text-foreground mb-3">Instructions</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {recipe.instructions}
                </p>
              </div>
            </>
          )}

          {/* External Link */}
          {recipe.link && (
            <>
              <Separator />
              <div>
                <a 
                  href={recipe.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  View original recipe
                </a>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MacroCard({ icon, label, value, unit, colorClass }: { icon: React.ReactNode; label: string; value: number; unit: string; colorClass: string }) {
  return (
    <div className="text-center space-y-1">
      <div className={cn('inline-flex p-2 rounded-lg', colorClass)}>
        {icon}
      </div>
      <div className="text-base font-bold text-foreground">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
