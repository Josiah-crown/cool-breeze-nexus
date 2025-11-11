import React from 'react';
import StatusLight from './StatusLight';

interface StatusData {
  isOn: boolean;
  hasWater: boolean;
  isCooling: boolean;
  motorTemp: number;
  deltaT: number;
  outsideTemp: number;
  insideTemp: number;
  currentAmps: number;
  voltage: number;
  power: number;
}

interface StatusPanelProps {
  data: StatusData;
}

const StatusPanel: React.FC<StatusPanelProps> = ({ data }) => {
  const getMotorStatus = () => {
    if (data.motorTemp > 80) return 'error';
    if (data.motorTemp > 60) return 'warning';
    return 'active';
  };

  const getDeltaTStatus = () => {
    if (data.deltaT > 5) return 'active';
    if (data.deltaT > 3) return 'warning';
    return 'inactive';
  };

  return (
    <div className="space-y-6">
      {/* System Status */}
      <div className="panel">
        <div className="panel-header">
          <span className="text-lg">📊</span>
          <h3 className="panel-title">System Status</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <StatusLight 
            status={data.isOn ? 'active' : 'inactive'} 
            label="Power" 
          />
          <StatusLight 
            status={data.hasWater ? 'active' : 'error'} 
            label="Water Level" 
          />
          <StatusLight 
            status={data.isCooling ? 'active' : 'inactive'} 
            label="Cooling Active" 
          />
          <StatusLight 
            status={getMotorStatus()} 
            label="Motor Status" 
          />
        </div>

        {/* Delta T Display */}
        <div className="mt-6 p-4 bg-status rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusLight 
                status={getDeltaTStatus()} 
                label="ΔT Efficiency" 
                showLabel={false}
              />
              <span className="text-sm font-medium text-muted-foreground">
                Temperature Differential
              </span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {data.deltaT.toFixed(1)}°C
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Temperature Readings */}
      <div className="panel">
        <div className="panel-header">
          <span className="text-lg">🌡️</span>
          <h3 className="panel-title">Temperature Monitoring</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-status rounded-lg">
            <span className="text-sm font-medium text-muted-foreground">Outside</span>
            <span className="text-lg font-bold text-warning">
              {data.outsideTemp.toFixed(1)}°C
            </span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-status rounded-lg">
            <span className="text-sm font-medium text-muted-foreground">Inside</span>
            <span className="text-lg font-bold text-accent">
              {data.insideTemp.toFixed(1)}°C
            </span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-status rounded-lg">
            <span className="text-sm font-medium text-muted-foreground">Motor</span>
            <span className={`text-lg font-bold ${
              data.motorTemp > 80 ? 'text-destructive' : 
              data.motorTemp > 60 ? 'text-warning' : 'text-accent'
            }`}>
              {data.motorTemp.toFixed(1)}°C
            </span>
          </div>
        </div>
      </div>

      {/* Electrical Readings */}
      <div className="panel">
        <div className="panel-header">
          <span className="text-lg">⚡</span>
          <h3 className="panel-title">Electrical Monitoring</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-status rounded-lg">
            <span className="text-sm font-medium text-muted-foreground">Current</span>
            <span className="text-lg font-bold text-primary">
              {data.currentAmps.toFixed(1)}A
            </span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-status rounded-lg">
            <span className="text-sm font-medium text-muted-foreground">Voltage</span>
            <span className="text-lg font-bold text-primary">
              {data.voltage.toFixed(0)}V
            </span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-status rounded-lg">
            <span className="text-sm font-medium text-muted-foreground">Power</span>
            <span className="text-lg font-bold text-primary">
              {Math.round(data.power)}W
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusPanel;