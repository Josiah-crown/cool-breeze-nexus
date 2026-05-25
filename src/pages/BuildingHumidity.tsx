import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TopTaskbar from "@/components/TopTaskbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

type Floor = { id: string; floor_key: string; name: string; sort_order: number };
type Position = { machine_id: string; floor_key: string; x_pct: number; y_pct: number; label_override: string | null };
type Settings = { humidity_on: number; humidity_off: number };

type OverallPoint = { bucket: string; rh_median: number | null };
type PerMachinePoint = { bucket: string; machine_id: string; rh_avg: number | null };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// Green -> Red interpolation. Uses HSL-ish hue interpolation for nicer gradients.
function humidityToColor(rh: number | null | undefined, on: number, off: number) {
  if (rh == null || !Number.isFinite(rh)) return "rgba(148,163,184,0.9)"; // slate-400
  if (off <= on) return "rgba(239,68,68,0.95)";
  const t = clamp((rh - on) / (off - on), 0, 1);
  // Hue: 120 (green) -> 0 (red)
  const hue = lerp(120, 0, t);
  return `hsl(${hue} 70% 45%)`;
}

function formatBucketLabel(ts: string) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:00`;
}

const BuildingHumidity: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { buildingId } = useParams<{ buildingId: string }>();

  const [buildingName, setBuildingName] = useState<string>("Building");
  const [floors, setFloors] = useState<Floor[]>([]);
  const [activeFloorKey, setActiveFloorKey] = useState<string>("");
  const [floorplanUrl, setFloorplanUrl] = useState<string | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [settings, setSettings] = useState<Settings>({ humidity_on: 40, humidity_off: 60 });
  const [mode, setMode] = useState<"layout" | "readouts">("layout");

  const [overall, setOverall] = useState<OverallPoint[]>([]);
  const [perMachine, setPerMachine] = useState<PerMachinePoint[]>([]);
  const [loading, setLoading] = useState(false);

  const [sliderIndex, setSliderIndex] = useState(0);

  const selectedBucket = overall[sliderIndex]?.bucket ?? null;

  const perMachineAtBucket = useMemo(() => {
    const map: Record<string, number | null> = {};
    if (!selectedBucket) return map;
    for (const row of perMachine) {
      if (row.bucket === selectedBucket) map[row.machine_id] = row.rh_avg;
    }
    return map;
  }, [perMachine, selectedBucket]);

  const overallAtBucket = useMemo(() => {
    if (!selectedBucket) return null;
    const p = overall.find((x) => x.bucket === selectedBucket);
    return p?.rh_median ?? null;
  }, [overall, selectedBucket]);

  const activePositions = useMemo(
    () => positions.filter((p) => p.floor_key === activeFloorKey),
    [positions, activeFloorKey]
  );

  const load = useCallback(async () => {
    if (!buildingId) return;
    setLoading(true);
    try {
      const { data: b, error: bErr } = await supabase
        .from("buildings")
        .select("id, name")
        .eq("id", buildingId)
        .maybeSingle();
      if (bErr) throw bErr;
      setBuildingName(b?.name || "Building");

      const { data: fl, error: fErr } = await supabase
        .from("building_floors")
        .select("id, floor_key, name, sort_order")
        .eq("building_id", buildingId)
        .order("sort_order", { ascending: true });
      if (fErr) throw fErr;
      const nextFloors = (fl || []) as any as Floor[];
      setFloors(nextFloors);
      const initialFloor = nextFloors[0]?.floor_key || "ground";
      setActiveFloorKey((prev) => prev || initialFloor);

      const { data: pos, error: pErr } = await supabase
        .from("building_machine_positions")
        .select("machine_id, floor_key, x_pct, y_pct, label_override")
        .eq("building_id", buildingId);
      if (pErr) throw pErr;
      setPositions((pos || []) as any);

      const { data: s, error: sErr } = await supabase
        .from("humidity_building_settings")
        .select("humidity_on, humidity_off")
        .eq("building_id", buildingId)
        .maybeSingle();
      if (sErr) throw sErr;
      if (s?.humidity_on != null && s?.humidity_off != null) {
        setSettings({ humidity_on: Number(s.humidity_on), humidity_off: Number(s.humidity_off) });
      }

      // Floorplan asset for active floor
      const { data: fa } = await supabase
        .from("building_floorplan_assets")
        .select("image_path, floor_key")
        .eq("building_id", buildingId);

      const assetByFloor: Record<string, string> = {};
      (fa || []).forEach((r: any) => (assetByFloor[r.floor_key] = r.image_path));
      const imagePath = assetByFloor[activeFloorKey || initialFloor] || null;

      if (imagePath) {
        const { data: signed } = await supabase.storage
          .from("floorplans")
          .createSignedUrl(imagePath, 60 * 60); // 1h
        setFloorplanUrl(signed?.signedUrl || null);
      } else {
        setFloorplanUrl(null);
      }

      // Historical range: last 7 days, hourly buckets
      const end = new Date();
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

      const { data: o, error: oErr } = await supabase.rpc("get_building_humidity_overall_hourly", {
        p_building_id: buildingId,
        p_start: start.toISOString(),
        p_end: end.toISOString(),
      });
      if (oErr) throw oErr;
      const overallSeries = (o || []).map((r: any) => ({
        bucket: r.bucket,
        rh_median: r.rh_median == null ? null : Number(r.rh_median),
      })) as OverallPoint[];
      setOverall(overallSeries);
      setSliderIndex(Math.max(0, overallSeries.length - 1));

      const { data: pm, error: pmErr } = await supabase.rpc("get_building_humidity_hourly", {
        p_building_id: buildingId,
        p_start: start.toISOString(),
        p_end: end.toISOString(),
      });
      if (pmErr) throw pmErr;
      setPerMachine(
        (pm || []).map((r: any) => ({
          bucket: r.bucket,
          machine_id: r.machine_id,
          rh_avg: r.rh_avg == null ? null : Number(r.rh_avg),
        })) as PerMachinePoint[]
      );
    } finally {
      setLoading(false);
    }
  }, [buildingId, activeFloorKey]);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user?.id, load]);

  // Reload floorplan URL when floor changes
  useEffect(() => {
    if (!buildingId) return;
    let ignore = false;
    const loadFloorplan = async () => {
      const { data: fa, error } = await supabase
        .from("building_floorplan_assets")
        .select("image_path, floor_key")
        .eq("building_id", buildingId);
      if (ignore) return;
      if (error) return;
      const assetByFloor: Record<string, string> = {};
      (fa || []).forEach((r: any) => (assetByFloor[r.floor_key] = r.image_path));
      const imagePath = assetByFloor[activeFloorKey] || null;
      if (imagePath) {
        const { data: signed } = await supabase.storage.from("floorplans").createSignedUrl(imagePath, 60 * 60);
        if (!ignore) setFloorplanUrl(signed?.signedUrl || null);
      } else {
        if (!ignore) setFloorplanUrl(null);
      }
    };
    loadFloorplan();
    return () => {
      ignore = true;
    };
  }, [buildingId, activeFloorKey]);

  const exportCsv = () => {
    if (!overall.length) return;
    const lines: string[] = [];
    lines.push(["bucket", "overall_rh_median", "machine_id", "machine_rh_avg"].join(","));

    const perMachineByBucket: Record<string, PerMachinePoint[]> = {};
    perMachine.forEach((p) => {
      (perMachineByBucket[p.bucket] ||= []).push(p);
    });

    for (const o of overall) {
      const bucket = o.bucket;
      const bucketRows = perMachineByBucket[bucket] || [];
      if (bucketRows.length === 0) {
        lines.push([bucket, o.rh_median ?? "", "", ""].join(","));
      } else {
        for (const r of bucketRows) {
          lines.push([bucket, o.rh_median ?? "", r.machine_id, r.rh_avg ?? ""].join(","));
        }
      }
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${buildingName.replace(/\s+/g, "_")}_humidity_hourly.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white text-[#1A2B1C]">
      <TopTaskbar
        title={buildingName}
        subtitle="Humidity playback (hourly) • layout heatmap • CSV export"
        rightActions={
          <>
            <Button variant="outline" onClick={() => navigate("/buildings")}>
              Back
            </Button>
            {(user.role === "super_admin" || user.role === "company" || user.role === "installer") && (
              <Button variant="outline" onClick={() => navigate(`/buildings/${buildingId}/designer`)}>
                Edit layout
              </Button>
            )}
            <Button variant="outline" onClick={exportCsv} disabled={!overall.length}>
              Export CSV
            </Button>
          </>
        }
      />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 space-y-4">
        {/* Header summary */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <Card className="p-4 border border-black/10 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm text-[#7A9B7D]">Selected hour</div>
                <div className="text-lg font-bold truncate">
                  {selectedBucket ? formatBucketLabel(selectedBucket) : "—"}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm text-[#7A9B7D]">Warehouse (median)</div>
                  <div className="text-2xl font-extrabold">
                    {overallAtBucket == null ? "—" : `${overallAtBucket.toFixed(1)}%`}
                  </div>
                </div>
                <div
                  className="h-10 w-10 rounded-xl border border-black/10"
                  style={{
                    background: humidityToColor(overallAtBucket, settings.humidity_on, settings.humidity_off),
                  }}
                  title="Overall color scale"
                />
              </div>
            </div>
          </Card>

          <Card className="p-3 border border-black/10 bg-white">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-[#7A9B7D]">View</div>
              <div className="inline-flex rounded-xl border border-black/10 bg-white p-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn("rounded-lg text-xs", mode === "layout" ? "bg-[#0D2211] text-white" : "text-[#1A2B1C]")}
                  onClick={() => setMode("layout")}
                >
                  Layout
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn("rounded-lg text-xs", mode === "readouts" ? "bg-[#0D2211] text-white" : "text-[#1A2B1C]")}
                  onClick={() => setMode("readouts")}
                >
                  Readouts
                </Button>
              </div>
            </div>

            <div className="mt-3">
              <div className="text-xs text-[#7A9B7D] mb-2">Floors</div>
              <div className="flex flex-wrap gap-2">
                {(floors.length ? floors : [{ id: "x", floor_key: "ground", name: "Ground", sort_order: 0 }]).map((f) => (
                  <Button
                    key={f.floor_key}
                    size="sm"
                    variant={activeFloorKey === f.floor_key ? "default" : "outline"}
                    className={cn(
                      "text-xs",
                      activeFloorKey === f.floor_key ? "bg-[#0D2211] text-white" : "border-black/20"
                    )}
                    onClick={() => setActiveFloorKey(f.floor_key)}
                  >
                    {f.name}
                  </Button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Timeline chart */}
        <Card className="p-4 border border-black/10 bg-white">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="text-sm font-semibold">Warehouse humidity (median, hourly)</div>
            <div className="text-xs text-[#7A9B7D]">
              Range: last 7 days • Points: {overall.length}
            </div>
          </div>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : overall.length === 0 ? (
            <div className="text-sm text-muted-foreground">No humidity data yet.</div>
          ) : (
            <div className="w-full h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={overall}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                  <XAxis
                    dataKey="bucket"
                    tickFormatter={(v) => {
                      const d = new Date(v);
                      return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:00`;
                    }}
                    minTickGap={28}
                  />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <RechartsTooltip
                    formatter={(value: any) => (value == null ? "—" : `${Number(value).toFixed(1)}%`)}
                    labelFormatter={(label) => formatBucketLabel(label)}
                  />
                  <Line
                    type="monotone"
                    dataKey="rh_median"
                    name="Warehouse RH"
                    stroke="#0D2211"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Slider */}
          {overall.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-[#7A9B7D] mb-2">
                <span>Oldest</span>
                <span className="text-[#1A2B1C] font-medium">
                  {selectedBucket ? formatBucketLabel(selectedBucket) : "—"}
                </span>
                <span>Newest</span>
              </div>
              <Slider
                value={[sliderIndex]}
                min={0}
                max={Math.max(0, overall.length - 1)}
                step={1}
                onValueChange={(v) => setSliderIndex(v[0] ?? 0)}
                trackClassName="h-1.5"
                rangeClassName="bg-transparent"
                thumbClassName="h-4 w-12 rounded-md"
              />
            </div>
          )}
        </Card>

        {/* Layout or Readouts */}
        {mode === "layout" ? (
          <Card className="border border-black/10 bg-white overflow-hidden">
            <div className="p-4 border-b border-black/10 flex items-center justify-between gap-4">
              <div className="text-sm font-semibold">Floorplan heatmap</div>
              <div className="text-xs text-[#7A9B7D]">
                Green at ≤{settings.humidity_on}% • Red at ≥{settings.humidity_off}%
              </div>
            </div>
            <div className="relative w-full min-h-[560px] bg-[hsl(var(--gradient-control))]">
              {floorplanUrl ? (
                <img
                  src={floorplanUrl}
                  alt="Floorplan"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                  No floorplan image uploaded for this floor yet.
                </div>
              )}

              {/* Pins */}
              {activePositions.map((p) => {
                const rh = perMachineAtBucket[p.machine_id];
                const bg = humidityToColor(rh, settings.humidity_on, settings.humidity_off);
                return (
                  <div
                    key={`${p.floor_key}-${p.machine_id}`}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${p.x_pct}%`, top: `${p.y_pct}%` }}
                    title={`${p.label_override || p.machine_id}\n${rh == null ? "—" : `${rh.toFixed(1)}%`}`}
                  >
                    <div
                      className="h-10 w-10 rounded-xl border border-black/10 shadow-sm grid place-items-center text-[10px] font-bold text-white"
                      style={{ background: bg }}
                    >
                      {rh == null ? "—" : `${Math.round(rh)}%`}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : (
          <Card className="p-4 border border-black/10 bg-white">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="text-sm font-semibold">Cooler readouts (selected hour)</div>
              <div className="text-xs text-[#7A9B7D]">Devices on this floor: {activePositions.length}</div>
            </div>
            {activePositions.length === 0 ? (
              <div className="text-sm text-muted-foreground">No machines positioned on this floor yet.</div>
            ) : (
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 18rem), 1fr))" }}>
                {activePositions.map((p) => {
                  const rh = perMachineAtBucket[p.machine_id];
                  const bg = humidityToColor(rh, settings.humidity_on, settings.humidity_off);
                  return (
                    <Card key={p.machine_id} className="p-3 border border-black/10">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">
                            {p.label_override || `Machine ${p.machine_id.slice(0, 8)}…`}
                          </div>
                          <div className="text-xs text-[#7A9B7D] truncate">{p.machine_id}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-9 w-9 rounded-lg border border-black/10" style={{ background: bg }} />
                          <div className="text-right">
                            <div className="text-xs text-[#7A9B7D]">RH</div>
                            <div className="text-lg font-extrabold">{rh == null ? "—" : `${rh.toFixed(1)}%`}</div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </Card>
        )}
      </main>
    </div>
  );
};

export default BuildingHumidity;

