import { Macros } from '@/types/meal';

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
  {
    key: 'calories' as const,
    targetKey: 'dailyCalories' as const,
    label: 'K',
    trackBg: 'rgba(98,116,142,0.1)',
    fillGradient: 'linear-gradient(90deg, hsl(var(--bar-calories-from)), hsl(var(--bar-calories-to)))',
    textClass: 'text-macro-calories',
  },
  {
    key: 'protein' as const,
    targetKey: 'protein' as const,
    label: 'P',
    trackBg: 'rgba(0,153,102,0.1)',
    fillGradient: 'linear-gradient(90deg, hsl(var(--bar-protein-from)), hsl(var(--bar-protein-to)))',
    textClass: 'text-[hsl(var(--bar-protein-from))]',
  },
  {
    key: 'carbs' as const,
    targetKey: 'carbs' as const,
    label: 'C',
    trackBg: 'rgba(0,146,184,0.1)',
    fillGradient: 'linear-gradient(90deg, hsl(var(--bar-carbs-from)), hsl(var(--bar-carbs-to)))',
    textClass: 'text-macro-carbs',
  },
  {
    key: 'fat' as const,
    targetKey: 'fat' as const,
    label: 'F',
    trackBg: 'rgba(255,105,0,0.1)',
    fillGradient: 'linear-gradient(90deg, hsl(var(--bar-fat-from)), hsl(var(--bar-fat-to)))',
    textClass: 'text-macro-fat',
  },
];

export function DayMacroBars({ macros, targets }: DayMacroBarsProps) {
  return (
    <div className="space-y-1 px-2 py-2">
      {bars.map(({ key, targetKey, trackBg, fillGradient, textClass }) => {
        const actual = macros[key];
        const target = targets[targetKey];
        const percent = target > 0 ? Math.min((actual / target) * 100, 100) : 0;

        return (
          <div key={key} className="flex items-center gap-1.5">
            <div
              className="relative h-1.5 flex-1 rounded-full overflow-hidden"
              style={{ background: trackBg }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${percent}%`, background: fillGradient }}
              />
            </div>
            <span className={`text-[10px] font-bold w-7 text-right tabular-nums ${textClass}`}>
              {actual}
            </span>
          </div>
        );
      })}
    </div>
  );
}
