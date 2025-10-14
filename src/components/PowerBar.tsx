import React from 'react';

interface PowerBarProps {
  value: number;
  max: number;
  label: string;
  unit: string;
}

const PowerBar: React.FC<PowerBarProps> = ({ value, max, label, unit }) => {
  const segments = 6;
  const filledSegments = Math.ceil((value / max) * segments);

  const getSegmentColor = (index: number) => {
    if (!isSegmentFilled(index)) return 'hsl(var(--muted))';
    if (index < 2) return 'hsl(var(--accent))'; // Green
    if (index < 4) return 'hsl(var(--warning))'; // Yellow
    return 'hsl(var(--destructive))'; // Red
  };

  const isSegmentFilled = (index: number) => index < filledSegments;

  return (
    <div className="bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border-2 border-[hsl(var(--control-border))] rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_8px_hsl(var(--accent))]"></div>
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
        </div>
        <div className="text-2xl font-bold text-foreground">
          {value.toFixed(1)}
          <span className="text-sm text-muted-foreground ml-1">{unit}</span>
        </div>
      </div>
      
      {/* Bar segments */}
      <div className="flex gap-1.5">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-10 rounded-md transition-all duration-300 border border-[hsl(var(--border))]"
            style={{
              backgroundColor: getSegmentColor(i),
              boxShadow: isSegmentFilled(i) 
                ? `0 0 10px ${getSegmentColor(i)}, inset 0 2px 4px rgba(255,255,255,0.1)` 
                : 'inset 0 2px 4px rgba(0,0,0,0.3)',
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default PowerBar;
