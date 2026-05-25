import type { LucideIcon } from "lucide-react";
import { Fan, Flame, Snowflake } from "lucide-react";
import type { MachineType } from "@/types/machine";
import { buildingOutlineColor, type BuildingOutlineColor } from "@/lib/siteErfOutline";

const UNATTACHED_PIN: BuildingOutlineColor = {
  stroke: "#0D2211",
  fill: "rgba(13, 34, 17, 0.12)",
  strokeDark: "#1A3A1E",
};

export function machinePinAccent(
  buildingId: string | null,
  orderedBuildingIds: string[],
): BuildingOutlineColor {
  if (!buildingId) return UNATTACHED_PIN;
  return buildingOutlineColor(buildingId, orderedBuildingIds);
}

export function machineTypeIcon(type: MachineType | string | undefined): LucideIcon {
  switch (type) {
    case "heatpump":
      return Flame;
    case "airconditioner":
      return Snowflake;
    case "evaporative":
    default:
      return Fan;
  }
}

export type SiteMachinePinRow = {
  id: string;
  machine_id: string;
  building_id: string | null;
  x_pct: number;
  y_pct: number;
};

/** Fan out icons when several machines share one building — icons stay the same size. */
export function displayPositionForMachinePins(pins: SiteMachinePinRow[]): Map<string, { x_pct: number; y_pct: number }> {
  const out = new Map<string, { x_pct: number; y_pct: number }>();
  const groups = new Map<string, SiteMachinePinRow[]>();

  pins.forEach((p) => {
    const key = p.building_id ?? `__unassigned_${p.machine_id}`;
    const list = groups.get(key) || [];
    list.push(p);
    groups.set(key, list);
  });

  groups.forEach((group) => {
    if (group.length === 1) {
      const p = group[0];
      out.set(p.id, { x_pct: p.x_pct, y_pct: p.y_pct });
      return;
    }

    const cx = group.reduce((s, p) => s + p.x_pct, 0) / group.length;
    const cy = group.reduce((s, p) => s + p.y_pct, 0) / group.length;
    const radius = Math.min(2.8, 0.65 + group.length * 0.35);

    group.forEach((p, i) => {
      const angle = (2 * Math.PI * i) / group.length - Math.PI / 2;
      out.set(p.id, {
        x_pct: Math.max(2, Math.min(98, cx + Math.cos(angle) * radius)),
        y_pct: Math.max(2, Math.min(98, cy + Math.sin(angle) * radius)),
      });
    });
  });

  return out;
}

export function machineTypeLabel(type: MachineType | string | undefined): string {
  switch (type) {
    case "heatpump":
      return "Heat pump";
    case "airconditioner":
      return "Air conditioner";
    case "evaporative":
      return "Evaporative cooler";
    default:
      return "Machine";
  }
}
