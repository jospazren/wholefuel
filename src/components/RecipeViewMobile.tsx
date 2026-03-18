import { RecipeIngredient } from '@/types/meal';
import { BaseIngredient } from '@/types/meal';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ExternalLink, Pencil, X } from 'lucide-react';

interface MacroBadge {
  label: string;
  icon: React.ReactNode;
  value: number;
  suffix: string;
  bg: string;
  text: string;
  ringBg: string;
}

interface RecipeViewMobileProps {
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  formName: string;
  formLink: string;
  formIngredients: RecipeIngredient[];
  formInstructionSteps: string[];
  formNotes: string;
  macroBadges: MacroBadge[];
  ingredientDb: BaseIngredient[];
}

export function RecipeViewMobile({
  open, onClose, onEdit, formName, formLink,
  formIngredients, formInstructionSteps, formNotes,
  macroBadges, ingredientDb,
}: RecipeViewMobileProps) {
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
            <button onClick={onEdit} className="text-emerald-600 p-1.5">
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
