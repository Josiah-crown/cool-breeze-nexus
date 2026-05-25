import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMachineData } from "@/hooks/useMachineData";
import TopTaskbar from "@/components/TopTaskbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Floor = { id: string; floor_key: string; name: string; sort_order: number };
type Position = { machine_id: string; floor_key: string; x_pct: number; y_pct: number; label_override: string | null };

function toFloorKey(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

const BuildingLayoutEditor: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { buildingId } = useParams<{ buildingId: string }>();
  const { machines } = useMachineData(user?.id || "", user?.role || "client");

  const [buildingName, setBuildingName] = useState("Building");
  const [floors, setFloors] = useState<Floor[]>([]);
  const [activeFloorKey, setActiveFloorKey] = useState<string>("ground");
  const [positions, setPositions] = useState<Position[]>([]);

  const [floorplanUrl, setFloorplanUrl] = useState<string | null>(null);
  const [floorplanPath, setFloorplanPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [newFloorName, setNewFloorName] = useState("");
  const [selectedMachineId, setSelectedMachineId] = useState<string>("");

  const activePositions = useMemo(
    () => positions.filter((p) => p.floor_key === activeFloorKey),
    [positions, activeFloorKey]
  );

  useEffect(() => {
    if (!user || !buildingId) return;
    let ignore = false;
    const load = async () => {
      const { data: b, error: bErr } = await supabase
        .from("buildings")
        .select("id, name")
        .eq("id", buildingId)
        .maybeSingle();
      if (!ignore) setBuildingName(b?.name || "Building");
      if (bErr) console.warn(bErr);

      const { data: fl } = await supabase
        .from("building_floors")
        .select("id, floor_key, name, sort_order")
        .eq("building_id", buildingId)
        .order("sort_order", { ascending: true });
      if (!ignore) {
        const nextFloors = (fl || []) as any as Floor[];
        setFloors(nextFloors);
        setActiveFloorKey((prev) => prev || nextFloors[0]?.floor_key || "ground");
      }

      const { data: pos } = await supabase
        .from("building_machine_positions")
        .select("machine_id, floor_key, x_pct, y_pct, label_override")
        .eq("building_id", buildingId);
      if (!ignore) setPositions((pos || []) as any);

      const { data: fa } = await supabase
        .from("building_floorplan_assets")
        .select("image_path, floor_key")
        .eq("building_id", buildingId);

      const byFloor: Record<string, string> = {};
      (fa || []).forEach((r: any) => (byFloor[r.floor_key] = r.image_path));
      const path = byFloor[activeFloorKey] || null;
      if (!ignore) setFloorplanPath(path);
      if (path) {
        const { data: signed } = await supabase.storage.from("floorplans").createSignedUrl(path, 60 * 60);
        if (!ignore) setFloorplanUrl(signed?.signedUrl || null);
      } else if (!ignore) {
        setFloorplanUrl(null);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [user?.id, buildingId]);

  // Reload floorplan when floor changes
  useEffect(() => {
    if (!buildingId) return;
    let ignore = false;
    const loadFloorplan = async () => {
      const { data: fa } = await supabase
        .from("building_floorplan_assets")
        .select("image_path, floor_key")
        .eq("building_id", buildingId);
      if (ignore) return;
      const byFloor: Record<string, string> = {};
      (fa || []).forEach((r: any) => (byFloor[r.floor_key] = r.image_path));
      const path = byFloor[activeFloorKey] || null;
      setFloorplanPath(path);
      if (path) {
        const { data: signed } = await supabase.storage.from("floorplans").createSignedUrl(path, 60 * 60);
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

  const addFloor = async () => {
    if (!buildingId) return;
    const name = newFloorName.trim();
    if (!name) return;
    const floor_key = toFloorKey(name);
    if (!floor_key) return;

    const sort_order = floors.length ? Math.max(...floors.map((f) => f.sort_order)) + 1 : 0;
    const { error } = await supabase.from("building_floors").insert({
      building_id: buildingId,
      floor_key,
      name,
      sort_order,
    } as any);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Floor added");
    setNewFloorName("");
    // reload floors
    const { data: fl } = await supabase
      .from("building_floors")
      .select("id, floor_key, name, sort_order")
      .eq("building_id", buildingId)
      .order("sort_order", { ascending: true });
    setFloors((fl || []) as any);
    setActiveFloorKey(floor_key);
  };

  const uploadFloorplan = async (file: File) => {
    if (!buildingId || !user) return;
    if (!file) return;
    setUploading(true);
    try {
      // We need site_id to build the storage path.
      const { data: b, error: bErr } = await supabase
        .from("buildings")
        .select("id, site_id")
        .eq("id", buildingId)
        .maybeSingle();
      if (bErr) throw bErr;
      const siteId = (b as any)?.site_id as string | undefined;
      if (!siteId) throw new Error("Building missing site_id");

      const ext = file.name.split(".").pop() || "png";
      const filename = `${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
      const objectPath = `site/${siteId}/building/${buildingId}/floor/${activeFloorKey}/${filename}`;

      const { error: upErr } = await supabase.storage.from("floorplans").upload(objectPath, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (upErr) throw upErr;

      const { error: metaErr } = await supabase
        .from("building_floorplan_assets")
        .upsert({
          building_id: buildingId,
          floor_key: activeFloorKey,
          image_path: objectPath,
        } as any, { onConflict: "building_id,floor_key" });
      if (metaErr) throw metaErr;

      toast.success("Floorplan uploaded");
      const { data: signed } = await supabase.storage.from("floorplans").createSignedUrl(objectPath, 60 * 60);
      setFloorplanPath(objectPath);
      setFloorplanUrl(signed?.signedUrl || null);
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const placePin = async (ev: React.MouseEvent<HTMLDivElement>) => {
    if (!buildingId) return;
    if (!selectedMachineId) {
      toast.error("Select a machine first");
      return;
    }
    const rect = (ev.currentTarget as HTMLDivElement).getBoundingClientRect();
    const xPct = ((ev.clientX - rect.left) / rect.width) * 100;
    const yPct = ((ev.clientY - rect.top) / rect.height) * 100;

    const { error } = await supabase.from("building_machine_positions").upsert({
      building_id: buildingId,
      floor_key: activeFloorKey,
      machine_id: selectedMachineId,
      x_pct: xPct,
      y_pct: yPct,
    } as any, { onConflict: "building_id,floor_key,machine_id" });

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pin placed");

    const { data: pos } = await supabase
      .from("building_machine_positions")
      .select("machine_id, floor_key, x_pct, y_pct, label_override")
      .eq("building_id", buildingId);
    setPositions((pos || []) as any);
  };

  const removePin = async (machineId: string) => {
    if (!buildingId) return;
    const { error } = await supabase
      .from("building_machine_positions")
      .delete()
      .eq("building_id", buildingId)
      .eq("floor_key", activeFloorKey)
      .eq("machine_id", machineId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pin removed");
    setPositions((prev) => prev.filter((p) => !(p.machine_id === machineId && p.floor_key === activeFloorKey)));
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white text-[#1A2B1C]">
      <TopTaskbar
        title={`${buildingName} — Layout Editor`}
        subtitle="Upload floorplans • position machines • multi-floor"
        rightActions={
          <>
            <Button variant="outline" onClick={() => navigate(`/buildings/${buildingId}`)}>
              Done
            </Button>
          </>
        }
      />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
        <Card className="p-4 border border-black/10 bg-white space-y-4">
          <div>
            <div className="text-sm font-semibold mb-2">Floors</div>
            <div className="flex flex-wrap gap-2">
              {floors.map((f) => (
                <Button
                  key={f.floor_key}
                  size="sm"
                  variant={activeFloorKey === f.floor_key ? "default" : "outline"}
                  className={activeFloorKey === f.floor_key ? "bg-[#0D2211] text-white" : "border-black/20"}
                  onClick={() => setActiveFloorKey(f.floor_key)}
                >
                  {f.name}
                </Button>
              ))}
              {floors.length === 0 && (
                <div className="text-xs text-muted-foreground">No floors yet. Add one below.</div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Add floor</Label>
            <div className="flex gap-2">
              <Input value={newFloorName} onChange={(e) => setNewFloorName(e.target.value)} placeholder="e.g. Ground, Upper, Mezzanine" />
              <Button onClick={addFloor} disabled={!newFloorName.trim() || !buildingId}>
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Floorplan image</Label>
            <Input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadFloorplan(f);
              }}
            />
            <div className="text-xs text-muted-foreground">
              Upload for the currently selected floor.
            </div>
          </div>

          <div className="space-y-2">
            <Label>Machine to place</Label>
            <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a machine…" />
              </SelectTrigger>
              <SelectContent>
                {machines.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              Then click on the floorplan to place/update that machine’s pin.
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold">Pins on this floor</div>
            <div className="space-y-2 max-h-[240px] overflow-auto pr-1">
              {activePositions.map((p) => (
                <div key={p.machine_id} className="flex items-center justify-between gap-2 rounded-lg border border-black/10 p-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {machines.find((m) => m.id === p.machine_id)?.name || p.machine_id.slice(0, 8)}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.x_pct.toFixed(1)}%, {p.y_pct.toFixed(1)}%
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => removePin(p.machine_id)}>
                    Remove
                  </Button>
                </div>
              ))}
              {activePositions.length === 0 && (
                <div className="text-xs text-muted-foreground">No pins placed yet.</div>
              )}
            </div>
          </div>
        </Card>

        <Card className="border border-black/10 bg-white overflow-hidden">
          <div className="p-4 border-b border-black/10 flex items-center justify-between">
            <div className="text-sm font-semibold">Click to place pins</div>
            <Button variant="outline" onClick={() => navigate(`/buildings/${buildingId}`)}>
              View playback
            </Button>
          </div>
          <div
            className="relative w-full min-h-[640px] bg-[hsl(var(--gradient-control))]"
            onClick={placePin}
            role="button"
            tabIndex={0}
          >
            {floorplanUrl ? (
              <img src={floorplanUrl} alt="Floorplan" className="absolute inset-0 w-full h-full object-contain" />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                Upload a floorplan image for this floor first.
              </div>
            )}

            {activePositions.map((p) => (
              <div
                key={`pin-${p.machine_id}`}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${p.x_pct}%`, top: `${p.y_pct}%` }}
                title={machines.find((m) => m.id === p.machine_id)?.name || p.machine_id}
              >
                <div className="h-9 w-9 rounded-xl bg-[#0D2211] text-white border border-black/10 shadow-sm grid place-items-center text-[10px] font-bold">
                  {machines.find((m) => m.id === p.machine_id)?.name?.slice(0, 2).toUpperCase() || "M"}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default BuildingLayoutEditor;

