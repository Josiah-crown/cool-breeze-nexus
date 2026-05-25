import type {
  Quote,
  QuoteLineItem,
  QuotePricingSettings,
  QuoteProduct,
  QuoteProduction,
  QuoteTemplateId,
  QuoteTotals,
  SavingsSummary,
  SavingsYearRow,
} from "@/types/quotes";
import { ALL_QC1_PRODUCTS, getProducts } from "@/config/qc1Catalog";

const PRODUCT_MAP = new Map(ALL_QC1_PRODUCTS.map((p) => [p.id, p]));

export function getProduct(id: string): QuoteProduct | undefined {
  return PRODUCT_MAP.get(id);
}

export function getProductsForTemplate(templateId: QuoteTemplateId): QuoteProduct[] {
  return getProducts(templateId);
}

export function unitSellPrice(product: QuoteProduct, pricing: QuotePricingSettings): number {
  if (product.unitSellPrice != null) return product.unitSellPrice;
  const cost = product.listPrice * (1 - pricing.supplierDiscountPercent / 100);
  const withMarkup = cost * (1 + pricing.markupPercent / 100);
  return withMarkup * (1 + pricing.safetyNetPercent / 100);
}

export function lineTotalExVat(
  product: QuoteProduct,
  qty: number,
  pricing: QuotePricingSettings,
): number {
  return unitSellPrice(product, pricing) * qty;
}

export function computeTotals(lineItems: QuoteLineItem[], pricing: QuotePricingSettings): QuoteTotals {
  let subtotalExVat = 0;
  for (const li of lineItems) {
    const p = getProduct(li.productId);
    if (!p || li.qty <= 0) continue;
    subtotalExVat += lineTotalExVat(p, li.qty, pricing);
  }
  const vat = subtotalExVat * (pricing.vatPercent / 100);
  return { subtotalExVat, vat, totalInclVat: subtotalExVat + vat };
}

export function computeProduction(lineItems: QuoteLineItem[], sunHoursPerDay = 5): QuoteProduction {
  let panelCount = 0;
  let totalWatts = 0;
  for (const li of lineItems) {
    const p = getProduct(li.productId);
    if (!p?.wattsPerPanel) continue;
    panelCount += li.qty;
    totalWatts += p.wattsPerPanel * li.qty;
  }
  const dailyPvKwh = panelCount > 0 ? (totalWatts / 1000) * sunHoursPerDay : 0;
  return { dailyPvKwh, annualPvKwh: dailyPvKwh * 365, offGridSavingsRatio: 0 };
}

export function applyOffGridRatio(production: QuoteProduction, clientDailyKwh: number): QuoteProduction {
  const ratio = clientDailyKwh > 0 ? Math.min(1, production.dailyPvKwh / clientDailyKwh) : 0;
  return { ...production, offGridSavingsRatio: ratio };
}

export function computeSavingsSummary(
  quote: Pick<Quote, "lineItems" | "pricing" | "savings">,
  production: QuoteProduction,
  years = 25,
): SavingsSummary {
  const { savings, pricing, lineItems } = quote;
  const totals = computeTotals(lineItems, pricing);
  const systemCostExVat = totals.subtotalExVat;
  const monthlyKwh = production.dailyPvKwh * savings.daysPerMonth;
  const annualPvKwh = monthlyKwh * 12;
  const lcoePerKwh = annualPvKwh > 0 ? systemCostExVat / annualPvKwh : 0;
  const monthlyUtilityZar = savings.clientDailyKwh * savings.daysPerMonth * savings.tariffPerKwh;
  const monthlyLcoeZar = monthlyKwh * lcoePerKwh;
  const monthlySavingZar = Math.max(0, monthlyUtilityZar - monthlyLcoeZar);
  const annualUsageKwh = savings.clientDailyKwh * 365;
  const breakevenYears =
    annualUsageKwh > 0 ? systemCostExVat / (annualUsageKwh * savings.tariffPerKwh) : 0;
  const paybackYearsApprox =
    monthlySavingZar > 0 ? systemCostExVat / (monthlySavingZar * 12) : Number.POSITIVE_INFINITY;

  const forecast: SavingsYearRow[] = [];
  let cumulative = 0;
  let utilityBill = annualUsageKwh * savings.tariffPerKwh;
  let pvDaily = production.dailyPvKwh;

  for (let y = 1; y <= years; y++) {
    if (y > 1) {
      utilityBill *= 1 + savings.annualTariffIncrease;
      pvDaily *= 1 - savings.panelDegradationPerYear;
    }
    const yearPvKwh = pvDaily * 365;
    const lcoeCost = yearPvKwh * lcoePerKwh;
    const annualSaving = Math.max(0, utilityBill - lcoeCost);
    cumulative += annualSaving;
    forecast.push({ year: y, utilityBill, lcoeCost, annualSaving, cumulativeSaving: cumulative });
  }

  return {
    lcoePerKwh,
    monthlyUtilityZar,
    monthlyLcoeZar,
    monthlySavingZar,
    breakevenYears,
    paybackYearsApprox,
    forecast,
  };
}

function hasTag(p: QuoteProduct, tag: string) {
  return p.tags.includes(tag);
}

function selectedUnitProducts(selected: QuoteProduct[]): QuoteProduct[] {
  return selected.filter((p) =>
    p.tags.some((t) => t.startsWith("unit-type:") || t.startsWith("refrigerant:")),
  );
}

/** Grey-out incompatible picks — still selectable (matches Excel workflow) */
export function getIncompatibleReason(
  product: QuoteProduct,
  selectedProducts: QuoteProduct[],
): string | null {
  const selected = selectedProducts.filter((p) => p.id !== product.id);
  if (!selected.length) return null;

  // —— Solar PV (QC1 col A categories) ——
  const inverter = selected.find((p) => p.categoryId === "solar-inverters");
  if (product.categoryId === "solar-batteries" && inverter) {
    const invV = inverter.tags.includes("high-voltage") ? "high-voltage" : "low-voltage";
    const batV = product.tags.includes("high-voltage")
      ? "high-voltage"
      : product.tags.includes("low-voltage")
        ? "low-voltage"
        : null;
    if (invV && batV && invV !== batV) {
      return `Battery voltage (${batV}) does not match inverter (${invV})`;
    }
    const invBrand = ["fox", "deye", "sunsynk"].find((b) => inverter.tags.includes(b));
    const batBrand = ["fox", "deye", "sunsynk"].find((b) => product.tags.includes(b));
    if (invBrand && batBrand && invBrand !== batBrand) {
      return `Brand: ${batBrand} battery with ${invBrand} inverter`;
    }
  }

  // —— AC template (refrigerant + unit line) ——
  const units = selectedUnitProducts(selected);
  if (units.length && (hasTag(product, "refrigerant:r32") || hasTag(product, "refrigerant:r410"))) {
    const selR32 = units.some((p) => hasTag(p, "refrigerant:r32"));
    const selR410 = units.some((p) => hasTag(p, "refrigerant:r410"));
    if (selR32 && hasTag(product, "refrigerant:r410")) {
      return "R410 unit/piping does not match R32 selection";
    }
    if (selR410 && hasTag(product, "refrigerant:r32")) {
      return "R32 unit/piping does not match R410 selection";
    }
  }
  if (hasTag(product, "line:refrigerant-piping")) {
    const selR32 = units.some((p) => hasTag(p, "refrigerant:r32"));
    const selR410 = units.some((p) => hasTag(p, "refrigerant:r410"));
    if (selR32 && hasTag(product, "refrigerant:r410")) {
      return "Piping refrigerant does not match R32 units on quote";
    }
    if (selR410 && hasTag(product, "refrigerant:r32")) {
      return "Piping refrigerant does not match R410 units on quote";
    }
  }

  return null;
}

export function isProductCompatible(product: QuoteProduct, selectedProducts: QuoteProduct[]): boolean {
  return getIncompatibleReason(product, selectedProducts) === null;
}

export function formatZar(amount: number, decimals = 0): string {
  return `R${amount.toLocaleString("en-ZA", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
