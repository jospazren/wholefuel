import { cn } from '@/lib/utils';

type MacroType = 'calories' | 'protein' | 'carbs' | 'fat';

const config: Record<MacroType, { suffix: string; bg: string; text: string }> = {
  calories: {
    suffix: 'K',
    bg: 'bg-macro-calories/10',
    text: 'text-macro-calories',
  },
  protein: {
    suffix: 'P',
    bg: 'bg-macro-protein/10',
    text: 'text-macro-protein',
  },
  carbs: {
    suffix: 'C',
    bg: 'bg-macro-carbs/10',
    text: 'text-macro-carbs',
  },
  fat: {
    suffix: 'F',
    bg: 'bg-macro-fat/10',
    text: 'text-macro-fat',
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
