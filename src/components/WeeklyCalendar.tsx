import { useState } from 'react';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { Recipe, DayOfWeek, MealSlot, DAYS_OF_WEEK, MEAL_SLOTS, DAY_LABELS, DAY_FULL_LABELS, WeeklyTargets, DietPreset, computeTargetsFromPreset } from '@/types/meal';
import { ViewSettingsDialog, getMacroVisibility, MacroVisibility } from '@/components/ViewSettingsDialog';
import { MealSlotCell } from '@/components/MealSlotCell';
import { MealEditSheet } from '@/components/MealEditSheet';
import { DayMacroBars } from '@/components/DayMacroBars';
import { MacroBadgeRow } from '@/components/MacroBadge';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, CalendarDays, SlidersHorizontal, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WeeklyCalendarProps {
  className?: string;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

function getCurrentDayOfWeek(): DayOfWeek {
  const jsDay = new Date().getDay();
  const map: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return map[jsDay];
}

export function WeeklyCalendar({ className, sidebarOpen, onToggleSidebar }: WeeklyCalendarProps) {
  const { 
    weeklyPlan, 
    weeklyTargets, 
    setWeeklyTargets,
    dietPresets,
    addMealToSlot, 
    moveMealToSlot, 
    getDailyMacros,
    goToPreviousWeek,
    goToNextWeek,
    getWeekLabel,
  } = useMealPlan();
  const isMobile = useIsMobile();
  const [dragOverSlot, setDragOverSlot] = useState<{ day: DayOfWeek; slot: MealSlot } | null>(null);
  const [editingMeal, setEditingMeal] = useState<{ meal: MealInstance; day: DayOfWeek; slot: MealSlot } | null>(null);
  const [draggingMeal, setDraggingMeal] = useState<{ day: DayOfWeek; slot: MealSlot } | null>(null);
  const [viewSettingsOpen, setViewSettingsOpen] = useState(false);
  const [macroVisibility, setMacroVisibility] = useState<MacroVisibility>(getMacroVisibility);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getCurrentDayOfWeek);

  const handlePrevDay = () => {
    const idx = DAYS_OF_WEEK.indexOf(selectedDay);
    setSelectedDay(DAYS_OF_WEEK[(idx - 1 + 7) % 7]);
  };

  const handleNextDay = () => {
    const idx = DAYS_OF_WEEK.indexOf(selectedDay);
    setSelectedDay(DAYS_OF_WEEK[(idx + 1) % 7]);
  };

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

  const handlePresetChange = (presetId: string) => {
    if (presetId === 'none') {
      setWeeklyTargets({ ...weeklyTargets, presetId: null });
      return;
    }
    const preset = dietPresets.find(p => p.id === presetId);
    if (!preset) return;
    const computed = computeTargetsFromPreset(preset, weeklyTargets.weightKg, weeklyTargets.tdee);
    setWeeklyTargets({
      ...weeklyTargets,
      presetId: preset.id,
      dailyCalories: computed.dailyCalories,
      protein: computed.protein,
      carbs: computed.carbs,
      fat: computed.fat,
    });
  };

  const handleWeightChange = (value: string) => {
    const weightKg = parseFloat(value) || 0;
    const preset = dietPresets.find(p => p.id === weeklyTargets.presetId);
    if (preset) {
      const computed = computeTargetsFromPreset(preset, weightKg, weeklyTargets.tdee);
      setWeeklyTargets({ ...weeklyTargets, weightKg, dailyCalories: computed.dailyCalories, protein: computed.protein, carbs: computed.carbs, fat: computed.fat });
    } else {
      setWeeklyTargets({ ...weeklyTargets, weightKg });
    }
  };

  const handleTdeeChange = (value: string) => {
    const tdee = parseFloat(value) || 0;
    const preset = dietPresets.find(p => p.id === weeklyTargets.presetId);
    if (preset) {
      const computed = computeTargetsFromPreset(preset, weeklyTargets.weightKg, tdee);
      setWeeklyTargets({ ...weeklyTargets, tdee, dailyCalories: computed.dailyCalories, protein: computed.protein, carbs: computed.carbs, fat: computed.fat });
    } else {
      setWeeklyTargets({ ...weeklyTargets, tdee });
    }
  };

  const renderDayHeader = (day: DayOfWeek) => {
    const dayMacros = getDailyMacros(day);
    return (
      <div
        key={`header-${day}`}
        className="rounded-2xl p-[13px] space-y-3 mx-1.5 mt-1.5"
        style={{
          backgroundImage: 'linear-gradient(137deg, rgba(255,255,255,0.6), rgba(249,250,251,0.3))',
          border: '1px solid rgba(255,255,255,0.5)',
        }}
      >
        <div className="text-center">
          <span className="text-[11px] font-bold text-[#6a7282] uppercase" style={{ letterSpacing: '0.34px' }}>
            {DAY_LABELS[day]}
          </span>
        </div>
        <DayMacroBars macros={dayMacros} targets={weeklyTargets} visibility={macroVisibility} />
      </div>
    );
  };

  const renderMealCell = (day: DayOfWeek, slot: MealSlot) => {
    const meal = weeklyPlan[day][slot];
    return (
      <div key={`${day}-${slot}`} className="px-1.5">
        <MealSlotCell
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
      </div>
    );
  };

  // Mobile: keep the single-day column rendering
  const renderMobileDayColumn = (day: DayOfWeek) => {
    const dayMacros = getDailyMacros(day);
    const dayMeals = MEAL_SLOTS.map((slot) => ({ slot, meal: weeklyPlan[day][slot] }));

    return (
      <div key={day} className="flex flex-col min-h-0">
        <div className="rounded-2xl p-[13px] space-y-3"
          style={{
            backgroundImage: 'linear-gradient(137deg, rgba(255,255,255,0.6), rgba(249,250,251,0.3))',
            border: '1px solid rgba(255,255,255,0.5)',
          }}
        >
          <DayMacroBars macros={dayMacros} targets={weeklyTargets} visibility={macroVisibility} />
        </div>

        <div className="flex-1 overflow-y-auto pb-1.5 pt-1.5 space-y-1">
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
  };

  const selectedPresetName = weeklyTargets.presetId
    ? dietPresets.find(p => p.id === weeklyTargets.presetId)?.name || 'No Preset'
    : 'No Preset';

  return (
    <>
      <div
        className={cn('rounded-3xl overflow-hidden flex flex-col', className)}
        style={{
          background: 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 8px 10px rgba(0,188,125,0.05)',
        }}
      >
        {/* Header */}
        <div className={cn(
          "border-b border-white/30",
          isMobile ? "px-3 py-2 space-y-2" : "flex items-center justify-between px-4 py-3"
        )}>
          {isMobile ? (
            <>
              {/* Mobile Row 1: Week nav + settings */}
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-0 rounded-full px-1"
                  style={{
                    background: 'rgba(255,255,255,0.55)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.5)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={goToPreviousWeek}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-semibold px-3 min-w-[80px] text-center">
                    {getWeekLabel()}
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={goToNextWeek}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Select value={weeklyTargets.presetId || 'none'} onValueChange={handlePresetChange}>
                    <SelectTrigger className="h-8 w-[100px] text-xs glass-subtle border-0 rounded-xl">
                      <SelectValue placeholder="No Preset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Preset</SelectItem>
                      {dietPresets.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setViewSettingsOpen(true)}>
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Mobile Row 2: Day selector */}
              <div className="flex items-center justify-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handlePrevDay}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-bold min-w-[90px] text-center">
                  {DAY_FULL_LABELS[selectedDay]}
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleNextDay}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Desktop header */}
              {/* Left: Toggle + Title */}
              <div className="flex items-center gap-2">
                {onToggleSidebar && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={onToggleSidebar}>
                    {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                  </Button>
                )}
                <CalendarDays className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-base">Meal Plan</h3>
              </div>

              {/* Center: Week Navigation */}
              <div
                className="flex items-center gap-0 rounded-full px-1"
                style={{
                  background: 'rgba(255,255,255,0.55)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.5)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={goToPreviousWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold px-4 min-w-[90px] text-center">
                  {getWeekLabel()}
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={goToNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Right: Preset + Weight + TDEE + Macro Summary + Filter */}
              <div className="flex items-center gap-3">
                <Select value={weeklyTargets.presetId || 'none'} onValueChange={handlePresetChange}>
                  <SelectTrigger className="h-8 w-[120px] text-xs glass-subtle border-0 rounded-xl">
                    <SelectValue placeholder="No Preset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Preset</SelectItem>
                    {dietPresets.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={weeklyTargets.weightKg || ''}
                    onChange={(e) => handleWeightChange(e.target.value)}
                    className="h-8 w-[60px] text-xs text-center border-0 glass-subtle rounded-xl px-1"
                    placeholder="80"
                  />
                  <span className="text-[11px] text-muted-foreground">kg</span>
                </div>

                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={weeklyTargets.tdee || ''}
                    onChange={(e) => handleTdeeChange(e.target.value)}
                    className="h-8 w-[65px] text-xs text-center border-0 glass-subtle rounded-xl px-1"
                    placeholder="2500"
                  />
                  <span className="text-[11px] text-muted-foreground">tdee</span>
                </div>

                <div className="hidden md:block">
                  <MacroBadgeRow
                    calories={weeklyTargets.dailyCalories}
                    protein={weeklyTargets.protein}
                    carbs={weeklyTargets.carbs}
                    fat={weeklyTargets.fat}
                    size="md"
                  />
                </div>

                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setViewSettingsOpen(true)}>
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Day Columns */}
        <div className="flex-1 overflow-x-auto">
          {isMobile ? (
            <div className="p-2">
              {renderMobileDayColumn(selectedDay)}
            </div>
          ) : (
            <div className="grid grid-cols-7 min-w-[700px] pb-1.5" style={{ alignItems: 'start' }}>
              {/* Row 1: Day headers */}
              {DAYS_OF_WEEK.map((day) => renderDayHeader(day))}
              {/* Rows 2+: Meal slots - each row spans all 7 days for equal height */}
              {MEAL_SLOTS.map((slot) => (
                DAYS_OF_WEEK.map((day) => (
                  <div key={`${day}-${slot}`} className="py-0.5 px-1.5">
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
                ))
              ))}
            </div>
          )}
        </div>
      </div>

      <MealEditSheet
        meal={editingMeal?.meal || null}
        day={editingMeal?.day || null}
        slot={editingMeal?.slot || null}
        open={!!editingMeal}
        onClose={() => setEditingMeal(null)}
      />

      <ViewSettingsDialog
        open={viewSettingsOpen}
        onOpenChange={setViewSettingsOpen}
        visibility={macroVisibility}
        onSave={setMacroVisibility}
      />
    </>
  );
}
