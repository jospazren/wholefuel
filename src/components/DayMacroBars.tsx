import { Macros } from '@/types/meal';
import { cn } from '@/lib/utils';

interface DayMacroBarsProps {
  macros: Macros;
  targets: {
    dailyCalories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

const bars = [
  { key: 'calories' as const, targetKey: 'dailyCalories' as const, color: 'bg-macro-calories', label: 'K' },
  { key: 'protein' as const, targetKey: 'protein' as const, color: 'bg-macro-protein', label: 'P' },
  { key: 'carbs' as const, targetKey: 'carbs' as const, color: 'bg-macro-carbs', label: 'C' },
  { key: 'fat' as const, targetKey: 'fat' as const, color: 'bg-macro-fat', label: 'F' },
];

export function DayMacroBars({ macros, targets }: DayMacroBarsProps) {
  return (
    <div className="space-y-1 px-1.5 py-1.5">
      {bars.map(({ key, targetKey, color, label }) => {
        const actual = macros[key];
        const target = targets[targetKey];
        const percent = target > 0 ? Math.min((actual / target) * 100, 100) : 0;

        return (
          <div key={key} className="flex items-center gap-1">
            <div className="relative h-2 flex-1 bg-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-300', color)}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-[9px] font-medium text-muted-foreground w-7 text-right tabular-nums">
              {actual}
            </span>
          </div>
        );
      })}
    </div>
  );
}
