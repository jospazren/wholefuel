import { useMealPlan } from '@/contexts/MealPlanContext';
import { DAYS_OF_WEEK, getEffectiveCalories } from '@/types/meal';
import { MacroRing } from '@/components/MacroRing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DailyMacroSummary() {
  const { weeklyTargets, getWeeklyTotals, getDailyMacros } = useMealPlan();
  const weeklyTotals = getWeeklyTotals();

  const averageDaily = {
    calories: Math.round(weeklyTotals.calories / 7),
    protein: Math.round(weeklyTotals.protein / 7),
    fat: Math.round(weeklyTotals.fat / 7),
    carbs: Math.round(weeklyTotals.carbs / 7),
  };

  // Calculate weekly adherence using per-day effective targets
  const weeklyTarget = DAYS_OF_WEEK.reduce((sum, day) => sum + getEffectiveCalories(weeklyTargets, day), 0);
  const adherencePercent = weeklyTarget > 0 ? Math.round((weeklyTotals.calories / weeklyTarget) * 100) : 0;
  const avgDailyCalTarget = Math.round(weeklyTarget / 7);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Weekly Progress</CardTitle>
          </div>
          <div className={cn(
            'text-sm font-semibold px-2 py-0.5 rounded',
            adherencePercent >= 95 && adherencePercent <= 105 ? 'text-primary bg-primary/10' :
            adherencePercent >= 85 && adherencePercent <= 115 ? 'text-yellow-600 bg-yellow-500/10' :
            'text-destructive bg-destructive/10'
          )}>
            {adherencePercent}% of target
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex items-center justify-around">
          <MacroRing
            type="calories"
            value={averageDaily.calories}
            max={weeklyTargets.dailyCalories}
            size="lg"
            label="Calories"
          />
          <MacroRing
            type="protein"
            value={averageDaily.protein}
            max={weeklyTargets.protein}
            size="md"
            label="Protein"
          />
          <MacroRing
            type="carbs"
            value={averageDaily.carbs}
            max={weeklyTargets.carbs}
            size="md"
            label="Carbs"
          />
          <MacroRing
            type="fat"
            value={averageDaily.fat}
            max={weeklyTargets.fat}
            size="md"
            label="Fat"
          />
        </div>
        
        <div className="mt-4 flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <Target className="h-3 w-3" />
          <span>Daily average vs. targets</span>
        </div>
      </CardContent>
    </Card>
  );
}
