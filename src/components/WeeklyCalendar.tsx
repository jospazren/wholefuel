import { useState } from 'react';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { Recipe, DayOfWeek, MealSlot, DAYS_OF_WEEK, MEAL_SLOTS, DAY_LABELS, MealInstance, WeeklyTargets } from '@/types/meal';
import { MealSlotCell } from '@/components/MealSlotCell';
import { MealEditSheet } from '@/components/MealEditSheet';
import { DayMacroBars } from '@/components/DayMacroBars';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WeeklyCalendarProps {
  className?: string;
}

const strategies = [
  { value: 'cut20', label: 'Cut 20%' },
  { value: 'cut10', label: 'Cut 10%' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'bulk10', label: 'Bulk 10%' },
  { value: 'bulk20', label: 'Bulk 20%' },
] as const;

export function WeeklyCalendar({ className }: WeeklyCalendarProps) {
  const { 
    weeklyPlan, 
    weeklyTargets, 
    setWeeklyTargets,
    calculateTargets,
    addMealToSlot, 
    moveMealToSlot, 
    getDailyMacros,
    goToPreviousWeek,
    goToNextWeek,
    getWeekLabel,
  } = useMealPlan();
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

  const handleStrategyChange = (value: string) => {
    const newStrategy = value as WeeklyTargets['strategy'];
    const targets = calculateTargets(weeklyTargets.tdee, newStrategy);
    setWeeklyTargets({
      ...weeklyTargets,
      strategy: newStrategy,
      dailyCalories: targets.calories,
      protein: targets.protein,
      fat: targets.fat,
      carbs: targets.carbs,
    });
  };

  // Compute weekly totals for header badges
  const weeklyTotals = DAYS_OF_WEEK.reduce(
    (acc, day) => {
      const m = getDailyMacros(day);
      acc.calories += m.calories;
      acc.protein += m.protein;
      acc.carbs += m.carbs;
      acc.fat += m.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const avgDaily = {
    calories: Math.round(weeklyTotals.calories / 7),
    protein: Math.round(weeklyTotals.protein / 7),
    carbs: Math.round(weeklyTotals.carbs / 7),
    fat: Math.round(weeklyTotals.fat / 7),
  };

  return (
    <>
      <div className={cn('bg-card rounded-xl border shadow-sm overflow-hidden flex flex-col', className)}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
          {/* Left: Title */}
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-base">Meal Plan</h3>
          </div>

          {/* Center: Week Navigation */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-3 min-w-[90px] text-center">
              {getWeekLabel()}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Right: Strategy + Macro Summary */}
          <div className="flex items-center gap-3">
            <Select value={weeklyTargets.strategy} onValueChange={handleStrategyChange}>
              <SelectTrigger className="h-8 w-[110px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {strategies.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="hidden md:flex items-center gap-1">
              <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold text-white bg-macro-calories">
                {weeklyTargets.dailyCalories}K
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold text-white bg-macro-protein">
                {weeklyTargets.protein}P
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold text-white bg-macro-carbs">
                {weeklyTargets.carbs}C
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold text-white bg-macro-fat">
                {weeklyTargets.fat}F
              </span>
            </div>
          </div>
        </div>

        {/* Day Columns */}
        <div className="flex-1 overflow-x-auto">
          <div className="grid grid-cols-7 min-w-[700px] h-full">
            {DAYS_OF_WEEK.map((day) => {
              const dayMacros = getDailyMacros(day);
              const dayMeals = MEAL_SLOTS.map((slot) => ({ slot, meal: weeklyPlan[day][slot] }));

              return (
                <div
                  key={day}
                  className="flex flex-col border-r last:border-r-0 min-h-0"
                >
                  {/* Day Header */}
                  <div className="text-center py-2 border-b bg-muted/30">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      {DAY_LABELS[day]}
                    </span>
                  </div>

                  {/* Macro Progress Bars */}
                  <DayMacroBars macros={dayMacros} targets={weeklyTargets} />

                  {/* Meal Cards */}
                  <div className="flex-1 p-1.5 space-y-1.5 overflow-y-auto">
                    {dayMeals.map(({ slot, meal }) => (
                      <MealSlotCell
                        key={slot}
                        day={day}
                        slot={slot}
                        meal={meal}
                        isDragOver={isSlotDraggedOver(day, slot)}
                        onDragOver={(e) => handleDragOver(e, day, slot)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, day, slot)}
                        onEditClick={() => handleEditClick(day, slot)}
                        onMealDragStart={(e) => handleMealDragStart(e, day, slot)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
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
