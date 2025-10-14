import React from 'react';
import { Card } from './ui/card';
import { MachineStatus } from '@/types/machine';
import StatusLight from './StatusLight';
import FanComponent from './FanComponent';
import HeatPumpComponent from './HeatPumpComponent';
import AirConditionerComponent from './AirConditionerComponent';
import { cn } from '@/lib/utils';

interface MachineCardProps {
  machine: MachineStatus;
  onClick: () => void;
  ownerName?: string;
}

const MachineCard: React.FC<MachineCardProps> = ({ machine, onClick, ownerName }) => {
  const getMachineComponent = () => {
    const size = 'w-24 h-24';
    switch (machine.type) {
      case 'fan':
        return <FanComponent isSpinning={machine.fanActive} size={size} />;
      case 'heatpump':
        return <HeatPumpComponent isActive={machine.isOn} size={size} />;
      case 'airconditioner':
        return <AirConditionerComponent isActive={machine.isCooling} size={size} />;
    }
  };

  const getStatusColor = () => {
    switch (machine.overallStatus) {
      case 'good':
        return 'border-accent';
      case 'warning':
        return 'border-warning';
      case 'error':
        return 'border-destructive';
      default:
        return 'border-border';
    }
  };

  return (
    <Card
      className={cn(
        'p-4 cursor-pointer transition-all hover:scale-105 hover:shadow-xl',
        'bg-gradient-to-br from-card to-panel border-2',
        getStatusColor()
      )}
      onClick={onClick}
    >
      {/* Machine Visual */}
      <div className="flex justify-center mb-4">
        {getMachineComponent()}
      </div>

      {/* Machine Name */}
      <h3 className="text-lg font-semibold text-center mb-2 text-foreground">
        {machine.name}
      </h3>
      
      {/* Owner Name */}
      {ownerName && (
        <p className="text-xs text-muted-foreground text-center mb-4">
          Owner: {ownerName}
        </p>
      )}

      {/* Status Grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatusLight
          status={machine.isOn ? 'active' : 'inactive'}
          label="Power"
          size="sm"
        />
        {machine.type !== 'heatpump' && (
          <StatusLight
            status={machine.fanActive ? 'active' : 'inactive'}
            label="Fan"
            size="sm"
          />
        )}
        <StatusLight
          status={machine.isCooling ? 'active' : 'inactive'}
          label="Cool"
          size="sm"
        />
        {machine.type !== 'airconditioner' && (
          <StatusLight
            status={machine.hasWater ? 'active' : 'error'}
            label="Water"
            size="sm"
          />
        )}
        <StatusLight
          status={
            Math.abs(machine.deltaT) >= 5 && Math.abs(machine.deltaT) <= 15
              ? 'active'
              : Math.abs(machine.deltaT) > 15
              ? 'warning'
              : 'inactive'
          }
          label="ΔT"
          size="sm"
        />
        <StatusLight
          status={
            machine.motorTemp < 70
              ? 'active'
              : machine.motorTemp < 80
              ? 'warning'
              : 'error'
          }
          label="Motor"
          size="sm"
        />
      </div>
    </Card>
  );
};

export default MachineCard;
