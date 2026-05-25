import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteMachineGroup = {
  siteId: string;
  siteName: string;
  siteAddress: string | null;
  machineIds: string[];
};

/**
 * Maps machines to BMS sites via building floorplan pins (building_machine_positions → buildings → sites).
 * Machines not on any pin for an accessible site are "unassigned".
 */
export function useSiteMachineGroups(visibleMachineIds: string[]) {
  const [groups, setGroups] = useState<SiteMachineGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const idKey = useMemo(() => [...visibleMachineIds].sort().join(","), [visibleMachineIds]);

  /** Stable list derived from idKey — do not depend on `visibleMachineIds` reference in load() or it re-runs every parent render. */
  const visibleIdsStable = useMemo(() => (idKey.length === 0 ? [] : idKey.split(",")), [idKey]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const idSet = new Set(visibleIdsStable);
    try {
      const { data: siteRows, error: siteErr } = await supabase
        .from("sites")
        .select("id, name, address")
        .order("name");
      if (siteErr) throw siteErr;

      const sites = (siteRows || []) as { id: string; name: string; address: string | null }[];
      if (sites.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      const siteIds = sites.map((s) => s.id);
      const { data: buildingRows, error: bErr } = await supabase
        .from("buildings")
        .select("id, site_id")
        .in("site_id", siteIds);
      if (bErr) throw bErr;

      const buildings = (buildingRows || []) as { id: string; site_id: string }[];
      const buildingToSite = new Map<string, string>();
      buildings.forEach((b) => buildingToSite.set(b.id, b.site_id));

      if (buildings.length === 0) {
        setGroups(
          sites.map((s) => ({
            siteId: s.id,
            siteName: s.name,
            siteAddress: s.address,
            machineIds: [],
          })),
        );
        setLoading(false);
        return;
      }

      const buildingIds = buildings.map((b) => b.id);
      const { data: posRows, error: pErr } = await supabase
        .from("building_machine_positions")
        .select("machine_id, building_id")
        .in("building_id", buildingIds);
      if (pErr) throw pErr;

      const positions = (posRows || []) as { machine_id: string; building_id: string }[];

      const siteToMachines = new Map<string, Set<string>>();
      sites.forEach((s) => siteToMachines.set(s.id, new Set()));

      for (const row of positions) {
        const siteId = buildingToSite.get(row.building_id);
        if (!siteId || !idSet.has(row.machine_id)) continue;
        siteToMachines.get(siteId)?.add(row.machine_id);
      }

      const { data: sitePosRows, error: sitePosErr } = await supabase
        .from("site_machine_positions")
        .select("machine_id, site_id")
        .in("site_id", siteIds);
      if (!sitePosErr) {
        for (const row of (sitePosRows || []) as { machine_id: string; site_id: string }[]) {
          if (!idSet.has(row.machine_id)) continue;
          siteToMachines.get(row.site_id)?.add(row.machine_id);
        }
      }

      setGroups(
        sites.map((s) => ({
          siteId: s.id,
          siteName: s.name,
          siteAddress: s.address,
          machineIds: Array.from(siteToMachines.get(s.id) || []),
        })),
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load site groupings";
      setError(msg);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [idKey, visibleIdsStable]);

  useEffect(() => {
    void load();
  }, [load]);

  const unassignedMachineIds = useMemo(() => {
    const placed = new Set<string>();
    for (const g of groups) {
      for (const id of g.machineIds) placed.add(id);
    }
    return visibleIdsStable.filter((id) => !placed.has(id));
  }, [groups, visibleIdsStable]);

  return { groups, unassignedMachineIds, loading, error, reload: load };
}
