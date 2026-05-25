import type { Quote, QuoteTemplateId } from "@/types/quotes";
import { DEFAULT_PRICING, DEFAULT_SAVINGS_INPUTS } from "@/config/quoteDefaults";

const STORAGE_KEY = "crown_quotes_v2";

function newId(): string {
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyQuote(templateId: QuoteTemplateId = "ac_v1"): Quote {
  const now = new Date().toISOString();
  return {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    templateId,
    client: {
      companyName: "",
      contactPerson: "",
      salesReference: "",
      tel: "",
      cell: "",
      email: "",
      addressLine1: "",
      addressLine2: "",
      salesPerson: "",
      quoteDate: new Date().toISOString().slice(0, 10),
    },
    pricing: { ...DEFAULT_PRICING },
    savings: { ...DEFAULT_SAVINGS_INPUTS },
    lineItems: [],
    notes: "",
  };
}

function migrateQuote(raw: Record<string, unknown>): Quote {
  const templateId = ((raw.templateId as QuoteTemplateId | undefined) ??
    (raw.systemType === "solar_pv" ? "solar_pv_v1" : "ac_v1")) as QuoteTemplateId;
  return {
    ...(raw as unknown as Quote),
    templateId,
  };
}

export function loadAllQuotes(): Quote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacy = localStorage.getItem("crown_solar_quotes_v1");
      if (legacy) {
        const parsed = JSON.parse(legacy) as Record<string, unknown>[];
        if (Array.isArray(parsed)) {
          const migrated = parsed.map(migrateQuote);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
          return migrated;
        }
      }
      return [];
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>[];
    return Array.isArray(parsed) ? parsed.map(migrateQuote) : [];
  } catch {
    return [];
  }
}

export function loadQuote(id: string): Quote | null {
  return loadAllQuotes().find((q) => q.id === id) ?? null;
}

export function saveQuote(quote: Quote): void {
  const all = loadAllQuotes();
  const idx = all.findIndex((q) => q.id === quote.id);
  const updated = { ...quote, updatedAt: new Date().toISOString() };
  if (idx >= 0) all[idx] = updated;
  else all.unshift(updated);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function deleteQuote(id: string): void {
  const all = loadAllQuotes().filter((q) => q.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/** Solar PV — 100kW Gauteng example */
export function createSolarDemoQuote(): Quote {
  const q = createEmptyQuote("solar_pv_v1");
  q.client = {
    companyName: "Example Client (Pty) Ltd",
    contactPerson: "Site Contact",
    salesReference: "PV-100KW-GP",
    tel: "011 000 0000",
    cell: "082 000 0000",
    email: "contact@example.co.za",
    addressLine1: "Industrial site, Gauteng",
    addressLine2: "",
    salesPerson: "Crown Sales",
    quoteDate: new Date().toISOString().slice(0, 10),
  };
  q.lineItems = [
    { productId: "panel-ja-700", qty: 96 },
    { productId: "mount-flat-concrete", qty: 96 },
    { productId: "inv-fox-30k-3ph", qty: 3.4 },
    { productId: "bat-fox-10k-hv", qty: 16 },
    { productId: "acc-battery-fuse", qty: 2 },
  ];
  q.savings.clientDailyKwh = 800;
  return q;
}

/** AC template — sample Alliance mid-wall line */
export function createAcDemoQuote(): Quote {
  const q = createEmptyQuote("ac_v1");
  q.client = {
    companyName: "Example Gym (Pty) Ltd",
    contactPerson: "Facilities Manager",
    salesReference: "AC-GYM-001",
    tel: "011 000 0000",
    cell: "082 000 0000",
    email: "facilities@example.co.za",
    addressLine1: "Site address",
    addressLine2: "",
    salesPerson: "Crown Sales",
    quoteDate: new Date().toISOString().slice(0, 10),
  };
  q.lineItems = [
    { productId: "ac-fcmi-12-26", qty: 2 },
    { productId: "ac-fousi18-r32-34", qty: 1 },
  ];
  return q;
}

/** @deprecated use createSolarDemoQuote */
export const createDemoQuote = createSolarDemoQuote;
