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
    trackClass: 'bg-slate-500/10',
    fillClass: 'bg-gradient-to-r from-slate-600 to-slate-500',
    textClass: 'text-slate-600',
  },
  {
    key: 'protein' as const,
    targetKey: 'protein' as const,
    trackClass: 'bg-emerald-600/10',
    fillClass: 'bg-gradient-to-r from-red-600 to-red-500',
    textClass: 'text-red-600',
  },
  {
    key: 'carbs' as const,
    targetKey: 'carbs' as const,
    trackClass: 'bg-cyan-600/10',
    fillClass: 'bg-gradient-to-r from-cyan-600 to-cyan-500',
    textClass: 'text-cyan-600',
  },
  {
    key: 'fat' as const,
    targetKey: 'fat' as const,
    trackClass: 'bg-orange-500/10',
    fillClass: 'bg-gradient-to-r from-orange-500 to-orange-400',
    textClass: 'text-orange-500',
  },
];

export function DayMacroBars({ macros, targets }: DayMacroBarsProps) {
  return (
    <div className="space-y-1 px-2 py-2">
      {bars.map(({ key, targetKey, trackClass, fillClass, textClass }) => {
        const actual = macros[key];
        const target = targets[targetKey];
        const percent = target > 0 ? Math.min((actual / target) * 100, 100) : 0;

        return (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`relative h-1.5 flex-1 rounded-full overflow-hidden ${trackClass}`}>
              <div
                className={`h-full rounded-full transition-all duration-300 ${fillClass}`}
                style={{ width: `${percent}%` }}
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
