import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getExternalSalesUrlForOffer } from "@/config/offers";

type BillingPeriod = "monthly" | "annual";

function formatZar(n: number) {
  return `R${Math.round(n).toLocaleString("en-ZA")}`;
}

export type PricingPlansSectionProps = {
  /** Full pricing page title vs flowing section on home */
  intro?: "full" | "compact";
  className?: string;
  deviceQtyInputId?: string;
};

const PricingPlansSection: React.FC<PricingPlansSectionProps> = ({
  intro = "full",
  className = "",
  deviceQtyInputId = "pricing-device-qty",
}) => {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [deviceQty, setDeviceQty] = useState<number>(1);

  const qty = Math.max(1, Number.isFinite(deviceQty) ? deviceQty : 1);
  const isVolume = qty >= 10;

  const standardUnitPrice = useMemo(() => {
    return period === "monthly" ? 99 : 999;
  }, [period]);

  const promoUnitPrice = useMemo(() => {
    if (isVolume) return period === "monthly" ? 39 : 390;
    return period === "monthly" ? 49 : 499;
  }, [isVolume, period]);

  const totalPromo = promoUnitPrice * qty;
  const totalStandard = standardUnitPrice * qty;

  const periodToggle = (
    <div className="flex items-center justify-center">
      <div className="inline-flex rounded-full border border-border bg-card p-1 shadow-[var(--shadow-sm)]">
        <button
          type="button"
          onClick={() => setPeriod("monthly")}
          className={[
            "rounded-full px-5 py-2 text-sm font-medium transition",
            period === "monthly"
              ? "bg-primary text-primary-foreground shadow-[var(--glow-primary)]"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setPeriod("annual")}
          className={[
            "rounded-full px-5 py-2 text-sm font-medium transition",
            period === "annual"
              ? "bg-primary text-primary-foreground shadow-[var(--glow-primary)]"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          Annual{" "}
          <span className="ml-2 rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 text-[11px] text-warning">
            save
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <div className={className}>
      {intro === "full" && (
        <header className="mx-auto max-w-2xl text-center">
          <div className="font-mono text-[11px] uppercase tracking-wider text-accent">Cmonitor by Crown Technologies</div>
          <h2 className="mt-4 font-serif text-3xl font-medium tracking-tight sm:text-5xl">
            Monitoring pricing + service plans.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] font-light leading-relaxed text-muted-foreground">
            Choose the cover that matches your operational requirements. Monitoring purchases are completed on{" "}
            <a
              href="https://crowntechnologies.co.za/booking"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              Crown Technologies
            </a>{" "}
            (booking and payment are not processed in this app).
          </p>
          <div className="mt-8">{periodToggle}</div>
        </header>
      )}

      {intro === "compact" && (
        <header className="mx-auto max-w-2xl text-center">
          <div className="font-mono text-[11px] uppercase tracking-wider text-accent">Plans & pricing</div>
          <h2 className="mt-3 font-serif text-2xl font-medium tracking-tight sm:text-3xl">
            Monitoring pricing + service plans
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] font-light leading-relaxed text-muted-foreground">
            Choose the cover that matches your site. Purchases are completed on{" "}
            <a
              href="https://crowntechnologies.co.za/booking"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              Crown Technologies
            </a>
            .
          </p>
          <div className="mt-6">{periodToggle}</div>
        </header>
      )}

      <section className="mt-10 grid gap-5 md:mt-12 md:grid-cols-3 md:items-start">
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow)]">
          <div className="border-b border-border p-7">
            <div className="min-h-[9.5rem]">
              <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Essential SLA · Maintenance plan
              </div>
              <h3 className="mt-3 font-serif text-2xl font-medium">Crown Maintenance Plan</h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
                Scheduled servicing on your equipment — slightly cheaper than ad hoc maintenance, plus priority scheduling
                when breakdowns occur.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <Button asChild className="w-full bg-foreground text-primary-foreground hover:bg-foreground/90">
                <a href="mailto:info@crowntechnologies.co.za?subject=Essential%20SLA%20(Maintenance%20Plan)%20Enquiry">
                  Enquire about Essential SLA ↗
                </a>
              </Button>
              <p className="text-center text-xs font-light text-muted-foreground">
                Contract terms vary · CPI escalated annually
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col p-7">
            <div>
              <div className="text-xs text-muted-foreground">Enquire for pricing</div>
              <div className="mt-2 inline-flex rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground/80">
                Scoped per site and equipment mix.
              </div>
            </div>

            <div className="mt-6 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">What’s included</div>
            <ul className="mt-4 space-y-2 text-sm font-light text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-1 h-4 w-4 rounded-full bg-primary/15" />
                Scheduled annual servicing (scope per site)
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-4 w-4 rounded-full bg-primary/15" />
                Priority scheduling when breakdowns occur
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-4 w-4 rounded-full bg-primary/15" />
                Service history and incident log on request
              </li>
            </ul>
          </div>
        </div>

        <div className="relative flex flex-col overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-[var(--shadow-lg)]">
          <div className="border-b border-border p-7">
            <div className="min-h-[9.5rem]">
              <div className="font-mono text-[11px] uppercase tracking-wider text-accent">
                Cmonitor IoT · Crown Technologies booking
              </div>
              <h3 className="mt-3 font-serif text-2xl font-medium">Cmonitor Monitoring</h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
                Remote monitoring included. Faster response. Built to catch faults early so repairs can happen at the next
                service — not during a breakdown.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                <a href={getExternalSalesUrlForOffer("monitoring")} target="_blank" rel="noreferrer">
                  Book assessment on Crown Technologies
                </a>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <a href="mailto:info@crowntechnologies.co.za?subject=Cmonitor%20IoT%20Monitoring%20Enquiry">
                  Enquire by email ↗
                </a>
              </Button>
            </div>
          </div>

          <div className="flex flex-1 flex-col p-7">
            <div className="rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground">
              <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Included</div>
              <ul className="mt-2 space-y-1 text-sm font-light">
                <li>Priority scheduling when breakdowns occur</li>
                <li>Annual reminders to service</li>
                <li>Historical monitoring data to foresee breakdowns</li>
                <li>Fault alerts</li>
                <li>5% discount on services/parts/labour/travel</li>
                <li>Free installation (worth R495)</li>
              </ul>
            </div>

            <div className="mt-6 rounded-xl border border-border bg-muted p-4 text-xs font-light text-muted-foreground">
              <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Disclaimers</div>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Device always remains the property of Cmonitor.</li>
                <li>Cancellation incurs a R495 deinstallation fee.</li>
                <li>All labour outside monitoring and online services is charged for.</li>
              </ul>
            </div>

            <div className="mt-6 rounded-xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-foreground">
              <span className="font-semibold">Special:</span> First 100 devices installed at{" "}
              <span className="font-semibold">{formatZar(period === "monthly" ? 49 : 499)}</span> per device /{" "}
              {period === "monthly" ? "month" : "year"}.
              <span className="ml-2 text-muted-foreground">
                (10+ devices: {formatZar(period === "monthly" ? 39 : 390)} / device)
              </span>
            </div>

            <div className="mt-4 flex items-end gap-3">
              <div className="flex-1">
                <Label htmlFor={deviceQtyInputId} className="text-foreground">
                  Number of devices
                </Label>
                <Input
                  id={deviceQtyInputId}
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setDeviceQty(Number(e.target.value || 1))}
                  className="mt-2 border-border bg-background text-foreground"
                />
                <div className="mt-2 text-xs text-muted-foreground">
                  {isVolume ? "Volume pricing applied (10+ devices)." : "Promo pricing applied (limited units)."}
                </div>
              </div>
              <div className="w-44 text-right">
                <div className="text-xs text-muted-foreground">Total ({period})</div>
                <div className="mt-1 text-3xl font-semibold tracking-tight">{formatZar(totalPromo)}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Standard: <span className="line-through">{formatZar(totalStandard)}</span>
                </div>
                {period === "annual" && qty === 10 && (
                  <div className="mt-1 text-xs text-muted-foreground">10 units: {formatZar(3900)} / year</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow)]">
          <div className="border-b border-border p-7">
            <div className="min-h-[9.5rem]">
              <div className="flex items-center justify-between gap-3">
                <div className="font-mono text-[11px] uppercase tracking-wider text-warning">
                  Enterprise SLA · Comfort plan
                </div>
                <div className="rounded-full border border-warning/25 bg-warning/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-warning">
                  Full SLA
                </div>
              </div>
              <h3 className="mt-3 font-serif text-2xl font-medium">Enterprise SLA</h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
                Contractual coverage and response commitments for environments where downtime becomes a compliance or
                revenue event.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                <a href="mailto:info@crowntechnologies.co.za?subject=Enterprise%20SLA%20Enquiry">
                  Enquire about Enterprise SLA ↗
                </a>
              </Button>
              <p className="text-center text-xs font-light text-muted-foreground">
                Typically 36–60 months · Terms depend on site scope
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col p-7">
            <div>
              <div className="text-xs text-muted-foreground">Enquire for pricing</div>
              <div className="mt-2 inline-flex rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground/80">
                SLA response + repair windows in writing.
              </div>
            </div>

            <div className="mt-6 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">What’s included</div>
            <ul className="mt-4 space-y-2 text-sm font-light text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-1 h-4 w-4 rounded-full bg-warning/15" />
                Priority scheduling + escalation path
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-4 w-4 rounded-full bg-warning/15" />
                Annual preventative servicing reminders and planning
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-4 w-4 rounded-full bg-warning/15" />
                Historical monitoring & trends to prevent breakdowns
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-border bg-card p-6 text-sm font-light text-muted-foreground shadow-[var(--shadow-sm)]">
        <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Why Cmonitor</div>
        <p className="mt-3">
          Historical status and monitoring data allow us to foresee breakdowns and potentially repair at the next service
          rather than waiting for the breakdown to occur and incur bigger costs.
        </p>
      </section>
    </div>
  );
};

export default PricingPlansSection;
