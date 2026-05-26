import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DASHBOARD_UNASSIGNED_GROUP_KEY,
  type DashboardCardGroupKey,
} from "@/lib/dashboardCardOrder";

type OrderRow = { group_key: string; machine_id: string; sort_order: number };

export function useDashboardCardOrder(groupKeys: DashboardCardGroupKey[]) {
  const [ordersByGroup, setOrdersByGroup] = useState<Map<string, Map<string, number>>>(new Map());
  const [loading, setLoading] = useState(true);
  const hasLoadedOnceRef = useRef(false);

  const groupKey = useMemo(() => [...new Set(groupKeys)].sort().join("|"), [groupKeys]);

  const load = useCallback(async () => {
    const keys = groupKey.length === 0 ? [] : groupKey.split("|");
    if (keys.length === 0) {
      setOrdersByGroup(new Map());
      setLoading(false);
      return;
    }

    const background = hasLoadedOnceRef.current;
    if (!background) setLoading(true);

    try {
      const { data, error } = await supabase
        .from("site_dashboard_card_order")
        .select("group_key, machine_id, sort_order")
        .in("group_key", keys);

      if (error) throw error;

      const next = new Map<string, Map<string, number>>();
      for (const row of (data || []) as OrderRow[]) {
        if (!next.has(row.group_key)) next.set(row.group_key, new Map());
        next.get(row.group_key)!.set(row.machine_id, row.sort_order);
      }
      setOrdersByGroup(next);
      hasLoadedOnceRef.current = true;
    } catch {
      setOrdersByGroup(new Map());
    } finally {
      setLoading(false);
    }
  }, [groupKey]);

  useEffect(() => {
    hasLoadedOnceRef.current = false;
    void load();
  }, [load]);

  const getOrderMap = useCallback(
    (key: DashboardCardGroupKey) => ordersByGroup.get(key) ?? new Map<string, number>(),
    [ordersByGroup],
  );

  const saveOrder = useCallback(
    async (key: DashboardCardGroupKey, orderedMachineIds: string[]) => {
      const rows = orderedMachineIds.map((machine_id, index) => ({
        group_key: key,
        machine_id,
        sort_order: index,
      }));

      const { error: deleteErr } = await supabase.from("site_dashboard_card_order").delete().eq("group_key", key);
      if (deleteErr) throw deleteErr;

      if (rows.length > 0) {
        const { error: insertErr } = await supabase.from("site_dashboard_card_order").insert(rows);
        if (insertErr) throw insertErr;
      }

      const orderMap = new Map<string, number>();
      orderedMachineIds.forEach((id, index) => orderMap.set(id, index));
      setOrdersByGroup((prev) => {
        const next = new Map(prev);
        next.set(key, orderMap);
        return next;
      });
    },
    [],
  );

  return {
    loading,
    getOrderMap,
    saveOrder,
    reload: load,
    unassignedGroupKey: DASHBOARD_UNASSIGNED_GROUP_KEY,
  };
}
