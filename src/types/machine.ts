export type MachineType = 'evaporative' | 'heatpump' | 'airconditioner';

export interface MachineStatus {
  id: string;
  name: string;
  type: MachineType;
  manufacturer?: string | null;
  ownerId: string;
  location?: string;
  isOn: boolean;
  isConnected: boolean;
  hasWater: boolean;  // For evaporative: water level | For heatpumps: pump status (GPIO5)
  isCooling: boolean;
  fanActive: boolean;
  hasHeat: boolean;  // For heatpumps: heating status (current > 1A)
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
  compressorStatus?: 'good' | 'warning' | 'failed';  // For heatpumps: compressor health
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
  isHeating: HistoricalDataPoint[];  // For heatpumps: heating status
  hasWater: HistoricalDataPoint[];  // For evaporative: water level | For heatpumps: pump status
  pumpActive: HistoricalDataPoint[];
  fanSpeed: HistoricalDataPoint[];
}

export interface NotificationRecipient {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: 'super_admin' | 'company' | 'installer' | 'client';
  enabled: boolean;
  canEdit: boolean; // Can the current user edit this recipient's preference?
}
