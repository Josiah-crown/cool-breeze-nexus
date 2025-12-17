import { supabase } from '@/integrations/supabase/client';
import { MachineHistoricalData, HistoricalDataPoint } from '@/types/machine';
import { getProcessingTable, type MachineType } from '@/lib/machineConfig';

type Period = '24h' | '7d' | '30d' | '1y';

/**
 * Determines which processing table to use based on machine type
 * 
 * Tables are simply named after the manufacturer (lowercase):
 * - cirrus, coolbreeze, alliance
 */
async function getMachineProcessingTable(machineId: string): Promise<'cirrus' | 'coolbreeze' | 'alliance' | null> {
  const { data: machine, error } = await supabase
    .from('machines')
    .select('type, manufacturer')
    .eq('id', machineId)
    .single();

  if (error || !machine) {
    console.error('Error fetching machine type:', error);
    return null;
  }
  
  // Use centralized configuration to determine processing table
  const processingTable = getProcessingTable(machine.type as MachineType, machine.manufacturer);
  
  return processingTable;
}

/**
 * Fetches historical data from device-specific processing tables
 * 
 * Tables: cirrus, coolbreeze, alliance (named after manufacturer)
 * Raw data goes to readings_raw (2 weeks retention)
 * Processed data stored in manufacturer tables (1 year retention)
 */
export async function fetchHistoricalData(
  machineId: string,
  period: Period = '24h'
): Promise<MachineHistoricalData> {
  // Calculate the start time based on the period
  // Always calculate from "now" backwards to ensure full period is shown
  const now = new Date();
  let startTime: Date;
  
  switch (period) {
    case '24h':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      startTime = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  
  // Store period info for use in formatChartData
  // We'll use the period to generate complete date ranges

  // Determine which processing table to use
  const processingTable = await getMachineProcessingTable(machineId);
  
  if (!processingTable) {
    console.warn('Could not determine processing table for machine:', machineId);
    return {
      motorTemp: [],
      current: [],
      outsideTemp: [],
      insideTemp: [],
      deltaT: [],
      fanActive: [],
      isCooling: [],
        isHeating: [],
      hasWater: [],
      power: [],
    };
  }

  // Use the optimized database function for fetching historical data
  // This function handles aggregation automatically based on period:
  // - 24h: All readings (no aggregation)
  // - 7d: 10-minute averages
  // - 30d: 1-hour averages
  // - 1y: 1-day averages
  const { data: readings, error } = await supabase.rpc('get_historical_data', {
    p_machine_id: machineId,
    p_period: period,
    p_table_name: processingTable,
  });

  if (error) {
    // Check if it's a function-not-found error (might need to run migration)
    if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('does not exist')) {
      console.error(`[Historical Data] Function 'get_historical_data' does not exist. Please run migration: 20250126000000_create_historical_data_views.sql`);
      // Fallback to direct table query
      console.warn('[Historical Data] Falling back to direct table query...');
      return await fetchHistoricalDataDirect(machineId, period, processingTable, startTime);
    } else {
      // Other errors (permissions, network, etc.)
      console.error('[Historical Data] Error fetching historical data:', error);
      return {
        motorTemp: [],
        current: [],
        outsideTemp: [],
        insideTemp: [],
        deltaT: [],
        fanActive: [],
        isCooling: [],
        isHeating: [],
        hasWater: [],
        pumpActive: [],
        power: [],
        fanSpeed: [],
      };
    }
  }

  if (!readings || readings.length === 0) {
    console.warn(`[Historical Data] No readings found for machine ${machineId} in ${processingTable} for period ${period}`);
    // Return empty data structure if no readings
    return {
      motorTemp: [],
      current: [],
      outsideTemp: [],
      insideTemp: [],
      deltaT: [],
      fanActive: [],
      isCooling: [],
      isHeating: [],
      hasWater: [],
      power: [],
    };
  }

  // Transform readings to the expected format
  const motorTemp: HistoricalDataPoint[] = [];
  const current: HistoricalDataPoint[] = [];
  const outsideTemp: HistoricalDataPoint[] = [];
  const insideTemp: HistoricalDataPoint[] = [];
  const deltaT: HistoricalDataPoint[] = [];
  const fanActive: HistoricalDataPoint[] = [];
  const isCooling: HistoricalDataPoint[] = [];
  const isHeating: HistoricalDataPoint[] = [];
  const hasWater: HistoricalDataPoint[] = [];
  const pumpActive: HistoricalDataPoint[] = [];
  const power: HistoricalDataPoint[] = [];
  const fanSpeed: HistoricalDataPoint[] = [];

  // Handle quoted column names from function (timestamp and current are reserved keywords)
  readings.forEach((reading: any) => {
    // Function returns "timestamp" and "current" as quoted identifiers
    const timestampValue = reading.timestamp || reading['timestamp'] || reading.created_at;
    const timestamp = new Date(timestampValue).getTime();

    // Motor temp (from processing table)
    if (reading.motor_temp != null) {
      motorTemp.push({
        timestamp,
        value: reading.motor_temp,
      });
    }

    // Current (from processing table - may be quoted as "current")
    const currentValue = reading.current ?? reading['current'];
    if (currentValue != null) {
      current.push({
        timestamp,
        value: currentValue,
      });
    }

    // Outside temp (ambient_temp in processing tables)
    if (reading.ambient_temp != null) {
      outsideTemp.push({
        timestamp,
        value: reading.ambient_temp,
      });
    }

    // Inside temp (duct_temp in processing tables)
    if (reading.duct_temp != null) {
      insideTemp.push({
        timestamp,
        value: reading.duct_temp,
      });
    }

    // Delta T (calculated in processing table)
    if (reading.delta_t != null) {
      deltaT.push({
        timestamp,
        value: reading.delta_t,
      });
    } else if (reading.ambient_temp != null && reading.duct_temp != null) {
      // Calculate delta_t if not present
      deltaT.push({
        timestamp,
        value: Math.abs(reading.ambient_temp - reading.duct_temp),
      });
    }

    // Fan active (from processing table)
    if (reading.fan_active != null) {
      fanActive.push({
        timestamp,
        value: reading.fan_active ? 1 : 0,
      });
    }

    // Is cooling (from processing table)
    if (reading.is_cooling != null) {
      isCooling.push({
        timestamp,
        value: reading.is_cooling ? 1 : 0,
      });
    }

    // Is heating (from processing table - heatpumps only)
    if (reading.is_heating != null) {
      isHeating.push({
        timestamp,
        value: reading.is_heating ? 1 : 0,
      });
    }

    // Has water (from processing table)
    if (reading.has_water != null) {
      hasWater.push({
        timestamp,
        value: reading.has_water ? 1 : 0,
      });
    }

    // Pump active (from processing table)
    if (reading.pump_active != null) {
      pumpActive.push({
        timestamp,
        value: reading.pump_active ? 1 : 0,
      });
    }

    // Power (from processing table)
    if (reading.power != null) {
      power.push({
        timestamp,
        value: reading.power,
      });
    } else if (reading.voltage != null && reading.current != null) {
      // Calculate power if not present
      power.push({
        timestamp,
        value: reading.voltage * reading.current,
      });
    }

    // Fan speed (from processing table, 0-100%, NULL for heatpumps)
    const fanSpeedValue = reading.fan_speed;
    if (fanSpeedValue != null) {
      fanSpeed.push({
        timestamp,
        value: Math.max(0, Math.min(100, fanSpeedValue)), // Ensure 0-100 range
      });
    }
  });

  return {
    motorTemp,
    current,
    outsideTemp,
    insideTemp,
    deltaT,
    fanActive,
    isCooling,
    isHeating,
    hasWater,
    pumpActive,
    power,
    fanSpeed,
  };
}

/**
 * Fallback function: Direct table query (used if database function doesn't exist)
 */
async function fetchHistoricalDataDirect(
  machineId: string,
  period: Period,
  processingTable: string,
  startTime: Date
): Promise<MachineHistoricalData> {
  const { data: readings, error } = await supabase
    .from(processingTable)
    .select('*')
    .eq('machine_id', machineId)
    .gte('timestamp', startTime.toISOString())
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('[Historical Data] Error in direct table query:', error);
    return {
      motorTemp: [],
      current: [],
      outsideTemp: [],
      insideTemp: [],
      deltaT: [],
      fanActive: [],
      isCooling: [],
      isHeating: [],
      hasWater: [],
      power: [],
      fanSpeed: [],
    };
  }

  // Transform readings (same logic as main function)
  const motorTemp: HistoricalDataPoint[] = [];
  const current: HistoricalDataPoint[] = [];
  const outsideTemp: HistoricalDataPoint[] = [];
  const insideTemp: HistoricalDataPoint[] = [];
  const deltaT: HistoricalDataPoint[] = [];
  const fanActive: HistoricalDataPoint[] = [];
  const isCooling: HistoricalDataPoint[] = [];
  const isHeating: HistoricalDataPoint[] = [];
  const hasWater: HistoricalDataPoint[] = [];
  const pumpActive: HistoricalDataPoint[] = [];
  const power: HistoricalDataPoint[] = [];
  const fanSpeed: HistoricalDataPoint[] = [];

  readings?.forEach((reading: any) => {
    const timestamp = new Date(reading.timestamp || reading.created_at).getTime();

    if (reading.motor_temp != null) motorTemp.push({ timestamp, value: reading.motor_temp });
    if (reading.current != null) current.push({ timestamp, value: reading.current });
    if (reading.ambient_temp != null) outsideTemp.push({ timestamp, value: reading.ambient_temp });
    if (reading.duct_temp != null) insideTemp.push({ timestamp, value: reading.duct_temp });
    if (reading.delta_t != null) {
      deltaT.push({ timestamp, value: reading.delta_t });
    } else if (reading.ambient_temp != null && reading.duct_temp != null) {
      deltaT.push({ timestamp, value: Math.abs(reading.ambient_temp - reading.duct_temp) });
    }
    if (reading.fan_active != null) fanActive.push({ timestamp, value: reading.fan_active ? 1 : 0 });
    if (reading.is_cooling != null) isCooling.push({ timestamp, value: reading.is_cooling ? 1 : 0 });
    if (reading.is_heating != null) isHeating.push({ timestamp, value: reading.is_heating ? 1 : 0 });
    if (reading.has_water != null) hasWater.push({ timestamp, value: reading.has_water ? 1 : 0 });
    if (reading.pump_active != null) pumpActive.push({ timestamp, value: reading.pump_active ? 1 : 0 });
    if (reading.power != null) {
      power.push({ timestamp, value: reading.power });
    } else if (reading.voltage != null && reading.current != null) {
      power.push({ timestamp, value: reading.voltage * reading.current });
    }
    // Fan speed (0-100%, NULL for heatpumps)
    const fanSpeedValue = reading.fan_speed;
    if (fanSpeedValue != null) {
      fanSpeed.push({ timestamp, value: Math.max(0, Math.min(100, fanSpeedValue)) });
    }
  });

  return {
    motorTemp,
    current,
    outsideTemp,
    insideTemp,
    deltaT,
    fanActive,
    isCooling,
    isHeating,
    hasWater,
    pumpActive,
    power,
    fanSpeed,
  };
}

/**
 * Fetches historical data for multiple machines
 */
export async function fetchHistoricalDataForMachines(
  machineIds: string[],
  period: Period = '24h'
): Promise<{ [key: string]: MachineHistoricalData }> {
  const results: { [key: string]: MachineHistoricalData } = {};

  // Fetch all data in parallel
  const promises = machineIds.map(async (machineId) => {
    const data = await fetchHistoricalData(machineId, period);
    return { machineId, data };
  });

  const resolved = await Promise.all(promises);
  
  resolved.forEach(({ machineId, data }) => {
    results[machineId] = data;
  });

  return results;
}

