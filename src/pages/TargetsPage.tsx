import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { DietPreset, MacroMode, computeTargetsFromPreset } from '@/types/meal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
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

  const previewWeight = weeklyTargets.weightKg || 80;
  const previewTdee = weeklyTargets.tdee || 2500;
  const previewCalories = weeklyTargets.dailyCalories || previewTdee;

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
                previewCalories={previewCalories}
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
        previewWeight={previewWeight}
        previewCalories={previewCalories}
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
  previewCalories,
  onEdit,
  onDelete,
}: {
  preset: DietPreset;
  computed: { dailyCalories: number; protein: number; carbs: number; fat: number };
  previewTdee: number;
  previewWeight: number;
  previewCalories: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Derive both representations
  const proteinPct = previewCalories > 0 ? ((computed.protein * 4) / previewCalories * 100).toFixed(1) : '0';
  const carbsPct = previewCalories > 0 ? ((computed.carbs * 4) / previewCalories * 100).toFixed(1) : '0';
  const fatPct = previewCalories > 0 ? ((computed.fat * 9) / previewCalories * 100).toFixed(1) : '0';

  const macros = [
    {
      label: 'Protein',
      gPerKg: preset.proteinPerKg != null ? `${preset.proteinPerKg}g/kg` : 'auto',
      pct: `${proteinPct}%`,
      value: computed.protein,
      color: 'text-macro-protein',
      bgColor: 'bg-macro-protein/10 border-macro-protein/20',
    },
    {
      label: 'Carbs',
      gPerKg: preset.carbsPerKg != null ? `${preset.carbsPerKg}g/kg` : 'auto',
      pct: `${carbsPct}%`,
      value: computed.carbs,
      color: 'text-macro-carbs',
      bgColor: 'bg-macro-carbs/10 border-macro-carbs/20',
    },
    {
      label: 'Fat',
      gPerKg: preset.fatPerKg != null ? `${preset.fatPerKg}g/kg` : 'auto',
      pct: `${fatPct}%`,
      value: computed.fat,
      color: 'text-macro-fat',
      bgColor: 'bg-macro-fat/10 border-macro-fat/20',
    },
  ];

  const modeLabel = preset.macroMode === 'pct_of_calories' ? '%kcal' : 'g/kg';

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
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-lg text-foreground">{preset.name}</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-medium">
            {modeLabel}
          </span>
        </div>
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
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {m.gPerKg} · {m.pct}
            </div>
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
  previewWeight,
  previewCalories,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset: DietPreset | null;
  previewWeight: number;
  previewCalories: number;
  onSave: (preset: DietPreset) => void;
}) {
  const [name, setName] = useState('');
  const [tdeeMultiplier, setTdeeMultiplier] = useState('100');
  const [macroMode, setMacroMode] = useState<MacroMode>('g_per_kg');

  // g/kg fields
  const [proteinPerKg, setProteinPerKg] = useState('1.8');
  const [carbsPerKg, setCarbsPerKg] = useState('4');
  const [fatPerKg, setFatPerKg] = useState('');
  const [proteinAuto, setProteinAuto] = useState(false);
  const [carbsAuto, setCarbsAuto] = useState(false);
  const [fatAuto, setFatAuto] = useState(true);

  // % fields
  const [proteinPct, setProteinPct] = useState('30');
  const [carbsPct, setCarbsPct] = useState('45');
  const [fatPct, setFatPct] = useState('25');

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      if (preset) {
        setName(preset.name);
        setTdeeMultiplier(String(Math.round(preset.tdeeMultiplier * 100)));
        setMacroMode(preset.macroMode);
        setProteinAuto(preset.proteinPerKg == null);
        setCarbsAuto(preset.carbsPerKg == null);
        setFatAuto(preset.fatPerKg == null);
        setProteinPerKg(preset.proteinPerKg != null ? String(preset.proteinPerKg) : '1.8');
        setCarbsPerKg(preset.carbsPerKg != null ? String(preset.carbsPerKg) : '4');
        setFatPerKg(preset.fatPerKg != null ? String(preset.fatPerKg) : '0.8');
        setProteinPct(preset.proteinPct != null ? String(preset.proteinPct) : '30');
        setCarbsPct(preset.carbsPct != null ? String(preset.carbsPct) : '45');
        setFatPct(preset.fatPct != null ? String(preset.fatPct) : '25');
      } else {
        setName('');
        setTdeeMultiplier('100');
        setMacroMode('g_per_kg');
        setProteinPerKg('1.8');
        setCarbsPerKg('4');
        setFatPerKg('0.8');
        setProteinAuto(false);
        setCarbsAuto(false);
        setFatAuto(true);
        setProteinPct('30');
        setCarbsPct('45');
        setFatPct('25');
      }
    }
    onOpenChange(isOpen);
  };

  const handleToggleAuto = (macro: 'protein' | 'carbs' | 'fat') => {
    setProteinAuto(macro === 'protein');
    setCarbsAuto(macro === 'carbs');
    setFatAuto(macro === 'fat');
  };

  // Percentage sum validation
  const pctSum = (parseFloat(proteinPct) || 0) + (parseFloat(carbsPct) || 0) + (parseFloat(fatPct) || 0);
  const pctWarning = macroMode === 'pct_of_calories' && Math.abs(pctSum - 100) > 5;

  // Preview derived values
  const effectiveCal = Math.round((parseInt(tdeeMultiplier) || 100) / 100 * previewCalories);

  const derivedFromPct = {
    protein: Math.round(((parseFloat(proteinPct) || 0) / 100) * effectiveCal / 4),
    carbs: Math.round(((parseFloat(carbsPct) || 0) / 100) * effectiveCal / 4),
    fat: Math.round(((parseFloat(fatPct) || 0) / 100) * effectiveCal / 9),
  };

  const derivedFromGpk = {
    protein: proteinAuto ? null : Math.round((parseFloat(proteinPerKg) || 0) * previewWeight),
    carbs: carbsAuto ? null : Math.round((parseFloat(carbsPerKg) || 0) * previewWeight),
    fat: fatAuto ? null : Math.round((parseFloat(fatPerKg) || 0) * previewWeight),
  };

  const handleSave = () => {
    onSave({
      id: preset?.id || crypto.randomUUID(),
      name: name || 'Untitled',
      tdeeMultiplier: (parseFloat(tdeeMultiplier) || 100) / 100,
      macroMode,
      proteinPerKg: proteinAuto ? null : (parseFloat(proteinPerKg) || 0),
      carbsPerKg: carbsAuto ? null : (parseFloat(carbsPerKg) || 0),
      fatPerKg: fatAuto ? null : (parseFloat(fatPerKg) || 0),
      proteinPct: macroMode === 'pct_of_calories' ? (parseFloat(proteinPct) || 0) : null,
      carbsPct: macroMode === 'pct_of_calories' ? (parseFloat(carbsPct) || 0) : null,
      fatPct: macroMode === 'pct_of_calories' ? (parseFloat(fatPct) || 0) : null,
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

          {/* Macro mode toggle */}
          <div className="space-y-2">
            <Label>Macro Input Mode</Label>
            <Tabs value={macroMode} onValueChange={(v) => setMacroMode(v as MacroMode)}>
              <TabsList className="w-full">
                <TabsTrigger value="g_per_kg" className="flex-1">g / kg</TabsTrigger>
                <TabsTrigger value="pct_of_calories" className="flex-1">% of Calories</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {macroMode === 'g_per_kg' ? (
            <>
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
              {/* Preview: derived percentages */}
              {derivedFromGpk.protein != null && (
                <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                  <span className="font-medium text-foreground text-sm">Preview (at {previewWeight}kg, {effectiveCal} kcal)</span>
                  <div className="flex gap-4">
                    {derivedFromGpk.protein != null && <span>P: {derivedFromGpk.protein}g ({((derivedFromGpk.protein * 4 / effectiveCal) * 100).toFixed(0)}%)</span>}
                    {derivedFromGpk.carbs != null && <span>C: {derivedFromGpk.carbs}g ({((derivedFromGpk.carbs * 4 / effectiveCal) * 100).toFixed(0)}%)</span>}
                    {derivedFromGpk.fat != null && <span>F: {derivedFromGpk.fat}g ({((derivedFromGpk.fat * 9 / effectiveCal) * 100).toFixed(0)}%)</span>}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Protein %</Label>
                  <Input type="number" value={proteinPct} onChange={(e) => setProteinPct(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Carbs %</Label>
                  <Input type="number" value={carbsPct} onChange={(e) => setCarbsPct(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fat %</Label>
                  <Input type="number" value={fatPct} onChange={(e) => setFatPct(e.target.value)} />
                </div>
              </div>

              {/* Sum indicator */}
              <div className={cn(
                'flex items-center gap-2 text-xs px-3 py-2 rounded-lg',
                pctWarning ? 'bg-destructive/10 text-destructive' : 'bg-secondary/50 text-muted-foreground'
              )}>
                {pctWarning && <AlertTriangle className="h-3.5 w-3.5" />}
                <span>Total: {pctSum.toFixed(1)}%{pctWarning ? ' — should be close to 100%' : ''}</span>
              </div>

              {/* Preview: derived grams */}
              <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <span className="font-medium text-foreground text-sm">Preview (at {effectiveCal} kcal)</span>
                <div className="flex gap-4">
                  <span>P: {derivedFromPct.protein}g</span>
                  <span>C: {derivedFromPct.carbs}g</span>
                  <span>F: {derivedFromPct.fat}g</span>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>{preset ? 'Save' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
