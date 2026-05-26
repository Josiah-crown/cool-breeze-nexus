import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  type LegalAcceptanceRow,
  type LegalDocumentRow,
  missingRequiredAcceptances,
} from "@/lib/requiredLegal";

export type LegalComplianceState = "loading" | "complete" | "incomplete";

/**
 * Loads versioned legal docs + user acceptances. Used for first-login gate and Account.
 */
export function useRequiredLegalCompliance(userId: string | undefined) {
  const [state, setState] = useState<LegalComplianceState>("loading");
  const [docs, setDocs] = useState<LegalDocumentRow[]>([]);
  const [acceptances, setAcceptances] = useState<LegalAcceptanceRow[]>([]);

  const load = useCallback(async () => {
    if (!userId) {
      setDocs([]);
      setAcceptances([]);
      setState("complete");
      return;
    }
    setState("loading");
    try {
      const [{ data: docsData, error: docsError }, { data: accData, error: accError }] = await Promise.all([
        supabase.from("legal_documents").select("document_key, version, title"),
        supabase.from("legal_acceptances").select("document_key, document_version, accepted_at").eq("user_id", userId),
      ]);
      if (docsError) throw docsError;
      if (accError) throw accError;
      const d = (docsData || []).map((row) => ({
        document_key: String((row as LegalDocumentRow).document_key),
        version: Number((row as LegalDocumentRow).version),
        title: String((row as LegalDocumentRow).title),
      })) as LegalDocumentRow[];
      const a = (accData || []).map((row) => ({
        document_key: String((row as LegalAcceptanceRow).document_key),
        document_version: Number((row as LegalAcceptanceRow).document_version),
        accepted_at: String((row as LegalAcceptanceRow).accepted_at),
      })) as LegalAcceptanceRow[];
      setDocs(d);
      setAcceptances(a);
      const missing = missingRequiredAcceptances(d, a);
      setState(missing.length === 0 ? "complete" : "incomplete");
    } catch {
      setState("incomplete");
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, docs, acceptances, reload: load };
}
