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
 * This determines which Supabase table stores the processed data
 * 
 * Tables are simply named after the manufacturer (lowercase)
 * Pattern for new manufacturers: just use lowercase manufacturer name
 */
export const PROCESSING_TABLE_MAP: Record<Manufacturer | string, 'cirrus' | 'coolbreeze' | 'alliance' | null> = {
  'Cirrus': 'cirrus',
  'CoolBreeze': 'coolbreeze',
  'Alliance': 'alliance',
  // Common lowercase variants (DB often stores lowercase manufacturer)
  'cirrus': 'cirrus',
  'coolbreeze': 'coolbreeze',
  'alliance': 'alliance',
  // Add new manufacturers here:
  // 'NewManufacturer': 'newmanufacturer',
};

/**
 * Determines which processing table to use based on machine type and manufacturer
 */
export function getProcessingTable(
  type: MachineType,
  manufacturer: string | null | undefined
): 'cirrus' | 'coolbreeze' | 'alliance' | null {
  // If manufacturer is specified, use it
  if (manufacturer) {
    const direct = PROCESSING_TABLE_MAP[manufacturer];
    if (direct) return direct as 'cirrus' | 'coolbreeze' | 'alliance';

    const normalized = manufacturer.trim().toLowerCase();
    const normalizedMap = PROCESSING_TABLE_MAP[normalized];
    if (normalizedMap) return normalizedMap as 'cirrus' | 'coolbreeze' | 'alliance';
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

