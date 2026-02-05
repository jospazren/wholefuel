import { useState, useEffect } from 'react';
import { MealInstance, DayOfWeek, MealSlot, DAY_FULL_LABELS, MEAL_SLOT_LABELS, MealIngredient } from '@/types/meal';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Flame, Beef, Wheat, Droplet, Trash2, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
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
        <SheetHeader>
          <SheetTitle className="text-lg">
            {DAY_FULL_LABELS[day]} - {MEAL_SLOT_LABELS[slot]}
          </SheetTitle>
          <SheetDescription>
            Customize ingredient amounts for this meal
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Recipe Name */}
          <div className="space-y-2">
            <Label htmlFor="recipe-name">Recipe Name</Label>
            <Input
              id="recipe-name"
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
              placeholder="Recipe name"
            />
          </div>

          <Separator />

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

          <Separator />

          {/* Macro Totals */}
          <div className="space-y-3">
            <Label>Meal Totals</Label>
            <div className="grid grid-cols-4 gap-3">
              <MacroCard icon={<Flame className="h-4 w-4" />} label="Calories" value={currentMacros.calories} colorClass="text-macro-calories bg-macro-calories/10" />
              <MacroCard icon={<Beef className="h-4 w-4" />} label="Protein" value={currentMacros.protein} colorClass="text-macro-protein bg-macro-protein/10" />
              <MacroCard icon={<Wheat className="h-4 w-4" />} label="Carbs" value={currentMacros.carbs} colorClass="text-macro-carbs bg-macro-carbs/10" />
              <MacroCard icon={<Droplet className="h-4 w-4" />} label="Fat" value={currentMacros.fat} colorClass="text-macro-fat bg-macro-fat/10" />
            </div>
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

function MacroCard({ icon, label, value, colorClass }: { icon: React.ReactNode; label: string; value: number; colorClass: string }) {
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
