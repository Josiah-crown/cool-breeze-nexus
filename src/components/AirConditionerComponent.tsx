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
          x="40"
          y="50"
          width="120"
          height="80"
          rx="6"
          className="fill-muted stroke-green-500/60"
          strokeWidth="4"
        />
        
        {/* Display panel */}
        <rect
          x="55"
          y="65"
          width="90"
          height="20"
          rx="3"
          className="fill-control stroke-border"
          strokeWidth="1"
        />
        
        {/* Temperature display */}
        {isActive && (
          <>
            <text
              x="100"
              y="80"
              textAnchor="middle"
              className="fill-accent text-xs font-bold"
              style={{ fontSize: '12px' }}
            >
              ON
            </text>
            <circle cx="70" cy="77" r="2" className="fill-accent animate-pulse" />
            <circle cx="130" cy="77" r="2" className="fill-accent animate-pulse" />
          </>
        )}
        
        {/* Air flow vents */}
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={`vent-${i}`}
            x1="50"
            y1={95 + i * 7}
            x2="150"
            y2={95 + i * 7}
            className={cn(
              'stroke-border transition-all duration-300',
              isActive && 'stroke-primary'
            )}
            strokeWidth="2"
          />
        ))}
        
        {/* Cool air flow indicators */}
        {isActive && (
          <>
            <path
              d="M 60 135 Q 70 145, 80 135"
              className="fill-none stroke-primary animate-pulse"
              strokeWidth="2"
              opacity="0.6"
            />
            <path
              d="M 90 135 Q 100 145, 110 135"
              className="fill-none stroke-primary animate-pulse"
              strokeWidth="2"
              opacity="0.6"
              style={{ animationDelay: '0.2s' }}
            />
            <path
              d="M 120 135 Q 130 145, 140 135"
              className="fill-none stroke-primary animate-pulse"
              strokeWidth="2"
              opacity="0.6"
              style={{ animationDelay: '0.4s' }}
            />
          </>
        )}
      </svg>
    </div>
  );
};

export default AirConditionerComponent;
