import { cn } from '@/lib/utils';

type MacroType = 'calories' | 'protein' | 'carbs' | 'fat';

const config: Record<MacroType, { suffix: string; bg: string; text: string }> = {
  calories: {
    suffix: 'K',
    bg: 'bg-slate-500/10',
    text: 'text-slate-600',
  },
  protein: {
    suffix: 'P',
    bg: 'bg-emerald-600/10',
    text: 'text-emerald-600',
  },
  carbs: {
    suffix: 'C',
    bg: 'bg-cyan-600/10',
    text: 'text-cyan-600',
  },
  fat: {
    suffix: 'F',
    bg: 'bg-orange-500/10',
    text: 'text-orange-500',
  },
};

interface MacroBadgeProps {
  type: MacroType;
  value: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function MacroBadge({ type, value, size = 'sm', className }: MacroBadgeProps) {
  const { suffix, bg, text } = config[type];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        bg,
        text,
        size === 'sm' && 'px-1.5 py-0.5 text-[9px]',
        size === 'md' && 'px-2.5 py-1 text-[11px]',
        className
      )}
    >
      {value}{suffix}
    </span>
  );
}

interface MacroBadgeRowProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function MacroBadgeRow({ calories, protein, carbs, fat, size = 'sm', className }: MacroBadgeRowProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <MacroBadge type="calories" value={calories} size={size} />
      <MacroBadge type="protein" value={protein} size={size} />
      <MacroBadge type="carbs" value={carbs} size={size} />
      <MacroBadge type="fat" value={fat} size={size} />
    </div>
  );
}

/* Connected band variant for recipe cards */
const bandConfig: Record<MacroType, { bg: string; text: string; suffix: string }> = {
  calories: { bg: 'bg-[rgba(98,116,142,0.1)]', text: 'text-[#45556c]', suffix: 'K' },
  protein:  { bg: 'bg-[rgba(0,153,102,0.1)]', text: 'text-[#096]', suffix: 'P' },
  carbs:    { bg: 'bg-[rgba(0,146,184,0.1)]', text: 'text-[#0092b8]', suffix: 'C' },
  fat:      { bg: 'bg-[rgba(255,105,0,0.1)]', text: 'text-[#ff6900]', suffix: 'F' },
};

interface MacroBandProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  className?: string;
}

export function MacroBand({ calories, protein, carbs, fat, className }: MacroBandProps) {
  const items: { type: MacroType; value: number }[] = [
    { type: 'calories', value: calories },
    { type: 'protein', value: protein },
    { type: 'carbs', value: carbs },
    { type: 'fat', value: fat },
  ];

  return (
    <div className={cn('flex h-[19px] rounded-[10px] overflow-hidden', className)}>
      {items.map(({ type, value }, i) => {
        const { bg, text, suffix } = bandConfig[type];
        return (
          <div
            key={type}
            className={cn(
              'flex-1 flex items-center justify-center text-[10px] font-medium',
              bg,
              text,
              i < items.length - 1 && 'border-r border-white/50'
            )}
          >
            {value}{suffix}
          </div>
        );
      })}
    </div>
  );
}
