import React from "react";
import { QUOTE_TEMPLATES } from "@/config/qc1Catalog";
import {
  applyOffGridRatio,
  computeProduction,
  computeSavingsSummary,
  computeTotals,
  formatZar,
  getProduct,
  lineTotalExVat,
  unitSellPrice,
} from "@/lib/quoteCalculations";
import type { Quote } from "@/types/quotes";

type Props = {
  quote: Quote;
  printMode?: boolean;
};

export const QuoteProposalView: React.FC<Props> = ({ quote, printMode }) => {
  const totals = computeTotals(quote.lineItems, quote.pricing);
  const isSolar = quote.templateId === "solar_pv_v1";
  const templateLabel = QUOTE_TEMPLATES.find((t) => t.id === quote.templateId)?.label ?? "Quote";

  const production = applyOffGridRatio(
    computeProduction(quote.lineItems),
    quote.savings.clientDailyKwh,
  );
  const savings = isSolar ? computeSavingsSummary(quote, production) : null;

  const quoteLines = quote.lineItems
    .map((li) => {
      const p = getProduct(li.productId);
      if (!p || li.qty <= 0) return null;
      const price = unitSellPrice(p, quote.pricing);
      return { li, p, price, total: price * li.qty };
    })
    .filter(Boolean) as { li: (typeof quote.lineItems)[0]; p: NonNullable<ReturnType<typeof getProduct>>; price: number; total: number }[];

  return (
    <article
      className={[
        "mx-auto max-w-4xl text-[13px] leading-relaxed text-foreground",
        printMode ? "bg-white p-8" : "",
      ].join(" ")}
    >
      <header className="rounded-xl bg-primary px-6 py-5 text-primary-foreground">
        <p className="text-[11px] opacity-90">Crown Technologies · {templateLabel}</p>
        <h1 className="mt-1 font-serif text-2xl font-medium">
          {isSolar ? "Solar PV — investment proposal" : "Air-conditioning — investment proposal"}
        </h1>
        <p className="mt-2 text-sm opacity-95">
          Prepared for {quote.client.companyName || "Client"} · Ref {quote.client.salesReference || "—"}
        </p>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client</h2>
          <p className="mt-2 font-medium">{quote.client.companyName}</p>
          <p>Att: {quote.client.contactPerson}</p>
          <p>{quote.client.addressLine1}</p>
          {quote.client.addressLine2 ? <p>{quote.client.addressLine2}</p> : null}
          <p className="mt-2 text-muted-foreground">
            {quote.client.tel} · {quote.client.cell} · {quote.client.email}
          </p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</h2>
          <dl className="mt-2 space-y-1">
            <Row label="Quote date" value={quote.client.quoteDate} />
            <Row label="Sales person" value={quote.client.salesPerson} />
            {isSolar && savings ? (
              <>
                <Row label="Current daily usage" value={`${quote.savings.clientDailyKwh} kWh`} />
                <Row label="Projected daily PV" value={`${production.dailyPvKwh.toFixed(0)} kWh`} />
                <Row
                  label="Off-grid savings (approx.)"
                  value={`${(production.offGridSavingsRatio * 100).toFixed(0)}%`}
                />
              </>
            ) : null}
          </dl>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="border-b border-border pb-2 text-sm font-semibold text-primary">
          Option 1: Outright purchase — {isSolar ? "solar PV system" : "Alliance air-conditioning"}
        </h2>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Quote tab (from QC1): Part · Description · Comment · Qty · Price · Total
        </p>
        <table className="mt-4 w-full border-collapse text-xs">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-2">Part</th>
              <th className="py-2 pr-2">Description</th>
              <th className="py-2 pr-2">Comment</th>
              <th className="py-2 pr-2 text-right">Qty</th>
              <th className="py-2 text-right">Price</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {quoteLines.map(({ li, p, price, total }) => (
              <tr key={li.productId} className="border-b border-border/60">
                <td className="py-2 pr-2 align-top font-mono text-[10px]">{p.partCode ?? "—"}</td>
                <td className="py-2 pr-2 align-top font-medium">{p.name}</td>
                <td className="py-2 pr-2 align-top text-muted-foreground">{p.comment ?? "—"}</td>
                <td className="py-2 pr-2 text-right align-top">{li.qty}</td>
                <td className="py-2 text-right align-top">{formatZar(price)}</td>
                <td className="py-2 text-right align-top">{formatZar(total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="py-2 text-right font-medium">
                Subtotal ex VAT
              </td>
              <td className="py-2 text-right font-medium">{formatZar(totals.subtotalExVat)}</td>
            </tr>
            <tr>
              <td colSpan={5} className="py-2 text-right text-muted-foreground">
                VAT ({quote.pricing.vatPercent}%)
              </td>
              <td className="py-2 text-right">{formatZar(totals.vat)}</td>
            </tr>
            <tr>
              <td colSpan={5} className="py-2 text-right text-base font-semibold text-primary">
                Your investment (incl. VAT)
              </td>
              <td className="py-2 text-right text-base font-semibold text-primary">
                {formatZar(totals.totalInclVat)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      {isSolar && savings ? (
        <section className="mt-8 rounded-lg border border-border bg-muted/20 p-4">
          <h2 className="text-sm font-semibold text-primary">Savings analysis (planning estimate)</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Metric label="LCOE" value={`${formatZar(savings.lcoePerKwh, 2)}/kWh`} />
            <Metric label="Monthly saving (approx.)" value={formatZar(savings.monthlySavingZar)} />
            <Metric label="Payback (approx.)" value={`${savings.paybackYearsApprox.toFixed(1)} years`} />
          </div>
        </section>
      ) : null}

      {quote.notes ? (
        <section className="mt-6 rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
          <strong className="text-foreground">Notes:</strong> {quote.notes}
        </section>
      ) : null}

      <footer className="mt-10 border-t border-border pt-4 text-[10px] text-muted-foreground">
        Crown Technologies · VAT 4850202542 · Pricing valid 30 days from quote date unless stated otherwise.
      </footer>
    </article>
  );
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
