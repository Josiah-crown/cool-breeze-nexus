/**
 * Machine Configuration
 * Centralized configuration for machine types, manufacturers, and their processing tables
 * 
 * To add a new subcategory:
 * 1. Add the manufacturer to the appropriate type's manufacturers array
 * 2. Add the processing table mapping in PROCESSING_TABLE_MAP
 * 3. Update the UI dropdowns in AddMachineDialog.tsx
 * 4. Create/update the processing trigger in Supabase if needed
 */

export type MachineType = 'evaporative' | 'heatpump' | 'airconditioner';

export type Manufacturer = 'Cirrus' | 'CoolBreeze' | 'Alliance' | 'Other';

/**
 * Available manufacturers for each machine type
 */
export const MACHINE_MANUFACTURERS: Record<MachineType, Manufacturer[]> = {
  evaporative: ['Cirrus', 'CoolBreeze'],
  heatpump: ['Alliance'],
  airconditioner: ['CoolBreeze'],
};

/**
 * Mapping of manufacturer to processing table
 * This determines which Supabase table processes the raw data
 * 
 * NOTE: After migration to new Supabase instance, these will change to:
 * - 'Cirrus': 'cirrus_calculated'
 * - 'CoolBreeze': 'coolbreeze_calculated'
 * Pattern: {manufacturer}_calculated
 */
export const PROCESSING_TABLE_MAP: Record<Manufacturer | string, 'cirrus' | 'coolbreeze' | 'alliance' | null> = {
  'Cirrus': 'cirrus',  // TODO: Change to 'cirrus_calculated' after migration
  'CoolBreeze': 'coolbreeze',  // TODO: Change to 'coolbreeze_calculated' after migration
  'Alliance': 'alliance',  // TODO: Change to 'alliance_calculated' after migration
  // Add new manufacturers here:
  // 'NewManufacturer': 'new_manufacturer_calculated',
};

/**
 * Determines which processing table to use based on machine type and manufacturer
 */
export function getProcessingTable(
  type: MachineType,
  manufacturer: string | null | undefined
): 'cirrus' | 'coolbreeze' | 'alliance' | null {
  // If manufacturer is specified, use it
  if (manufacturer && PROCESSING_TABLE_MAP[manufacturer]) {
    return PROCESSING_TABLE_MAP[manufacturer] as 'cirrus' | 'coolbreeze' | 'alliance';
  }

  // Fallback to type-based mapping
  if (type === 'evaporative') {
    return 'cirrus'; // Default for evaporative coolers
  } else if (type === 'airconditioner') {
    return 'coolbreeze'; // Default for air conditioners
  } else if (type === 'heatpump') {
    return 'alliance'; // Default for heat pumps (Alliance)
  }

  return null;
}

/**
 * Check if manufacturer is required for a machine type
 */
export function isManufacturerRequired(type: MachineType): boolean {
  return type === 'evaporative';
}

/**
 * Get available manufacturers for a machine type
 */
export function getAvailableManufacturers(type: MachineType): Manufacturer[] {
  return MACHINE_MANUFACTURERS[type] || [];
}

