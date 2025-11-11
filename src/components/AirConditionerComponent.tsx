import React from 'react';
import { cn } from '@/lib/utils';

interface AirConditionerComponentProps {
  isActive: boolean;
  size?: 'sm' | 'md' | 'lg' | string;
}

const AirConditionerComponent: React.FC<AirConditionerComponentProps> = ({ 
  isActive, 
  size = 'w-48 h-48' 
}) => {
  return (
    <div className={cn('relative flex items-center justify-center', size)}>
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Main AC unit body */}
        <rect
          x="20"
          y="30"
          width="160"
          height="110"
          rx="8"
          className={cn(
            'fill-muted stroke-green-500/60 transition-all duration-300',
            isActive && 'stroke-green-500'
          )}
          strokeWidth="4"
        />
        
        {/* Display panel */}
        <rect
          x="40"
          y="50"
          width="120"
          height="26"
          rx="4"
          className={cn(
            'stroke-border transition-all duration-300',
            isActive ? 'fill-accent/20' : 'fill-control'
          )}
          strokeWidth="1"
        />
        
        {/* Display text - always visible */}
        <text
          x="100"
          y="67"
          textAnchor="middle"
          className={cn(
            'text-xs font-bold transition-all duration-300',
            isActive ? 'fill-accent' : 'fill-muted-foreground'
          )}
          style={{ fontSize: '14px' }}
        >
          {isActive ? 'ON' : 'OFF'}
        </text>
        
        {/* Status indicator lights */}
        {isActive ? (
          <>
            <circle cx="55" cy="63" r="2.5" className="fill-green-500 animate-pulse" />
            <circle cx="145" cy="63" r="2.5" className="fill-green-500 animate-pulse" />
          </>
        ) : (
          <>
            <circle cx="55" cy="63" r="2.5" className="fill-muted-foreground/50" />
            <circle cx="145" cy="63" r="2.5" className="fill-muted-foreground/50" />
          </>
        )}
        
        {/* Air flow vents - always visible with good contrast */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line
            key={`vent-${i}`}
            x1="35"
            y1={90 + i * 7}
            x2="165"
            y2={90 + i * 7}
            className={cn(
              'transition-all duration-300',
              isActive ? 'stroke-primary' : 'stroke-foreground/30'
            )}
            strokeWidth="2"
          />
        ))}
        
        {/* Cool air flow indicators - only when active */}
        {isActive && (
          <>
            <path
              d="M 50 145 Q 65 160, 80 145"
              className="fill-none stroke-primary animate-pulse"
              strokeWidth="2.5"
              opacity="0.6"
            />
            <path
              d="M 90 145 Q 105 160, 120 145"
              className="fill-none stroke-primary animate-pulse"
              strokeWidth="2.5"
              opacity="0.6"
              style={{ animationDelay: '0.2s' }}
            />
            <path
              d="M 130 145 Q 145 160, 160 145"
              className="fill-none stroke-primary animate-pulse"
              strokeWidth="2.5"
              opacity="0.6"
              style={{ animationDelay: '0.4s' }}
            />
          </>
        )}
      </svg>
    </div>
  );
};

export { AirConditionerComponent };
