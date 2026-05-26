import React, { createContext, useContext, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRequiredLegalCompliance, type LegalComplianceState } from "@/hooks/useRequiredLegalCompliance";
import type { LegalAcceptanceRow, LegalDocumentRow } from "@/lib/requiredLegal";

type LegalComplianceContextValue = {
  state: LegalComplianceState;
  docs: LegalDocumentRow[];
  acceptances: LegalAcceptanceRow[];
  reload: () => Promise<void>;
  skipLegalGate: boolean;
};

const LegalComplianceContext = createContext<LegalComplianceContextValue | undefined>(undefined);

export const LegalComplianceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const skipLegalGate = user?.role === "super_admin";
  const { state, docs, acceptances, reload } = useRequiredLegalCompliance(skipLegalGate ? undefined : user?.id);

  const value = useMemo(
    () => ({ state, docs, acceptances, reload, skipLegalGate }),
    [state, docs, acceptances, reload, skipLegalGate],
  );

  return <LegalComplianceContext.Provider value={value}>{children}</LegalComplianceContext.Provider>;
};

export function useLegalCompliance() {
  const ctx = useContext(LegalComplianceContext);
  if (!ctx) {
    throw new Error("useLegalCompliance must be used within LegalComplianceProvider");
  }
  return ctx;
}
