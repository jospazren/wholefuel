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
    fillClass: 'bg-gradient-to-r from-[#475569] to-[#64748b]',
    textClass: 'text-slate-600',
  },
  {
    key: 'protein' as const,
    targetKey: 'protein' as const,
    trackClass: 'bg-emerald-600/10',
    fillClass: 'bg-gradient-to-r from-[#096] to-[#00bc7d]',
    textClass: 'text-[#096]',
  },
  {
    key: 'carbs' as const,
    targetKey: 'carbs' as const,
    trackClass: 'bg-cyan-600/10',
    fillClass: 'bg-gradient-to-r from-[#0891b2] to-[#06b6d4]',
    textClass: 'text-cyan-600',
  },
  {
    key: 'fat' as const,
    targetKey: 'fat' as const,
    trackClass: 'bg-orange-500/10',
    fillClass: 'bg-gradient-to-r from-[#f97316] to-[#fb923c]',
    textClass: 'text-orange-500',
  },
];

const OVER_FILL = 'bg-gradient-to-r from-[#e7000b] to-[#fb2c36]';
const OVER_TEXT = 'text-[#e7000b]';

export function DayMacroBars({ macros, targets }: DayMacroBarsProps) {
  return (
    <div className="space-y-1 px-2 py-2">
      {bars.map(({ key, targetKey, trackClass, fillClass, textClass }) => {
        const actual = macros[key];
        const target = targets[targetKey];
        const percent = target > 0 ? Math.min((actual / target) * 100, 100) : 0;
        const isOver = actual > target && target > 0;
        const activeFill = isOver ? OVER_FILL : fillClass;
        const activeText = isOver ? OVER_TEXT : textClass;

        return (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`relative h-1.5 flex-1 rounded-full overflow-hidden ${trackClass}`}>
              <div
                className={`h-full rounded-full transition-all duration-300 ${activeFill}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className={`text-[10px] font-bold w-7 text-right tabular-nums ${activeText}`}>
              {actual}
            </span>
          </div>
        );
      })}
    </div>
  );
}
