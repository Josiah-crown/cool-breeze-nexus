import React, { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMachineData } from "@/hooks/useMachineData";
import type { MachineStatus } from "@/types/machine";
import MachineDetailView from "@/components/MachineDetailView";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type FloorKey = "upper" | "ground";
type ModeKey = "lights" | "hvac";

type Marker = {
  id: string;
  label: string;
  machineId: string;
  floor: FloorKey;
  // percentage positioning within plan container (0..100)
  xPct: number;
  yPct: number;
  kind: ModeKey;
};

const DEFAULT_MARKER_SIZE_PX = 36;

const BuildingControl: React.FC = () => {
  const { user } = useAuth();
  const { machines, historicalData } = useMachineData(user?.id || "", user?.role || "client");

  const [floor, setFloor] = useState<FloorKey>("upper");
  const [mode, setMode] = useState<ModeKey>("lights");
  const [selectedMachine, setSelectedMachine] = useState<MachineStatus | null>(null);

  // Temporary demo markers:
  // For now we map the first N machines to markers so the UI can be built
  // before zone/floorplan storage is implemented in Supabase.
  const markers: Marker[] = useMemo(() => {
    const usable = (machines || []).slice(0, 24);
    const mk: Marker[] = [];

    usable.forEach((m, i) => {
      const col = i % 6;
      const row = Math.floor(i / 6);
      mk.push({
        id: `m-${m.id}`,
        label: m.name,
        machineId: m.id,
        floor: i < 12 ? "upper" : "ground",
        kind: i % 2 === 0 ? "lights" : "hvac",
        xPct: 12 + col * 14.5,
        yPct: 14 + row * 18,
      });
    });

    return mk;
  }, [machines]);

  const filteredMarkers = useMemo(
    () => markers.filter((m) => m.floor === floor && m.kind === mode),
    [markers, floor, mode]
  );

  const counts = useMemo(() => {
    const relevant = machines || [];
    const on = relevant.filter((m) => m.isOn).length;
    const off = Math.max(0, relevant.length - on);
    return { on, off, total: relevant.length };
  }, [machines]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-[1400px] px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow border border-primary/30 shadow-sm grid place-items-center">
              <span className="text-primary-foreground font-bold text-sm">BC</span>
            </div>
            <div>
              <div className="text-lg font-semibold text-foreground leading-tight">Building Control</div>
              <div className="text-xs text-muted-foreground">
                {user.name} • {user.role.replaceAll("_", " ")}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-border bg-background p-1 shadow-sm">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-lg px-4 text-xs",
                  mode === "lights" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                )}
                onClick={() => setMode("lights")}
              >
                💡 Lights
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-lg px-4 text-xs",
                  mode === "hvac" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                )}
                onClick={() => setMode("hvac")}
              >
                ❄️ Air-Con
              </Button>
            </div>

            <div className="text-xs text-muted-foreground hidden sm:block">
              Devices: <span className="font-medium text-foreground">{counts.total}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-5 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* Sidebar */}
        <Card className="p-3 lg:p-4 border border-border shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1 mb-2">
            Floor
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={floor === "upper" ? "default" : "outline"}
              className="justify-between"
              onClick={() => setFloor("upper")}
            >
              Upper <span className="text-xs opacity-80">4F</span>
            </Button>
            <Button
              variant={floor === "ground" ? "default" : "outline"}
              className="justify-between"
              onClick={() => setFloor("ground")}
            >
              Ground <span className="text-xs opacity-80">1F</span>
            </Button>
          </div>

          <div className="my-4 h-px bg-border" />

          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1 mb-2">
            Global controls
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Button variant="outline" className="justify-start">
              <span className="mr-2">●</span> All {mode === "lights" ? "Lights" : "Air-Con"}
            </Button>
            <Button variant="outline" className="justify-start text-muted-foreground">
              ✕ All {mode === "lights" ? "Lights" : "AC"} OFF
            </Button>
          </div>

          <div className="my-4 h-px bg-border" />

          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1 mb-2">
            Status
          </div>
          <div className="grid grid-cols-2 gap-3 px-1">
            <div className="rounded-xl border border-border bg-background p-3">
              <div className="text-[11px] text-muted-foreground">ON</div>
              <div className="text-xl font-semibold text-foreground">{counts.on}</div>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <div className="text-[11px] text-muted-foreground">OFF</div>
              <div className="text-xl font-semibold text-foreground">{counts.off}</div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-background p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Zone list (stub)
            </div>
            <div className="space-y-2 max-h-[40vh] overflow-auto pr-1">
              {filteredMarkers.map((mk) => (
                <button
                  key={mk.id}
                  className="w-full text-left rounded-lg border border-border bg-card hover:bg-accent/10 transition-colors px-3 py-2"
                  onClick={() => {
                    const m = machines.find((x) => x.id === mk.machineId);
                    if (m) setSelectedMachine(m);
                  }}
                >
                  <div className="text-sm font-medium text-foreground truncate">{mk.label}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{mk.machineId}</div>
                </button>
              ))}
              {filteredMarkers.length === 0 && (
                <div className="text-xs text-muted-foreground">No markers for this floor/mode yet.</div>
              )}
            </div>
          </div>
        </Card>

        {/* Floorplan */}
        <Card className="border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-card flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div className="text-sm font-semibold text-foreground">
                {floor === "upper" ? "Upper Floor" : "Ground Floor"} —{" "}
                {mode === "lights" ? "Lighting Control" : "Air-Con Control"}
              </div>
              <div className="text-xs text-muted-foreground">
                Click a marker to open the expanded machine card.
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Markers shown: <span className="font-medium text-foreground">{filteredMarkers.length}</span>
            </div>
          </div>

          <div className="relative w-full min-h-[560px] bg-[hsl(var(--gradient-control))]">
            {/* Placeholder plan background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
            <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(hsl(var(--foreground))_1px,transparent_1px)] [background-size:16px_16px]" />

            {/* Markers */}
            {filteredMarkers.map((mk) => (
              <button
                key={mk.id}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border shadow-sm transition-all",
                  "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring",
                  mode === "lights"
                    ? "bg-accent text-accent-foreground border-accent/40"
                    : "bg-primary text-primary-foreground border-primary/40"
                )}
                style={{
                  left: `${mk.xPct}%`,
                  top: `${mk.yPct}%`,
                  width: DEFAULT_MARKER_SIZE_PX,
                  height: DEFAULT_MARKER_SIZE_PX,
                }}
                title={mk.label}
                onClick={() => {
                  const m = machines.find((x) => x.id === mk.machineId);
                  if (m) setSelectedMachine(m);
                }}
              >
                <span className="text-[10px] font-bold">{mode === "lights" ? "L" : "A"}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {selectedMachine && (
        <MachineDetailView
          machine={selectedMachine}
          historicalData={historicalData[selectedMachine.id] || ({} as any)}
          onClose={() => setSelectedMachine(null)}
        />
      )}
    </div>
  );
};

export default BuildingControl;

