/**
 * Required legal documents for platform use (must match Account + any gate).
 */
export const REQUIRED_DOC_KEYS = ["privacy_policy", "user_agreement", "data_use_agreement", "product_agreement"] as const;

export type RequiredDocKey = (typeof REQUIRED_DOC_KEYS)[number];

export type LegalDocumentRow = {
  document_key: string;
  version: number;
  title: string;
};

export type LegalAcceptanceRow = {
  document_key: string;
  document_version: number;
  accepted_at: string;
};

/** True when all four required keys exist in legal_documents (any version row per key). */
export function allRequiredDocumentsPublished(docs: LegalDocumentRow[]): boolean {
  const latest = latestDocByKey(docs);
  return REQUIRED_DOC_KEYS.every((key) => latest.has(key));
}

export function latestDocByKey(docs: LegalDocumentRow[]): Map<string, LegalDocumentRow> {
  const map = new Map<string, LegalDocumentRow>();
  for (const d of docs) {
    const existing = map.get(d.document_key);
    if (!existing || d.version > existing.version) map.set(d.document_key, d);
  }
  return map;
}

export function acceptanceByCompositeKey(acceptances: LegalAcceptanceRow[]): Map<string, LegalAcceptanceRow> {
  const map = new Map<string, LegalAcceptanceRow>();
  for (const a of acceptances) map.set(`${a.document_key}:${a.document_version}`, a);
  return map;
}

export function missingRequiredAcceptances(
  docs: LegalDocumentRow[],
  acceptances: LegalAcceptanceRow[],
): { key: string; title: string; version: number }[] {
  const latest = latestDocByKey(docs);
  const accMap = acceptanceByCompositeKey(acceptances);
  const missing: { key: string; title: string; version: number }[] = [];
  for (const key of REQUIRED_DOC_KEYS) {
    const doc = latest.get(key);
    if (!doc) {
      missing.push({ key, title: key, version: 1 });
      continue;
    }
    if (!accMap.has(`${doc.document_key}:${doc.version}`)) {
      missing.push({ key: doc.document_key, title: doc.title, version: doc.version });
    }
  }
  return missing;
}

/** Latest required docs the user has fully accepted (for “Signed” list on Account). */
export function signedRequiredAgreements(
  docs: LegalDocumentRow[],
  acceptances: LegalAcceptanceRow[],
): { key: string; title: string; version: number; signedAt: string }[] {
  const latest = latestDocByKey(docs);
  const accMap = acceptanceByCompositeKey(acceptances);
  const out: { key: string; title: string; version: number; signedAt: string }[] = [];
  for (const key of REQUIRED_DOC_KEYS) {
    const doc = latest.get(key);
    if (!doc) continue;
    const row = accMap.get(`${doc.document_key}:${doc.version}`);
    if (row) {
      out.push({
        key: doc.document_key,
        title: doc.title,
        version: doc.version,
        signedAt: row.accepted_at,
      });
    }
  }
  return out;
}
