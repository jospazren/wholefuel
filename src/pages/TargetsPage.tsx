import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { DietPreset, computeTargetsFromPreset } from '@/types/meal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TargetsPage() {
  const { dietPresets, addDietPreset, updateDietPreset, deleteDietPreset, weeklyTargets } = useMealPlan();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<DietPreset | null>(null);

  const openAdd = () => {
    setEditingPreset(null);
    setEditorOpen(true);
  };

  const openEdit = (preset: DietPreset) => {
    setEditingPreset(preset);
    setEditorOpen(true);
  };

  // Use user's current weight/tdee for preview
  const previewWeight = weeklyTargets.weightKg || 80;
  const previewTdee = weeklyTargets.tdee || 2500;

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display font-bold text-2xl text-foreground">Diet Presets</h1>
          <Button onClick={openAdd} className="gap-2 rounded-full px-5">
            <Plus className="h-4 w-4" />
            Add Preset
          </Button>
        </div>

        <div className="space-y-4">
          {dietPresets.map((preset) => {
            const computed = computeTargetsFromPreset(preset, previewWeight, previewTdee);
            return (
              <PresetCard
                key={preset.id}
                preset={preset}
                computed={computed}
                previewTdee={previewTdee}
                previewWeight={previewWeight}
                onEdit={() => openEdit(preset)}
                onDelete={() => deleteDietPreset(preset.id)}
              />
            );
          })}

          {dietPresets.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p>No presets yet. Create your first diet preset to get started.</p>
            </div>
          )}
        </div>
      </div>

      <PresetEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        preset={editingPreset}
        onSave={(preset) => {
          if (editingPreset) {
            updateDietPreset(preset.id, preset);
          } else {
            addDietPreset(preset);
          }
          setEditorOpen(false);
        }}
      />
    </AppLayout>
  );
}

function PresetCard({
  preset,
  computed,
  previewTdee,
  previewWeight,
  onEdit,
  onDelete,
}: {
  preset: DietPreset;
  computed: { dailyCalories: number; protein: number; carbs: number; fat: number };
  previewTdee: number;
  previewWeight: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const macros = [
    {
      label: `Protein${preset.proteinPerKg != null ? ` (${preset.proteinPerKg}g/kg)` : ' (auto)'}`,
      value: computed.protein,
      color: 'text-macro-protein',
      bgColor: 'bg-macro-protein/10 border-macro-protein/20',
    },
    {
      label: `Carbs${preset.carbsPerKg != null ? ` (${preset.carbsPerKg}g/kg)` : ' (auto)'}`,
      value: computed.carbs,
      color: 'text-macro-carbs',
      bgColor: 'bg-macro-carbs/10 border-macro-carbs/20',
    },
    {
      label: `Fat${preset.fatPerKg != null ? ` (${preset.fatPerKg}g/kg)` : ' (auto)'}`,
      value: computed.fat,
      color: 'text-macro-fat',
      bgColor: 'bg-macro-fat/10 border-macro-fat/20',
    },
  ];

  return (
    <div
      className="rounded-2xl p-6 space-y-4 cursor-pointer hover:shadow-md transition-shadow"
      style={{
        backgroundImage: 'linear-gradient(137deg, rgba(255,255,255,0.7), rgba(249,250,251,0.4))',
        border: '1px solid rgba(255,255,255,0.6)',
        backdropFilter: 'blur(12px)',
      }}
      onClick={onEdit}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg text-foreground">{preset.name}</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>TDEE Multiplier:</span>
        <span className="font-semibold text-foreground">{Math.round(preset.tdeeMultiplier * 100)}%</span>
        <span className="px-2 py-0.5 rounded-md bg-secondary text-xs font-medium">
          {computed.dailyCalories} kcal
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {macros.map((m) => (
          <div
            key={m.label}
            className={cn('rounded-xl p-4 border', m.bgColor)}
          >
            <span className={cn('text-xs font-medium', m.color)}>{m.label}</span>
            <div className={cn('text-2xl font-bold mt-1', m.color)}>{m.value}g</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PresetEditorDialog({
  open,
  onOpenChange,
  preset,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset: DietPreset | null;
  onSave: (preset: DietPreset) => void;
}) {
  const [name, setName] = useState('');
  const [tdeeMultiplier, setTdeeMultiplier] = useState('100');
  const [proteinPerKg, setProteinPerKg] = useState('1.8');
  const [carbsPerKg, setCarbsPerKg] = useState('4');
  const [fatPerKg, setFatPerKg] = useState('');
  const [proteinAuto, setProteinAuto] = useState(false);
  const [carbsAuto, setCarbsAuto] = useState(false);
  const [fatAuto, setFatAuto] = useState(true);

  // Reset form when opening
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      if (preset) {
        setName(preset.name);
        setTdeeMultiplier(String(Math.round(preset.tdeeMultiplier * 100)));
        setProteinAuto(preset.proteinPerKg == null);
        setCarbsAuto(preset.carbsPerKg == null);
        setFatAuto(preset.fatPerKg == null);
        setProteinPerKg(preset.proteinPerKg != null ? String(preset.proteinPerKg) : '1.8');
        setCarbsPerKg(preset.carbsPerKg != null ? String(preset.carbsPerKg) : '4');
        setFatPerKg(preset.fatPerKg != null ? String(preset.fatPerKg) : '0.8');
      } else {
        setName('');
        setTdeeMultiplier('100');
        setProteinPerKg('1.8');
        setCarbsPerKg('4');
        setFatPerKg('0.8');
        setProteinAuto(false);
        setCarbsAuto(false);
        setFatAuto(true);
      }
    }
    onOpenChange(isOpen);
  };

  const handleToggleAuto = (macro: 'protein' | 'carbs' | 'fat') => {
    // Only one can be auto at a time
    setProteinAuto(macro === 'protein');
    setCarbsAuto(macro === 'carbs');
    setFatAuto(macro === 'fat');
  };

  const handleSave = () => {
    onSave({
      id: preset?.id || crypto.randomUUID(),
      name: name || 'Untitled',
      tdeeMultiplier: (parseFloat(tdeeMultiplier) || 100) / 100,
      proteinPerKg: proteinAuto ? null : (parseFloat(proteinPerKg) || 0),
      carbsPerKg: carbsAuto ? null : (parseFloat(carbsPerKg) || 0),
      fatPerKg: fatAuto ? null : (parseFloat(fatPerKg) || 0),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{preset ? 'Edit Preset' : 'New Diet Preset'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maintenance" />
          </div>

          <div className="space-y-2">
            <Label>TDEE Multiplier (%)</Label>
            <Input
              type="number"
              value={tdeeMultiplier}
              onChange={(e) => setTdeeMultiplier(e.target.value)}
              placeholder="100"
            />
          </div>

          {/* Macro fields */}
          {([
            { key: 'protein' as const, label: 'Protein (g/kg)', value: proteinPerKg, setValue: setProteinPerKg, isAuto: proteinAuto },
            { key: 'carbs' as const, label: 'Carbs (g/kg)', value: carbsPerKg, setValue: setCarbsPerKg, isAuto: carbsAuto },
            { key: 'fat' as const, label: 'Fat (g/kg)', value: fatPerKg, setValue: setFatPerKg, isAuto: fatAuto },
          ]).map((m) => (
            <div key={m.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{m.label}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Auto</span>
                  <Switch
                    checked={m.isAuto}
                    onCheckedChange={() => handleToggleAuto(m.key)}
                  />
                </div>
              </div>
              {!m.isAuto && (
                <Input
                  type="number"
                  step="0.1"
                  value={m.value}
                  onChange={(e) => m.setValue(e.target.value)}
                />
              )}
              {m.isAuto && (
                <p className="text-xs text-muted-foreground italic">Calculated from remaining calories</p>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>{preset ? 'Save' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
