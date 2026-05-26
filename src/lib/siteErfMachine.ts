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

/** Pins closer than this (% of plan width/height) are treated as overlapping and fanned slightly. */
export const MACHINE_PIN_OVERLAP_EPS_PCT = 1.25;

function pinDistancePct(a: SiteMachinePinRow, b: SiteMachinePinRow) {
  return Math.hypot(a.x_pct - b.x_pct, a.y_pct - b.y_pct);
}

function clusterRoot(parent: number[], i: number): number {
  if (parent[i] !== i) parent[i] = clusterRoot(parent, parent[i]);
  return parent[i];
}

/**
 * Use each pin's stored plan coordinates. Only fan out icons that were placed on
 * (or dragged to) nearly the same spot so labels remain clickable.
 */
export function displayPositionForMachinePins(pins: SiteMachinePinRow[]): Map<string, { x_pct: number; y_pct: number }> {
  const out = new Map<string, { x_pct: number; y_pct: number }>();
  if (pins.length === 0) return out;

  const parent = pins.map((_, i) => i);
  for (let i = 0; i < pins.length; i++) {
    for (let j = i + 1; j < pins.length; j++) {
      if (pinDistancePct(pins[i], pins[j]) < MACHINE_PIN_OVERLAP_EPS_PCT) {
        const ri = clusterRoot(parent, i);
        const rj = clusterRoot(parent, j);
        if (ri !== rj) parent[ri] = rj;
      }
    }
  }

  const clusters = new Map<number, SiteMachinePinRow[]>();
  pins.forEach((p, i) => {
    const root = clusterRoot(parent, i);
    const list = clusters.get(root) || [];
    list.push(p);
    clusters.set(root, list);
  });

  clusters.forEach((group) => {
    if (group.length === 1) {
      const p = group[0];
      out.set(p.id, { x_pct: p.x_pct, y_pct: p.y_pct });
      return;
    }

    const cx = group.reduce((s, p) => s + p.x_pct, 0) / group.length;
    const cy = group.reduce((s, p) => s + p.y_pct, 0) / group.length;
    const radius = Math.min(2.2, 0.55 + group.length * 0.28);

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
