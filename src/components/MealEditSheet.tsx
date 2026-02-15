import { useState, useEffect, useMemo } from 'react';
import { MealInstance, DayOfWeek, MealSlot, DAY_FULL_LABELS, MEAL_SLOT_LABELS, MealIngredient, RecipeIngredient, RECIPE_CATEGORIES, CATEGORY_LABELS, RecipeCategory } from '@/types/meal';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Trash2, Plus, ExternalLink, Check, Flame, Beef, Wheat, Droplet, X } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableIngredientRow } from '@/components/SortableIngredientRow';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const [recipeLink, setRecipeLink] = useState('');
  const [category, setCategory] = useState<RecipeCategory>('main');
  const [instructionSteps, setInstructionSteps] = useState<string[]>([]);

  useEffect(() => {
    if (open && meal) {
      setEditedIngredients([...meal.ingredients]);
      setRecipeName(meal.recipeName);
      const linkedRecipe = recipes.find(r => r.id === meal.recipeId);
      setRecipeLink(linkedRecipe?.link || '');
      setCategory((linkedRecipe?.category as RecipeCategory) || 'main');
      // Parse instructions into steps
      const instructions = linkedRecipe?.instructions || '';
      if (instructions) {
        setInstructionSteps(instructions.split('\n').filter(s => s.trim()));
      } else {
        setInstructionSteps([]);
      }
    }
  }, [open, meal, recipes]);

  const sortedIngredientDb = useMemo(() =>
    [...ingredientDb].sort((a, b) => a.name.localeCompare(b.name)),
    [ingredientDb]
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!meal || !day || !slot) return null;

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

  const handleAddStep = () => {
    setInstructionSteps([...instructionSteps, '']);
  };

  const handleStepChange = (index: number, value: string) => {
    const updated = [...instructionSteps];
    updated[index] = value;
    setInstructionSteps(updated);
  };

  const handleRemoveStep = (index: number) => {
    setInstructionSteps(instructionSteps.filter((_, i) => i !== index));
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

  const formIngredients: RecipeIngredient[] = editedIngredients.map(i => ({
    ingredientId: i.ingredientId,
    name: i.name,
    servingMultiplier: i.servingMultiplier,
  }));

  const macroBadges = [
    { icon: <Flame className="h-3.5 w-3.5" />, value: currentMacros.calories, suffix: '', bg: 'bg-slate-500/10', text: 'text-slate-600' },
    { icon: <Beef className="h-3.5 w-3.5" />, value: currentMacros.protein, suffix: 'g', bg: 'bg-emerald-600/10', text: 'text-emerald-600' },
    { icon: <Wheat className="h-3.5 w-3.5" />, value: currentMacros.carbs, suffix: 'g', bg: 'bg-cyan-600/10', text: 'text-cyan-600' },
    { icon: <Droplet className="h-3.5 w-3.5" />, value: currentMacros.fat, suffix: 'g', bg: 'bg-orange-500/10', text: 'text-orange-500' },
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 space-y-3 shrink-0">
          <Input
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            placeholder="Recipe name..."
            className="text-2xl font-bold h-auto py-1 px-0 border-0 bg-transparent focus-visible:ring-0 shadow-none"
          />
          
          {/* Category + Link + Macros row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={category} onValueChange={(v) => setCategory(v as RecipeCategory)}>
              <SelectTrigger className="w-[100px] h-8 text-sm rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECIPE_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <a
              href={recipeLink || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-muted-foreground ${recipeLink ? 'hover:text-primary cursor-pointer' : 'opacity-40 pointer-events-none'}`}
            >
              <ExternalLink className="h-4 w-4" />
            </a>

            <Input
              value={recipeLink}
              onChange={(e) => setRecipeLink(e.target.value)}
              placeholder="Recipe link (optional)"
              className="h-8 text-sm flex-1 min-w-[140px] max-w-[220px]"
            />

            <div className="flex-1" />

            {/* Macro badges */}
            <div className="flex items-center gap-1.5">
              {macroBadges.map((m, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${m.bg} ${m.text}`}
                >
                  {m.icon}
                  {m.value}{m.suffix}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 min-h-0">
          <div className="space-y-6 pb-6">
            {/* Ingredients */}
            <div>
              <h3 className="text-base font-bold mb-3">Ingredients</h3>
              
              <div className="glass-subtle rounded-2xl p-3">
                {/* Column headers */}
                <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase pb-2 border-b border-border/30">
                  <span className="shrink-0 w-4" />
                  <span className="flex-1 min-w-0">Ingredient</span>
                  <span className="w-16 text-center shrink-0">Qty</span>
                  <span className="w-14 text-center shrink-0">Cal</span>
                  <span className="w-11 text-center shrink-0 text-emerald-600">P</span>
                  <span className="w-11 text-center shrink-0 text-cyan-600">C</span>
                  <span className="w-11 text-center shrink-0 text-orange-500">F</span>
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
                    <div>
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
              </div>

              {/* Add ingredient button */}
              {availableIngredients.length > 0 && (
                <Popover open={addIngredientOpen} onOpenChange={setAddIngredientOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className="w-full mt-2 py-2.5 rounded-2xl border-2 border-dashed border-emerald-300/50 text-emerald-600 text-sm font-medium hover:border-emerald-400/70 hover:bg-emerald-50/30 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Plus className="h-4 w-4" />
                      Add Ingredient
                    </button>
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

            {/* Instructions */}
            {(instructionSteps.length > 0 || true) && (
              <div>
                <h3 className="text-base font-bold mb-3">Instructions</h3>
                <div className="space-y-2">
                  {instructionSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3 glass-subtle rounded-xl px-4 py-3">
                      <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">
                        {idx + 1}
                      </div>
                      <input
                        value={step}
                        onChange={(e) => handleStepChange(idx, e.target.value)}
                        placeholder={`Step ${idx + 1}...`}
                        className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground/40 hover:text-destructive"
                        onClick={() => handleRemoveStep(idx)}
                        type="button"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <button
                    onClick={handleAddStep}
                    className="w-full py-2.5 rounded-2xl border-2 border-dashed border-emerald-300/50 text-emerald-600 text-sm font-medium hover:border-emerald-400/70 hover:bg-emerald-50/30 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    Add Step
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center gap-3 border-t shrink-0">
          <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose} className="rounded-xl px-6">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!recipeName || editedIngredients.length === 0}
            className="rounded-xl px-6 gap-2 text-white font-semibold"
            style={{
              background: 'linear-gradient(135deg, rgba(0,188,125,1), rgba(0,187,167,1))',
              boxShadow: '0 4px 12px rgba(0,188,125,0.3)',
            }}
          >
            <Check className="h-4 w-4" />
            Save Recipe
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
