import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatZar } from "@/lib/solarQuoteCalculations";
import type { QuoteProduction, QuoteSavingsInputs, SavingsSummary } from "@/types/quotes";

type Props = {
  savings: QuoteSavingsInputs;
  production: QuoteProduction;
  summary: SavingsSummary;
  onChange: (savings: QuoteSavingsInputs) => void;
};

export const SavingsCalculatorPanel: React.FC<Props> = ({
  savings,
  production,
  summary,
  onChange,
}) => {
  const chartData = summary.forecast.map((r) => ({
    year: r.year,
    utility: Math.round(r.utilityBill),
    saving: Math.round(r.annualSaving),
    cumulative: Math.round(r.cumulativeSaving),
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="clientDailyKwh">Current daily usage (kWh)</Label>
          <Input
            id="clientDailyKwh"
            type="number"
            min={0}
            value={savings.clientDailyKwh}
            onChange={(e) =>
              onChange({ ...savings, clientDailyKwh: parseFloat(e.target.value) || 0 })
            }
          />
        </div>
        <div>
          <Label htmlFor="tariffPerKwh">Tariff (R/kWh, ex VAT)</Label>
          <Input
            id="tariffPerKwh"
            type="number"
            min={0}
            step={0.01}
            value={savings.tariffPerKwh}
            onChange={(e) =>
              onChange({ ...savings, tariffPerKwh: parseFloat(e.target.value) || 0 })
            }
          />
        </div>
        <div>
          <Label htmlFor="annualTariffIncrease">Annual tariff increase</Label>
          <Input
            id="annualTariffIncrease"
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={savings.annualTariffIncrease}
            onChange={(e) =>
              onChange({ ...savings, annualTariffIncrease: parseFloat(e.target.value) || 0 })
            }
          />
          <p className="mt-1 text-[10px] text-muted-foreground">e.g. 0.08 = 8% (template default)</p>
        </div>
        <div>
          <Label htmlFor="panelDegradation">Panel degradation p.a.</Label>
          <Input
            id="panelDegradation"
            type="number"
            min={0}
            max={0.1}
            step={0.005}
            value={savings.panelDegradationPerYear}
            onChange={(e) =>
              onChange({ ...savings, panelDegradationPerYear: parseFloat(e.target.value) || 0 })
            }
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Daily PV production" value={`${production.dailyPvKwh.toFixed(0)} kWh`} />
        <Stat
          label="Off-grid savings (approx.)"
          value={`${(production.offGridSavingsRatio * 100).toFixed(0)}%`}
        />
        <Stat label="LCOE" value={`${formatZar(summary.lcoePerKwh, 2)}/kWh`} />
        <Stat label="Monthly saving (approx.)" value={formatZar(summary.monthlySavingZar)} />
        <Stat label="Payback (approx.)" value={`${summary.paybackYearsApprox.toFixed(1)} yrs`} />
        <Stat label="Breakeven vs utility" value={`${summary.breakevenYears.toFixed(1)} yrs`} />
        <Stat
          label="25-year cumulative saving"
          value={formatZar(summary.forecast[24]?.cumulativeSaving ?? 0)}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Figures are planning estimates from your PV quote template — ultra conservative assumptions
        recommended for client proposals. Adjust tariff and usage to match actual bills.
      </p>

      <div className="h-64 w-full rounded-xl border border-border bg-card p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="year" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatZar(v)} />
            <Legend />
            <Line type="monotone" dataKey="utility" name="Utility bill" stroke="hsl(var(--muted-foreground))" dot={false} />
            <Line type="monotone" dataKey="cumulative" name="Cumulative saving" stroke="hsl(var(--primary))" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
