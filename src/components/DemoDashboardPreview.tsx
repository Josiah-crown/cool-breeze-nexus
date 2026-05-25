import React from "react";
import { Link } from "react-router-dom";
import { getExternalSalesUrlForOffer } from "@/config/offers";
import { Button } from "@/components/ui/button";

/** Mirrors provisioned demo set: one machine per UI type (evaporative / heat pump / air conditioner). */
const MOCK_MACHINES = [
  {
    id: "demo-1",
    label: "Demo · Cirrus evaporative",
    state: "ok" as const,
    inlet: "22.1 °C",
    outlet: "18.4 °C",
    power: "1.2 kW",
  },
  {
    id: "demo-2",
    label: "Demo · Alliance heat pump",
    state: "warn" as const,
    inlet: "19.8 °C",
    outlet: "21.2 °C",
    power: "2.4 kW",
  },
  {
    id: "demo-3",
    label: "Demo · CoolBreeze air conditioner",
    state: "ok" as const,
    inlet: "23.0 °C",
    outlet: "17.9 °C",
    power: "0.9 kW",
  },
];

type DemoDashboardPreviewProps = {
  /** Inside dashboard layout card — tighter padding, no duplicate page chrome */
  embedded?: boolean;
};

/** Sample dashboard shown when not logged in (home used to show this; now lives on /dashboard). */
const DemoDashboardPreview: React.FC<DemoDashboardPreviewProps> = ({ embedded = false }) => {
  const partnerCheckoutUrl = getExternalSalesUrlForOffer("monitoring");

  return (
    <section className={embedded ? "p-4 sm:p-6" : "mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 sm:pb-14 sm:pt-10"}>
      <div
        className={
          embedded
            ? "flex flex-col gap-3 border-b border-border pb-6"
            : "flex flex-col gap-4 border-b border-border pb-8 md:flex-row md:items-end md:justify-between"
        }
      >
        <div>
          <div className="font-mono text-[11px] uppercase tracking-wider text-accent">Demo · sample data</div>
          <h2 className={embedded ? "mt-1 text-lg font-semibold text-foreground" : "mt-2 font-sans text-2xl font-extrabold tracking-tight sm:text-3xl"}>
            {embedded ? "Machines (preview)" : "Cmonitor demo dashboard"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            This is example data only. After Crown commissions your devices, log in to see your real machines — nothing
            fake to clean up later.
          </p>
        </div>
        {!embedded && (
          <div className="flex flex-wrap gap-2 md:justify-end">
            <Button asChild variant="outline" className="border-border">
              <Link to="/login?source=dashboard">Log in</Link>
            </Button>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <a href={partnerCheckoutUrl} target="_blank" rel="noreferrer">
                Book on Crown Technologies
              </a>
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-muted/50 p-4 sm:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">Last 24 hours (sample)</span>
            <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] text-accent">demo</span>
          </div>
          <div className="mt-4 flex h-24 items-end gap-1">
            {[40, 55, 48, 62, 58, 70, 52, 68, 75, 60, 72, 65].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-primary/30" style={{ height: `${h}%` }} aria-hidden />
            ))}
          </div>
        </div>

        {MOCK_MACHINES.map((m) => (
          <div
            key={m.id}
            className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow)]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-semibold leading-snug text-foreground">{m.label}</div>
              <span
                className={
                  m.state === "ok"
                    ? "shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-accent"
                    : "shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning"
                }
              >
                {m.state === "ok" ? "Connected" : "Check"}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wide">Inlet</dt>
                <dd className="font-medium text-foreground">{m.inlet}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wide">Outlet</dt>
                <dd className="font-medium text-foreground">{m.outlet}</dd>
              </div>
              <div className="col-span-2">
                <dt className="font-mono text-[10px] uppercase tracking-wide">Power</dt>
                <dd className="font-medium text-foreground">{m.power}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      {embedded ? (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/login?source=dashboard" className="text-accent underline-offset-4 hover:underline">
            Log in
          </Link>{" "}
          for your live dashboard ·{" "}
          <Link to="/#pricing" className="text-accent underline-offset-4 hover:underline">
            View plans
          </Link>
        </p>
      ) : (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Crown Technologies installs hardware and links live machines to your account —{" "}
          <Link to="/#pricing" className="text-accent underline-offset-4 hover:underline">
            plans & pricing
          </Link>
        </p>
      )}
    </section>
  );
};

export default DemoDashboardPreview;
