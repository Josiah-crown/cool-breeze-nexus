import { supabase } from "@/integrations/supabase/client";
import type { MachineStatus } from "@/types/machine";

export type PublicClientDemoPayload = {
  site: {
    id: string;
    name: string;
    address: string | null;
    owner_id: string;
    company_id: string | null;
    updated_at: string;
  };
  owner_display_name: string;
  buildings: { id: string; site_id: string; name: string; updated_at: string }[];
  building_floor_counts: Record<string, number>;
  erf_asset: { site_id: string; image_path: string; updated_at: string } | null;
  building_shapes: unknown[];
  machine_positions: {
    id: string;
    site_id: string;
    machine_id: string;
    building_id: string | null;
    x_pct: number;
    y_pct: number;
  }[];
  machines: MachineStatus[];
};

function mapDemoMachine(row: Record<string, unknown>): MachineStatus {
  const outsideTemp = Number(row.outside_temp ?? 0);
  const insideTemp = Number(row.inside_temp ?? 0);
  return {
    id: String(row.id),
    name: String(row.name),
    type: row.type as MachineStatus["type"],
    manufacturer: (row.manufacturer as string | null) ?? null,
    ownerId: String(row.owner_id),
    location: (row.location as string | null) ?? null,
    isOn: Boolean(row.is_on),
    isCooling: Boolean(row.is_cooling),
    fanActive: Boolean(row.fan_active),
    hasWater: Boolean(row.has_water),
    hasHeat: Boolean(row.has_heat),
    isConnected: Boolean(row.is_connected),
    motorTemp: Number(row.motor_temp ?? 0),
    outsideTemp,
    insideTemp,
    temperatureSetpoint: row.setpoint != null ? Number(row.setpoint) : null,
    deltaT: Math.abs(outsideTemp - insideTemp),
    current: Number(row.current ?? 0),
    voltage: Number(row.voltage ?? 0),
    power: Number(row.power ?? 0),
    overallStatus: (row.overall_status as MachineStatus["overallStatus"]) ?? "offline",
    motorStatus: (row.motor_status as MachineStatus["motorStatus"]) ?? "normal",
    notificationsEnabled: true,
    apiKey: null,
  };
}

export async function fetchPublicClientDemo(): Promise<PublicClientDemoPayload | null> {
  const { data, error } = await supabase.rpc("get_public_client_demo");
  if (error) throw error;
  if (!data || typeof data !== "object") return null;
  const raw = data as Record<string, unknown>;
  if (raw.error === "no_demo_site") return null;

  const machines = ((raw.machines as Record<string, unknown>[]) || []).map(mapDemoMachine);

  return {
    site: raw.site as PublicClientDemoPayload["site"],
    owner_display_name: String(raw.owner_display_name || "Demo client"),
    buildings: (raw.buildings as PublicClientDemoPayload["buildings"]) || [],
    building_floor_counts: (raw.building_floor_counts as Record<string, number>) || {},
    erf_asset: (raw.erf_asset as PublicClientDemoPayload["erf_asset"]) || null,
    building_shapes: (raw.building_shapes as unknown[]) || [],
    machine_positions: (raw.machine_positions as PublicClientDemoPayload["machine_positions"]) || [],
    machines,
  };
}
