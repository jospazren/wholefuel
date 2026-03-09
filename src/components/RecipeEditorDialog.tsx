import { useState, useEffect, useMemo } from 'react';
import { Recipe, RecipeIngredient } from '@/types/meal';
import { useIngredients } from '@/contexts/IngredientsContext';
import { useRecipes } from '@/contexts/RecipesContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, ExternalLink, Check, Flame, Beef, Wheat, Droplet, X, Trash2, Pencil } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableIngredientRow } from '@/components/SortableIngredientRow';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export type RecipeEditorMode = 
  | { type: 'add' }
  | { type: 'editRecipe'; recipe: Recipe }
  | { type: 'editMeal'; recipe: Recipe; onDelete?: () => void };

interface RecipeEditorDialogProps {
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
}

export function RecipeEditorDialog({ mode, open, onClose, onSave }: RecipeEditorDialogProps) {
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
        setFormName('');
        setFormTags([]);
        setFormIngredients([]);
        setFormInstructionSteps([]);
        setFormNotes('');
        setFormLink('');
        setMobileEditing(true);
      } else {
        const recipe = mode.recipe;
        setFormName(recipe.name);
        setFormTags(recipe.tags || []);
        setFormIngredients([...recipe.ingredients]);
        const instructions = recipe.instructions || '';
        setFormInstructionSteps(instructions ? instructions.split('\n').filter(s => s.trim()) : []);
        setFormNotes(recipe.notes || '');
        setFormLink(recipe.link || '');
        setMobileEditing(false);
      }
    }
  }, [open, mode]);

  const sortedIngredientDb = useMemo(() =>
    [...ingredientDb].sort((a, b) => a.name.localeCompare(b.name)),
    [ingredientDb]
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
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
      setFormIngredients([...formIngredients, {
        ingredientId: ing.id,
        name: ing.name,
        servingMultiplier: 1,
      }]);
    }
  };

  const handleSwapIngredient = (index: number, newIngredientId: string) => {
    const ing = ingredientDb.find(i => i.id === newIngredientId);
    if (ing) {
      const updated = [...formIngredients];
      updated[index] = {
        ingredientId: ing.id,
        name: ing.name,
        servingMultiplier: updated[index].servingMultiplier,
      };
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

  const handleAddStep = () => {
    setFormInstructionSteps([...formInstructionSteps, '']);
  };

  const handleStepChange = (index: number, value: string) => {
    const updated = [...formInstructionSteps];
    updated[index] = value;
    setFormInstructionSteps(updated);
  };

  const handleRemoveStep = (index: number) => {
    setFormInstructionSteps(formInstructionSteps.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave({
      name: formName,
      tags: formTags,
      ingredients: formIngredients,
      instructions: formInstructionSteps.filter(s => s.trim()).join('\n') || undefined,
      notes: formNotes || undefined,
      link: formLink || undefined,
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

  const canDelete = mode?.type === 'editMeal' && mode.onDelete;
  const saveLabel = mode?.type === 'add' ? 'Add Recipe' : 'Save Recipe';

  // ─── Mobile view mode (read-only with tabs) ─────────────────────
  if (isMobile && !mobileEditing) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="w-full h-full max-w-full max-h-full rounded-none p-0 flex flex-col [&>button]:hidden">
          {/* Header */}
          <div className="px-5 pt-5 pb-0 flex items-start justify-between shrink-0">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground truncate">{formName}</h2>
              {formLink && (
                <a
                  href={formLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1 max-w-full"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{formLink.replace(/^https?:\/\/(www\.)?/, '')}</span>
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setMobileEditing(true)}
                className="text-emerald-600 p-1.5"
              >
                <Pencil className="h-5 w-5" />
              </button>
              <button onClick={onClose} className="text-muted-foreground p-1.5">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="macros" className="flex-1 flex flex-col min-h-0">
            <TabsList className="mx-5 mt-3 mb-0 bg-transparent border-b border-border rounded-none h-auto p-0 gap-4 justify-start">
              <TabsTrigger value="macros" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-emerald-600 px-1 pb-2 text-sm font-medium">
                Macros
              </TabsTrigger>
              <TabsTrigger value="ingredients" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-emerald-600 px-1 pb-2 text-sm font-medium">
                Ingredients
              </TabsTrigger>
              <TabsTrigger value="instructions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-emerald-600 px-1 pb-2 text-sm font-medium">
                Instructions
              </TabsTrigger>
              <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-emerald-600 px-1 pb-2 text-sm font-medium">
                Notes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="macros" className="flex-1 overflow-y-auto px-5 py-4 mt-0">
              <div className="space-y-3">
                {macroBadges.map((m, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-4 rounded-xl border border-border/40 ${m.ringBg}`}>
                    <div className={`w-10 h-10 rounded-full ${m.bg} flex items-center justify-center ${m.text}`}>
                      {m.icon}
                    </div>
                    <span className={`text-sm font-medium ${m.text}`}>{m.label}</span>
                    <span className={`ml-auto text-lg font-bold ${m.text}`}>{m.value}{m.suffix}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="ingredients" className="flex-1 overflow-y-auto px-5 py-4 mt-0">
              <div className="space-y-2">
                {formIngredients.map((ing, idx) => {
                  const info = getIngredientInfo(ing.ingredientId, ing.servingMultiplier);
                  const dbIng = ingredientDb.find(i => i.id === ing.ingredientId);
                  const servingDesc = dbIng?.servingDescription || '100g';
                  return (
                    <div key={idx} className="flex items-start justify-between gap-3 px-4 py-3 rounded-xl border border-border/40 bg-muted/30">
                      <span className="text-sm font-medium text-foreground flex-1 min-w-0">{ing.name}</span>
                      <span className="text-sm shrink-0 text-right">
                        <span className="font-semibold text-emerald-600">×{Math.round(ing.servingMultiplier * 100) / 100}</span>{' '}
                        <span className="text-muted-foreground">{servingDesc}</span>
                      </span>
                    </div>
                  );
                })}
                {formIngredients.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No ingredients</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="instructions" className="flex-1 overflow-y-auto px-5 py-4 mt-0">
              <div className="space-y-3">
                {formInstructionSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 px-4 py-4 rounded-xl border border-border/40 bg-muted/30">
                    <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">
                      {idx + 1}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{step}</p>
                  </div>
                ))}
                {formInstructionSteps.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No instructions</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="notes" className="flex-1 overflow-y-auto px-5 py-4 mt-0">
              {formNotes ? (
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{formNotes}</p>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No notes</p>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    );
  }

  // ─── Mobile edit mode (single scrollable form) ──────────────────
  if (isMobile && mobileEditing) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="w-full h-full max-w-full max-h-full rounded-none p-0 flex flex-col [&>button]:hidden">
          {/* Header */}
          <div className="px-5 pt-5 pb-3 flex items-center justify-between shrink-0 border-b border-border/40">
            <h2 className="text-xl font-bold text-foreground truncate flex-1">{formName || 'New Recipe'}</h2>
            <button onClick={onClose} className="text-muted-foreground p-1.5 shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable form */}
          <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
            <div className="space-y-6">
              {/* Recipe name */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Recipe Name</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Recipe name..."
                  className="text-base font-semibold"
                />
              </div>

              {/* Ingredients */}
              <div>
                <h3 className="text-sm font-medium text-emerald-600 mb-3">Ingredients</h3>
                <div className="space-y-2">
                  {formIngredients.map((ing, idx) => {
                    const multiplierStr = String(Math.round(ing.servingMultiplier * 100) / 100);
                    return (
                      <div key={idx} className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border/40 bg-muted/30">
                        <span className="flex-1 text-sm font-medium text-foreground truncate">{ing.name}</span>
                        <Input
                          type="text"
                          inputMode="decimal"
                          defaultValue={multiplierStr}
                          onChange={(e) => handleIngredientMultiplierChange(idx, e.target.value)}
                          className="w-14 h-8 text-center text-sm shrink-0"
                        />
                        <span className="text-[11px] text-muted-foreground shrink-0 max-w-[60px] truncate">
                          {ingredientDb.find(i => i.id === ing.ingredientId)?.servingDescription || '100g'}
                        </span>
                        <button
                          onClick={() => handleRemoveIngredient(idx)}
                          className="text-destructive/60 hover:text-destructive shrink-0 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {availableIngredients.length > 0 && (
                  <Popover open={addIngredientOpen} onOpenChange={setAddIngredientOpen}>
                    <PopoverTrigger asChild>
                      <button className="w-full mt-2 py-2.5 rounded-2xl border-2 border-dashed border-emerald-300/50 text-emerald-600 text-sm font-medium hover:border-emerald-400/70 hover:bg-emerald-50/30 transition-colors flex items-center justify-center gap-1.5">
                        <Plus className="h-4 w-4" />
                        Add Ingredient
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-0" align="center">
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
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Instructions</h3>
                <div className="space-y-2">
                  {formInstructionSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3 px-4 py-3 rounded-xl border border-border/40 bg-muted/30">
                      <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">
                        {idx + 1}
                      </div>
                      <input
                        value={step}
                        onChange={(e) => handleStepChange(idx, e.target.value)}
                        placeholder={`Step ${idx + 1}...`}
                        className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground min-w-0"
                      />
                      <button
                        onClick={() => handleRemoveStep(idx)}
                        className="text-destructive/60 hover:text-destructive shrink-0 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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

              {/* Notes */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Notes</h3>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Add notes about this recipe..."
                  className="w-full min-h-[100px] rounded-xl border border-border/40 bg-muted/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-y outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 flex items-center gap-3 border-t shrink-0">
            {canDelete && (
              <Button variant="destructive" size="sm" onClick={mode.type === 'editMeal' ? mode.onDelete : undefined} className="gap-2">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={() => {
              if (mode?.type === 'add') { onClose(); } else { setMobileEditing(false); }
            }} className="rounded-xl px-6">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formName || formIngredients.length === 0}
              className="rounded-xl px-6 gap-2 text-white font-semibold"
              style={{
                background: 'linear-gradient(135deg, rgba(0,188,125,1), rgba(0,187,167,1))',
                boxShadow: '0 4px 12px rgba(0,188,125,0.3)',
              }}
            >
              <Check className="h-4 w-4" />
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ─── Desktop layout (unchanged) ─────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 space-y-3 shrink-0">
          <Input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Recipe name..."
            className="text-2xl font-bold h-auto py-1 px-0 border-0 bg-transparent focus-visible:ring-0 shadow-none"
          />

          {/* Tags + Link + Macros row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tag chips */}
            <div className="flex flex-wrap gap-1.5">
              {allTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setFormTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                    formTags.includes(tag)
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  )}
                >
                  {tag}
                </button>
              ))}
              <NewTagInput onAdd={(tag) => {
                if (!formTags.includes(tag)) setFormTags(prev => [...prev, tag]);
              }} />
            </div>

            <Input
              value={formLink}
              onChange={(e) => setFormLink(e.target.value)}
              placeholder="Recipe link (optional)"
              className="h-8 text-sm flex-1 min-w-[180px] max-w-[300px]"
            />

            <a
              href={formLink || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-muted-foreground ${formLink ? 'hover:text-primary cursor-pointer' : 'opacity-40 pointer-events-none'}`}
            >
              <ExternalLink className="h-4 w-4" />
            </a>

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

              <div className="bg-accent rounded-xl p-3"> {/* Column headers */}
                <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase pb-2 border-b border-border/30">
                  <span className="shrink-0 w-4" />
                  <span className="flex-1 min-w-0">Ingredient</span>
                  <span className="w-14 text-center shrink-0">Qty</span>
                  <span className="w-20 shrink-0 text-left">Serving</span>
                  <span className="w-14 text-center shrink-0">Cal</span>
                  <span className="w-11 text-center shrink-0 text-emerald-600">P</span>
                  <span className="w-11 text-center shrink-0 text-cyan-600">C</span>
                  <span className="w-11 text-center shrink-0 text-orange-500">F</span>
                  <span className="w-7 shrink-0" />
                </div>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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

            {/* Instructions - Step-based */}
            <div>
              <h3 className="text-base font-bold mb-3">Instructions</h3>
              <div className="space-y-2">
                {formInstructionSteps.map((step, idx) => (
                  <div key={idx} className="flex itbg-accent roundeems-start gap-3 bg-accent rounded-lg px-4 py-3"      <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">
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

            {/* Notes */}
            <div>
              <h3 className="text-base font-bold mb-3">Notes</h3>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Add notes about this recipe..."
                className="w-full min-h-[100plg bg-accent px-4 pg bg-accenty-3 text-sm text-foreground placeholder:text-muted-foreground resize-y outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center gap-3 border-t shrink-0">
          {canDelete && (
            <Button variant="destructive" size="sm" onClick={mode.type === 'editMeal' ? mode.onDelete : undefined} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose} className="rounded-xl px-6">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formName || formIngredients.length === 0}
            className="rounded-xl px-6 gap-2 text-white font-semibold"
            style={{
              background: 'linear-gradient(135deg, rgba(0,188,125,1), rgba(0,187,167,1))',
              boxShadow: '0 4px 12px rgba(0,188,125,0.3)',
            }}
          >
            <Check className="h-4 w-4" />
            {saveLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewTagInput({ onAdd }: { onAdd: (tag: string) => void }) {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);

  const handleAdd = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onAdd(trimmed);
      setValue('');
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-2.5 py-1 rounded-full text-xs font-medium border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-all"
      >
        + Tag
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setOpen(false); }}
        placeholder="New tag..."
        className="w-20 h-6 px-2 text-xs rounded-full border border-input bg-background outline-none focus:ring-1 focus:ring-ring"
      />
      <button type="button" onClick={handleAdd} className="text-primary p-0.5">
        <Check className="h-3 w-3" />
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground p-0.5">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
