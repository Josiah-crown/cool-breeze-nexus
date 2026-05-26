import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TopTaskbar from "@/components/TopTaskbar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type BuildingRow = {
  id: string;
  site_id: string;
  name: string;
  updated_at: string;
};

type SiteRow = {
  id: string;
  name: string;
};

const Buildings: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState<BuildingRow[]>([]);
  const [sitesById, setSitesById] = useState<Record<string, SiteRow>>({});
  const [allSites, setAllSites] = useState<SiteRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState("");
  const [newBuildingSiteId, setNewBuildingSiteId] = useState("");
  const [showCreateSite, setShowCreateSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteAddress, setNewSiteAddress] = useState("");

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data: sAll, error: sAllErr } = await supabase.from("sites").select("id, name").order("name");
        if (sAllErr) throw sAllErr;
        if (!ignore) setAllSites((sAll || []) as any);

        const { data: b, error } = await supabase
          .from("buildings")
          .select("id, site_id, name, updated_at")
          .order("updated_at", { ascending: false });
        if (error) throw error;
        if (ignore) return;
        setBuildings((b || []) as any);

        const siteIds = Array.from(new Set((b || []).map((x: any) => x.site_id).filter(Boolean)));
        if (siteIds.length) {
          const { data: s, error: sErr } = await supabase
            .from("sites")
            .select("id, name")
            .in("id", siteIds);
          if (sErr) throw sErr;
          if (ignore) return;
          const map: Record<string, SiteRow> = {};
          (s || []).forEach((row: any) => (map[row.id] = row));
          setSitesById(map);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [user?.id]);

  const createBuilding = async () => {
    if (!newBuildingName.trim() || !newBuildingSiteId) {
      toast.error("Choose a site and enter a building name");
      return;
    }
    try {
      const { data: created, error } = await supabase
        .from("buildings")
        .insert({
          site_id: newBuildingSiteId,
          name: newBuildingName.trim(),
        } as any)
        .select("id, site_id, name")
        .maybeSingle();
      if (error) throw error;
      if (!created?.id) throw new Error("Building creation failed");

      // Seed default floor + settings so the building opens ready to design.
      await supabase.from("building_floors").insert({
        building_id: created.id,
        floor_key: "ground",
        name: "Ground",
        sort_order: 0,
      } as any);
      await supabase.from("humidity_building_settings").insert({
        building_id: created.id,
        humidity_on: 40,
        humidity_off: 60,
      } as any);

      toast.success("Building created");
      setShowCreate(false);
      setNewBuildingName("");
      setNewBuildingSiteId("");
      navigate(`/buildings/${created.id}/designer`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to create building");
    }
  };

  const createSite = async () => {
    if (!user) return;
    if (!newSiteName.trim()) {
      toast.error("Enter a site name");
      return;
    }
    try {
      const { data: created, error } = await supabase.rpc("create_site", {
        p_name: newSiteName.trim(),
        p_address: newSiteAddress.trim() || null,
      } as any);
      if (error) throw error;
      const row = (created as any) || null;
      if (!row?.id) throw new Error("Site creation failed");

      toast.success("Site created");
      setAllSites((prev) => [...prev, row as any].sort((a, b) => a.name.localeCompare(b.name)));
      setSitesById((prev) => ({ ...prev, [row.id]: row as any }));
      setNewBuildingSiteId(row.id);
      setShowCreateSite(false);
      setNewSiteName("");
      setNewSiteAddress("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to create site");
    }
  };

  const cards = useMemo(() => {
    return buildings.map((b) => {
      const site = sitesById[b.site_id];
      return (
        <button
          key={b.id}
          className="text-left"
          onClick={() => navigate(`/buildings/${b.id}`)}
        >
          <Card className="p-4 border border-black/10 bg-white hover:shadow-[0_24px_60px_rgba(13,34,17,0.10)] transition-shadow">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-lg font-bold tracking-tight text-[#1A2B1C] truncate">
                  {b.name}
                </div>
                <div className="text-sm text-[#7A9B7D] truncate">
                  {site ? site.name : "Site"} • Updated{" "}
                  {b.updated_at ? new Date(b.updated_at).toLocaleString() : "—"}
                </div>
              </div>
              <div className="shrink-0 text-xs text-muted-foreground">
                Open
              </div>
            </div>
          </Card>
        </button>
      );
    });
  }, [buildings, sitesById, navigate]);

  if (!user) return null;

  const content = (
    <>
      <main className={["mx-auto w-full max-w-6xl", embedded ? "p-4 sm:p-6" : "px-4 py-8 sm:px-6"].join(" ")}>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading buildings…</div>
        ) : buildings.length ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 22rem), 1fr))" }}>
            {cards}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No buildings found.</div>
        )}
      </main>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-white border border-black/10">
          <DialogHeader>
            <DialogTitle>Create building</DialogTitle>
            <DialogDescription>Attach the building to a Site (access is inherited).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Site</Label>
                {(user.role === "super_admin" || user.role === "company") && (
                  <Button variant="outline" size="sm" onClick={() => setShowCreateSite(true)}>
                    New site
                  </Button>
                )}
              </div>
              <Select value={newBuildingSiteId} onValueChange={setNewBuildingSiteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a site…" />
                </SelectTrigger>
                <SelectContent>
                  {allSites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {allSites.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  No sites yet. Click “New site” to create one.
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Building name</Label>
              <Input value={newBuildingName} onChange={(e) => setNewBuildingName(e.target.value)} placeholder="e.g. Main Warehouse" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button className="bg-[#0D2211] text-white hover:bg-[#1A3A1E]" onClick={createBuilding}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateSite} onOpenChange={setShowCreateSite}>
        <DialogContent className="bg-white border border-black/10">
          <DialogHeader>
            <DialogTitle>Create site</DialogTitle>
            <DialogDescription>Sites are the top-level containers that Buildings belong to.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Site name</Label>
              <Input value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)} placeholder="e.g. ACME Warehouse (Cape Town)" />
            </div>
            <div className="space-y-2">
              <Label>Address (optional)</Label>
              <Input value={newSiteAddress} onChange={(e) => setNewSiteAddress(e.target.value)} placeholder="Street, suburb, city" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSite(false)}>
              Cancel
            </Button>
            <Button className="bg-[#0D2211] text-white hover:bg-[#1A3A1E]" onClick={createSite}>
              Create site
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (embedded) return content;

  return (
    <div className="min-h-screen bg-white text-[#1A2B1C]">
      <TopTaskbar
        title="Buildings"
        subtitle="Layouts • humidity playback • CSV export"
        rightActions={
          <>
            {(user.role === "super_admin" || user.role === "company") && (
              <Button className="bg-[#0D2211] text-white hover:bg-[#1A3A1E]" onClick={() => setShowCreate(true)}>
                New building
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate("/sites")}>
              Sites
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </>
        }
      />

      {content}
    </div>
  );
};

export default Buildings;

