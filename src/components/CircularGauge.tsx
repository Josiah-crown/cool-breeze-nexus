import React from 'react';

interface CircularGaugeProps {
  value: number;
  max: number;
  label: string;
  unit: string;
  size?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
}

const CircularGauge: React.FC<CircularGaugeProps> = ({
  value,
  max,
  label,
  unit,
  size = 180,
  warningThreshold = 0.7,
  criticalThreshold = 0.9,
}) => {
  const percentage = Math.min(value / max, 1);
  const angle = percentage * 270 - 135; // -135 to 135 degrees
  
  // Determine color based on value
  const getColor = () => {
    if (percentage >= criticalThreshold) return 'hsl(var(--destructive))';
    if (percentage >= warningThreshold) return 'hsl(var(--warning))';
    return 'hsl(var(--accent))';
  };

  return (
    <div className="flex flex-col items-center">
      <div 
        className="relative bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] rounded-full border-4 border-[hsl(var(--control-border))] shadow-xl"
        style={{ width: size, height: size }}
      >
        {/* Outer ring gradient */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] border-2 border-[hsl(var(--border))]">
          {/* Scale marks */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
            {/* Tick marks */}
            {Array.from({ length: 13 }).map((_, i) => {
              const tickAngle = -135 + (i * 270) / 12;
              const isMainTick = i % 3 === 0;
              const innerRadius = isMainTick ? 35 : 38;
              const outerRadius = 42;
              const rad = (tickAngle * Math.PI) / 180;
              
              return (
                <line
                  key={i}
                  x1={50 + Math.cos(rad) * innerRadius}
                  y1={50 + Math.sin(rad) * innerRadius}
                  x2={50 + Math.cos(rad) * outerRadius}
                  y2={50 + Math.sin(rad) * outerRadius}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={isMainTick ? 2 : 1}
                  opacity={isMainTick ? 0.8 : 0.5}
                />
              );
            })}
            
            {/* Needle */}
            <line
              x1="50"
              y1="50"
              x2={50 + Math.cos((angle * Math.PI) / 180) * 35}
              y2={50 + Math.sin((angle * Math.PI) / 180) * 35}
              stroke={getColor()}
              strokeWidth="3"
              strokeLinecap="round"
              className="drop-shadow-[0_0_8px_currentColor]"
            />
            
            {/* Center circle */}
            <circle
              cx="50"
              cy="50"
              r="5"
              fill="url(#centerGradient)"
              stroke="hsl(var(--control-border))"
              strokeWidth="1"
            />
            
            {/* Gradients */}
            <defs>
              <linearGradient id="centerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--muted))" />
                <stop offset="100%" stopColor="hsl(var(--border))" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Value display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
            <div className="text-3xl font-bold text-foreground" style={{ color: getColor() }}>
              {Math.round(value)}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
              {unit}
            </div>
          </div>
        </div>
      </div>
      
      {/* Label */}
      <div className="mt-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
};

export default CircularGauge;
