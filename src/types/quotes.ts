/** Quote workbook template — matches Excel QC1 → Quote flow */
export type QuoteTemplateId = "ac_v1" | "solar_pv_v1";

export type Qc1Category = {
  id: string;
  /** Column A category label (PV) or QC1 section header (AC) */
  label: string;
  templateId: QuoteTemplateId;
};

export type CompatibilityTag = string;

export type QuoteProduct = {
  id: string;
  templateId: QuoteTemplateId;
  /** QC1 category dropdown value */
  categoryId: string;
  /** Quote tab — Part column (QC1 col A) */
  partCode?: string;
  /** Quote tab — Description (QC1 col B) */
  name: string;
  /** Quote tab — Comment (QC1 col C) */
  comment?: string;
  listPrice: number;
  unitSellPrice?: number;
  defaultQty?: number;
  unitLabel?: string;
  wattsPerPanel?: number;
  kwhPerUnit?: number;
  kwRating?: number;
  tags: CompatibilityTag[];
};

export type QuoteLineItem = {
  productId: string;
  qty: number;
};

export type QuoteClient = {
  companyName: string;
  contactPerson: string;
  salesReference: string;
  tel: string;
  cell: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  salesPerson: string;
  quoteDate: string;
};

export type QuotePricingSettings = {
  markupPercent: number;
  safetyNetPercent: number;
  supplierDiscountPercent: number;
  vatPercent: number;
};

export type QuoteSavingsInputs = {
  clientDailyKwh: number;
  tariffPerKwh: number;
  annualTariffIncrease: number;
  panelDegradationPerYear: number;
  daysPerMonth: number;
};

export type Quote = {
  id: string;
  createdAt: string;
  updatedAt: string;
  templateId: QuoteTemplateId;
  client: QuoteClient;
  pricing: QuotePricingSettings;
  savings: QuoteSavingsInputs;
  lineItems: QuoteLineItem[];
  notes?: string;
};

/** @deprecated use Quote */
export type SolarQuote = Quote;

export type SavingsYearRow = {
  year: number;
  utilityBill: number;
  lcoeCost: number;
  annualSaving: number;
  cumulativeSaving: number;
};

export type QuoteTotals = {
  subtotalExVat: number;
  vat: number;
  totalInclVat: number;
};

export type QuoteProduction = {
  dailyPvKwh: number;
  annualPvKwh: number;
  offGridSavingsRatio: number;
};

export type SavingsSummary = {
  lcoePerKwh: number;
  monthlyUtilityZar: number;
  monthlyLcoeZar: number;
  monthlySavingZar: number;
  breakevenYears: number;
  paybackYearsApprox: number;
  forecast: SavingsYearRow[];
};
