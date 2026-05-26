import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ManagedAccountRow = {
  id: string;
  role: "super_admin" | "company" | "installer" | "client";
  name: string;
  email: string;
  business_name: string | null;
  cell_number: string | null;
  company_id: string | null;
  company_name: string | null;
  installer_id: string | null;
  installer_name: string | null;
  machine_count: number;
  site_count: number;
  assigned_at: string | null;
  assigned_by: string | null;
};

type DirectoryPayload = {
  viewer_role: "super_admin" | "company";
  accounts: ManagedAccountRow[];
};

export function useManagedAccountDirectory(enabled: boolean) {
  const [accounts, setAccounts] = useState<ManagedAccountRow[]>([]);
  const [viewerRole, setViewerRole] = useState<"super_admin" | "company" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setAccounts([]);
      setViewerRole(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_managed_account_directory");
      if (rpcError) throw rpcError;
      const payload = data as DirectoryPayload | null;
      setViewerRole(payload?.viewer_role ?? null);
      setAccounts(Array.isArray(payload?.accounts) ? payload.accounts : []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load accounts";
      setError(msg);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { accounts, viewerRole, loading, error, reload: load };
}
