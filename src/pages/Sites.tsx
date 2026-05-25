import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMachineData } from "@/hooks/useMachineData";
import TopTaskbar from "@/components/TopTaskbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import SiteErfOutlineLayer from "@/components/SiteErfOutlineLayer";
import SiteErfMachinePins from "@/components/SiteErfMachinePins";
import {
  OUTLINE_MIN_CORNERS,
  type OutlinePointPct,
  bboxFromOutlinePoints,
  buildingOutlineColor,
  isNearOutlinePoint,
  nearestBuildingIdForPoint,
} from "@/lib/siteErfOutline";
import { machinePinAccent, machineTypeIcon, machineTypeLabel } from "@/lib/siteErfMachine";
import { outlineSnapThresholdPct, pointerMovedBeyondTap } from "@/lib/erfCanvasPointer";
import type { MachineStatus, MachineType } from "@/types/machine";

type SiteRow = { id: string; name: string; address: string | null; owner_id: string; updated_at: string };
type MembershipRow = { id: string; site_id: string; user_id: string; role: string; created_at: string };
type BuildingRow = { id: string; site_id: string; name: string; updated_at: string };
type ErfAssetRow = { site_id: string; image_path: string; updated_at: string };
type BuildingShapeRow = {
  id: string;
  site_id: string;
  building_id: string;
  x_pct: number;
  y_pct: number;
  w_pct: number;
  h_pct: number;
  label_override: string | null;
  polygon_pct?: unknown;
};

type SiteMachinePositionRow = {
  id: string;
  site_id: string;
  machine_id: string;
  building_id: string | null;
  x_pct: number;
  y_pct: number;
};

const SITE_SELECTION_STORAGE_KEY = "cmonitor_selected_site_id";

function formatDbError(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "Request failed";
  if (msg.includes("site_erf_assets") && (msg.includes("schema cache") || msg.includes("does not exist"))) {
    return "Site ERF tables are not on your database yet. Apply Supabase migration 20260521120000_site_erf_and_machine_positions_v1, then reload the API schema in the dashboard.";
  }
  if (msg.includes("site_machine_positions") && (msg.includes("schema cache") || msg.includes("does not exist"))) {
    return "Site machine position table is missing. Apply migration 20260521120000_site_erf_and_machine_positions_v1 on Supabase.";
  }
  return msg;
}

const Sites: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { users, machines } = useMachineData(user?.id || "", user?.role || "client");

  const [sites, setSites] = useState<SiteRow[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>(() => {
    try {
      return sessionStorage.getItem(SITE_SELECTION_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [buildingsBySiteId, setBuildingsBySiteId] = useState<Record<string, BuildingRow[]>>({});
  const [erfAsset, setErfAsset] = useState<ErfAssetRow | null>(null);
  const [erfSignedUrl, setErfSignedUrl] = useState<string | null>(null);
  const [buildingShapes, setBuildingShapes] = useState<BuildingShapeRow[]>([]);
  const [buildingFloorCounts, setBuildingFloorCounts] = useState<Record<string, number>>({});
  const [siteMachinePositions, setSiteMachinePositions] = useState<SiteMachinePositionRow[]>([]);
  const erfFileInputRef = useRef<HTMLInputElement | null>(null);
  const erfCanvasRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);

  const selectSite = (siteId: string) => {
    setSelectedSiteId(siteId);
    try {
      sessionStorage.setItem(SITE_SELECTION_STORAGE_KEY, siteId);
    } catch {
      // ignore
    }
  };

  const [showCreateSite, setShowCreateSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteAddress, setNewSiteAddress] = useState("");
  const [newSiteOwnerId, setNewSiteOwnerId] = useState("");
  const [showEditSite, setShowEditSite] = useState(false);
  const [editSiteName, setEditSiteName] = useState("");
  const [editSiteAddress, setEditSiteAddress] = useState("");
  const [editSiteOwnerId, setEditSiteOwnerId] = useState("");
  const [showDeleteSite, setShowDeleteSite] = useState(false);
  const [deleteBuildingId, setDeleteBuildingId] = useState<string | null>(null);

  const [showAddMember, setShowAddMember] = useState(false);
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState<"company" | "installer" | "viewer" | "manager">("viewer");

  const [showCreateBuilding, setShowCreateBuilding] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState("");
  const [newBuildingFloors, setNewBuildingFloors] = useState<number>(1);
  const [placingBuildingId, setPlacingBuildingId] = useState<string | null>(null);
  const [draftOutlinePoints, setDraftOutlinePoints] = useState<OutlinePointPct[]>([]);
  const [outlineHoverPoint, setOutlineHoverPoint] = useState<OutlinePointPct | null>(null);
  const [machinePlaceModeId, setMachinePlaceModeId] = useState<string | null>(null);
  const [machineDragId, setMachineDragId] = useState<string | null>(null);
  const [machineDragPreview, setMachineDragPreview] = useState<OutlinePointPct | null>(null);
  const [hoveredBuildingId, setHoveredBuildingId] = useState<string | null>(null);
  const [hoveredMachineId, setHoveredMachineId] = useState<string | null>(null);
  const erfPointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const selectedSite = useMemo(() => sites.find((s) => s.id === selectedSiteId) || null, [sites, selectedSiteId]);

  const canManageSite =
    user?.role === "super_admin" || user?.role === "company" || user?.role === "installer";

  const clientUsersForSiteOwner = useMemo(() => {
    return users.filter((u) => u.role === "client").sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("sites")
          .select("id, name, address, owner_id, updated_at")
          .order("name");
        if (error) throw error;
        if (ignore) return;
        const nextSites = (data || []) as any as SiteRow[];
        setSites(nextSites);
        if (nextSites.length) {
          const stored = (() => {
            try {
              return sessionStorage.getItem(SITE_SELECTION_STORAGE_KEY);
            } catch {
              return null;
            }
          })();
          const stillValid = stored && nextSites.some((s) => s.id === stored);
          if (stillValid) {
            setSelectedSiteId(stored!);
          } else if (!selectedSiteId || !nextSites.some((s) => s.id === selectedSiteId)) {
            const nextId = nextSites[0].id;
            setSelectedSiteId(nextId);
            try {
              sessionStorage.setItem(SITE_SELECTION_STORAGE_KEY, nextId);
            } catch {
              // ignore
            }
          }
        }

        // Load buildings for these sites so "Buildings" lives under Sites.
        const siteIds = nextSites.map((s) => s.id);
        if (siteIds.length) {
          const { data: b, error: bErr } = await supabase
            .from("buildings")
            .select("id, site_id, name, updated_at")
            .in("site_id", siteIds)
            .order("updated_at", { ascending: false });
          if (!ignore) {
            if (bErr) {
              setBuildingsBySiteId({});
              setBuildingFloorCounts({});
            } else {
              const map: Record<string, BuildingRow[]> = {};
              const buildingIds: string[] = [];
              (b || []).forEach((row: any) => {
                (map[row.site_id] ||= []).push(row as BuildingRow);
                buildingIds.push(row.id);
              });
              setBuildingsBySiteId(map);
              if (buildingIds.length) {
                const { data: floors } = await supabase.from("building_floors").select("building_id").in("building_id", buildingIds);
                const counts: Record<string, number> = {};
                (floors || []).forEach((f: { building_id: string }) => {
                  counts[f.building_id] = (counts[f.building_id] || 0) + 1;
                });
                setBuildingFloorCounts(counts);
              } else {
                setBuildingFloorCounts({});
              }
            }
          }
        } else {
          setBuildingsBySiteId({});
          setBuildingFloorCounts({});
        }
      } catch (e: unknown) {
        toast.error(formatDbError(e) || "Failed to load sites");
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!selectedSiteId) {
      setMemberships([]);
      setErfAsset(null);
      setErfSignedUrl(null);
      setBuildingShapes([]);
      setSiteMachinePositions([]);
      return;
    }
    let ignore = false;
    const loadMembers = async () => {
      const { data, error } = await supabase
        .from("site_memberships")
        .select("id, site_id, user_id, role, created_at")
        .eq("site_id", selectedSiteId)
        .order("created_at", { ascending: false });
      if (!ignore) {
        if (error) {
          // If user doesn't have access, this will fail under RLS; show empty.
          setMemberships([]);
        } else {
          setMemberships((data || []) as any);
        }
      }
    };
    loadMembers();
    return () => {
      ignore = true;
    };
  }, [selectedSiteId]);

  useEffect(() => {
    if (!selectedSiteId) return;
    let ignore = false;
    const loadErfAndShapes = async () => {
      const { data: a, error: aErr } = await supabase
        .from("site_erf_assets")
        .select("site_id, image_path, updated_at")
        .eq("site_id", selectedSiteId)
        .maybeSingle();
      if (!ignore) {
        if (aErr) {
          if (aErr.message?.includes("schema cache") || aErr.message?.includes("does not exist")) {
            toast.error(formatDbError(aErr));
          }
          setErfAsset(null);
          setErfSignedUrl(null);
        } else {
          setErfAsset((a as any) || null);
        }
      }

      const { data: sh, error: shErr } = await supabase
        .from("site_building_shapes")
        .select("id, site_id, building_id, x_pct, y_pct, w_pct, h_pct, label_override, polygon_pct")
        .eq("site_id", selectedSiteId);
      if (!ignore) {
        if (shErr) setBuildingShapes([]);
        else setBuildingShapes((sh || []) as any);
      }

      const { data: mp, error: mpErr } = await supabase
        .from("site_machine_positions")
        .select("id, site_id, machine_id, building_id, x_pct, y_pct")
        .eq("site_id", selectedSiteId);
      if (!ignore) {
        if (mpErr) setSiteMachinePositions([]);
        else setSiteMachinePositions((mp || []) as SiteMachinePositionRow[]);
      }
    };
    loadErfAndShapes();
    return () => {
      ignore = true;
    };
  }, [selectedSiteId]);

  useEffect(() => {
    if (!erfAsset?.image_path) {
      setErfSignedUrl(null);
      return;
    }
    let ignore = false;
    const sign = async () => {
      // Uses existing floorplans bucket to avoid introducing new storage policies right now.
      const { data } = await supabase.storage.from("floorplans").createSignedUrl(erfAsset.image_path, 60 * 60);
      if (!ignore) setErfSignedUrl(data?.signedUrl || null);
    };
    sign();
    return () => {
      ignore = true;
    };
  }, [erfAsset?.image_path]);

  const createSite = async () => {
    if (!user) return;
    if (!newSiteName.trim()) return toast.error("Enter a site name");
    try {
      const ownerId =
        canManageSite && newSiteOwnerId
          ? newSiteOwnerId
          : user.role === "client"
            ? user.id
            : newSiteOwnerId || user.id;

      const { data: created, error } = await supabase.rpc("create_site", {
        p_name: newSiteName.trim(),
        p_address: newSiteAddress.trim() || null,
        p_owner_id: ownerId,
      } as any);
      if (error) throw error;
      const row = (created as any) || null;
      if (!row?.id) throw new Error("Site creation failed");
      toast.success("Site created");
      setSites((prev) => [...prev, row as any].sort((a, b) => a.name.localeCompare(b.name)));
      selectSite(row.id);
      setShowCreateSite(false);
      setNewSiteName("");
      setNewSiteAddress("");
      setNewSiteOwnerId(clientUsersForSiteOwner[0]?.id || "");
    } catch (e: any) {
      toast.error(e?.message || "Failed to create site");
    }
  };

  const createBuilding = async () => {
    if (!selectedSiteId) return;
    if (!newBuildingName.trim()) return toast.error("Enter a building name");
    const floors = Math.max(1, Math.min(20, Number(newBuildingFloors) || 1));
    try {
      const { data: created, error } = await supabase
        .from("buildings")
        .insert({ site_id: selectedSiteId, name: newBuildingName.trim() } as any)
        .select("id, site_id, name, updated_at")
        .maybeSingle();
      if (error) throw error;
      if (!created?.id) throw new Error("Building creation failed");

      // Seed floors (ground + 1..n)
      const floorRows = Array.from({ length: floors }, (_, i) => ({
        building_id: created.id,
        floor_key: i === 0 ? "ground" : `floor_${i + 1}`,
        name: i === 0 ? "Ground" : `Floor ${i + 1}`,
        sort_order: i,
      }));
      await supabase.from("building_floors").insert(floorRows as any);

      toast.success("Building created");
      setBuildingsBySiteId((prev) => ({
        ...prev,
        [selectedSiteId]: [created as any, ...(prev[selectedSiteId] || [])],
      }));
      setBuildingFloorCounts((prev) => ({ ...prev, [created.id]: floors }));
      setShowCreateBuilding(false);
      setNewBuildingName("");
      setNewBuildingFloors(1);
      clearMachinePlacementModes();
      setDraftOutlinePoints([]);
      setOutlineHoverPoint(null);
      setPlacingBuildingId(created.id);
    } catch (e: any) {
      toast.error(e?.message || "Failed to create building");
    }
  };

  const cancelBuildingOutlineDraw = () => {
    setPlacingBuildingId(null);
    setDraftOutlinePoints([]);
    setOutlineHoverPoint(null);
  };

  const clearMachinePlacementModes = () => {
    setMachinePlaceModeId(null);
    setMachineDragId(null);
    setMachineDragPreview(null);
  };

  const saveBuildingOutline = async (buildingId: string, points: OutlinePointPct[]) => {
    if (!selectedSiteId || points.length < OUTLINE_MIN_CORNERS) return;
    const bbox = bboxFromOutlinePoints(points);
    try {
      const { data: saved, error } = await supabase
        .from("site_building_shapes")
        .upsert(
          {
            site_id: selectedSiteId,
            building_id: buildingId,
            ...bbox,
            polygon_pct: points,
          } as any,
          { onConflict: "site_id,building_id" },
        )
        .select("id, site_id, building_id, x_pct, y_pct, w_pct, h_pct, label_override, polygon_pct")
        .maybeSingle();
      if (error) throw error;
      toast.success("Building outline saved");
      setBuildingShapes((prev) => {
        const next = prev.filter((p) => p.building_id !== buildingId);
        if (saved) next.push(saved as BuildingShapeRow);
        return next;
      });
      cancelBuildingOutlineDraw();
    } catch (e: unknown) {
      toast.error(formatDbError(e) || "Failed to save building outline");
    }
  };

  const uploadErfImage = async (file: File) => {
    if (!selectedSiteId) return;
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const safeExt = ["png", "jpg", "jpeg", "webp"].includes(ext) ? ext : "png";
      const path = `site-erf/${selectedSiteId}/${Date.now()}.${safeExt}`;

      const { error: upErr } = await supabase.storage.from("floorplans").upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: saved, error: saveErr } = await supabase
        .from("site_erf_assets")
        .upsert({ site_id: selectedSiteId, image_path: path } as any, { onConflict: "site_id" })
        .select("site_id, image_path, updated_at")
        .maybeSingle();
      if (saveErr) throw saveErr;

      toast.success("ERF image uploaded");
      setErfAsset((saved as any) || null);
    } catch (e: unknown) {
      toast.error(formatDbError(e) || "Failed to upload ERF image");
    }
  };

  const siteMachines = useMemo(() => {
    if (!selectedSite?.owner_id) return [];
    const ownerId = selectedSite.owner_id;
    const pinnedIds = new Set(siteMachinePositions.map((p) => p.machine_id));
    return machines.filter((m) => m.ownerId === ownerId || pinnedIds.has(m.id));
  }, [machines, selectedSite?.owner_id, siteMachinePositions]);

  const machinePositionByMachineId = useMemo(() => {
    const map = new Map<string, SiteMachinePositionRow>();
    siteMachinePositions.forEach((p) => map.set(p.machine_id, p));
    return map;
  }, [siteMachinePositions]);

  const machineMetaById = useMemo(() => {
    const map: Record<string, { name: string; type?: MachineType | string }> = {};
    siteMachines.forEach((m) => {
      map[m.id] = { name: m.name, type: m.type };
    });
    return map;
  }, [siteMachines]);

  const buildingNameById = useMemo(() => {
    const map: Record<string, string> = {};
    const list = selectedSiteId ? buildingsBySiteId[selectedSiteId] || [] : [];
    list.forEach((b) => {
      map[b.id] = b.name;
    });
    return map;
  }, [buildingsBySiteId, selectedSiteId]);

  const placementPreviewBuildingId = useMemo(() => {
    if (!outlineHoverPoint) return null;
    return nearestBuildingIdForPoint(outlineHoverPoint, buildingShapes);
  }, [outlineHoverPoint, buildingShapes]);

  const dragPreviewBuildingId = useMemo(() => {
    if (!machineDragPreview) return null;
    return nearestBuildingIdForPoint(machineDragPreview, buildingShapes);
  }, [machineDragPreview, buildingShapes]);

  const resolveBuildingAt = (x_pct: number, y_pct: number) =>
    nearestBuildingIdForPoint({ x_pct, y_pct }, buildingShapes);

  const setMachineHover = (machineId: string, buildingId: string | null) => {
    setHoveredMachineId(machineId);
    if (buildingId) setHoveredBuildingId(buildingId);
  };

  const clearMachineHover = () => {
    setHoveredMachineId(null);
    setHoveredBuildingId(null);
  };

  const pctFromClientPoint = (clientX: number, clientY: number) => {
    const rect = erfCanvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return {
      x_pct: Math.max(2, Math.min(98, x)),
      y_pct: Math.max(2, Math.min(98, y)),
    };
  };

  const removeMachineFromErf = async (machineId: string) => {
    if (!selectedSiteId) return;
    try {
      const { error } = await supabase
        .from("site_machine_positions")
        .delete()
        .eq("site_id", selectedSiteId)
        .eq("machine_id", machineId);
      if (error) throw error;
      setSiteMachinePositions((prev) => prev.filter((p) => p.machine_id !== machineId));
      if (machinePlaceModeId === machineId) clearMachinePlacementModes();
      if (hoveredMachineId === machineId) clearMachineHover();
      toast.success("Machine removed from plan");
    } catch (e: unknown) {
      toast.error(formatDbError(e) || "Failed to remove machine from plan");
    }
  };

  const saveMachineOnErf = async (machineId: string, x_pct: number, y_pct: number) => {
    if (!selectedSiteId) return;
    const building_id = resolveBuildingAt(x_pct, y_pct);
    try {
      const { data: saved, error } = await supabase
        .from("site_machine_positions")
        .upsert({ site_id: selectedSiteId, machine_id: machineId, x_pct, y_pct, building_id } as any, {
          onConflict: "site_id,machine_id",
        })
        .select("id, site_id, machine_id, building_id, x_pct, y_pct")
        .maybeSingle();
      if (error) throw error;
      setSiteMachinePositions((prev) => {
        const next = prev.filter((p) => p.machine_id !== machineId);
        if (saved) next.push(saved as SiteMachinePositionRow);
        return next;
      });
      toast.success("Machine placed on ERF");
    } catch (e: unknown) {
      toast.error(formatDbError(e) || "Failed to place machine");
    }
  };

  const onErfMachineDrop = (evt: React.DragEvent<HTMLDivElement>) => {
    evt.preventDefault();
    const machineId = evt.dataTransfer.getData("text/machine-id");
    if (!machineId) return;
    const pt = pctFromClientPoint(evt.clientX, evt.clientY);
    if (!pt) return;
    void saveMachineOnErf(machineId, pt.x_pct, pt.y_pct);
  };

  const addOutlineCornerAt = (clientX: number, clientY: number, pointerType: string) => {
    if (!placingBuildingId) return;
    const pt = pctFromClientPoint(clientX, clientY);
    if (!pt) return;

    const snap = outlineSnapThresholdPct(pointerType);
    if (draftOutlinePoints.length >= OUTLINE_MIN_CORNERS && isNearOutlinePoint(pt, draftOutlinePoints[0], snap)) {
      void saveBuildingOutline(placingBuildingId, draftOutlinePoints);
      return;
    }

    setDraftOutlinePoints((prev) => [...prev, pt]);
  };

  const erfCanvasInteractive = Boolean(placingBuildingId || machinePlaceModeId || machineDragId);
  const canCloseDraftOutline = draftOutlinePoints.length >= OUTLINE_MIN_CORNERS;

  const closeDraftOutline = () => {
    if (!placingBuildingId || !canCloseDraftOutline) return;
    void saveBuildingOutline(placingBuildingId, draftOutlinePoints);
  };

  const handleErfPointerDown = (evt: React.PointerEvent<HTMLDivElement>) => {
    if ((evt.target as HTMLElement).closest("[data-erf-machine-pin], [data-erf-machine-hit], [data-erf-outline-ui], [data-erf-building-hit]")) {
      return;
    }

    erfPointerStartRef.current = { x: evt.clientX, y: evt.clientY };

    if (placingBuildingId || machinePlaceModeId) {
      evt.currentTarget.setPointerCapture(evt.pointerId);
    }
  };

  const handleErfPointerMove = (evt: React.PointerEvent<HTMLDivElement>) => {
    const pt = pctFromClientPoint(evt.clientX, evt.clientY);
    if ((placingBuildingId || machinePlaceModeId) && pt) {
      setOutlineHoverPoint(pt);
      if (machinePlaceModeId) {
        setHoveredMachineId(machinePlaceModeId);
        const bid = resolveBuildingAt(pt.x_pct, pt.y_pct);
        if (bid) setHoveredBuildingId(bid);
      }
    } else if (!machineDragId) {
      setOutlineHoverPoint(null);
    }

    if (machineDragId && pt) {
      setMachineDragPreview(pt);
      setHoveredMachineId(machineDragId);
      const bid = resolveBuildingAt(pt.x_pct, pt.y_pct);
      if (bid) setHoveredBuildingId(bid);
    }
  };

  const handleErfPointerUp = (evt: React.PointerEvent<HTMLDivElement>) => {
    if ((evt.target as HTMLElement).closest("[data-erf-outline-ui]")) return;

    const start = erfPointerStartRef.current;
    erfPointerStartRef.current = null;

    const pt = pctFromClientPoint(evt.clientX, evt.clientY);
    if (!pt) return;

    if (placingBuildingId && canCloseDraftOutline) {
      const snap = outlineSnapThresholdPct(evt.pointerType);
      if (isNearOutlinePoint(pt, draftOutlinePoints[0], snap)) {
        void saveBuildingOutline(placingBuildingId, draftOutlinePoints);
        return;
      }
    }

    if (machineDragId) {
      const moved = start ? pointerMovedBeyondTap(start, { x: evt.clientX, y: evt.clientY }, 8) : true;
      if (moved) {
        void saveMachineOnErf(machineDragId, pt.x_pct, pt.y_pct);
      }
      setMachineDragId(null);
      setMachineDragPreview(null);
      setHoveredMachineId(null);
      return;
    }

    // Place machine on any release while in place mode (preview may have moved with the pointer).
    if (machinePlaceModeId) {
      void saveMachineOnErf(machinePlaceModeId, pt.x_pct, pt.y_pct);
      setMachinePlaceModeId(null);
      setOutlineHoverPoint(null);
      return;
    }

    if (!start || pointerMovedBeyondTap(start, { x: evt.clientX, y: evt.clientY })) {
      return;
    }

    if (placingBuildingId) {
      addOutlineCornerAt(evt.clientX, evt.clientY, evt.pointerType);
    }
  };

  const handleErfPointerLeave = () => {
    if (!placingBuildingId) setOutlineHoverPoint(null);
    if (!placingBuildingId && !machinePlaceModeId && !machineDragId) {
      setHoveredBuildingId(null);
      setHoveredMachineId(null);
    }
  };

  const startMachinePinDrag = (evt: React.PointerEvent, machineId: string, x_pct: number, y_pct: number) => {
    evt.stopPropagation();
    evt.preventDefault();
    clearMachinePlacementModes();
    setMachineDragId(machineId);
    setMachineDragPreview({ x_pct, y_pct });
    erfCanvasRef.current?.setPointerCapture(evt.pointerId);
  };

  const addMember = async () => {
    if (!selectedSiteId) return;
    if (!memberUserId) return toast.error("Choose a user");
    try {
      const { error } = await supabase.from("site_memberships").upsert({
        site_id: selectedSiteId,
        user_id: memberUserId,
        role: memberRole,
        created_by: user?.id ?? null,
      } as any, { onConflict: "site_id,user_id" });
      if (error) throw error;
      toast.success("Member added");
      setShowAddMember(false);
      setMemberUserId("");
      setMemberRole("viewer");
      // reload
      const { data } = await supabase
        .from("site_memberships")
        .select("id, site_id, user_id, role, created_at")
        .eq("site_id", selectedSiteId)
        .order("created_at", { ascending: false });
      setMemberships((data || []) as any);
    } catch (e: any) {
      toast.error(e?.message || "Failed to add member");
    }
  };

  const openEditSite = () => {
    if (!selectedSite) return;
    setEditSiteName(selectedSite.name);
    setEditSiteAddress(selectedSite.address || "");
    setEditSiteOwnerId(selectedSite.owner_id);
    setShowEditSite(true);
  };

  const updateSite = async () => {
    if (!selectedSiteId) return;
    if (!editSiteName.trim()) return toast.error("Enter a site name");
    if (canManageSite && !editSiteOwnerId) return toast.error("Choose the site owner (client)");
    try {
      const { data, error } = await supabase
        .from("sites")
        .update({
          name: editSiteName.trim(),
          address: editSiteAddress.trim() || null,
          ...(canManageSite ? { owner_id: editSiteOwnerId } : {}),
        } as any)
        .eq("id", selectedSiteId)
        .select("id, name, address, owner_id, updated_at")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Site update failed");
      setSites((prev) =>
        prev.map((s) => (s.id === selectedSiteId ? (data as SiteRow) : s)).sort((a, b) => a.name.localeCompare(b.name)),
      );
      toast.success("Site updated");
      setShowEditSite(false);
    } catch (e: unknown) {
      toast.error(formatDbError(e) || "Failed to update site");
    }
  };

  const deleteSite = async () => {
    if (!selectedSiteId) return;
    const siteId = selectedSiteId;
    try {
      const { error } = await supabase.from("sites").delete().eq("id", siteId);
      if (error) throw error;
      toast.success("Site deleted");
      setShowDeleteSite(false);
      setSites((prev) => {
        const next = prev.filter((s) => s.id !== siteId);
        const nextId = next[0]?.id || "";
        selectSite(nextId);
        if (!nextId) {
          setSelectedSiteId("");
          try {
            sessionStorage.removeItem(SITE_SELECTION_STORAGE_KEY);
          } catch {
            // ignore
          }
        }
        return next;
      });
      setBuildingsBySiteId((prev) => {
        const copy = { ...prev };
        delete copy[siteId];
        return copy;
      });
      setBuildingShapes([]);
      setSiteMachinePositions([]);
      setErfAsset(null);
      setErfSignedUrl(null);
      setMemberships([]);
    } catch (e: unknown) {
      toast.error(formatDbError(e) || "Failed to delete site");
    }
  };

  const deleteBuilding = async (buildingId: string) => {
    if (!selectedSiteId) return;
    try {
      const { error: posErr } = await supabase
        .from("site_machine_positions")
        .delete()
        .eq("site_id", selectedSiteId)
        .eq("building_id", buildingId);
      if (posErr) throw posErr;

      const { error } = await supabase.from("buildings").delete().eq("id", buildingId);
      if (error) throw error;

      setSiteMachinePositions((prev) => prev.filter((p) => p.building_id !== buildingId));
      setBuildingShapes((prev) => prev.filter((p) => p.building_id !== buildingId));
      setBuildingsBySiteId((prev) => ({
        ...prev,
        [selectedSiteId]: (prev[selectedSiteId] || []).filter((b) => b.id !== buildingId),
      }));
      setBuildingFloorCounts((prev) => {
        const next = { ...prev };
        delete next[buildingId];
        return next;
      });
      if (placingBuildingId === buildingId) cancelBuildingOutlineDraw();
      if (hoveredBuildingId === buildingId) setHoveredBuildingId(null);
      setDeleteBuildingId(null);
      toast.success("Building deleted — machines moved back to Not on plan");
    } catch (e: unknown) {
      toast.error(formatDbError(e) || "Failed to delete building");
    }
  };

  const removeMember = async (membershipId: string) => {
    try {
      const { error } = await supabase.from("site_memberships").delete().eq("id", membershipId);
      if (error) throw error;
      toast.success("Member removed");
      setMemberships((prev) => prev.filter((m) => m.id !== membershipId));
    } catch (e: any) {
      toast.error(e?.message || "Failed to remove member");
    }
  };

  const userNameById = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach((u) => (map[u.id] = u.name));
    return map;
  }, [users]);

  const siteOwnerLabel = useMemo(() => {
    if (!selectedSite) return "";
    return userNameById[selectedSite.owner_id] || selectedSite.owner_id;
  }, [selectedSite, userNameById]);

  const siteBuildingColorOrder = useMemo(() => {
    const list = selectedSiteId ? buildingsBySiteId[selectedSiteId] || [] : [];
    return [...list].sort((a, b) => a.name.localeCompare(b.name)).map((b) => b.id);
  }, [buildingsBySiteId, selectedSiteId]);

  const { unplacedMachines, onPlanUnassignedMachines, machinesByBuildingId } = useMemo(() => {
    const unplaced: MachineStatus[] = [];
    const onPlanUnassigned: MachineStatus[] = [];
    const byBuilding = new Map<string, MachineStatus[]>();

    siteMachines.forEach((m) => {
      const pos = machinePositionByMachineId.get(m.id);
      if (!pos) {
        unplaced.push(m);
        return;
      }
      if (pos.building_id) {
        const list = byBuilding.get(pos.building_id) || [];
        list.push(m);
        byBuilding.set(pos.building_id, list);
      } else {
        onPlanUnassigned.push(m);
      }
    });

    const sortByName = (a: MachineStatus, b: MachineStatus) => a.name.localeCompare(b.name);
    unplaced.sort(sortByName);
    onPlanUnassigned.sort(sortByName);
    byBuilding.forEach((list) => list.sort(sortByName));

    return {
      unplacedMachines: unplaced,
      onPlanUnassignedMachines: onPlanUnassigned,
      machinesByBuildingId: byBuilding,
    };
  }, [siteMachines, machinePositionByMachineId]);

  const renderMachineCard = (m: MachineStatus, buildingId: string | null) => {
    const pos = machinePositionByMachineId.get(m.id);
    const accent = machinePinAccent(buildingId, siteBuildingColorOrder);
    const isHovered = hoveredMachineId === m.id;
    const isPlacing = machinePlaceModeId === m.id;
    const Icon = machineTypeIcon(m.type);

    return (
      <Card
        key={m.id}
        className={[
          "p-3 border bg-white transition-shadow",
          isHovered || isPlacing ? "border-2 shadow-md" : "border border-black/10",
        ].join(" ")}
        style={
          isHovered || isPlacing
            ? { borderColor: accent.stroke, boxShadow: `0 0 0 1px ${accent.stroke}33` }
            : undefined
        }
        onMouseEnter={() => setMachineHover(m.id, buildingId)}
        onMouseLeave={() => {
          setHoveredMachineId((id) => (id === m.id ? null : id));
          if (buildingId) setHoveredBuildingId((id) => (id === buildingId ? null : id));
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2 text-left">
            <span
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 bg-white shadow-sm"
              style={{ borderColor: accent.stroke }}
              title={machineTypeLabel(m.type)}
            >
              <Icon className="h-4 w-4" style={{ color: accent.strokeDark }} aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#1A2B1C] truncate">{m.name}</div>
              <div className="text-xs text-muted-foreground truncate">{machineTypeLabel(m.type)}</div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                erfPointerStartRef.current = null;
                setPlacingBuildingId(null);
                setDraftOutlinePoints([]);
                setOutlineHoverPoint(null);
                clearMachinePlacementModes();
                setMachinePlaceModeId(m.id);
              }}
            >
              {pos ? "Reposition" : "Place on plan"}
            </Button>
            {pos && canManageSite && (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => void removeMachineFromErf(m.id)}
              >
                Remove from plan
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const buildingsAndMachinesLayout = () => {
    if (!selectedSiteId) {
      return <div className="text-sm text-muted-foreground">Select a site to manage buildings and machines.</div>;
    }

    const buildings = [...(buildingsBySiteId[selectedSiteId] || [])].sort((a, b) => a.name.localeCompare(b.name));

    return (
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(240px,28%)_minmax(0,1fr)]">
        <Card className="border border-black/10 bg-white p-4 xl:sticky xl:top-4">
          <div className="text-sm font-semibold">Not on plan</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Place machines on the ERF — they move under a building when dropped inside its outline. Multiple machines per
            building keep the same icon size and fan out slightly so they stay visible.
          </p>
          {machinePlaceModeId && unplacedMachines.some((m) => m.id === machinePlaceModeId) && (
            <p className="mt-2 text-xs text-primary">Tap the ERF image above to place the selected machine.</p>
          )}
          <div className="mt-3 space-y-2">
            {siteMachines.length === 0 ? (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  No machines for site owner <strong className="text-[#0D2211]">{siteOwnerLabel || "—"}</strong>.
                </p>
                <p className="text-xs">
                  Machines must belong to the same client as the site. Use <strong>Edit site</strong> → Site owner (client)
                  — e.g. assign Neil Britz if his machines should appear here.
                </p>
              </div>
            ) : unplacedMachines.length === 0 && onPlanUnassignedMachines.length === 0 ? (
              <p className="text-sm text-muted-foreground">All machines are on the plan under a building.</p>
            ) : (
              <>
                {unplacedMachines.map((m) => renderMachineCard(m, null))}
                {onPlanUnassignedMachines.length > 0 && (
                  <div className="space-y-2 border-t border-black/10 pt-3">
                    <p className="text-xs font-medium text-muted-foreground">On plan — outside building outlines</p>
                    {onPlanUnassignedMachines.map((m) => renderMachineCard(m, null))}
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          {buildings.length === 0 ? (
            <Card className="border border-black/10 bg-white p-4">
              <p className="text-sm text-muted-foreground">No buildings yet. Add a building, then draw its outline on the ERF.</p>
            </Card>
          ) : (
            buildings.map((row) => {
              const color = buildingOutlineColor(row.id, siteBuildingColorOrder);
              const isBuildingHovered = hoveredBuildingId === row.id;
              const buildingMachines = machinesByBuildingId.get(row.id) || [];

              return (
                <Card
                  key={row.id}
                  className={[
                    "border bg-white p-4 transition-shadow",
                    isBuildingHovered ? "border-2 shadow-md" : "border-black/10",
                  ].join(" ")}
                  style={
                    isBuildingHovered
                      ? { borderColor: color.stroke, boxShadow: `0 0 0 1px ${color.stroke}33` }
                      : undefined
                  }
                  onMouseEnter={() => {
                    setHoveredMachineId(null);
                    setHoveredBuildingId(row.id);
                  }}
                  onMouseLeave={() => setHoveredBuildingId((id) => (id === row.id ? null : id))}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2 text-left">
                      <span
                        className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border border-black/15 shadow-sm"
                        style={{ backgroundColor: color.fill, boxShadow: `inset 0 0 0 1px ${color.stroke}` }}
                        title="Colour on site plan"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#1A2B1C] truncate">{row.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {buildingFloorCounts[row.id] ?? "—"} floor{(buildingFloorCounts[row.id] || 0) === 1 ? "" : "s"}
                          {buildingMachines.length > 0
                            ? ` · ${buildingMachines.length} machine${buildingMachines.length === 1 ? "" : "s"}`
                            : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          clearMachinePlacementModes();
                          setDraftOutlinePoints([]);
                          setOutlineHoverPoint(null);
                          setPlacingBuildingId(row.id);
                        }}
                      >
                        Draw outline
                      </Button>
                      {canManageSite && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteBuildingId(row.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 space-y-2 border-t border-black/10 pt-3">
                    {buildingMachines.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No machines in this building yet — place one inside its outline on the ERF.
                      </p>
                    ) : (
                      buildingMachines.map((m) => renderMachineCard(m, row.id))
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    );
  };

  if (!user) return null;

  const content = (
    <>
      <main
        className={[
          "mx-auto flex w-full max-w-[1600px] flex-col gap-4",
          embedded ? "p-4 sm:p-6" : "px-4 py-8 sm:px-6",
        ].join(" ")}
      >
        {/* Site ERF map only */}
        <Card className="w-full p-4 border border-black/10 bg-white">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">Site ERF</div>
            {(user.role === "super_admin" || user.role === "company" || user.role === "installer") && (
              <>
                <input
                  ref={erfFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadErfImage(f);
                    if (e.target) e.target.value = "";
                  }}
                />
                <Button variant="outline" disabled={!selectedSiteId} onClick={() => erfFileInputRef.current?.click()}>
                  Upload ERF image
                </Button>
              </>
            )}
          </div>

          <div className="mt-2 w-full rounded-xl border border-black/10 bg-[hsl(var(--gradient-control))] overflow-hidden">
              <div
                ref={erfCanvasRef}
                className={[
                  "relative w-full aspect-[16/9] select-none touch-none",
                  placingBuildingId ? "cursor-crosshair" : "cursor-default",
                  machinePlaceModeId ? "ring-2 ring-primary/40 ring-inset" : "",
                ].join(" ")}
                style={{ touchAction: erfCanvasInteractive ? "none" : "manipulation" }}
                onPointerDown={handleErfPointerDown}
                onPointerMove={handleErfPointerMove}
                onPointerUp={handleErfPointerUp}
                onPointerCancel={handleErfPointerLeave}
                onPointerLeave={handleErfPointerLeave}
                onDragOver={(e) => {
                  if (e.dataTransfer.types.includes("text/machine-id")) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }
                }}
                onDrop={onErfMachineDrop}
                title={
                  placingBuildingId
                    ? "Tap corners; tap the first corner again to snap closed"
                    : machinePlaceModeId
                      ? "Tap the plan to place the selected machine"
                      : "Select a machine in the panel below, then tap the plan — or drag on desktop"
                }
              >
                {erfSignedUrl ? (
                  <img src={erfSignedUrl} alt="ERF plan" className="absolute inset-0 h-full w-full object-contain" />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                    No ERF image uploaded yet.
                  </div>
                )}

                <SiteErfOutlineLayer
                  shapes={buildingShapes}
                  draftPoints={draftOutlinePoints}
                  hoverPoint={outlineHoverPoint}
                  placingBuildingId={placingBuildingId}
                  orderedBuildingIds={siteBuildingColorOrder}
                  highlightedBuildingId={hoveredBuildingId}
                  onBuildingHover={(buildingId) => {
                    setHoveredMachineId(null);
                    setHoveredBuildingId(buildingId);
                  }}
                  onBuildingHoverEnd={() => setHoveredBuildingId(null)}
                  canCloseDraft={canCloseDraftOutline}
                  onFinishOutline={closeDraftOutline}
                />

                <SiteErfMachinePins
                  pins={siteMachinePositions}
                  machineMetaById={machineMetaById}
                  orderedBuildingIds={siteBuildingColorOrder}
                  highlightedMachineId={hoveredMachineId}
                  placingMachineId={machinePlaceModeId}
                  machineDragId={machineDragId}
                  machineDragPreview={machineDragPreview}
                  placementPreview={machinePlaceModeId ? outlineHoverPoint : null}
                  placementPreviewBuildingId={placementPreviewBuildingId}
                  dragPreviewBuildingId={dragPreviewBuildingId}
                  hoverEnabled={!placingBuildingId && !machinePlaceModeId}
                  onMachineHover={setMachineHover}
                  onMachineHoverEnd={clearMachineHover}
                  onPinPointerDown={startMachinePinDrag}
                  onPinDragStart={(e, machineId) => {
                    e.dataTransfer.setData("text/machine-id", machineId);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onPinDragEnd={(e, machineId) => {
                    const pt = pctFromClientPoint(e.clientX, e.clientY);
                    if (pt) void saveMachineOnErf(machineId, pt.x_pct, pt.y_pct);
                  }}
                />

                {machinePlaceModeId && (
                  <>
                    <div className="pointer-events-none absolute left-3 bottom-3 z-20 max-w-[min(100%,20rem)] rounded-lg border border-black/10 bg-white/95 px-3 py-2 text-xs text-[#1A2B1C] shadow-sm">
                      <div className="font-semibold">Place machine on plan</div>
                      <div className="mt-1 text-[#1A2B1C]/85">
                        Tap the ERF to drop the icon. It links to the nearest building outline.
                      </div>
                    </div>
                    <button
                      type="button"
                      className="absolute right-3 top-3 z-20 min-h-[2.5rem] rounded-full border border-black/10 bg-white/95 px-3 py-2 text-xs font-medium text-[#0D2211] shadow-sm hover:bg-white sm:py-1"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        clearMachinePlacementModes();
                        setOutlineHoverPoint(null);
                      }}
                    >
                      Cancel placement
                    </button>
                  </>
                )}

                {placingBuildingId && (
                  <button
                    type="button"
                    className="absolute right-3 top-3 z-20 min-h-[2.5rem] rounded-full border border-black/10 bg-white/95 px-3 py-2 text-xs font-medium text-[#0D2211] shadow-sm hover:bg-white sm:py-1"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      cancelBuildingOutlineDraw();
                    }}
                  >
                    Cancel drawing
                  </button>
                )}
              </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_min(320px,28%)] lg:items-start">
          <div className="flex min-w-0 flex-col gap-4">
            {buildingsAndMachinesLayout()}

            <Card className="p-4 border border-black/10 bg-white">
              <div className="text-sm font-semibold mb-2">Site access list</div>
              <div className="space-y-2">
                {memberships.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No explicit members yet. Owner always has access.</div>
                ) : (
                  memberships.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-black/10 p-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{userNameById[m.user_id] || m.user_id}</div>
                        <div className="text-xs text-muted-foreground truncate">{m.role}</div>
                      </div>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => removeMember(m.id)}>
                        Remove
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <Card className="p-4 border border-black/10 bg-white lg:sticky lg:top-4">
            <div className="text-sm font-medium text-[#5A7A5E]">Selected site</div>
            <div className="mt-0.5 text-lg font-bold truncate text-[#0D2211]">{selectedSite?.name || "—"}</div>
            <div className="text-sm text-[#3D5240] truncate">{selectedSite?.address || ""}</div>
            {selectedSite && (
              <div className="mt-1 text-xs text-[#5A7A5E]">
                Site owner: <span className="font-medium text-[#0D2211]">{siteOwnerLabel}</span>
              </div>
            )}
            <div className="mt-3 flex flex-col gap-2">
              {canManageSite && (
                <>
                  <Button variant="outline" className="w-full" disabled={!selectedSiteId} onClick={openEditSite}>
                    Edit site
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={!selectedSiteId}
                    onClick={() => {
                      setShowCreateBuilding(true);
                      setNewBuildingName("");
                      setNewBuildingFloors(1);
                    }}
                  >
                    Add building
                  </Button>
                  <Button variant="outline" className="w-full" disabled={!selectedSiteId} onClick={() => setShowAddMember(true)}>
                    Add access
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-destructive hover:text-destructive"
                    disabled={!selectedSiteId}
                    onClick={() => setShowDeleteSite(true)}
                  >
                    Delete site
                  </Button>
                </>
              )}
            </div>

            <div className="mt-5 border-t border-black/10 pt-4">
              <div className="text-sm font-semibold mb-2">Your accessible sites</div>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : sites.length === 0 ? (
                <div className="text-sm text-muted-foreground">No sites yet.</div>
              ) : (
                <div className="max-h-[min(50vh,28rem)] space-y-2 overflow-auto pr-1">
                  {sites.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        selectedSiteId === s.id
                          ? "border-[#0D2211] bg-[#E8F5E9] shadow-sm"
                          : "border-black/10 hover:bg-black/5"
                      }`}
                      onClick={() => selectSite(s.id)}
                    >
                      <div
                        className={`text-sm font-semibold ${
                          selectedSiteId === s.id ? "text-[#0D2211]" : "text-[#1A2B1C]"
                        }`}
                      >
                        {s.name}
                      </div>
                      <div
                        className={`text-xs truncate ${
                          selectedSiteId === s.id ? "text-[#3D5240]" : "text-muted-foreground"
                        }`}
                      >
                        {s.address || "—"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </main>

      <Dialog open={showCreateSite} onOpenChange={setShowCreateSite}>
        <DialogContent className="bg-white border border-black/10">
          <DialogHeader>
            <DialogTitle>Create site</DialogTitle>
            <DialogDescription>Sites can contain multiple buildings.</DialogDescription>
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
            {canManageSite && (
              <div className="space-y-2">
                <Label>Site owner (client)</Label>
                <Select
                  value={newSiteOwnerId || undefined}
                  onValueChange={setNewSiteOwnerId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose client who owns machines on this site…" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientUsersForSiteOwner.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Only this client&apos;s machines can be placed on the ERF (e.g. Neil Britz).
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSite(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#0D2211] text-white hover:bg-[#1A3A1E]"
              disabled={canManageSite && !newSiteOwnerId}
              onClick={createSite}
            >
              Create site
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateBuilding} onOpenChange={setShowCreateBuilding}>
        <DialogContent className="bg-white border border-black/10">
          <DialogHeader>
            <DialogTitle>Add building</DialogTitle>
            <DialogDescription>
              Set floors, then tap corners on the ERF. Add as many points as you need, then tap the first dot to close the shape and save the building.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Building name</Label>
              <Input value={newBuildingName} onChange={(e) => setNewBuildingName(e.target.value)} placeholder="e.g. Admin Block" />
            </div>
            <div className="space-y-2">
              <Label>Number of floors</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={String(newBuildingFloors)}
                onChange={(e) => setNewBuildingFloors(Number(e.target.value))}
              />
              <div className="text-xs text-muted-foreground">We’ll auto-create floors (Ground, Floor 2, …).</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateBuilding(false)}>
              Cancel
            </Button>
            <Button className="bg-[#0D2211] text-white hover:bg-[#1A3A1E]" onClick={createBuilding}>
              Create & place
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditSite} onOpenChange={setShowEditSite}>
        <DialogContent className="bg-white border border-black/10">
          <DialogHeader>
            <DialogTitle>Edit site</DialogTitle>
            <DialogDescription>
              Update the site name, address, and which client owns machines on this ERF plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Site name</Label>
              <Input value={editSiteName} onChange={(e) => setEditSiteName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Address (optional)</Label>
              <Input value={editSiteAddress} onChange={(e) => setEditSiteAddress(e.target.value)} />
            </div>
            {canManageSite && (
              <div className="space-y-2">
                <Label>Site owner (client)</Label>
                <Select value={editSiteOwnerId || undefined} onValueChange={setEditSiteOwnerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose client…" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientUsersForSiteOwner.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditSite(false)}>
              Cancel
            </Button>
            <Button className="bg-[#0D2211] text-white hover:bg-[#1A3A1E]" onClick={updateSite}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteSite} onOpenChange={setShowDeleteSite}>
        <AlertDialogContent className="bg-white border border-black/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete site?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{selectedSite?.name}</strong>, all buildings, ERF outlines, machine pins,
              and site access entries. Machines themselves are not deleted — only their positions on this site plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void deleteSite()}
            >
              Delete site
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteBuildingId != null} onOpenChange={(open) => !open && setDeleteBuildingId(null)}>
        <AlertDialogContent className="bg-white border border-black/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete building?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes <strong>{deleteBuildingId ? buildingNameById[deleteBuildingId] || "this building" : "this building"}</strong>,
              its floorplans, and ERF outline. Machines on this building are removed from the plan and return to{" "}
              <strong>Not on plan</strong> (they are not deleted from your account).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteBuildingId && void deleteBuilding(deleteBuildingId)}
            >
              Delete building
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="bg-white border border-black/10">
          <DialogHeader>
            <DialogTitle>Add site access</DialogTitle>
            <DialogDescription>Grant a user access to view/manage this site (and its buildings).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>User</Label>
              <Select value={memberUserId} onValueChange={setMemberUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user…" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={memberRole} onValueChange={(v) => setMemberRole(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">viewer</SelectItem>
                  <SelectItem value="installer">installer</SelectItem>
                  <SelectItem value="company">company</SelectItem>
                  <SelectItem value="manager">manager</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                company/installer/manager can manage layouts; viewer is read-only.
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMember(false)}>
              Cancel
            </Button>
            <Button className="bg-[#0D2211] text-white hover:bg-[#1A3A1E]" onClick={addMember}>
              Add access
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
        title="Sites"
        subtitle="Create sites • assign access • then add buildings"
        rightActions={
          <>
            {(user.role === "super_admin" || user.role === "company" || user.role === "installer") && (
              <Button
                className="bg-[#0D2211] text-white hover:bg-[#1A3A1E]"
                onClick={() => {
                  setNewSiteName("");
                  setNewSiteAddress("");
                  setNewSiteOwnerId(clientUsersForSiteOwner[0]?.id || "");
                  setShowCreateSite(true);
                }}
              >
                New site
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate("/buildings")}>
              Buildings
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
          </>
        }
      />

      {content}
    </div>
  );
};

export default Sites;

