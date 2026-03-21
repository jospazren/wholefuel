import { useState } from 'react';
import { MealSlotEntry, DayOfWeek, MealSlot, Recipe, RecipeIngredient, DAYS_OF_WEEK, MEAL_SLOTS, DAY_FULL_LABELS } from '@/types/meal';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { useRecipes } from '@/contexts/RecipesContext';
import { useMeals } from '@/contexts/MealsContext';
import { RecipeEditorDialog, RecipeEditorMode } from '@/components/RecipeEditorDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Scale } from 'lucide-react';
import { toast } from 'sonner';

interface MealEditSheetProps {
  meal: MealSlotEntry | null;
  day: DayOfWeek | null;
  slot: MealSlot | null;
  open: boolean;
  onClose: () => void;
}

export function MealEditSheet({ meal: entry, day, slot, open, onClose }: MealEditSheetProps) {
  const { removeMealFromSlot, duplicateMealToSlot, weeklyPlan } = useMealPlan();
  const { recipes } = useRecipes();
  const { getMeal, getMealMacros, updateMeal, adjustMealPortion } = useMeals();

  if (!entry || !day || !slot) return null;

  const mealData = getMeal(entry.mealId);
  if (!mealData) return null;

  if (mealData.type === 'estimated') {
    return (
      <EstimatedMealEditor
        mealId={entry.mealId}
        name={mealData.name}
        estCalories={mealData.estCalories ?? 0}
        estProtein={mealData.estProtein ?? 0}
        estFat={mealData.estFat ?? 0}
        estCarbs={mealData.estCarbs ?? 0}
        open={open}
        onClose={onClose}
        onDelete={() => { removeMealFromSlot(day, slot); onClose(); }}
        onSave={(updates) => { updateMeal(entry.mealId, updates); onClose(); }}
        onDuplicate={(toDay, toSlot) => { duplicateMealToSlot(entry.mealId, toDay, toSlot); toast.success('Meal duplicated'); }}
        weeklyPlan={weeklyPlan}
      />
    );
  }

  // Build a pseudo-recipe from the meal for the editor
  const linkedRecipe = mealData.sourceRecipeId
    ? recipes.find(r => r.id === mealData.sourceRecipeId)
    : undefined;

  const macros = getMealMacros(mealData);

  const pseudoRecipe: Recipe = {
    id: mealData.id,
    name: mealData.name,
    description: '',
    tags: linkedRecipe?.tags || [],
    ingredients: (mealData.ingredients || []).map(i => ({
      ingredientId: i.ingredientId,
      name: i.name,
      servingMultiplier: i.servingMultiplier,
    })),
    totalMacros: macros,
    instructions: linkedRecipe?.instructions,
    notes: linkedRecipe?.notes,
    link: linkedRecipe?.link,
  };

  const handleDelete = () => {
    removeMealFromSlot(day, slot);
    onClose();
  };

  const mode: RecipeEditorMode = {
    type: 'editMeal',
    recipe: pseudoRecipe,
    onDelete: handleDelete,
  };

  const handleSave = (data: { name: string; ingredients: RecipeIngredient[] }) => {
    updateMeal(entry.mealId, {
      name: data.name,
      ingredients: data.ingredients,
    });
    onClose();
  };

  const handlePortionAdjust = (multiplier: number) => {
    adjustMealPortion(entry.mealId, multiplier);
    toast.success(`Portion adjusted to ${multiplier}×`);
  };

  const handleDuplicate = (toDay: DayOfWeek, toSlot: MealSlot) => {
    duplicateMealToSlot(entry.mealId, toDay, toSlot);
    toast.success('Meal duplicated');
  };

  return (
    <RecipeEditorDialog
      mode={mode}
      open={open}
      onClose={onClose}
      onSave={handleSave}
      mealActions={{
        onPortionAdjust: handlePortionAdjust,
        onDuplicate: handleDuplicate,
        weeklyPlan,
      }}
    />
  );
}

// Sub-component for editing estimated meals
function EstimatedMealEditor({
  mealId,
  name: initialName,
  estCalories: initialCal,
  estProtein: initialPro,
  estFat: initialFat,
  estCarbs: initialCarbs,
  open,
  onClose,
  onDelete,
  onSave,
  onDuplicate,
  weeklyPlan,
}: {
  mealId: string;
  name: string;
  estCalories: number;
  estProtein: number;
  estFat: number;
  estCarbs: number;
  open: boolean;
  onClose: () => void;
  onDelete: () => void;
  onSave: (updates: { name: string; estCalories: number; estProtein: number; estFat: number; estCarbs: number }) => void;
  onDuplicate: (day: DayOfWeek, slot: MealSlot) => void;
  weeklyPlan: any;
}) {
  const [name, setName] = useState(initialName);
  const [cal, setCal] = useState(String(initialCal));
  const [pro, setPro] = useState(String(initialPro));
  const [fat, setFat] = useState(String(initialFat));
  const [carbs, setCarbs] = useState(String(initialCarbs));
  const [showDuplicate, setShowDuplicate] = useState(false);

  const handleSave = () => {
    onSave({
      name: name.trim() || initialName,
      estCalories: Number(cal) || 0,
      estProtein: Number(pro) || 0,
      estFat: Number(fat) || 0,
      estCarbs: Number(carbs) || 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle className="text-base">Edit Estimated Meal</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Calories</Label>
              <Input type="number" value={cal} onChange={(e) => setCal(e.target.value)} className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Protein (g)</Label>
              <Input type="number" value={pro} onChange={(e) => setPro(e.target.value)} className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Fat (g)</Label>
              <Input type="number" value={fat} onChange={(e) => setFat(e.target.value)} className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Carbs (g)</Label>
              <Input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          {/* Duplicate to slot */}
          {showDuplicate ? (
            <DuplicateToSlotPicker weeklyPlan={weeklyPlan} onSelect={(d, s) => { onDuplicate(d, s); setShowDuplicate(false); }} onCancel={() => setShowDuplicate(false)} />
          ) : (
            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={() => setShowDuplicate(true)}>
              <Copy className="h-3.5 w-3.5" />
              Duplicate to slot
            </Button>
          )}
        </div>
        <DialogFooter className="flex justify-between sm:justify-between gap-2">
          <Button variant="destructive" size="sm" onClick={onDelete}>
            Remove
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Shared duplicate-to-slot picker
function DuplicateToSlotPicker({
  weeklyPlan,
  onSelect,
  onCancel,
}: {
  weeklyPlan: any;
  onSelect: (day: DayOfWeek, slot: MealSlot) => void;
  onCancel: () => void;
}) {
  const [dupDay, setDupDay] = useState<DayOfWeek>(DAYS_OF_WEEK[0]);
  const [dupSlot, setDupSlot] = useState<MealSlot>(MEAL_SLOTS[0]);

  // Find empty slots for the selected day
  const emptySlots = MEAL_SLOTS.filter(s => !weeklyPlan[dupDay]?.[s]);

  return (
    <div className="space-y-2 p-2 rounded-lg border border-border bg-muted/30">
      <div className="flex gap-2">
        <Select value={dupDay} onValueChange={(v) => { setDupDay(v as DayOfWeek); setDupSlot(MEAL_SLOTS[0]); }}>
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAYS_OF_WEEK.map(d => (
              <SelectItem key={d} value={d} className="text-xs">{DAY_FULL_LABELS[d]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dupSlot} onValueChange={(v) => setDupSlot(v as MealSlot)}>
          <SelectTrigger className="h-8 text-xs w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEAL_SLOTS.map(s => (
              <SelectItem key={s} value={s} className="text-xs">{s.toUpperCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs" onClick={onCancel}>Cancel</Button>
        <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => onSelect(dupDay, dupSlot)}>
          Duplicate
        </Button>
      </div>
    </div>
  );
}
