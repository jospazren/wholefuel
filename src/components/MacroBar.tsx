import { cn } from '@/lib/utils';

interface MacroBarProps {
  value: number;
  max: number;
  type: 'calories' | 'protein' | 'carbs' | 'fat';
  label: string;
  unit?: string;
  className?: string;
}

const colorConfig = {
  calories: {
    bg: 'bg-macro-calories/15',
    fill: 'bg-gradient-to-r from-macro-calories to-macro-calories/80',
    text: 'text-macro-calories',
  },
  protein: {
    bg: 'bg-macro-protein/15',
    fill: 'bg-gradient-to-r from-macro-protein to-macro-protein/80',
    text: 'text-macro-protein',
  },
  carbs: {
    bg: 'bg-macro-carbs/15',
    fill: 'bg-gradient-to-r from-macro-carbs to-macro-carbs/80',
    text: 'text-macro-carbs',
  },
  fat: {
    bg: 'bg-macro-fat/15',
    fill: 'bg-gradient-to-r from-macro-fat to-macro-fat/80',
    text: 'text-macro-fat',
  },
};

export function MacroBar({ value, max, type, label, unit = 'g', className }: MacroBarProps) {
  const colors = colorConfig[type];
  const percentage = Math.min((value / max) * 100, 100);
  const isOver = value > max;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className={cn('text-sm font-semibold', isOver ? 'text-destructive' : colors.text)}>
          {Math.round(value)}
          <span className="text-muted-foreground font-normal">/{max}{unit}</span>
        </span>
      </div>
      <div className={cn('h-2 rounded-full overflow-hidden', colors.bg)}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            isOver ? 'bg-destructive' : colors.fill
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
