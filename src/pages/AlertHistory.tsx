import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type AlertRow = {
  id: string;
  machine_id: string;
  alert_type: string;
  severity: "critical" | "warning" | "info" | "recovery";
  message: string;
  current_value: number | null;
  threshold_value: number | null;
  duration_minutes: number | null;
  alert_sent_at: string;
};

const AlertHistory: React.FC = () => {
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [machineId, setMachineId] = useState<string>("");
  const [severity, setSeverity] = useState<string>("all");
  const [daysBack, setDaysBack] = useState<string>("7");

  const sinceIso = useMemo(() => {
    const n = Number(daysBack);
    const days = Number.isFinite(n) && n > 0 ? n : 7;
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  }, [daysBack]);

  const load = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("alert_history")
        .select("id,machine_id,alert_type,severity,message,current_value,threshold_value,duration_minutes,alert_sent_at")
        .gte("alert_sent_at", sinceIso)
        .order("alert_sent_at", { ascending: false })
        .limit(200);

      if (machineId.trim()) q = q.eq("machine_id", machineId.trim());
      if (severity !== "all") q = q.eq("severity", severity);

      const { data, error } = await q;
      if (error) throw error;
      setRows((data ?? []) as any);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load alert history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4 sm:p-6">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-wider text-accent">Alerts</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">Alert history</h1>
          <p className="mt-1 text-sm text-muted-foreground">Most recent alerts sent (up to 200).</p>
        </div>
        <Button onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>

      <div className="grid gap-4 p-4 sm:p-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="machineId">Machine ID (optional)</Label>
              <Input id="machineId" value={machineId} onChange={(e) => setMachineId(e.target.value)} placeholder="UUID" />
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="recovery">Recovery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Days back</Label>
              <Select value={daysBack} onValueChange={setDaysBack}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-3">
              <Button variant="outline" onClick={load} disabled={loading}>
                Apply filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.length === 0 ? (
              <div className="text-sm text-muted-foreground">{loading ? "Loading…" : "No alerts found."}</div>
            ) : (
              rows.map((r) => (
                <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">
                        {r.alert_type.replaceAll("_", " ")}{" "}
                        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {r.severity}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground break-all">machine_id: {r.machine_id}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(r.alert_sent_at).toLocaleString()}</div>
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{r.message}</div>
                  {(r.current_value != null || r.threshold_value != null || r.duration_minutes != null) && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {r.current_value != null && <span className="rounded-md border border-border bg-muted px-2 py-1">value: {r.current_value}</span>}
                      {r.threshold_value != null && <span className="rounded-md border border-border bg-muted px-2 py-1">threshold: {r.threshold_value}</span>}
                      {r.duration_minutes != null && <span className="rounded-md border border-border bg-muted px-2 py-1">duration: {r.duration_minutes} min</span>}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AlertHistory;

