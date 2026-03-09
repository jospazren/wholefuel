import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

export type MacroVisibility = {
  calories: boolean;
  protein: boolean;
  carbs: boolean;
  fat: boolean;
};

const STORAGE_KEY = 'wholefuel-macro-visibility';

const defaultVisibility: MacroVisibility = {
  calories: true,
  protein: true,
  carbs: true,
  fat: true,
};

export function getMacroVisibility(): MacroVisibility {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return defaultVisibility;
}

const macroItems = [
  { key: 'calories' as const, label: 'Calories', color: 'bg-slate-500' },
  { key: 'protein' as const, label: 'Protein', color: 'bg-emerald-500' },
  { key: 'carbs' as const, label: 'Carbs', color: 'bg-cyan-500' },
  { key: 'fat' as const, label: 'Fat', color: 'bg-orange-500' },
] as const;

interface ViewSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (visibility: MacroVisibility) => void;
  visibility: MacroVisibility;
}

export function ViewSettingsDialog({ open, onOpenChange, onSave, visibility }: ViewSettingsDialogProps) {
  const [local, setLocal] = useState<MacroVisibility>(visibility);

  useEffect(() => {
    if (open) setLocal(visibility);
  }, [open, visibility]);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
    onSave(local);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">View Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Display Macros</p>
          <div className="space-y-2">
            {macroItems.map(({ key, label, color }) => (
              <label
                key={key}
                className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-3 cursor-pointer hover:bg-white/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${color}`} />
                  <span className="font-medium text-sm">{label}</span>
                </div>
                <Checkbox
                  checked={local[key]}
                  onCheckedChange={(checked) =>
                    setLocal((prev) => ({ ...prev, [key]: !!checked }))
                  }
                  className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                />
              </label>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white" onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
