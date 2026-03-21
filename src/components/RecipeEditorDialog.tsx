import { useState, useEffect, useMemo } from 'react';
import { Recipe, RecipeIngredient } from '@/types/meal';
import { useIngredients } from '@/contexts/IngredientsContext';
import { useRecipes } from '@/contexts/RecipesContext';
import { Flame, Beef, Wheat, Droplet } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import { useIsMobile } from '@/hooks/use-mobile';
import { DragEndEvent } from '@dnd-kit/core';
import { RecipeViewMobile } from '@/components/RecipeViewMobile';
import { RecipeEditMobile } from '@/components/RecipeEditMobile';
import { RecipeEditDesktop, MealActions } from '@/components/RecipeEditDesktop';

export type RecipeEditorMode =
  | { type: 'add' }
  | { type: 'editRecipe'; recipe: Recipe }
  | { type: 'editMeal'; recipe: Recipe; onDelete?: () => void };

export interface RecipeEditorDialogProps {
  mode: RecipeEditorMode | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    tags: string[];
    ingredients: RecipeIngredient[];
    instructions?: string;
    notes?: string;
    link?: string;
  }) => void;
  mealActions?: MealActions;
}

export function RecipeEditorDialog({ mode, open, onClose, onSave, mealActions }: RecipeEditorDialogProps) {
  const { ingredients: ingredientDb } = useIngredients();
  const { calculateMacrosFromIngredients, allTags } = useRecipes();
  const isMobile = useIsMobile();

  const [formName, setFormName] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formIngredients, setFormIngredients] = useState<RecipeIngredient[]>([]);
  const [formInstructionSteps, setFormInstructionSteps] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState('');
  const [formLink, setFormLink] = useState('');
  const [openIngredientPopover, setOpenIngredientPopover] = useState<number | null>(null);
  const [addIngredientOpen, setAddIngredientOpen] = useState(false);
  const [mobileEditing, setMobileEditing] = useState(false);

  useEffect(() => {
    if (open && mode) {
      if (mode.type === 'add') {
        setFormName(''); setFormTags([]); setFormIngredients([]);
        setFormInstructionSteps([]); setFormNotes(''); setFormLink('');
        setMobileEditing(true);
      } else {
        const recipe = mode.recipe;
        setFormName(recipe.name); setFormTags(recipe.tags || []);
        setFormIngredients([...recipe.ingredients]);
        const instructions = recipe.instructions || '';
        setFormInstructionSteps(instructions ? instructions.split('\n').filter(s => s.trim()) : []);
        setFormNotes(recipe.notes || ''); setFormLink(recipe.link || '');
        setMobileEditing(false);
      }
    }
  }, [open, mode]);

  const sortedIngredientDb = useMemo(() =>
    [...ingredientDb].sort((a, b) => a.name.localeCompare(b.name)),
    [ingredientDb]
  );

  const currentMacros = calculateMacrosFromIngredients(
    formIngredients.map(i => ({ ingredientId: i.ingredientId, servingMultiplier: i.servingMultiplier }))
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
    const updated = [...formIngredients];
    updated[index] = { ...updated[index], servingMultiplier: num };
    setFormIngredients(updated);
  };

  const handleRemoveIngredient = (index: number) => {
    setFormIngredients(formIngredients.filter((_, i) => i !== index));
  };

  const handleAddIngredient = (ingredientId: string) => {
    const ing = ingredientDb.find(i => i.id === ingredientId);
    if (ing) {
      setFormIngredients([...formIngredients, { ingredientId: ing.id, name: ing.name, servingMultiplier: 1 }]);
    }
  };

  const handleSwapIngredient = (index: number, newIngredientId: string) => {
    const ing = ingredientDb.find(i => i.id === newIngredientId);
    if (ing) {
      const updated = [...formIngredients];
      updated[index] = { ingredientId: ing.id, name: ing.name, servingMultiplier: updated[index].servingMultiplier };
      setFormIngredients(updated);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = formIngredients.findIndex((ing, idx) => ing.ingredientId + '-' + idx === active.id);
      const newIndex = formIngredients.findIndex((ing, idx) => ing.ingredientId + '-' + idx === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        setFormIngredients(arrayMove(formIngredients, oldIndex, newIndex));
      }
    }
  };

  const handleAddStep = () => setFormInstructionSteps([...formInstructionSteps, '']);
  const handleStepChange = (index: number, value: string) => {
    const updated = [...formInstructionSteps]; updated[index] = value; setFormInstructionSteps(updated);
  };
  const handleRemoveStep = (index: number) => setFormInstructionSteps(formInstructionSteps.filter((_, i) => i !== index));

  const handleSave = () => {
    onSave({
      name: formName, tags: formTags, ingredients: formIngredients,
      instructions: formInstructionSteps.filter(s => s.trim()).join('\n') || undefined,
      notes: formNotes || undefined, link: formLink || undefined,
    });
  };

  const availableIngredients = sortedIngredientDb.filter(
    ing => !formIngredients.some(fi => fi.ingredientId === ing.id)
  );

  const macroBadges = [
    { label: 'Calories', icon: <Flame className="h-3.5 w-3.5" />, value: currentMacros.calories, suffix: '', bg: 'bg-slate-500/10', text: 'text-slate-600', ringBg: 'bg-muted/60' },
    { label: 'Protein', icon: <Beef className="h-3.5 w-3.5" />, value: currentMacros.protein, suffix: 'g', bg: 'bg-emerald-600/10', text: 'text-emerald-600', ringBg: 'bg-emerald-50' },
    { label: 'Carbs', icon: <Wheat className="h-3.5 w-3.5" />, value: currentMacros.carbs, suffix: 'g', bg: 'bg-cyan-600/10', text: 'text-cyan-600', ringBg: 'bg-cyan-50' },
    { label: 'Fat', icon: <Droplet className="h-3.5 w-3.5" />, value: currentMacros.fat, suffix: 'g', bg: 'bg-orange-500/10', text: 'text-orange-500', ringBg: 'bg-orange-50' },
  ];

  const canDelete = mode?.type === 'editMeal' && !!mode.onDelete;
  const saveLabel = mode?.type === 'add' ? 'Add Recipe' : 'Save Recipe';

  // ─── Mobile view mode (read-only) ─────────────────────
  if (isMobile && !mobileEditing) {
    return (
      <RecipeViewMobile
        open={open}
        onClose={onClose}
        onEdit={() => setMobileEditing(true)}
        formName={formName}
        formLink={formLink}
        formIngredients={formIngredients}
        formInstructionSteps={formInstructionSteps}
        formNotes={formNotes}
        macroBadges={macroBadges}
        ingredientDb={ingredientDb}
      />
    );
  }

  // ─── Mobile edit mode ──────────────────────────────────
  if (isMobile && mobileEditing) {
    return (
      <RecipeEditMobile
        open={open}
        onClose={onClose}
        onSave={handleSave}
        onCancelEdit={() => { if (mode?.type === 'add') onClose(); else setMobileEditing(false); }}
        mode={mode}
        formName={formName}
        setFormName={setFormName}
        formIngredients={formIngredients}
        ingredientDb={ingredientDb}
        availableIngredients={availableIngredients}
        addIngredientOpen={addIngredientOpen}
        setAddIngredientOpen={setAddIngredientOpen}
        onAddIngredient={handleAddIngredient}
        onMultiplierChange={handleIngredientMultiplierChange}
        onRemoveIngredient={handleRemoveIngredient}
        formInstructionSteps={formInstructionSteps}
        onStepChange={handleStepChange}
        onRemoveStep={handleRemoveStep}
        onAddStep={handleAddStep}
        formNotes={formNotes}
        setFormNotes={setFormNotes}
        canDelete={canDelete}
        onDelete={mode?.type === 'editMeal' ? mode.onDelete : undefined}
      />
    );
  }

  // ─── Desktop layout ────────────────────────────────────
  return (
    <RecipeEditDesktop
      open={open}
      onClose={onClose}
      onSave={handleSave}
      mode={mode}
      formName={formName}
      setFormName={setFormName}
      formTags={formTags}
      setFormTags={setFormTags}
      formLink={formLink}
      setFormLink={setFormLink}
      formIngredients={formIngredients}
      setFormIngredients={setFormIngredients}
      ingredientDb={ingredientDb}
      sortedIngredientDb={sortedIngredientDb}
      availableIngredients={availableIngredients}
      addIngredientOpen={addIngredientOpen}
      setAddIngredientOpen={setAddIngredientOpen}
      openIngredientPopover={openIngredientPopover}
      setOpenIngredientPopover={setOpenIngredientPopover}
      onAddIngredient={handleAddIngredient}
      onMultiplierChange={handleIngredientMultiplierChange}
      onSwapIngredient={handleSwapIngredient}
      onRemoveIngredient={handleRemoveIngredient}
      onDragEnd={handleDragEnd}
      getIngredientInfo={getIngredientInfo}
      formInstructionSteps={formInstructionSteps}
      onStepChange={handleStepChange}
      onRemoveStep={handleRemoveStep}
      onAddStep={handleAddStep}
      formNotes={formNotes}
      setFormNotes={setFormNotes}
      macroBadges={macroBadges}
      allTags={allTags}
      canDelete={canDelete}
      onDelete={mode?.type === 'editMeal' ? mode.onDelete : undefined}
      saveLabel={saveLabel}
    />
  );
}
