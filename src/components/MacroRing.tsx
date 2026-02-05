import { cn } from '@/lib/utils';

interface MacroRingProps {
  value: number;
  max: number;
  size?: 'sm' | 'md' | 'lg';
  type: 'calories' | 'protein' | 'carbs' | 'fat';
  label?: string;
  showValue?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { size: 48, stroke: 4, textSize: 'text-xs' },
  md: { size: 64, stroke: 5, textSize: 'text-sm' },
  lg: { size: 80, stroke: 6, textSize: 'text-base' },
};

const colorConfig = {
  calories: {
    bg: 'stroke-macro-calories/20',
    fg: 'stroke-macro-calories',
    text: 'text-macro-calories',
  },
  protein: {
    bg: 'stroke-macro-protein/20',
    fg: 'stroke-macro-protein',
    text: 'text-macro-protein',
  },
  carbs: {
    bg: 'stroke-macro-carbs/20',
    fg: 'stroke-macro-carbs',
    text: 'text-macro-carbs',
  },
  fat: {
    bg: 'stroke-macro-fat/20',
    fg: 'stroke-macro-fat',
    text: 'text-macro-fat',
  },
};

export function MacroRing({
  value,
  max,
  size = 'md',
  type,
  label,
  showValue = true,
  className,
}: MacroRingProps) {
  const config = sizeConfig[size];
  const colors = colorConfig[type];
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (config.size - config.stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div className="relative" style={{ width: config.size, height: config.size }}>
        <svg
          className="transform -rotate-90"
          width={config.size}
          height={config.size}
        >
          {/* Background ring */}
          <circle
            className={colors.bg}
            strokeWidth={config.stroke}
            fill="transparent"
            r={radius}
            cx={config.size / 2}
            cy={config.size / 2}
          />
          {/* Progress ring */}
          <circle
            className={cn(colors.fg, 'transition-all duration-500 ease-out')}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            fill="transparent"
            r={radius}
            cx={config.size / 2}
            cy={config.size / 2}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
            }}
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn('font-semibold', config.textSize, colors.text)}>
              {Math.round(value)}
            </span>
          </div>
        )}
      </div>
      {label && (
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      )}
    </div>
  );
}
