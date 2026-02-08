import { useState, useEffect } from 'react';
import { MealInstance, DayOfWeek, MealSlot, DAY_FULL_LABELS, MEAL_SLOT_LABELS, MealIngredient } from '@/types/meal';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { Sheet, SheetContent, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Flame, Trash2, Save, X } from 'lucide-react';
import { IngredientSelector } from '@/components/IngredientSelector';

interface MealEditSheetProps {
  meal: MealInstance | null;
  day: DayOfWeek | null;
  slot: MealSlot | null;
  open: boolean;
  onClose: () => void;
}

export function MealEditSheet({ meal, day, slot, open, onClose }: MealEditSheetProps) {
  const { updateMealInstance, removeMealFromSlot, ingredients: ingredientDb, calculateMacrosFromIngredients } = useMealPlan();
  const [editedIngredients, setEditedIngredients] = useState<MealIngredient[]>([]);
  const [recipeName, setRecipeName] = useState('');

  // Sync state when meal changes or sheet opens
  useEffect(() => {
    if (open && meal) {
      setEditedIngredients([...meal.ingredients]);
      setRecipeName(meal.recipeName);
    }
  }, [open, meal]);

  if (!meal || !day || !slot) return null;

  const currentMacros = calculateMacrosFromIngredients(
    editedIngredients.map(i => ({ ingredientId: i.ingredientId, amount: i.amount }))
  );

  const handleAmountChange = (index: number, amount: number) => {
    const updated = [...editedIngredients];
    updated[index] = { ...updated[index], amount };
    setEditedIngredients(updated);
  };

  const handleRemoveIngredient = (index: number) => {
    setEditedIngredients(editedIngredients.filter((_, i) => i !== index));
  };

  const handleAddIngredient = (ingredientId: string) => {
    const ing = ingredientDb.find(i => i.id === ingredientId);
    if (ing) {
      setEditedIngredients([...editedIngredients, {
        ingredientId: ing.id,
        name: ing.name,
        amount: 100,
        unit: 'g',
      }]);
    }
  };

  const handleSave = () => {
    updateMealInstance(day, slot, {
      recipeName,
      ingredients: editedIngredients,
    });
    onClose();
  };

  const handleDelete = () => {
    removeMealFromSlot(day, slot);
    onClose();
  };

  const usedIngredientIds = editedIngredients.map(e => e.ingredientId);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="sm:max-w-lg flex flex-col">
        {/* Custom header with name left, macros right */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b">
          {/* Left: Day/Slot info and Recipe Name */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="text-xs text-muted-foreground">
              {DAY_FULL_LABELS[day]} · {MEAL_SLOT_LABELS[slot]}
            </div>
            <Input
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
              placeholder="Recipe name..."
              className="text-base font-semibold h-9"
            />
          </div>
          
          {/* Right: Macro totals */}
          <div className="flex flex-col items-end gap-1 shrink-0 text-sm">
            <div className="flex items-center gap-1 text-macro-calories">
              <Flame className="h-3.5 w-3.5" />
              <span className="font-bold">{currentMacros.calories}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-macro-protein font-medium">{currentMacros.protein}P</span>
              <span className="text-macro-carbs font-medium">{currentMacros.carbs}C</span>
              <span className="text-macro-fat font-medium">{currentMacros.fat}F</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Ingredients */}
          <div className="space-y-3">
            <Label>Ingredients</Label>
            <div className="space-y-2">
              {editedIngredients.map((ing, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  <span className="flex-1 text-sm font-medium truncate">{ing.name}</span>
                  <Input
                    type="number"
                    value={ing.amount}
                    onChange={(e) => handleAmountChange(idx, parseFloat(e.target.value) || 0)}
                    className="w-20 h-8 text-center"
                    min={0}
                  />
                  <span className="text-sm text-muted-foreground w-6">{ing.unit}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveIngredient(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add Ingredient with type filtering */}
            <IngredientSelector
              ingredients={ingredientDb}
              usedIngredientIds={usedIngredientIds}
              onSelect={handleAddIngredient}
            />
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 border-t pt-4">
          <Button variant="destructive" onClick={handleDelete} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
