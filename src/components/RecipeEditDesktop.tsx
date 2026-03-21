import { useState } from 'react';
import { RecipeIngredient, BaseIngredient } from '@/types/meal';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, ExternalLink, Check, X, Trash2, Scale, Copy } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableIngredientRow } from '@/components/SortableIngredientRow';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RecipeEditorMode } from '@/components/RecipeEditorDialog';

export interface MealActions {
  onPortionAdjust: (multiplier: number) => void;
  onDuplicate: () => void;
}

interface MacroBadge {
  label: string;
  icon: React.ReactNode;
  value: number;
  suffix: string;
  bg: string;
  text: string;
}

interface RecipeEditDesktopProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  mode: RecipeEditorMode | null;
  formName: string;
  setFormName: (v: string) => void;
  formTags: string[];
  setFormTags: (v: string[] | ((prev: string[]) => string[])) => void;
  formLink: string;
  setFormLink: (v: string) => void;
  formIngredients: RecipeIngredient[];
  setFormIngredients: (v: RecipeIngredient[] | ((prev: RecipeIngredient[]) => RecipeIngredient[])) => void;
  ingredientDb: BaseIngredient[];
  sortedIngredientDb: BaseIngredient[];
  availableIngredients: BaseIngredient[];
  addIngredientOpen: boolean;
  setAddIngredientOpen: (v: boolean) => void;
  openIngredientPopover: number | null;
  setOpenIngredientPopover: (v: number | null) => void;
  onAddIngredient: (id: string) => void;
  onMultiplierChange: (idx: number, value: string) => void;
  onSwapIngredient: (idx: number, newId: string) => void;
  onRemoveIngredient: (idx: number) => void;
  onDragEnd: (event: DragEndEvent) => void;
  getIngredientInfo: (id: string, mult: number) => { calories: number; protein: number; carbs: number; fat: number; serving: string };
  formInstructionSteps: string[];
  onStepChange: (idx: number, value: string) => void;
  onRemoveStep: (idx: number) => void;
  onAddStep: () => void;
  formNotes: string;
  setFormNotes: (v: string) => void;
  macroBadges: MacroBadge[];
  allTags: string[];
  canDelete: boolean;
  onDelete?: () => void;
  saveLabel: string;
  mealActions?: MealActions;
}

export function RecipeEditDesktop({
  open, onClose, onSave, mode,
  formName, setFormName,
  formTags, setFormTags,
  formLink, setFormLink,
  formIngredients, setFormIngredients,
  ingredientDb, sortedIngredientDb, availableIngredients,
  addIngredientOpen, setAddIngredientOpen,
  openIngredientPopover, setOpenIngredientPopover,
  onAddIngredient, onMultiplierChange, onSwapIngredient, onRemoveIngredient, onDragEnd,
  getIngredientInfo,
  formInstructionSteps, onStepChange, onRemoveStep, onAddStep,
  formNotes, setFormNotes,
  macroBadges, allTags,
  canDelete, onDelete, saveLabel,
  mealActions,
}: RecipeEditDesktopProps) {
  const [batchMultiplier, setBatchMultiplier] = useState(1);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const isMealMode = mode?.type === 'editMeal';
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
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold">Ingredients</h3>
                {isMealMode && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Cooking for</span>
                    <Select value={String(batchMultiplier)} onValueChange={(v) => setBatchMultiplier(Number(v))}>
                      <SelectTrigger className="h-7 w-16 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map(n => (
                          <SelectItem key={n} value={String(n)} className="text-xs">{n}×</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="bg-accent rounded-xl p-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase pb-2 border-b border-border/30">
                  <span className="shrink-0 w-4" />
                  <span className="flex-1 min-w-0">Ingredient</span>
                  <span className="w-14 text-center shrink-0">{batchMultiplier > 1 ? 'Qty (×' + batchMultiplier + ')' : 'Qty'}</span>
                  <span className="w-20 shrink-0 text-left">Serving</span>
                  <span className="w-14 text-center shrink-0">Cal</span>
                  <span className="w-11 text-center shrink-0 text-emerald-600">P</span>
                  <span className="w-11 text-center shrink-0 text-cyan-600">C</span>
                  <span className="w-11 text-center shrink-0 text-orange-500">F</span>
                  <span className="w-7 shrink-0" />
                </div>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext
                    items={formIngredients.map((ing, idx) => ing.ingredientId + '-' + idx)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div>
                      {formIngredients.map((ing, idx) => {
                        const info = getIngredientInfo(ing.ingredientId, ing.servingMultiplier * batchMultiplier);
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
                            onMultiplierChange={(value) => onMultiplierChange(idx, value)}
                            onSwap={(newId) => onSwapIngredient(idx, newId)}
                            onRemove={() => onRemoveIngredient(idx)}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>

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
                                onAddIngredient(ing.id);
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
              <h3 className="text-base font-bold mb-3">Instructions</h3>
              <div className="space-y-2">
                {formInstructionSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-accent rounded-lg px-4 py-3">
                    <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">
                      {idx + 1}
                    </div>
                    <input
                      value={step}
                      onChange={(e) => onStepChange(idx, e.target.value)}
                      placeholder={`Step ${idx + 1}...`}
                      className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-muted-foreground/40 hover:text-destructive"
                      onClick={() => onRemoveStep(idx)}
                      type="button"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <button
                  onClick={onAddStep}
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
                className="w-full min-h-[100px] rounded-xl bg-accent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-y outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Meal Actions */}
        {mealActions && (
          <div className="px-6 py-3 flex items-center gap-2 border-t shrink-0">
            <PortionAdjustButton onAdjust={mealActions.onPortionAdjust} />
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={mealActions.onDuplicate}>
              <Copy className="h-3.5 w-3.5" />
              Duplicate to slot
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 flex items-center gap-3 border-t shrink-0">
          {canDelete && (
            <Button variant="destructive" size="sm" onClick={onDelete} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose} className="rounded-xl px-6">
            Cancel
          </Button>
          <Button
            onClick={onSave}
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


function PortionAdjustButton({ onAdjust }: { onAdjust: (multiplier: number) => void }) {
  const [showInput, setShowInput] = useState(false);
  const [value, setValue] = useState('');

  if (!showInput) {
    return (
      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowInput(true)}>
        <Scale className="h-3.5 w-3.5" />
        Adjust portion
      </Button>
    );
  }

  const handleApply = () => {
    const mult = parseFloat(value);
    if (mult > 0) {
      onAdjust(mult);
      setShowInput(false);
      setValue('');
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <Input
        autoFocus
        type="number"
        step="0.25"
        min="0.25"
        placeholder="e.g. 0.5"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleApply(); if (e.key === 'Escape') setShowInput(false); }}
        className="h-7 w-20 text-xs"
      />
      <span className="text-xs text-muted-foreground">×</span>
      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={handleApply}>Apply</Button>
      <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={() => setShowInput(false)}>
        <X className="h-3 w-3" />
      </Button>
    </div>
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
