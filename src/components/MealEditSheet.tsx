import { useState, useEffect, useMemo } from 'react';
import { MealInstance, DayOfWeek, MealSlot, DAY_FULL_LABELS, MEAL_SLOT_LABELS, MealIngredient, RecipeIngredient } from '@/types/meal';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Trash2, Save, X, Plus, ExternalLink } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableIngredientRow } from '@/components/SortableIngredientRow';

interface MealEditSheetProps {
  meal: MealInstance | null;
  day: DayOfWeek | null;
  slot: MealSlot | null;
  open: boolean;
  onClose: () => void;
}

export function MealEditSheet({ meal, day, slot, open, onClose }: MealEditSheetProps) {
  const { updateMealInstance, removeMealFromSlot, ingredients: ingredientDb, calculateMacrosFromIngredients, recipes } = useMealPlan();
  const [editedIngredients, setEditedIngredients] = useState<MealIngredient[]>([]);
  const [recipeName, setRecipeName] = useState('');
  const [openIngredientPopover, setOpenIngredientPopover] = useState<number | null>(null);
  const [addIngredientOpen, setAddIngredientOpen] = useState(false);

  // Sync state when meal changes or dialog opens
  useEffect(() => {
    if (open && meal) {
      setEditedIngredients([...meal.ingredients]);
      setRecipeName(meal.recipeName);
    }
  }, [open, meal]);

  const sortedIngredientDb = useMemo(() =>
    [...ingredientDb].sort((a, b) => a.name.localeCompare(b.name)),
    [ingredientDb]
  );

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!meal || !day || !slot) return null;

  // Get linked recipe for instructions/link
  const linkedRecipe = recipes.find(r => r.id === meal.recipeId);

  const currentMacros = calculateMacrosFromIngredients(
    editedIngredients.map(i => ({ ingredientId: i.ingredientId, servingMultiplier: i.servingMultiplier }))
  );

  const getIngredientInfo = (ingredientId: string, servingMultiplier: number) => {
    const ing = ingredientDb.find(i => i.id === ingredientId);
    if (!ing) return { calories: 0, protein: 0, carbs: 0, fat: 0, serving: '' };
    return {
      calories: Math.round(ing.caloriesPerServing * servingMultiplier),
      protein: Math.round(ing.proteinPerServing * servingMultiplier),
      carbs: Math.round(ing.carbsPerServing * servingMultiplier),
      fat: Math.round(ing.fatPerServing * servingMultiplier),
      serving: ing.servingDescription || '100g',
    };
  };

  const handleIngredientMultiplierChange = (index: number, value: string) => {
    const normalized = value.replace(',', '.');
    const num = parseFloat(normalized) || 0;
    const updated = [...editedIngredients];
    updated[index] = { ...updated[index], servingMultiplier: num };
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
        servingMultiplier: 1,
      }]);
    }
  };

  const handleSwapIngredient = (index: number, newIngredientId: string) => {
    const ing = ingredientDb.find(i => i.id === newIngredientId);
    if (ing) {
      const updated = [...editedIngredients];
      updated[index] = {
        ingredientId: ing.id,
        name: ing.name,
        servingMultiplier: updated[index].servingMultiplier,
      };
      setEditedIngredients(updated);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = editedIngredients.findIndex((ing, idx) => ing.ingredientId + '-' + idx === active.id);
      const newIndex = editedIngredients.findIndex((ing, idx) => ing.ingredientId + '-' + idx === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        setEditedIngredients(arrayMove(editedIngredients, oldIndex, newIndex));
      }
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

  const availableIngredients = sortedIngredientDb.filter(
    ing => !editedIngredients.some(fi => fi.ingredientId === ing.id)
  );

  // Map MealIngredient to RecipeIngredient shape for SortableIngredientRow
  const formIngredients: RecipeIngredient[] = editedIngredients.map(i => ({
    ingredientId: i.ingredientId,
    name: i.name,
    servingMultiplier: i.servingMultiplier,
  }));

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header: day/slot label + name + macros aligned with columns */}
        <div className="space-y-2 pb-4 border-b shrink-0">
          <div className="text-xs text-muted-foreground">
            {DAY_FULL_LABELS[day]} · {MEAL_SLOT_LABELS[slot]}
          </div>
          <div className="flex items-center gap-2">
            {/* Spacer for drag handle */}
            <div className="shrink-0 w-4" />

            {/* Recipe name */}
            <Input
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
              placeholder="Recipe name..."
              className="text-base font-semibold h-9 flex-1 min-w-0"
            />

            {/* Spacer for serving column */}
            <div className="w-24 shrink-0" />

            {/* Macro totals - aligned with macro columns */}
            <span className="w-12 text-center shrink-0 text-macro-calories font-bold text-sm">{currentMacros.calories}</span>
            <span className="w-10 text-center shrink-0 text-macro-protein font-bold text-sm">{currentMacros.protein}</span>
            <span className="w-10 text-center shrink-0 text-macro-carbs font-bold text-sm">{currentMacros.carbs}</span>
            <span className="w-10 text-center shrink-0 text-macro-fat font-bold text-sm">{currentMacros.fat}</span>

            {/* Spacer for remove button */}
            <div className="w-7 shrink-0" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 min-h-0">
          <div className="space-y-4 py-4">
            {/* Ingredients */}
            <div className="space-y-2">
              <Label>Ingredients</Label>
              {/* Column headers */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
                <span className="shrink-0 w-4" />
                <span className="flex-1 min-w-0">Name</span>
                <span className="w-20 text-left shrink-0">Qty</span>
                <span className="w-24 text-left shrink-0">Serving</span>
                <span className="w-12 text-left shrink-0">Cal</span>
                <span className="w-10 text-left shrink-0">P</span>
                <span className="w-10 text-left shrink-0">C</span>
                <span className="w-10 text-left shrink-0">F</span>
                <span className="w-7 shrink-0" />
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={formIngredients.map((ing, idx) => ing.ingredientId + '-' + idx)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {formIngredients.map((ing, idx) => {
                      const info = getIngredientInfo(ing.ingredientId, ing.servingMultiplier);
                      return (
                        <SortableIngredientRow
                          key={ing.ingredientId + '-' + idx}
                          ingredient={ing}
                          index={idx}
                          ingredientInfo={info}
                          ingredientDb={ingredientDb}
                          sortedIngredientDb={sortedIngredientDb}
                          formIngredients={formIngredients}
                          openPopover={openIngredientPopover === idx}
                          onPopoverChange={(open) => setOpenIngredientPopover(open ? idx : null)}
                          onMultiplierChange={(value) => handleIngredientMultiplierChange(idx, value)}
                          onSwap={(newId) => handleSwapIngredient(idx, newId)}
                          onRemove={() => handleRemoveIngredient(idx)}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>

              {availableIngredients.length > 0 && (
                <Popover open={addIngredientOpen} onOpenChange={setAddIngredientOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-start gap-2 font-normal">
                      <Plus className="h-4 w-4" />
                      Add ingredient...
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search ingredients..." />
                      <CommandList>
                        <CommandEmpty>No ingredient found.</CommandEmpty>
                        <CommandGroup>
                          {availableIngredients.map(ing => (
                            <CommandItem
                              key={ing.id}
                              value={`${ing.name} ${ing.brand || ''}`}
                              onSelect={() => {
                                handleAddIngredient(ing.id);
                                setAddIngredientOpen(false);
                              }}
                            >
                              {ing.name}
                              {ing.brand && <span className="text-muted-foreground"> [{ing.brand}]</span>}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Instructions from linked recipe (read-only) */}
            {linkedRecipe?.instructions && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Instructions</Label>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 rounded-lg p-3">
                  {linkedRecipe.instructions}
                </p>
              </div>
            )}

            {/* Link from linked recipe */}
            {linkedRecipe?.link && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Recipe Link</Label>
                <a
                  href={linkedRecipe.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  View original recipe
                </a>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row gap-2">
          <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!recipeName || editedIngredients.length === 0}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
