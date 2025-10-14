export type MachineType = 'fan' | 'heatpump' | 'airconditioner';

export interface MachineStatus {
  id: string;
  name: string;
  type: MachineType;
  ownerId: string;
  isOn: boolean;
  isConnected: boolean;
  hasWater: boolean;
  isCooling: boolean;
  fanActive: boolean;
  motorTemp: number;
  outsideTemp: number;
  insideTemp: number;
  deltaT: number;
  current: number;
  voltage: number;
  power: number;
  overallStatus: 'good' | 'warning' | 'error';
  motorStatus: 'normal' | 'warning' | 'critical';
}

export interface HistoricalDataPoint {
  timestamp: number;
  value: number;
}

export interface MachineHistoricalData {
  power: HistoricalDataPoint[];
  deltaT: HistoricalDataPoint[];
  motorTemp: HistoricalDataPoint[];
}
