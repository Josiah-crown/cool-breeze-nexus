import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import TopTaskbar from "@/components/TopTaskbar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type DocRow = {
  document_key: string;
  version: number;
  title: string;
  content_md: string;
};

const LegalDocument: React.FC = () => {
  const { key } = useParams();
  const [doc, setDoc] = useState<DocRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        if (!cancelled) setDoc((data as any) ?? null);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load document");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return (
    <div className="min-h-screen bg-white text-[#1A2B1C]">
      <TopTaskbar subtitle="Legal" />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {isLoading ? (
          <div className="text-sm text-[#4A6B4D]">Loading…</div>
        ) : !doc ? (
          <div className="text-sm text-[#4A6B4D]">Document not found.</div>
        ) : (
          <div className="rounded-2xl border border-black/10 bg-white p-7">
            <div className="font-mono text-[11px] uppercase tracking-wider text-[#7A9B7D]">
              {doc.document_key} · v{doc.version}
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{doc.title}</h1>
            <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-[#4A6B4D]">{doc.content_md}</div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LegalDocument;

