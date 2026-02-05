import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { WeeklyTargetsForm } from '@/components/WeeklyTargetsForm';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { Settings, Flame, ShoppingCart, ChefHat } from 'lucide-react';

export function Header() {
  const { weeklyTargets } = useMealPlan();
  const [isTargetsOpen, setIsTargetsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-xl shadow-glow">
            <ChefHat className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-foreground">NutriPlan</h1>
            <p className="text-xs text-muted-foreground -mt-0.5">Meal Planning Made Simple</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Stats */}
          <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-macro-calories" />
              <span className="text-sm font-semibold text-foreground">{weeklyTargets.dailyCalories}</span>
              <span className="text-xs text-muted-foreground">kcal/day</span>
            </div>
            <div className="w-px h-5 bg-border" />
            <div className="text-sm">
              <span className="font-semibold text-macro-protein">{weeklyTargets.protein}P</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="font-semibold text-macro-carbs">{weeklyTargets.carbs}C</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="font-semibold text-macro-fat">{weeklyTargets.fat}F</span>
            </div>
          </div>

          {/* Shopping List Button */}
          <Button variant="outline" size="sm" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Shopping List</span>
          </Button>

          {/* Settings Dialog */}
          <Dialog open={isTargetsOpen} onOpenChange={setIsTargetsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden">
              <WeeklyTargetsForm onComplete={() => setIsTargetsOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
