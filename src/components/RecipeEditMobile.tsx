import { RecipeIngredient, BaseIngredient } from '@/types/meal';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Check, Trash2, X } from 'lucide-react';
import { RecipeEditorMode } from '@/components/RecipeEditorDialog';

interface RecipeEditMobileProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
  mode: RecipeEditorMode | null;
  formName: string;
  setFormName: (v: string) => void;
  formIngredients: RecipeIngredient[];
  ingredientDb: BaseIngredient[];
  availableIngredients: BaseIngredient[];
  addIngredientOpen: boolean;
  setAddIngredientOpen: (v: boolean) => void;
  onAddIngredient: (id: string) => void;
  onMultiplierChange: (idx: number, value: string) => void;
  onRemoveIngredient: (idx: number) => void;
  formInstructionSteps: string[];
  onStepChange: (idx: number, value: string) => void;
  onRemoveStep: (idx: number) => void;
  onAddStep: () => void;
  formNotes: string;
  setFormNotes: (v: string) => void;
  canDelete: boolean;
  onDelete?: () => void;
}

export function RecipeEditMobile({
  open, onClose, onSave, onCancelEdit, mode,
  formName, setFormName,
  formIngredients, ingredientDb, availableIngredients,
  addIngredientOpen, setAddIngredientOpen,
  onAddIngredient, onMultiplierChange, onRemoveIngredient,
  formInstructionSteps, onStepChange, onRemoveStep, onAddStep,
  formNotes, setFormNotes,
  canDelete, onDelete,
}: RecipeEditMobileProps) {
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
                        onChange={(e) => onMultiplierChange(idx, e.target.value)}
                        className="w-14 h-8 text-center text-sm shrink-0"
                      />
                      <span className="text-[11px] text-muted-foreground shrink-0 max-w-[60px] truncate">
                        {ingredientDb.find(i => i.id === ing.ingredientId)?.servingDescription || '100g'}
                      </span>
                      <button
                        onClick={() => onRemoveIngredient(idx)}
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
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Instructions</h3>
              <div className="space-y-2">
                {formInstructionSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 px-4 py-3 rounded-xl border border-border/40 bg-muted/30">
                    <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">
                      {idx + 1}
                    </div>
                    <input
                      value={step}
                      onChange={(e) => onStepChange(idx, e.target.value)}
                      placeholder={`Step ${idx + 1}...`}
                      className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground min-w-0"
                    />
                    <button
                      onClick={() => onRemoveStep(idx)}
                      className="text-destructive/60 hover:text-destructive shrink-0 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
            <Button variant="destructive" size="sm" onClick={onDelete} className="gap-2">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={onCancelEdit} className="rounded-xl px-6">
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
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
