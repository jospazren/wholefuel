import { useState } from 'react';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { Recipe, DayOfWeek, MealSlot, DAYS_OF_WEEK, MEAL_SLOTS, MEAL_SLOT_LABELS, DAY_LABELS, MealInstance } from '@/types/meal';
import { MealSlotCell } from '@/components/MealSlotCell';
import { MealEditSheet } from '@/components/MealEditSheet';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, CalendarDays, Flame, Beef, Wheat, Droplet } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WeeklyCalendarProps {
  className?: string;
}

export function WeeklyCalendar({ className }: WeeklyCalendarProps) {
  const { weeklyPlan, weeklyTargets, addMealToSlot, moveMealToSlot, getDailyMacros } = useMealPlan();
  const [dragOverSlot, setDragOverSlot] = useState<{ day: DayOfWeek; slot: MealSlot } | null>(null);
  const [editingMeal, setEditingMeal] = useState<{ meal: MealInstance; day: DayOfWeek; slot: MealSlot } | null>(null);
  const [draggingMeal, setDraggingMeal] = useState<{ day: DayOfWeek; slot: MealSlot } | null>(null);

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
    
    // Check if we're moving an existing meal
    const mealMoveData = e.dataTransfer.getData('meal-move');
    if (mealMoveData) {
      try {
        const { fromDay, fromSlot } = JSON.parse(mealMoveData);
        moveMealToSlot(fromDay, fromSlot, day, slot);
        setDraggingMeal(null);
        return;
      } catch (error) {
        console.error('Failed to parse meal move data:', error);
      }
    }
    
    // Otherwise, it's a new recipe from library
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

  const handleMealDragStart = (e: React.DragEvent, day: DayOfWeek, slot: MealSlot) => {
    e.dataTransfer.setData('meal-move', JSON.stringify({ fromDay: day, fromSlot: slot }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingMeal({ day, slot });
  };

  const handleEditClick = (day: DayOfWeek, slot: MealSlot) => {
    const meal = weeklyPlan[day][slot];
    if (meal) {
      setEditingMeal({ meal, day, slot });
    }
  };

  const isSlotDraggedOver = (day: DayOfWeek, slot: MealSlot) => {
    return dragOverSlot?.day === day && dragOverSlot?.slot === slot;
  };

  // Calculate target adherence color
  const getAdherenceColor = (actual: number, target: number): string => {
    const ratio = actual / target;
    if (ratio >= 0.95 && ratio <= 1.05) return 'text-primary bg-primary/10';
    if (ratio >= 0.85 && ratio <= 1.15) return 'text-yellow-600 bg-yellow-500/10';
    return 'text-destructive bg-destructive/10';
  };

  return (
    <>
      <div className={cn('bg-card rounded-lg border shadow-sm overflow-hidden h-[calc(100vh-7rem)] flex flex-col', className)}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b bg-secondary/30">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h3 className="font-display font-semibold text-sm">Weekly Plan</h3>
          </div>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-xs text-muted-foreground px-1">This Week</span>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="overflow-x-auto flex-1 flex flex-col">
          <div className="min-w-[600px] flex flex-col flex-1">
            {/* Day Headers */}
            <div className="grid grid-cols-[50px_repeat(7,1fr)] border-b">
              <div className="px-1 py-1.5 bg-muted/30" />
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="px-0.5 py-1.5 text-center border-l bg-muted/20">
                  <div className="font-medium text-foreground text-[10px]">{DAY_LABELS[day]}</div>
                </div>
              ))}
            </div>

            {/* Meal Rows */}
            {MEAL_SLOTS.map((slot) => (
              <div key={slot} className="grid grid-cols-[50px_repeat(7,1fr)] border-b last:border-b-0 flex-1">
                <div className="px-1 py-0.5 bg-muted/30 flex items-center">
                  <span className="text-[9px] font-medium text-muted-foreground leading-tight">
                    {MEAL_SLOT_LABELS[slot]}
                  </span>
                </div>
                {DAYS_OF_WEEK.map((day) => (
                  <div key={`${day}-${slot}`} className="border-l">
                    <MealSlotCell
                      day={day}
                      slot={slot}
                      meal={weeklyPlan[day][slot]}
                      isDragOver={isSlotDraggedOver(day, slot)}
                      onDragOver={(e) => handleDragOver(e, day, slot)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, day, slot)}
                      onEditClick={() => handleEditClick(day, slot)}
                      onMealDragStart={(e) => handleMealDragStart(e, day, slot)}
                    />
                  </div>
                ))}
              </div>
            ))}

            {/* Daily Totals Row */}
            <div className="grid grid-cols-[50px_repeat(7,1fr)] border-t border-primary/20 bg-secondary/20">
              <div className="px-1 py-1 bg-muted/30">
                <span className="text-[9px] font-medium text-muted-foreground">Total</span>
              </div>
              {DAYS_OF_WEEK.map((day) => {
                const macros = getDailyMacros(day);
                return (
                  <div key={`total-${day}`} className="px-0.5 py-1 border-l flex flex-col items-center">
                    <div className={cn('text-[10px] font-semibold', getAdherenceColor(macros.calories, weeklyTargets.dailyCalories))}>
                      {macros.calories}
                    </div>
                    <div className="text-[8px] text-muted-foreground">
                      {macros.protein}P {macros.carbs}C {macros.fat}F
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <MealEditSheet
        meal={editingMeal?.meal || null}
        day={editingMeal?.day || null}
        slot={editingMeal?.slot || null}
        open={!!editingMeal}
        onClose={() => setEditingMeal(null)}
      />
    </>
  );
}
