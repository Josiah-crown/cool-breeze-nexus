import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ControlPanelProps {
  mode: string;
  isOn: boolean;
  speed: number;
  onModeChange: (mode: string) => void;
  onPowerToggle: () => void;
  onSpeedChange: (direction: 'increase' | 'decrease') => void;
  onTimerSet: () => void;
  disabled?: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  mode,
  isOn,
  speed,
  onModeChange,
  onPowerToggle,
  onSpeedChange,
  onTimerSet,
  disabled = false
}) => {
  return (
    <div className="panel">
      <div className="panel-header">
        <span className="text-lg">⚙️</span>
        <h3 className="panel-title">System Controls</h3>
      </div>
      
      {/* Control Grid - 2 columns, 4 rows */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Row 1: Cool, On/Off */}
        <Button
          onClick={() => onModeChange('Cool')}
          className={cn(
            "btn-control",
            mode === 'Cool' ? "active" : ""
          )}
          disabled={disabled}
        >
          <span className="mr-1">❄️</span>
          COOL
        </Button>
        <Button
          onClick={onPowerToggle}
          className={cn(
            "btn-control",
            isOn ? "active" : ""
          )}
          disabled={disabled}
        >
          <span className="mr-1">{isOn ? '🟢' : '🔴'}</span>
          {isOn ? 'ON' : 'OFF'}
        </Button>

        {/* Row 2: Fan, Timer */}
        <Button
          onClick={() => onModeChange('Fan')}
          className={cn(
            "btn-control",
            mode === 'Fan' ? "active" : ""
          )}
          disabled={disabled}
        >
          <span className="mr-1">🌀</span>
          FAN
        </Button>
        <Button
          onClick={onTimerSet}
          className="btn-control"
          disabled={disabled || !isOn}
        >
          <span className="mr-1">⏰</span>
          TIMER
        </Button>

        {/* Row 3: Exhaust, Auto */}
        <Button
          onClick={() => onModeChange('Exhaust')}
          className={cn(
            "btn-control",
            mode === 'Exhaust' ? "active" : ""
          )}
          disabled={disabled}
        >
          <span className="mr-1">💨</span>
          EXHAUST
        </Button>
        <Button
          onClick={() => onModeChange('Auto')}
          className={cn(
            "btn-control",
            mode === 'Auto' ? "active" : ""
          )}
          disabled={disabled}
        >
          <span className="mr-1">🔄</span>
          AUTO
        </Button>

        {/* Row 4: Speed Controls */}
        <Button
          onClick={() => onSpeedChange('decrease')}
          className="btn-control"
          disabled={disabled || !isOn}
        >
          &lt;&lt;
        </Button>
        <Button
          onClick={() => onSpeedChange('increase')}
          className="btn-control"
          disabled={disabled || !isOn}
        >
          &gt;&gt;
        </Button>
      </div>
    </div>
  );
};

export default ControlPanel;