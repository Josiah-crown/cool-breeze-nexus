import { useCallback, useEffect, useState } from "react";
import { fetchPublicClientDemo, type PublicClientDemoPayload } from "@/lib/publicClientDemo";

export function usePublicClientDemo(enabled: boolean) {
  const [payload, setPayload] = useState<PublicClientDemoPayload | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPublicClientDemo();
      setPayload(data);
      if (!data) {
        setError(
          "No demo site is configured yet. Mark a site with is_public_client_demo or name “demo”, and add machines with “demo” in the name.",
        );
      }
    } catch (e: unknown) {
      setPayload(null);
      setError(e instanceof Error ? e.message : "Failed to load demo");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setPayload(null);
      setLoading(false);
      setError(null);
      return;
    }
    void load();
  }, [enabled, load]);

  return { payload, loading, error, reload: load };
}
