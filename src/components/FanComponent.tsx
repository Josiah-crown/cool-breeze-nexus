import React from 'react';
import { Snowflake } from 'lucide-react';

interface FanComponentProps {
  isSpinning: boolean;
  isCooling?: boolean;
  isConnected?: boolean;
  speed?: 'slow' | 'medium' | 'fast';
  size?: 'sm' | 'md' | 'lg' | string;
}

const FanComponent: React.FC<FanComponentProps> = ({ 
  isSpinning, 
  isCooling = false,
  isConnected = true,
  speed = 'medium',
  size = 'lg' 
}) => {
  // If disconnected, override all states to off
  const actuallySpinning = isConnected && isSpinning;
  const showCooling = isConnected && isCooling;
  const sizeClasses: Record<string, string> = {
    sm: 'w-28 h-28',
    md: 'w-72 h-72', 
    lg: 'w-[21.6rem] h-[21.6rem]'
  };

  const speedDuration = {
    slow: '2s',
    medium: '0.8s',
    fast: '0.4s'
  };

  // Use size directly if it's a custom string, otherwise use the preset
  const sizeClass = typeof size === 'string' && size.includes('w-') ? size : sizeClasses[size as 'sm' | 'md' | 'lg'];

  return (
    <div className="flex items-center justify-center p-[2rem]">
      <div className={`relative ${sizeClass}`}>
        {/* Outer Fan Housing */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-panel to-control border-[0.25rem] border-green-500/60 shadow-xl">
          {/* Concentric Circles */}
          <div className="absolute inset-[1rem] rounded-full border border-border/30"></div>
          <div className="absolute inset-[2rem] rounded-full border border-border/20"></div>
          
          {/* Fan Blades Container */}
          <div 
            className={`absolute inset-0 ${actuallySpinning ? 'fan-spinning' : ''}`}
            style={{
              animationDuration: actuallySpinning ? speedDuration[speed] : '0s'
            }}
          >
            {/* Fan Blades - Smooth elliptical/teardrop shape */}
            {[0, 120, 240].map((rotation, index) => (
              <div
                key={index}
                className="absolute top-1/2 left-1/2 origin-bottom"
                style={{
                  transform: `translate(-50%, -100%) rotate(${rotation}deg)`,
                  width: '20%',
                  height: '45%',
                }}
              >
                <div 
                  className="w-full h-full bg-gradient-to-t from-primary to-primary-glow shadow-md" 
                  style={{
                    borderRadius: '50% 50% 50% 50% / 80% 80% 20% 20%'
                  }}
                />
              </div>
            ))}
            
            {/* Center Hub */}
            <div className="absolute top-1/2 left-1/2 w-[2rem] h-[2rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-primary to-primary-glow border-[0.125rem] border-background shadow-lg">
              <div className="absolute inset-[0.25rem] rounded-full bg-gradient-to-br from-control to-background"></div>
            </div>
          </div>
          
          {/* Glow Effect When Spinning */}
          {actuallySpinning && (
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse"></div>
          )}
        </div>
        
        {/* Fan Grill Pattern */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-green-500/40"
              style={{
                width: '2px',
                height: '100%',
                left: '50%',
                top: '0',
                transformOrigin: 'center',
                transform: `translateX(-50%) rotate(${i * 22.5}deg)`,
              }}
            />
          ))}
        </div>
        
        {/* Cooling Snowflake Indicator - Bottom Left */}
        {showCooling && (
          <div className="absolute -bottom-[0.5rem] -left-[0.5rem] z-10">
            <div className="relative">
              <Snowflake 
                className="w-[2.5rem] h-[2.5rem] text-cyan-400 animate-pulse drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" 
                strokeWidth={2}
              />
              {/* Glow effect behind snowflake */}
              <div className="absolute inset-0 bg-cyan-400/30 rounded-full blur-md animate-pulse" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { FanComponent };