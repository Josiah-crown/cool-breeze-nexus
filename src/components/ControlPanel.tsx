import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ControlPanelProps {
  isOn: boolean;
  coolMode: boolean;
  fanMode: boolean;
  exhaustMode: boolean;
  speed: number;
  onPowerToggle: () => void;
  onCoolToggle: () => void;
  onFanToggle: () => void;
  onExhaustToggle: () => void;
  onSpeedChange: (direction: 'increase' | 'decrease') => void;
  onTimerSet: () => void;
  disabled?: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  isOn,
  coolMode,
  fanMode,
  exhaustMode,
  speed,
  onPowerToggle,
  onCoolToggle,
  onFanToggle,
  onExhaustToggle,
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
          onClick={onCoolToggle}
          className={cn(
            "btn-control",
            coolMode ? "active" : ""
          )}
          disabled={disabled || !isOn}
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
          onClick={onFanToggle}
          className={cn(
            "btn-control",
            fanMode ? "active" : ""
          )}
          disabled={disabled || !isOn}
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
          onClick={onExhaustToggle}
          className={cn(
            "btn-control",
            exhaustMode ? "active" : ""
          )}
          disabled={disabled || !isOn}
        >
          <span className="mr-1">💨</span>
          EXHAUST
        </Button>
        <Button
          onClick={onExhaustToggle}
          className={cn(
            "btn-control",
            exhaustMode ? "active" : ""
          )}
          disabled={disabled || !isOn}
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