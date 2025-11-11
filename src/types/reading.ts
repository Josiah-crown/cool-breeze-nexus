// src/types/reading.ts
// Type definitions for sensor readings from ESP32

export interface StateInput {
  input: number;
  label: string;
  value: number;
  voltage: number;
  speed?: number; // Optional, only for fan input
}

export interface Reading {
  id: string;
  machine_id: string;
  timestamp: string;
  
  // Temperature readings (Celsius)
  temp_inside: number | null;
  temp_outside: number | null;
  temp_machine: number | null;
  
  // Other sensors
  ct_current: number | null;
  water_level: number | null;
  
  // State data
  state_inputs: StateInput[] | null;
  derived_state: 'off' | 'idle' | 'cooling' | string;
  delta_t: number | null;
  
  // Metadata
  created_at: string;
}

export interface MachineWithReading {
  // Machine properties
  id: string;
  name: string;
  type: 'fan' | 'heatpump' | 'airconditioner';
  owner_id: string;
  location?: string | null;
  setpoint?: number | null;
  notifications_enabled?: boolean;
  api_key?: string | null;
  device_id?: string | null;
  
  // Legacy machine properties (fallback values)
  is_on?: boolean;
  is_connected?: boolean;
  has_water?: boolean;
  is_cooling?: boolean;
  fan_active?: boolean;
  motor_temp?: number;
  outside_temp?: number;
  inside_temp?: number;
  delta_t?: number;
  current?: number;
  voltage?: number;
  power?: number;
  overall_status?: string;
  motor_status?: string;
  
  // Latest reading from readings_raw table
  latest_reading: Reading | null;
  
  created_at: string;
  updated_at: string;
}

export interface ReadingsQueryParams {
  machine_id: string;
  start_time?: string;
  end_time?: string;
  limit?: number;
}
