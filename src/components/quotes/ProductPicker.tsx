import React, { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCategories } from "@/config/qc1Catalog";
import {
  formatZar,
  getIncompatibleReason,
  getProduct,
  getProductsForTemplate,
  isProductCompatible,
  unitSellPrice,
} from "@/lib/quoteCalculations";
import type { QuoteLineItem, QuotePricingSettings, QuoteProduct, QuoteTemplateId } from "@/types/quotes";
import { toast } from "sonner";

type Props = {
  templateId: QuoteTemplateId;
  lineItems: QuoteLineItem[];
  pricing: QuotePricingSettings;
  onChange: (items: QuoteLineItem[]) => void;
};

function selectedProducts(lineItems: QuoteLineItem[]): QuoteProduct[] {
  return lineItems.map((li) => getProduct(li.productId)).filter((p): p is QuoteProduct => Boolean(p));
}

export const ProductPicker: React.FC<Props> = ({ templateId, lineItems, pricing, onChange }) => {
  const categories = getCategories(templateId);
  const allProducts = getProductsForTemplate(templateId);
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id ?? "");

  const selected = selectedProducts(lineItems);
  const visibleProducts = useMemo(
    () => allProducts.filter((p) => p.categoryId === categoryId),
    [allProducts, categoryId],
  );
  const activeCategory = categories.find((c) => c.id === categoryId);

  const setQty = (productId: string, qty: number) => {
    const next = lineItems.filter((li) => li.productId !== productId);
    if (qty > 0) next.push({ productId, qty });
    onChange(next);
  };

  const getQty = (productId: string) => lineItems.find((li) => li.productId === productId)?.qty ?? 0;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <Label htmlFor="qc1-category" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          QC1 category
        </Label>
        <p className="mb-2 mt-1 text-xs text-muted-foreground">
          Same as Excel: pick a category first, then set quantities. Lines flow through to the Quote tab.
        </p>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger id="qc1-category" className="max-w-xl">
            <SelectValue placeholder="Select category…" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activeCategory ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Showing {visibleProducts.length} item(s) in <strong>{activeCategory.label}</strong>
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {visibleProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground sm:col-span-2">No products in this category yet.</p>
        ) : (
          visibleProducts.map((product) => {
            const qty = getQty(product.id);
            const compatible = isProductCompatible(product, selected);
            const reason = getIncompatibleReason(product, selected);
            const sell = unitSellPrice(product, pricing);

            return (
              <div
                key={product.id}
                className={[
                  "rounded-xl border p-4 transition-opacity",
                  compatible ? "border-border bg-card" : "border-amber-200/80 bg-muted/40 opacity-55",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {product.partCode ? (
                      <p className="font-mono text-[10px] text-muted-foreground">{product.partCode}</p>
                    ) : null}
                    <p className="text-sm font-medium leading-snug">{product.name}</p>
                    {product.comment ? (
                      <p className="mt-1 text-xs text-muted-foreground">{product.comment}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatZar(sell)} {product.unitLabel ? `· ${product.unitLabel}` : "· each"} ex VAT
                    </p>
                  </div>
                  {!compatible && reason ? (
                    <span
                      className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900"
                      title={reason}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      Check
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 flex items-end gap-2">
                  <div className="flex-1">
                    <Label htmlFor={`qty-${product.id}`} className="text-xs">
                      Qty
                    </Label>
                    <Input
                      id={`qty-${product.id}`}
                      type="number"
                      min={0}
                      step={templateId === "solar_pv_v1" && product.categoryId === "solar-inverters" ? 0.1 : 1}
                      value={qty || ""}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        const nextQty = Number.isFinite(v) ? Math.max(0, v) : 0;
                        if (!compatible && nextQty > 0) {
                          toast.warning(reason ?? "May be incompatible", {
                            description: "You can still add it — verify before sending the proposal.",
                          });
                        }
                        setQty(product.id, nextQty);
                      }}
                      className="h-9"
                    />
                  </div>
                  {qty > 0 ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setQty(product.id, 0)}>
                      Clear
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {lineItems.length > 0 ? (
        <div className="rounded-lg border border-dashed border-border p-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">On quote ({lineItems.length} lines)</p>
          <ul className="space-y-1 text-xs">
            {lineItems.map((li) => {
              const p = getProduct(li.productId);
              if (!p) return null;
              const cat = categories.find((c) => c.id === p.categoryId);
              return (
                <li key={li.productId} className="flex justify-between gap-2">
                  <span>
                    <span className="text-muted-foreground">{cat?.label ?? p.categoryId} · </span>
                    {p.partCode ? `${p.partCode} — ` : ""}
                    {p.name}
                  </span>
                  <span className="font-medium">× {li.qty}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
};
