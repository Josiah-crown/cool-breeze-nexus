import type { MachineHistoricalData } from "@/types/machine";

/** Detail view always fetches charts on open; use this until the first load completes. */
export const EMPTY_MACHINE_HISTORICAL: MachineHistoricalData = {
  power: [],
  deltaT: [],
  motorTemp: [],
  current: [],
  outsideTemp: [],
  insideTemp: [],
  fanActive: [],
  isCooling: [],
  isHeating: [],
  hasWater: [],
  pumpActive: [],
  fanSpeed: [],
};
