import React from 'react';
import { cn } from '@/lib/utils';
import { Flame } from 'lucide-react';

interface HeatPumpComponentProps {
  isHeating: boolean;
  isConnected?: boolean;
  size?: 'sm' | 'md' | 'lg' | string;
}

const HeatPumpComponent: React.FC<HeatPumpComponentProps> = ({ 
  isHeating, 
  isConnected = true,
  size = 'w-48 h-48' 
}) => {
  // If disconnected, override heating state to off
  const actuallyHeating = isConnected && isHeating;
  
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
        
        {/* Compressor circle - pulses when heating */}
        <circle
          cx="100"
          cy="130"
          r="25"
          className={cn(
            'stroke-border fill-control transition-all duration-300',
            actuallyHeating && 'fill-orange-500/60'
          )}
          strokeWidth="2"
          style={actuallyHeating ? { animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite' } : {}}
        />
        
        {/* Heat exchange coils - glow when heating */}
        <path
          d="M 70 130 Q 70 115, 85 115 T 100 115 T 115 115 T 130 115 Q 130 130, 130 130"
          className={cn(
            'fill-none stroke-primary transition-all duration-300',
            actuallyHeating && 'stroke-orange-400'
          )}
          strokeWidth="3"
        />
        
        {/* Active indicator light */}
        <circle
          cx="150"
          cy="75"
          r="5"
          className={cn(
            'transition-all duration-300',
            actuallyHeating ? 'fill-orange-500' : 'fill-gray-500'
          )}
          style={actuallyHeating ? { animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite' } : {}}
        />
      </svg>
      
      {/* Heating Flame Indicator - Bottom Left */}
      {actuallyHeating && (
        <div className="absolute -bottom-[0.5rem] -left-[0.5rem] z-10">
          <div className="relative">
            <Flame 
              className="w-[2.5rem] h-[2.5rem] text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" 
              strokeWidth={2}
              fill="rgba(249,115,22,0.3)"
              style={{ animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
            />
            {/* Glow effect behind flame */}
            <div 
              className="absolute inset-0 bg-orange-500/30 rounded-full blur-md" 
              style={{ animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export { HeatPumpComponent };
