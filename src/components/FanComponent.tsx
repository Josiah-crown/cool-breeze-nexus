import React from 'react';

interface FanComponentProps {
  isSpinning: boolean;
  speed?: 'slow' | 'medium' | 'fast';
  size?: 'sm' | 'md' | 'lg' | string;
}

const FanComponent: React.FC<FanComponentProps> = ({ 
  isSpinning, 
  speed = 'medium',
  size = 'lg' 
}) => {
  const sizeClasses: Record<string, string> = {
    sm: 'w-32 h-32',
    md: 'w-80 h-80', 
    lg: 'w-96 h-96'
  };

  const speedDuration = {
    slow: '2s',
    medium: '0.8s',
    fast: '0.4s'
  };

  // Use size directly if it's a custom string, otherwise use the preset
  const sizeClass = typeof size === 'string' && size.includes('w-') ? size : sizeClasses[size as 'sm' | 'md' | 'lg'];

  return (
    <div className="flex items-center justify-center p-8">
      <div className={`relative ${sizeClass}`}>
        {/* Outer Fan Housing */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-panel to-control border-4 border-green-500/60 shadow-xl">
          {/* Concentric Circles */}
          <div className="absolute inset-4 rounded-full border border-border/30"></div>
          <div className="absolute inset-8 rounded-full border border-border/20"></div>
          
          {/* Fan Blades Container */}
          <div 
            className={`absolute inset-0 ${isSpinning ? 'fan-spinning' : ''}`}
            style={{
              animationDuration: isSpinning ? speedDuration[speed] : '0s'
            }}
          >
            {/* Fan Blades */}
            {[0, 120, 240].map((rotation, index) => (
              <div
                key={index}
                className="absolute top-1/2 left-1/2 origin-bottom"
                style={{
                  transform: `translate(-50%, -100%) rotate(${rotation}deg)`,
                  width: '12px',
                  height: '45%',
                }}
              >
                <div className="w-full h-full bg-gradient-to-t from-primary to-primary-glow rounded-t-full shadow-md" />
              </div>
            ))}
            
            {/* Center Hub */}
            <div className="absolute top-1/2 left-1/2 w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-primary to-primary-glow border-2 border-background shadow-lg">
              <div className="absolute inset-1 rounded-full bg-gradient-to-br from-control to-background"></div>
            </div>
          </div>
          
          {/* Glow Effect When Spinning */}
          {isSpinning && (
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
      </div>
    </div>
  );
};

export default FanComponent;