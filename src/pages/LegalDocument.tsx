import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import TopTaskbar from "@/components/TopTaskbar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLegalCompliance } from "@/contexts/LegalComplianceContext";
import { latestDocByKey, missingRequiredAcceptances } from "@/lib/requiredLegal";
import { toast } from "sonner";

type DocRow = {
  document_key: string;
  version: number;
  title: string;
  content_md: string;
};

const LegalDocument: React.FC = () => {
  const { key } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { docs, acceptances, reload, state: legalState } = useLegalCompliance();
  const [doc, setDoc] = useState<DocRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [signing, setSigning] = useState(false);

  const latestMap = useMemo(() => latestDocByKey(docs), [docs]);
  const needsSign = useMemo(() => {
    if (!user || !key || legalState === "loading") return false;
    return missingRequiredAcceptances(docs, acceptances).some((m) => m.key === key);
  }, [user, key, docs, acceptances, legalState]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!key) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("legal_documents")
          .select("document_key, version, title, content_md")
          .eq("document_key", key)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (!cancelled && data) {
          setDoc({
            document_key: String(data.document_key),
            version: Number(data.version),
            title: String(data.title),
            content_md: String(data.content_md),
          });
        } else if (!cancelled) {
          setDoc(null);
        }
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to load document");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [key]);

  const signDocument = async () => {
    if (!user || !doc) return;
    const latest = latestMap.get(doc.document_key);
    if (!latest) {
      toast.error("Document not available");
      return;
    }
    setSigning(true);
    try {
      const { error } = await supabase.from("legal_acceptances").insert({
        user_id: user.id,
        document_key: latest.document_key,
        document_version: latest.version,
        user_agent: navigator.userAgent,
      });
      if (error) throw error;
      toast.success("Agreement signed");
      await reload();
      const updatedAcceptances = [
        ...acceptances.filter(
          (a) => !(a.document_key === latest.document_key && a.document_version === latest.version),
        ),
        {
          document_key: latest.document_key,
          document_version: latest.version,
          accepted_at: new Date().toISOString(),
        },
      ];
      if (missingRequiredAcceptances(docs, updatedAcceptances).length === 0) {
        navigate("/dashboard/sites", { replace: true });
      } else {
        navigate("/account", { replace: true, state: { requireLegal: true } });
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to record acceptance");
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#1A2B1C]">
      <TopTaskbar subtitle="Legal" />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {isLoading ? (
          <div className="text-sm text-[#4A6B4D]">Loading…</div>
        ) : !doc ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-sm text-[#4A6B4D]">
            <p className="font-semibold text-[#1A2B1C]">Document not published</p>
            <p className="mt-2">
              No row exists in <code className="text-xs">legal_documents</code> for key{" "}
              <code className="text-xs">{key}</code>. An administrator must run{" "}
              <code className="text-xs">scripts/sql/BOOTSTRAP_LEGAL_TABLES_AND_SEED.sql</code> in Supabase before clients can read
              or sign this agreement.
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link to="/account">Back to account</Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-black/10 bg-white p-7">
            <div className="font-mono text-[11px] uppercase tracking-wider text-[#7A9B7D]">
              {doc.document_key} · v{doc.version}
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{doc.title}</h1>
            <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-[#4A6B4D]">{doc.content_md}</div>

            {user ? (
              <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-black/10 pt-6">
                {needsSign ? (
                  <>
                    <p className="w-full text-sm text-[#4A6B4D]">
                      Reading this document does not record acceptance. Use <strong>Sign agreement</strong> to continue
                      to the dashboard.
                    </p>
                    <Button
                      className="bg-[#0D2211] text-white hover:bg-[#1A3A1E]"
                      disabled={signing}
                      onClick={() => void signDocument()}
                    >
                      {signing ? "Signing…" : "Sign agreement"}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-[#4A6B4D]">You have signed this document (current version).</p>
                )}
                <Button variant="outline" asChild>
                  <Link to="/account">Back to account</Link>
                </Button>
              </div>
            ) : (
              <p className="mt-8 text-sm text-[#4A6B4D]">
                <Link className="text-[#3D9E40] underline" to="/login">
                  Sign in
                </Link>{" "}
                to accept agreements before using the dashboard.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default LegalDocument;
