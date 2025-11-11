export type MachineType = 'evaporative' | 'heatpump' | 'airconditioner';

export interface MachineStatus {
  id: string;
  name: string;
  type: MachineType;
  ownerId: string;
  location?: string;
  isOn: boolean;
  isConnected: boolean;
  hasWater: boolean;
  isCooling: boolean;
  fanActive: boolean;
  hasPump: boolean;
  hasHeat: boolean;
  motorTemp: number;
  outsideTemp: number;
  insideTemp: number;
  deltaT: number;
  current: number;
  voltage: number;
  power: number;
  temperatureSetpoint?: number;
  overallStatus: 'good' | 'warning' | 'error';
  motorStatus: 'normal' | 'warning' | 'critical';
  notificationsEnabled: boolean;
  apiKey?: string | null;
}

export interface HistoricalDataPoint {
  timestamp: number;
  value: number;
}

export interface MachineHistoricalData {
  power: HistoricalDataPoint[];
  deltaT: HistoricalDataPoint[];
  motorTemp: HistoricalDataPoint[];
  current: HistoricalDataPoint[];
  outsideTemp: HistoricalDataPoint[];
  insideTemp: HistoricalDataPoint[];
  fanActive: HistoricalDataPoint[];
  isCooling: HistoricalDataPoint[];
  hasWater: HistoricalDataPoint[];
}
