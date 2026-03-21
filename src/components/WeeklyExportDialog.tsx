import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { useMeals } from '@/contexts/MealsContext';
import { useIngredients } from '@/contexts/IngredientsContext';
import { buildExportJson, getExportSummary } from '@/lib/exportWeeklyNutrition';
import { Copy, Download } from 'lucide-react';
import { toast } from 'sonner';

interface WeeklyExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WeeklyExportDialog({ open, onOpenChange }: WeeklyExportDialogProps) {
  const { weeklyPlan, weeklyTargets, currentWeekStart, dietPresets } = useMealPlan();
  const { getMeal, getMealMacros } = useMeals();
  const { ingredients } = useIngredients();

  const presetName = weeklyTargets.presetId
    ? dietPresets.find(p => p.id === weeklyTargets.presetId)?.name
    : undefined;

  const summary = useMemo(() => getExportSummary({
    weekStart: currentWeekStart,
    weeklyPlan,
    weeklyTargets,
    getMeal,
    getMealMacros,
    ingredients,
  }), [currentWeekStart, weeklyPlan, weeklyTargets, getMeal, getMealMacros, ingredients]);

  const exportJson = useMemo(() => {
    if (!open) return '';
    const data = buildExportJson({
      weekStart: currentWeekStart,
      weeklyPlan,
      weeklyTargets,
      getMeal,
      getMealMacros,
      ingredients,
      presetName,
    });
    return JSON.stringify(data, null, 2);
  }, [open, currentWeekStart, weeklyPlan, weeklyTargets, getMeal, getMealMacros, ingredients, presetName]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportJson);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([exportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wholefuel-${currentWeekStart}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded');
  };

  const totalMeals = summary.totalMealsPlanned + summary.totalMealsEstimated;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-base">Export Week — {currentWeekStart}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-accent/50 p-2.5">
              <div className="text-muted-foreground text-xs">Total meals</div>
              <div className="font-semibold">{totalMeals}</div>
            </div>
            <div className="rounded-lg bg-accent/50 p-2.5">
              <div className="text-muted-foreground text-xs">Estimated</div>
              <div className="font-semibold">{summary.totalMealsEstimated}</div>
            </div>
            <div className="rounded-lg bg-accent/50 p-2.5">
              <div className="text-muted-foreground text-xs">Days with data</div>
              <div className="font-semibold">{summary.daysWithData} / 7</div>
            </div>
            <div className="rounded-lg bg-accent/50 p-2.5">
              <div className="text-muted-foreground text-xs">Empty days</div>
              <div className="font-semibold">{summary.daysEmpty}</div>
            </div>
          </div>

          {totalMeals === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No meals this week. Add some meals before exporting.
            </p>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopy} disabled={totalMeals === 0}>
            <Copy className="h-3.5 w-3.5" />
            Copy JSON
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleDownload} disabled={totalMeals === 0}>
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
