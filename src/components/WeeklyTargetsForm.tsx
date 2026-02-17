import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { WeeklyTargets } from '@/types/meal';
import { Target, Flame, Beef, Wheat, Droplet, Check, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

const strategies = [
  { value: 'cut20', label: 'Cut 20%', description: 'Aggressive fat loss' },
  { value: 'cut10', label: 'Cut 10%', description: 'Moderate fat loss' },
  { value: 'maintain', label: 'Maintain', description: 'Stay at current weight' },
  { value: 'bulk10', label: 'Bulk 10%', description: 'Lean muscle gain' },
  { value: 'bulk20', label: 'Bulk 20%', description: 'Aggressive bulking' },
] as const;

interface WeeklyTargetsFormProps {
  onComplete?: () => void;
}

export function WeeklyTargetsForm({ onComplete }: WeeklyTargetsFormProps) {
  const { weeklyTargets, setWeeklyTargets, calculateTargets, getWeekLabel } = useMealPlan();
  const [tdee, setTdee] = useState(weeklyTargets.tdee.toString());
  const [strategy, setStrategy] = useState<WeeklyTargets['strategy']>(weeklyTargets.strategy);
  const [inputMode, setInputMode] = useState<'calculated' | 'manual'>('calculated');
  
  // Manual input states
  const [manualProtein, setManualProtein] = useState(weeklyTargets.protein.toString());
  const [manualFat, setManualFat] = useState(weeklyTargets.fat.toString());
  const [manualCarbs, setManualCarbs] = useState(weeklyTargets.carbs.toString());

  const calculatedTargets = calculateTargets(parseInt(tdee) || 0, strategy);
  
  useEffect(() => {
    if (inputMode === 'calculated') {
      setManualProtein(calculatedTargets.protein.toString());
      setManualFat(calculatedTargets.fat.toString());
      setManualCarbs(calculatedTargets.carbs.toString());
    }
  }, [tdee, strategy, inputMode]);

  const handleApply = () => {
    const finalTargets: WeeklyTargets = {
      tdee: parseInt(tdee) || 2000,
      strategy,
      dailyCalories: inputMode === 'calculated' 
        ? calculatedTargets.calories 
        : Math.round((parseInt(manualProtein) * 4) + (parseInt(manualFat) * 9) + (parseInt(manualCarbs) * 4)),
      protein: inputMode === 'calculated' ? calculatedTargets.protein : parseInt(manualProtein) || 0,
      fat: inputMode === 'calculated' ? calculatedTargets.fat : parseInt(manualFat) || 0,
      carbs: inputMode === 'calculated' ? calculatedTargets.carbs : parseInt(manualCarbs) || 0,
      presetId: weeklyTargets.presetId,
      weightKg: weeklyTargets.weightKg,
    };
    setWeeklyTargets(finalTargets);
    onComplete?.();
  };

  const displayCalories = inputMode === 'calculated'
    ? calculatedTargets.calories
    : Math.round((parseInt(manualProtein) || 0) * 4 + (parseInt(manualFat) || 0) * 9 + (parseInt(manualCarbs) || 0) * 4);

  return (
    <Card className="border-0 shadow-lg animate-fade-in">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Weekly Targets</CardTitle>
              <CardDescription>Set your daily macro goals</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{getWeekLabel()}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* TDEE Input */}
        <div className="space-y-2">
          <Label htmlFor="tdee" className="text-sm font-medium">
            Total Daily Energy Expenditure (TDEE)
          </Label>
          <div className="relative">
            <Input
              id="tdee"
              type="number"
              value={tdee}
              onChange={(e) => setTdee(e.target.value)}
              className="pl-10 h-12 text-lg font-semibold"
              placeholder="2000"
            />
            <Flame className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-macro-calories" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              kcal
            </span>
          </div>
        </div>

        {/* Strategy Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Goal Strategy</Label>
          <Select value={strategy} onValueChange={(v) => setStrategy(v as WeeklyTargets['strategy'])}>
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {strategies.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{s.label}</span>
                    <span className="text-xs text-muted-foreground">{s.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Macro Configuration */}
        <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'calculated' | 'manual')}>
          <TabsList className="w-full">
            <TabsTrigger value="calculated" className="flex-1">Auto Calculate</TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">Manual Input</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calculated" className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Using balanced split: 30% protein, 25% fat, 45% carbs
            </p>
          </TabsContent>

          <TabsContent value="manual" className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Beef className="h-3 w-3 text-macro-protein" />
                  Protein
                </Label>
                <Input
                  type="number"
                  value={manualProtein}
                  onChange={(e) => setManualProtein(e.target.value)}
                  className="h-10"
                  placeholder="150"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Droplet className="h-3 w-3 text-macro-fat" />
                  Fat
                </Label>
                <Input
                  type="number"
                  value={manualFat}
                  onChange={(e) => setManualFat(e.target.value)}
                  className="h-10"
                  placeholder="70"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Wheat className="h-3 w-3 text-macro-carbs" />
                  Carbs
                </Label>
                <Input
                  type="number"
                  value={manualCarbs}
                  onChange={(e) => setManualCarbs(e.target.value)}
                  className="h-10"
                  placeholder="200"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Calculated Display */}
        <div className="bg-secondary/50 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Daily Targets</h4>
          <div className="grid grid-cols-4 gap-2">
            <MacroDisplayCard
              icon={<Flame className="h-4 w-4" />}
              label="Calories"
              value={displayCalories}
              unit="kcal"
              colorClass="text-macro-calories bg-macro-calories/10"
            />
            <MacroDisplayCard
              icon={<Beef className="h-4 w-4" />}
              label="Protein"
              value={inputMode === 'calculated' ? calculatedTargets.protein : parseInt(manualProtein) || 0}
              unit="g"
              colorClass="text-macro-protein bg-macro-protein/10"
            />
            <MacroDisplayCard
              icon={<Droplet className="h-4 w-4" />}
              label="Fat"
              value={inputMode === 'calculated' ? calculatedTargets.fat : parseInt(manualFat) || 0}
              unit="g"
              colorClass="text-macro-fat bg-macro-fat/10"
            />
            <MacroDisplayCard
              icon={<Wheat className="h-4 w-4" />}
              label="Carbs"
              value={inputMode === 'calculated' ? calculatedTargets.carbs : parseInt(manualCarbs) || 0}
              unit="g"
              colorClass="text-macro-carbs bg-macro-carbs/10"
            />
          </div>
        </div>

        <Button onClick={handleApply} className="w-full h-12 text-base font-semibold gap-2">
          <Check className="h-5 w-5" />
          Apply to {getWeekLabel()}
        </Button>
      </CardContent>
    </Card>
  );
}

function MacroDisplayCard({
  icon,
  label,
  value,
  unit,
  colorClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  colorClass: string;
}) {
  return (
    <div className="bg-card rounded-lg p-3 text-center space-y-1">
      <div className={cn('inline-flex p-1.5 rounded-md', colorClass)}>
        {icon}
      </div>
      <div className="text-lg font-bold text-foreground">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}
