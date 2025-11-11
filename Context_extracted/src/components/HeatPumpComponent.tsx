import React from 'react';
import { cn } from '@/lib/utils';

interface HeatPumpComponentProps {
  isActive: boolean;
  size?: 'sm' | 'md' | 'lg' | string;
}

const HeatPumpComponent: React.FC<HeatPumpComponentProps> = ({ 
  isActive, 
  size = 'w-48 h-48' 
}) => {
  return (
    <div className={cn('relative flex items-center justify-center', size)}>
      {/* Outer housing */}
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Base unit */}
        <rect
          x="30"
          y="60"
          width="140"
          height="100"
          rx="8"
          className="fill-muted stroke-green-500/60"
          strokeWidth="4"
        />
        
        {/* Top vent lines */}
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={`vent-${i}`}
            x1="40"
            y1={75 + i * 8}
            x2="160"
            y2={75 + i * 8}
            className="stroke-border"
            strokeWidth="2"
          />
        ))}
        
        {/* Compressor circle */}
        <circle
          cx="100"
          cy="130"
          r="25"
          className={cn(
            'stroke-border fill-control transition-all duration-300',
            isActive && 'fill-accent animate-pulse'
          )}
          strokeWidth="2"
        />
        
        {/* Heat exchange coils */}
        <path
          d="M 70 130 Q 70 115, 85 115 T 100 115 T 115 115 T 130 115 Q 130 130, 130 130"
          className={cn(
            'fill-none stroke-primary transition-all duration-300',
            isActive && 'stroke-accent-glow'
          )}
          strokeWidth="3"
        />
        
        {/* Active indicator */}
        {isActive && (
          <circle
            cx="150"
            cy="75"
            r="5"
            className="fill-accent animate-pulse"
          />
        )}
      </svg>
    </div>
  );
};

export default HeatPumpComponent;
