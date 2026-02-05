import { useState } from 'react';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { Recipe, DayOfWeek, MealSlot, DAYS_OF_WEEK, MEAL_SLOTS, MEAL_SLOT_LABELS } from '@/types/meal';
import { MealSlotCell } from '@/components/MealSlotCell';
import { MacroBar } from '@/components/MacroBar';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

const DAY_FULL_LABELS: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

interface WeeklyCalendarProps {
  className?: string;
}

export function WeeklyCalendar({ className }: WeeklyCalendarProps) {
  const { weeklyPlan, weeklyTargets, addMealToSlot, getDailyMacros } = useMealPlan();
  const [dragOverSlot, setDragOverSlot] = useState<{ day: DayOfWeek; slot: MealSlot } | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);

  const handleDragOver = (e: React.DragEvent, day: DayOfWeek, slot: MealSlot) => {
    e.preventDefault();
    setDragOverSlot({ day, slot });
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = (e: React.DragEvent, day: DayOfWeek, slot: MealSlot) => {
    e.preventDefault();
    setDragOverSlot(null);
    
    try {
      const recipeData = e.dataTransfer.getData('recipe');
      if (recipeData) {
        const recipe: Recipe = JSON.parse(recipeData);
        addMealToSlot(day, slot, recipe);
      }
    } catch (error) {
      console.error('Failed to parse dropped recipe:', error);
    }
  };

  const isSlotDraggedOver = (day: DayOfWeek, slot: MealSlot) => {
    return dragOverSlot?.day === day && dragOverSlot?.slot === slot;
  };

  return (
    <div className={cn('bg-card rounded-xl border shadow-sm overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-secondary/30">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h3 className="font-display font-semibold text-lg">Weekly Meal Plan</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground px-2">This Week</span>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Day Headers */}
          <div className="grid grid-cols-8 border-b">
            <div className="p-3 bg-muted/30">
              <span className="text-xs font-medium text-muted-foreground">Meal</span>
            </div>
            {DAYS_OF_WEEK.map((day) => {
              const dailyMacros = getDailyMacros(day);
              const calProgress = (dailyMacros.calories / weeklyTargets.dailyCalories) * 100;
              return (
                <div
                  key={day}
                  className={cn(
                    'p-3 text-center border-l cursor-pointer transition-colors',
                    selectedDay === day ? 'bg-primary/5' : 'hover:bg-muted/30'
                  )}
                  onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                >
                  <div className="font-semibold text-foreground text-sm">{DAY_LABELS[day]}</div>
                  <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        calProgress > 100 ? 'bg-destructive' : 'bg-primary'
                      )}
                      style={{ width: `${Math.min(calProgress, 100)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {dailyMacros.calories}/{weeklyTargets.dailyCalories}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Meal Rows */}
          {MEAL_SLOTS.map((slot) => (
            <div key={slot} className="grid grid-cols-8 border-b last:border-b-0">
              <div className="p-3 bg-muted/30 flex items-center">
                <span className="text-xs font-medium text-muted-foreground">
                  {MEAL_SLOT_LABELS[slot]}
                </span>
              </div>
              {DAYS_OF_WEEK.map((day) => (
                <div key={`${day}-${slot}`} className="p-1.5 border-l">
                  <MealSlotCell
                    day={day}
                    slot={slot}
                    meal={weeklyPlan[day][slot]}
                    isDragOver={isSlotDraggedOver(day, slot)}
                    onDragOver={(e) => handleDragOver(e, day, slot)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, day, slot)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Day Detail Panel */}
      {selectedDay && (
        <div className="p-4 border-t bg-secondary/20 animate-fade-in">
          <h4 className="font-semibold text-foreground mb-3">{DAY_FULL_LABELS[selectedDay]} Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MacroBar
              type="calories"
              label="Calories"
              value={getDailyMacros(selectedDay).calories}
              max={weeklyTargets.dailyCalories}
              unit="kcal"
            />
            <MacroBar
              type="protein"
              label="Protein"
              value={getDailyMacros(selectedDay).protein}
              max={weeklyTargets.protein}
            />
            <MacroBar
              type="carbs"
              label="Carbs"
              value={getDailyMacros(selectedDay).carbs}
              max={weeklyTargets.carbs}
            />
            <MacroBar
              type="fat"
              label="Fat"
              value={getDailyMacros(selectedDay).fat}
              max={weeklyTargets.fat}
            />
          </div>
        </div>
      )}
    </div>
  );
}
