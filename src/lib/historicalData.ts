import { supabase } from '@/integrations/supabase/client';
import { MachineHistoricalData, HistoricalDataPoint } from '@/types/machine';
import { getProcessingTable, type MachineType } from '@/lib/machineConfig';

type Period = '24h' | '7d' | '30d' | '1y';

/**
 * Determines which processing table to use based on machine type
 */
async function getMachineProcessingTable(machineId: string): Promise<'cirrus' | 'coolbreeze' | null> {
  const { data: machine, error } = await supabase
    .from('machines')
    .select('type, manufacturer')
    .eq('id', machineId)
    .single();

  if (error || !machine) {
    console.error('Error fetching machine type:', error);
    return null;
  }

  console.log(`[Historical Data] Machine ${machineId}: type=${machine.type}, manufacturer=${machine.manufacturer}`);
  
  // Use centralized configuration to determine processing table
  const processingTable = getProcessingTable(machine.type as MachineType, machine.manufacturer);
  console.log(`[Historical Data] Determined processing table: ${processingTable}`);
  
  return processingTable;
}

/**
 * Fetches historical data from device-specific processing tables (cirrus or coolbreeze)
 * Raw data is deleted after processing, so we fetch from processed tables
 */
export async function fetchHistoricalData(
  machineId: string,
  period: Period = '24h'
): Promise<MachineHistoricalData> {
  // Calculate the start time based on the period
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
      hasWater: [],
      power: [],
    };
  }

  // Fetch readings from the appropriate processing table
  console.log(`[Historical Data] Fetching from ${processingTable} for machine ${machineId}, period: ${period}, startTime: ${startTime.toISOString()}`);
  
  const { data: readings, error } = await supabase
    .from(processingTable)
    .select('*')
    .eq('machine_id', machineId)
    .gte('timestamp', startTime.toISOString())
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('[Historical Data] Error fetching historical data:', error);
    // Return empty data structure on error
    return {
      motorTemp: [],
      current: [],
      outsideTemp: [],
      insideTemp: [],
      deltaT: [],
      fanActive: [],
      isCooling: [],
      hasWater: [],
      power: [],
    };
  }

  console.log(`[Historical Data] Fetched ${readings?.length || 0} readings from ${processingTable}`);

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
  const hasWater: HistoricalDataPoint[] = [];
  const power: HistoricalDataPoint[] = [];

  readings.forEach((reading: any) => {
    const timestamp = new Date(reading.timestamp || reading.created_at).getTime();

    // Motor temp (from processing table)
    if (reading.motor_temp != null) {
      motorTemp.push({
        timestamp,
        value: reading.motor_temp,
      });
    }

    // Current (from processing table)
    if (reading.current != null) {
      current.push({
        timestamp,
        value: reading.current,
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

    // Has water (from processing table)
    if (reading.has_water != null) {
      hasWater.push({
        timestamp,
        value: reading.has_water ? 1 : 0,
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
  });

  return {
    motorTemp,
    current,
    outsideTemp,
    insideTemp,
    deltaT,
    fanActive,
    isCooling,
    hasWater,
    power,
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

