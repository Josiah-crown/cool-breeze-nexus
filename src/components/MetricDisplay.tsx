import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricDisplayProps {
  label: string;
  value: number | string;
  unit?: string;
  icon?: LucideIcon;
  highlight?: boolean;
}

const MetricDisplay: React.FC<MetricDisplayProps> = ({ 
  label, 
  value, 
  unit, 
  icon: Icon,
  highlight = false 
}) => {
  return (
    <div className={`bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border-2 ${
      highlight ? 'border-primary/50' : 'border-[hsl(var(--control-border))]'
    } rounded-xl p-4 shadow-lg relative overflow-hidden`}>
      {highlight && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none"></div>
      )}
      
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-accent" />}
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
        </div>
      </div>
      
      <div className="relative mt-2">
        <div className="text-3xl font-bold text-foreground">
          {typeof value === 'number' ? value.toFixed(1) : value}
          {unit && <span className="text-lg text-muted-foreground ml-1">{unit}</span>}
        </div>
      </div>
    </div>
  );
};

export default MetricDisplay;
