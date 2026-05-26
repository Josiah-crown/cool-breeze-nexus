/** Site UUID as text, or literal `unassigned` for the not-on-site-map bucket. */
export type DashboardCardGroupKey = string;

export const DASHBOARD_UNASSIGNED_GROUP_KEY = "unassigned" as const;

export function siteDashboardGroupKey(siteId: string): DashboardCardGroupKey {
  return siteId;
}

export function applyDashboardCardOrder(machineIds: string[], orderByMachineId: Map<string, number>): string[] {
  if (machineIds.length === 0) return [];
  const known = machineIds.filter((id) => orderByMachineId.has(id));
  const unknown = machineIds.filter((id) => !orderByMachineId.has(id));
  known.sort((a, b) => (orderByMachineId.get(a) ?? 0) - (orderByMachineId.get(b) ?? 0));
  unknown.sort((a, b) => a.localeCompare(b));
  return [...known, ...unknown];
}
