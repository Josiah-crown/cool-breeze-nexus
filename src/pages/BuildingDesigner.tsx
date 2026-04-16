import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Line, Circle, Text, Group, Rect } from "react-konva";
import type Konva from "konva";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useMachineData } from "@/hooks/useMachineData";
import type { MachineStatus } from "@/types/machine";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type FloorKey = string;

type Point = { x: number; y: number };

type Polygon = {
  id: string;
  name: string;
  points: Point[];
};

type DeviceKind = "switch" | "light" | "ac_indoor" | "compressor" | "presence";

type DeviceNode = {
  id: string;
  kind: DeviceKind;
  label: string;
  x: number;
  y: number;
  zoneId?: string;
  boundMachineId?: string;
};

type FloorLayout = {
  floorId: FloorKey;
  boundary?: Polygon;
  zones: Polygon[];
  devices: DeviceNode[];
};

type LayoutDoc = {
  version: 1;
  floors: Record<FloorKey, FloorLayout>;
  activeFloorId: FloorKey;
};

type Tool =
  | "select"
  | "draw-boundary"
  | "draw-zone"
  | "place-switch"
  | "place-light"
  | "place-ac"
  | "place-compressor"
  | "place-presence";

const STORAGE_KEY = "building-designer:layout:v1";
const SNAP_PX = 10;
const CANVAS_SIZE = 1920;
const GRID_STEP = 10;
const AXIS_LOCK_PX = 10;

function dist(a: Point, b: Point) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function flattenPoints(points: Point[]) {
  const arr: number[] = [];
  points.forEach((p) => {
    arr.push(p.x, p.y);
  });
  return arr;
}

function genId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function toolToDeviceKind(t: Tool): DeviceKind | null {
  switch (t) {
    case "place-switch":
      return "switch";
    case "place-light":
      return "light";
    case "place-ac":
      return "ac_indoor";
    case "place-compressor":
      return "compressor";
    case "place-presence":
      return "presence";
    default:
      return null;
  }
}

function deviceLabel(kind: DeviceKind) {
  switch (kind) {
    case "switch":
      return "Switch";
    case "light":
      return "Light";
    case "ac_indoor":
      return "AC";
    case "compressor":
      return "Comp";
    case "presence":
      return "Sense";
  }
}

const BuildingDesigner: React.FC = () => {
  const stageRef = useRef<Konva.Stage | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { user } = useAuth();
  const { machines } = useMachineData(user?.id || "", user?.role || "client");

  const [tool, setTool] = useState<Tool>("select");
  const [doc, setDoc] = useState<LayoutDoc>(() => ({
    version: 1,
    activeFloorId: "upper",
    floors: {
      upper: { floorId: "upper", zones: [], devices: [] },
      ground: { floorId: "ground", zones: [], devices: [] },
    },
  }));

  const [stageSize, setStageSize] = useState<{ w: number; h: number }>({ w: 900, h: 640 });

  const [draftPoints, setDraftPoints] = useState<Point[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [boundarySelected, setBoundarySelected] = useState(false);
  const [pointer, setPointer] = useState<{ raw?: Point; snapped?: Point; axisHint?: "x" | "y" | null }>({});

  const [showBindDialog, setShowBindDialog] = useState(false);
  const [pendingNode, setPendingNode] = useState<DeviceNode | null>(null);
  const [bindMachineId, setBindMachineId] = useState<string>("");

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as LayoutDoc;
      if (parsed?.version === 1 && parsed.floors) {
        setDoc((prev) => ({
          ...prev,
          ...parsed,
          floors: { ...prev.floors, ...parsed.floors },
        }));
      }
    } catch {
      // ignore
    }
  }, []);

  const activeFloor = doc.floors[doc.activeFloorId];

  // Resize stage with container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setStageSize({
        w: Math.max(640, Math.floor(r.width)),
        h: Math.max(520, Math.floor(r.height)),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const allSnapPoints: Point[] = useMemo(() => {
    const pts: Point[] = [];
    if (activeFloor.boundary) pts.push(...activeFloor.boundary.points);
    activeFloor.zones.forEach((z) => pts.push(...z.points));
    return pts;
  }, [activeFloor.boundary, activeFloor.zones]);

  const snapPoint = useCallback(
    (p: Point): Point => {
      let best: Point | null = null;
      let bestD = Infinity;
      for (const sp of allSnapPoints) {
        const d = dist(p, sp);
        if (d < bestD) {
          bestD = d;
          best = sp;
        }
      }
      if (best && bestD <= SNAP_PX) return { x: best.x, y: best.y };
      return p;
    },
    [allSnapPoints]
  );

  const setActiveFloorId = (floorId: FloorKey) => {
    setDoc((prev) => ({ ...prev, activeFloorId: floorId }));
    setDraftPoints([]);
    setSelectedZoneId(null);
    setSelectedDeviceId(null);
    setBoundarySelected(false);
  };

  const persist = useCallback((next: LayoutDoc) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const updateDoc = useCallback(
    (updater: (prev: LayoutDoc) => LayoutDoc) => {
      setDoc((prev) => {
        const next = updater(prev);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const resetDraft = () => setDraftPoints([]);

  const clampToCanvas = useCallback((p: Point): Point => {
    return {
      x: Math.max(0, Math.min(CANVAS_SIZE, p.x)),
      y: Math.max(0, Math.min(CANVAS_SIZE, p.y)),
    };
  }, []);

  const snapToGrid = useCallback(
    (p: Point): Point => {
      return {
        x: Math.round(p.x / GRID_STEP) * GRID_STEP,
        y: Math.round(p.y / GRID_STEP) * GRID_STEP,
      };
    },
    []
  );

  const applyAxisLock = useCallback(
    (p: Point): { p: Point; hint: "x" | "y" | null } => {
      if (draftPoints.length === 0) return { p, hint: null };
      const last = draftPoints[draftPoints.length - 1];
      const dx = Math.abs(p.x - last.x);
      const dy = Math.abs(p.y - last.y);
      if (dx <= AXIS_LOCK_PX && dx < dy) return { p: { ...p, x: last.x }, hint: "y" }; // vertical line (Y axis aligned)
      if (dy <= AXIS_LOCK_PX && dy < dx) return { p: { ...p, y: last.y }, hint: "x" }; // horizontal line (X axis aligned)
      return { p, hint: null };
    },
    [draftPoints]
  );

  const completePolygon = (name: string, kind: "boundary" | "zone") => {
    if (draftPoints.length < 3) return;
    const poly: Polygon = {
      id: genId(kind),
      name,
      points: draftPoints,
    };
    updateDoc((prev) => {
      const fl = prev.floors[prev.activeFloorId];
      const nextFloor: FloorLayout =
        kind === "boundary"
          ? { ...fl, boundary: poly }
          : { ...fl, zones: [...fl.zones, poly] };
      return {
        ...prev,
        floors: { ...prev.floors, [prev.activeFloorId]: nextFloor },
      };
    });
    resetDraft();
  };

  const getBoardPointer = useCallback((): Point | null => {
    const st = stageRef.current;
    if (!st) return null;
    const p = st.getPointerPosition();
    if (!p) return null;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
    return { x: p.x, y: p.y };
  }, []);

  const onStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const st = stageRef.current;
    if (!st) return;
    const board = getBoardPointer();
    if (!board) return;

    // If clicking on empty stage in select mode, clear selection
    const clickedOnStage = e.target === st;
    if (tool === "select") {
      if (clickedOnStage) {
        setSelectedZoneId(null);
        setSelectedDeviceId(null);
        setBoundarySelected(false);
      }
      return;
    }

    const dk = toolToDeviceKind(tool);
    if (dk) {
      const base = clampToCanvas(board);
      const p = snapPoint(snapToGrid(base));
      const node: DeviceNode = {
        id: genId("dev"),
        kind: dk,
        label: deviceLabel(dk),
        x: p.x,
        y: p.y,
      };
      // For switch/AC/compressor: prompt to bind to a machine now (v1 binding)
      if (dk === "switch" || dk === "ac_indoor" || dk === "compressor") {
        setPendingNode(node);
        setBindMachineId("");
        setShowBindDialog(true);
      } else {
        updateDoc((prev) => {
          const fl = prev.floors[prev.activeFloorId];
          return {
            ...prev,
            floors: {
              ...prev.floors,
              [prev.activeFloorId]: { ...fl, devices: [...fl.devices, node] },
            },
          };
        });
      }
      return;
    }

    if (tool === "draw-boundary" || tool === "draw-zone") {
      const base = clampToCanvas(board);
      const snapped = snapPoint(snapToGrid(base));
      const locked = applyAxisLock(snapped).p;
      const p = locked;
      setDraftPoints((prev) => [...prev, p]);
      return;
    }
  };

  const onStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const board = getBoardPointer();
    if (!board) return;
    const raw = clampToCanvas(board);
    const snappedBase = snapPoint(snapToGrid(raw));
    const { p: axisLocked, hint } = applyAxisLock(snappedBase);
    setPointer({ raw, snapped: axisLocked, axisHint: hint });
  };

  const exportJson = () => {
    const json = JSON.stringify(doc, null, 2);
    navigator.clipboard?.writeText(json);
    alert("Layout JSON copied to clipboard.");
  };

  const importJson = () => {
    const raw = prompt("Paste layout JSON");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as LayoutDoc;
      if (parsed?.version !== 1 || !parsed.floors) throw new Error("bad");
      setDoc(parsed);
      persist(parsed);
      setDraftPoints([]);
      setSelectedZoneId(null);
      setSelectedDeviceId(null);
    } catch {
      alert("Invalid JSON");
    }
  };

  const deleteSelected = () => {
    if (selectedDeviceId) {
      updateDoc((prev) => {
        const fl = prev.floors[prev.activeFloorId];
        return {
          ...prev,
          floors: {
            ...prev.floors,
            [prev.activeFloorId]: { ...fl, devices: fl.devices.filter((d) => d.id !== selectedDeviceId) },
          },
        };
      });
      setSelectedDeviceId(null);
      return;
    }
    if (selectedZoneId) {
      updateDoc((prev) => {
        const fl = prev.floors[prev.activeFloorId];
        return {
          ...prev,
          floors: {
            ...prev.floors,
            [prev.activeFloorId]: { ...fl, zones: fl.zones.filter((z) => z.id !== selectedZoneId) },
          },
        };
      });
      setSelectedZoneId(null);
      return;
    }
    if (boundarySelected) {
      updateDoc((prev) => {
        const fl = prev.floors[prev.activeFloorId];
        return {
          ...prev,
          floors: {
            ...prev.floors,
            [prev.activeFloorId]: { ...fl, boundary: undefined },
          },
        };
      });
      setBoundarySelected(false);
    }
  };

  const addFloor = () => {
    const name = prompt("New floor name (e.g. mezzanine, basement)");
    if (!name) return;
    const key = name.trim().toLowerCase().replace(/\s+/g, "_");
    if (!key) return;
    updateDoc((prev) => {
      if (prev.floors[key]) return prev;
      return {
        ...prev,
        activeFloorId: key,
        floors: {
          ...prev.floors,
          [key]: { floorId: key, zones: [], devices: [] },
        },
      };
    });
  };

  const deleteActiveFloor = () => {
    updateDoc((prev) => {
      const keys = Object.keys(prev.floors);
      if (keys.length <= 1) return prev;
      const ok = confirm(`Delete floor "${prev.activeFloorId}"? This cannot be undone.`);
      if (!ok) return prev;
      const nextFloors = { ...prev.floors };
      delete nextFloors[prev.activeFloorId];
      const nextActive = Object.keys(nextFloors)[0];
      return { ...prev, floors: nextFloors, activeFloorId: nextActive };
    });
    setDraftPoints([]);
    setSelectedZoneId(null);
    setSelectedDeviceId(null);
    setBoundarySelected(false);
  };

  const confirmBind = () => {
    if (!pendingNode) return;
    const bound = bindMachineId || undefined;
    const node: DeviceNode = { ...pendingNode, boundMachineId: bound };
    updateDoc((prev) => {
      const fl = prev.floors[prev.activeFloorId];
      return {
        ...prev,
        floors: {
          ...prev.floors,
          [prev.activeFloorId]: { ...fl, devices: [...fl.devices, node] },
        },
      };
    });
    setPendingNode(null);
    setShowBindDialog(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-[1600px] px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow border border-primary/30 shadow-sm grid place-items-center">
              <span className="text-primary-foreground font-bold text-sm">BD</span>
            </div>
            <div>
              <div className="text-lg font-semibold text-foreground leading-tight">Building Designer (v1)</div>
              <div className="text-xs text-muted-foreground">Manual zones • Any-angle geometry • Snap points</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportJson}>
              Export JSON
            </Button>
            <Button variant="outline" size="sm" onClick={importJson}>
              Import JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={deleteSelected}
              disabled={!selectedZoneId && !selectedDeviceId && !boundarySelected}
            >
              Delete selected
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 py-5 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
        {/* Tools */}
        <Card className="p-3 lg:p-4 border border-border shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1 mb-2">
            Floors
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(doc.floors)
              .slice(0, 6)
              .map((k) => (
                <Button key={k} variant={doc.activeFloorId === k ? "default" : "outline"} onClick={() => setActiveFloorId(k)}>
                  {k}
                </Button>
              ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={addFloor}>
              + Add
            </Button>
            <Button variant="outline" className="text-destructive" onClick={deleteActiveFloor} disabled={Object.keys(doc.floors).length <= 1}>
              Delete
            </Button>
          </div>

          <div className="my-4 h-px bg-border" />

          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1 mb-2">
            Tools
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant={tool === "select" ? "default" : "outline"} onClick={() => setTool("select")}>
              Select
            </Button>
            <Button
              variant={tool === "draw-boundary" ? "default" : "outline"}
              onClick={() => {
                setTool("draw-boundary");
                setDraftPoints([]);
              }}
            >
              Boundary
            </Button>
            <Button
              variant={tool === "draw-zone" ? "default" : "outline"}
              onClick={() => {
                setTool("draw-zone");
                setDraftPoints([]);
              }}
            >
              Zone
            </Button>
            <Button variant="outline" onClick={resetDraft} disabled={draftPoints.length === 0}>
              Clear draft
            </Button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={draftPoints.length < 3 || (tool !== "draw-boundary" && tool !== "draw-zone")}
              onClick={() => completePolygon(tool === "draw-boundary" ? "Building" : `Zone ${activeFloor.zones.length + 1}`, tool === "draw-boundary" ? "boundary" : "zone")}
            >
              Finish polygon
            </Button>
            <div className="text-xs text-muted-foreground">
              Points: <span className="text-foreground font-medium">{draftPoints.length}</span>
            </div>
          </div>

          <div className="my-4 h-px bg-border" />

          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1 mb-2">
            Place devices
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant={tool === "place-switch" ? "default" : "outline"} onClick={() => setTool("place-switch")}>
              Switch
            </Button>
            <Button variant={tool === "place-light" ? "default" : "outline"} onClick={() => setTool("place-light")}>
              Light
            </Button>
            <Button variant={tool === "place-ac" ? "default" : "outline"} onClick={() => setTool("place-ac")}>
              AC Indoor
            </Button>
            <Button variant={tool === "place-compressor" ? "default" : "outline"} onClick={() => setTool("place-compressor")}>
              Compressor
            </Button>
            <Button variant={tool === "place-presence" ? "default" : "outline"} onClick={() => setTool("place-presence")}>
              Presence
            </Button>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-background p-3">
            <div className="text-xs text-muted-foreground leading-relaxed">
              <div className="font-medium text-foreground mb-1">Tips</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>Any angle geometry is supported.</li>
                <li>Points snap to nearby vertices (≈{SNAP_PX}px).</li>
                <li>Use “Finish polygon” to save boundary/zones.</li>
                <li>Devices are place-and-drag icons (binding later).</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Canvas */}
        <Card className="border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-card flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div className="text-sm font-semibold text-foreground">
                Floor: <span className="text-primary">{doc.activeFloorId}</span> • Tool:{" "}
                <span className="text-foreground">{tool}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Canvas: (0,0) → (1920,1920). 1:1 pointer mapping (no zoom). Draw shows axis lock (blue=X, red=Y).
              </div>
            </div>
            <div className={cn("text-xs px-2 py-1 rounded-lg border", draftPoints.length ? "border-accent/40 bg-accent/10" : "border-border bg-background")}>
              Draft: {draftPoints.length ? "active" : "none"}
            </div>
          </div>

          <div
            ref={containerRef}
            className="relative w-full h-[calc(100vh-220px)] min-h-[560px] bg-[hsl(var(--gradient-control))] overflow-auto"
            style={{ cursor: "none" }}
          >
            {/* Cursor coordinate readout */}
            <div className="absolute left-3 top-3 z-10 rounded-lg border border-border bg-background/90 backdrop-blur-sm px-3 py-2 text-xs">
              <div className="font-medium text-foreground">Cursor</div>
              <div className="text-muted-foreground">
                raw:{" "}
                <span className="text-foreground font-medium">
                  {pointer.raw ? `${Math.round(pointer.raw.x)}, ${Math.round(pointer.raw.y)}` : "--"}
                </span>
              </div>
              <div className="text-muted-foreground">
                snap:{" "}
                <span className="text-foreground font-medium">
                  {pointer.snapped ? `${Math.round(pointer.snapped.x)}, ${Math.round(pointer.snapped.y)}` : "--"}
                </span>
              </div>
              <div className="text-muted-foreground">
                axis:{" "}
                <span className="text-foreground font-medium">
                  {pointer.axisHint === "x" ? "X (horizontal)" : pointer.axisHint === "y" ? "Y (vertical)" : "—"}
                </span>
              </div>
            </div>

            <Stage
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              ref={(n) => (stageRef.current = n)}
              onMouseDown={onStageMouseDown}
              onMouseMove={onStageMouseMove}
            >
              <Layer>
                {/* canvas bounds */}
                <Rect x={0} y={0} width={CANVAS_SIZE} height={CANVAS_SIZE} fill="rgba(255,255,255,0.6)" stroke="rgba(15,23,42,0.18)" strokeWidth={2} />

                {/* grid inside 4000x4000 */}
                {Array.from({ length: Math.floor(CANVAS_SIZE / 100) + 1 }).map((_, i) => (
                  <Line key={`gv-${i}`} points={[i * 100, 0, i * 100, CANVAS_SIZE]} stroke="rgba(0,0,0,0.04)" />
                ))}
                {Array.from({ length: Math.floor(CANVAS_SIZE / 100) + 1 }).map((_, i) => (
                  <Line key={`gh-${i}`} points={[0, i * 100, CANVAS_SIZE, i * 100]} stroke="rgba(0,0,0,0.04)" />
                ))}

                {/* corner labels */}
                <Text x={6} y={6} text={"0,0"} fontSize={14} fill="rgba(15,23,42,0.55)" />
                <Text x={CANVAS_SIZE - 92} y={CANVAS_SIZE - 22} text={"4000,4000"} fontSize={14} fill="rgba(15,23,42,0.55)" />

                {/* boundary */}
                {activeFloor.boundary && (
                  <>
                    <Line
                      points={[...flattenPoints(activeFloor.boundary.points), activeFloor.boundary.points[0].x, activeFloor.boundary.points[0].y]}
                      closed
                      fill={boundarySelected ? "rgba(59,130,246,0.10)" : "rgba(59,130,246,0.06)"}
                      stroke={boundarySelected ? "rgba(59,130,246,0.95)" : "rgba(59,130,246,0.8)"}
                      strokeWidth={boundarySelected ? 3 : 2}
                      onMouseDown={(ev) => {
                        if (tool !== "select") return;
                        ev.cancelBubble = true;
                        setBoundarySelected(true);
                        setSelectedZoneId(null);
                        setSelectedDeviceId(null);
                      }}
                    />
                    {activeFloor.boundary.points.map((p, idx) => (
                      <Circle
                        key={`bpt-${idx}`}
                        x={p.x}
                        y={p.y}
                        radius={6}
                        fill="white"
                        stroke="rgba(59,130,246,0.9)"
                        strokeWidth={2}
                        draggable={tool === "select" && boundarySelected}
                        onDragMove={(ev) => {
                          const nx = ev.target.x();
                          const ny = ev.target.y();
                          updateDoc((prev) => {
                            const fl = prev.floors[prev.activeFloorId];
                            if (!fl.boundary) return prev;
                            const nextPts = fl.boundary.points.map((pp, i) =>
                              i === idx ? snapPoint(snapToGrid(clampToCanvas({ x: nx, y: ny }))) : pp
                            );
                            return {
                              ...prev,
                              floors: {
                                ...prev.floors,
                                [prev.activeFloorId]: { ...fl, boundary: { ...fl.boundary, points: nextPts } },
                              },
                            };
                          });
                        }}
                      />
                    ))}
                  </>
                )}

                {/* zones */}
                {activeFloor.zones.map((z) => {
                  const isSel = z.id === selectedZoneId;
                  return (
                    <Group
                      key={z.id}
                      onMouseDown={(ev) => {
                        if (tool !== "select") return;
                        ev.cancelBubble = true;
                        setSelectedZoneId(z.id);
                        setSelectedDeviceId(null);
                        setBoundarySelected(false);
                      }}
                    >
                      <Line
                        points={[...flattenPoints(z.points), z.points[0].x, z.points[0].y]}
                        closed
                        fill={isSel ? "rgba(34,197,94,0.14)" : "rgba(34,197,94,0.08)"}
                        stroke={isSel ? "rgba(34,197,94,0.95)" : "rgba(34,197,94,0.7)"}
                        strokeWidth={isSel ? 3 : 2}
                      />
                      <Text
                        x={z.points[0].x + 8}
                        y={z.points[0].y + 8}
                        text={z.name}
                        fontSize={12}
                        fill="rgba(17,24,39,0.75)"
                      />
                      {z.points.map((p, idx) => (
                        <Circle
                          key={`${z.id}-pt-${idx}`}
                          x={p.x}
                          y={p.y}
                          radius={5}
                          fill="white"
                          stroke={isSel ? "rgba(34,197,94,0.95)" : "rgba(34,197,94,0.65)"}
                          strokeWidth={2}
                          draggable={tool === "select" && isSel}
                          onDragMove={(ev) => {
                            if (!isSel) return;
                            const nx = ev.target.x();
                            const ny = ev.target.y();
                            updateDoc((prev) => {
                              const fl = prev.floors[prev.activeFloorId];
                              const nextZones = fl.zones.map((zz) => {
                                if (zz.id !== z.id) return zz;
                                const nextPts = zz.points.map((pp, i) =>
                                  i === idx ? snapPoint(snapToGrid(clampToCanvas({ x: nx, y: ny }))) : pp
                                );
                                return { ...zz, points: nextPts };
                              });
                              return {
                                ...prev,
                                floors: { ...prev.floors, [prev.activeFloorId]: { ...fl, zones: nextZones } },
                              };
                            });
                          }}
                        />
                      ))}
                    </Group>
                  );
                })}

                {/* draft polygon */}
                {draftPoints.length > 0 && (
                  <>
                    <Line points={flattenPoints(draftPoints)} stroke="rgba(17,24,39,0.55)" strokeWidth={2} dash={[6, 5]} />
                    {draftPoints.map((p, idx) => (
                      <Circle key={`dpt-${idx}`} x={p.x} y={p.y} radius={4} fill="rgba(17,24,39,0.55)" />
                    ))}
                    {/* live preview segment to cursor with axis hint color */}
                    {pointer.snapped && draftPoints.length > 0 && (
                      <Line
                        points={[
                          draftPoints[draftPoints.length - 1].x,
                          draftPoints[draftPoints.length - 1].y,
                          pointer.snapped.x,
                          pointer.snapped.y,
                        ]}
                        stroke={
                          pointer.axisHint === "x"
                            ? "rgba(37,99,235,0.9)" // blue for horizontal (X-axis aligned)
                            : pointer.axisHint === "y"
                              ? "rgba(220,38,38,0.9)" // red for vertical (Y-axis aligned)
                              : "rgba(15,23,42,0.5)"
                        }
                        strokeWidth={3}
                        dash={[8, 6]}
                      />
                    )}
                  </>
                )}

                {/* crosshair aimer (hides OS cursor, shows exact placement point) */}
                {pointer.snapped && (
                  <>
                    <Line
                      points={[pointer.snapped.x - 18, pointer.snapped.y, pointer.snapped.x + 18, pointer.snapped.y]}
                      stroke="rgba(15,23,42,0.65)"
                      strokeWidth={2}
                    />
                    <Line
                      points={[pointer.snapped.x, pointer.snapped.y - 18, pointer.snapped.x, pointer.snapped.y + 18]}
                      stroke="rgba(15,23,42,0.65)"
                      strokeWidth={2}
                    />
                    <Circle x={pointer.snapped.x} y={pointer.snapped.y} radius={4} fill="rgba(15,23,42,0.7)" />
                  </>
                )}

                {/* devices */}
                {activeFloor.devices.map((d) => {
                  const sel = d.id === selectedDeviceId;
                  const color =
                    d.kind === "switch"
                      ? "#3b82f6"
                      : d.kind === "presence"
                        ? "#8b5cf6"
                        : d.kind === "light"
                          ? "#f59e0b"
                          : d.kind === "compressor"
                            ? "#111827"
                            : "#10b981";
                  return (
                    <Group
                      key={d.id}
                      x={d.x}
                      y={d.y}
                      draggable={tool === "select"}
                      onDragMove={(ev) => {
                        const nx = ev.target.x();
                        const ny = ev.target.y();
                        updateDoc((prev) => {
                          const fl = prev.floors[prev.activeFloorId];
                          const next = fl.devices.map((dd) => (dd.id === d.id ? { ...dd, ...snapPoint({ x: nx, y: ny }) } : dd));
                          return { ...prev, floors: { ...prev.floors, [prev.activeFloorId]: { ...fl, devices: next } } };
                        });
                      }}
                      onMouseDown={(ev) => {
                        if (tool !== "select") return;
                        ev.cancelBubble = true;
                        setSelectedDeviceId(d.id);
                        setSelectedZoneId(null);
                        setBoundarySelected(false);
                      }}
                    >
                      <Circle radius={14} fill={sel ? color : `${color}cc`} stroke={sel ? "#0f172a" : "#00000033"} strokeWidth={sel ? 3 : 2} />
                      <Text text={d.label} fontSize={10} fill="#fff" width={40} offsetX={20} offsetY={5} align="center" />
                    </Group>
                  );
                })}
              </Layer>
            </Stage>
          </div>
        </Card>
      </div>

      <Dialog open={showBindDialog} onOpenChange={(v) => {
        setShowBindDialog(v);
        if (!v) setPendingNode(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bind device to a machine</DialogTitle>
            <DialogDescription>
              Select which machine this {pendingNode?.label?.toLowerCase() || "device"} belongs to. You can change this later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Machine</Label>
            <Select value={bindMachineId} onValueChange={setBindMachineId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a machine…" />
              </SelectTrigger>
              <SelectContent>
                {(machines || []).map((m: MachineStatus) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              If you leave this blank, the device will be placed unbound.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPendingNode(null); setShowBindDialog(false); }}>
              Cancel
            </Button>
            <Button onClick={confirmBind}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuildingDesigner;

