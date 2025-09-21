import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ControlPanelProps {
  mode: string;
  isOn: boolean;
  swingDirection: string;
  onModeChange: (mode: string) => void;
  onPowerToggle: () => void;
  onSwingToggle: (direction: string) => void;
  onTimerSet: () => void;
  disabled?: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  mode,
  isOn,
  swingDirection,
  onModeChange,
  onPowerToggle,
  onSwingToggle,
  onTimerSet,
  disabled = false
}) => {
  const modes = [
    { key: 'Cool', label: 'Cool', icon: '❄️' },
    { key: 'Fan', label: 'Fan', icon: '🌀' },
    { key: 'Exhaust', label: 'Exhaust', icon: '💨' },
    { key: 'Auto', label: 'Auto', icon: '🔄' }
  ];

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="text-lg">⚙️</span>
        <h3 className="panel-title">System Controls</h3>
      </div>
      
      {/* Power Control */}
      <div className="mb-6">
        <Button
          onClick={onPowerToggle}
          className={cn(
            "btn-control w-full py-4 text-base",
            isOn ? "active" : ""
          )}
          disabled={disabled}
        >
          <span className="mr-2">{isOn ? '🟢' : '🔴'}</span>
          {isOn ? 'SYSTEM ON' : 'SYSTEM OFF'}
        </Button>
      </div>

      {/* Mode Controls */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          Operating Mode
        </h4>
        <div className="control-grid">
          {modes.map((modeItem) => (
            <Button
              key={modeItem.key}
              onClick={() => onModeChange(modeItem.key)}
              className={cn(
                "btn-control",
                mode === modeItem.key && isOn ? "active" : ""
              )}
              disabled={disabled || !isOn}
            >
              <span className="mr-1">{modeItem.icon}</span>
              {modeItem.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Swing Controls */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          Air Direction
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => onSwingToggle('left')}
            className={cn(
              "btn-control",
              swingDirection === 'left' ? "active" : ""
            )}
            disabled={disabled || !isOn}
          >
            <span className="mr-1">⬅️</span>
            Left
          </Button>
          <Button
            onClick={() => onSwingToggle('right')}
            className={cn(
              "btn-control",
              swingDirection === 'right' ? "active" : ""
            )}
            disabled={disabled || !isOn}
          >
            <span className="mr-1">➡️</span>
            Right
          </Button>
        </div>
      </div>

      {/* Timer Control */}
      <div>
        <Button
          onClick={onTimerSet}
          className="btn-control w-full"
          disabled={disabled || !isOn}
        >
          <span className="mr-2">⏰</span>
          Set Timer
        </Button>
      </div>
    </div>
  );
};

export default ControlPanel;