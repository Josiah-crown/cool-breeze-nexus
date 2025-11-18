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

export type Manufacturer = 'Cirrus' | 'CoolBreeze' | 'Other';

/**
 * Available manufacturers for each machine type
 */
export const MACHINE_MANUFACTURERS: Record<MachineType, Manufacturer[]> = {
  evaporative: ['Cirrus', 'CoolBreeze'],
  heatpump: ['CoolBreeze'],
  airconditioner: ['CoolBreeze'],
};

/**
 * Mapping of manufacturer to processing table
 * This determines which Supabase table processes the raw data
 */
export const PROCESSING_TABLE_MAP: Record<Manufacturer | string, 'cirrus' | 'coolbreeze' | null> = {
  'Cirrus': 'cirrus',
  'CoolBreeze': 'coolbreeze',
  // Add new manufacturers here:
  // 'NewManufacturer': 'new_table',
};

/**
 * Determines which processing table to use based on machine type and manufacturer
 */
export function getProcessingTable(
  type: MachineType,
  manufacturer: string | null | undefined
): 'cirrus' | 'coolbreeze' | null {
  // If manufacturer is specified, use it
  if (manufacturer && PROCESSING_TABLE_MAP[manufacturer]) {
    return PROCESSING_TABLE_MAP[manufacturer] as 'cirrus' | 'coolbreeze';
  }

  // Fallback to type-based mapping
  if (type === 'evaporative') {
    return 'cirrus'; // Default for evaporative coolers
  } else if (type === 'airconditioner' || type === 'heatpump') {
    return 'coolbreeze'; // Default for HVAC systems
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

