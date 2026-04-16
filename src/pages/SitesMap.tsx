import React, { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Fix default marker icons for Vite bundling
import marker2x from "leaflet/dist/images/marker-icon-2x.png";
import marker from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x,
  iconUrl: marker,
  shadowUrl: markerShadow,
});

type SiteRow = {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
  updated_at: string;
};

type GooglePrediction = { place_id: string; description: string };

function FlyTo({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!center) return;
    map.flyTo(center, Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [center, map]);
  return null;
}

const DEFAULT_CENTER: [number, number] = [-26.2041, 28.0473]; // Johannesburg

const SitesMap: React.FC = () => {
  const { user } = useAuth();

  const [sites, setSites] = useState<SiteRow[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const selectedSite = useMemo(() => sites.find((s) => s.id === selectedSiteId) || null, [selectedSiteId, sites]);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GooglePrediction[]>([]);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [mapFocus, setMapFocus] = useState<[number, number] | null>(null);
  const [openResults, setOpenResults] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const loadSites = async () => {
    if (!user) return;
    const query = supabase.from("sites").select("*").order("created_at", { ascending: false });
    const { data, error } = user.role === "super_admin" ? await query : await query.eq("owner_id", user.id);
    if (error) return;
    setSites((data || []) as SiteRow[]);
  };

  useEffect(() => {
    loadSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  const doAutocomplete = async (query: string) => {
    const input = query.trim();
    if (!input || !user) return;
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-places", {
        body: { action: "autocomplete", input, country: "za" },
      });
      if (error) {
        setResults([]);
        return;
      }
      setResults((data?.predictions ?? []) as GooglePrediction[]);
    } finally {
      setSearching(false);
    }
  };

  const pickResult = async (p: GooglePrediction) => {
    if (!user) return;
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-places", {
        body: { action: "details", placeId: p.place_id },
      });
      if (error) return;
      const place = data?.place;
      const lat = Number(place?.lat);
      const lng = Number(place?.lng);
      setAddress((place?.formatted_address as string) || p.description);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setPicked({ lat, lng });
        setMapFocus([lat, lng]);
      } else {
        setPicked(null);
      }
      setOpenResults(false);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const query = q.trim();
    if (!query) {
      setResults([]);
      setOpenResults(false);
      return;
    }
    setOpenResults(true);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      doAutocomplete(query);
    }, 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, user?.id]);

  const saveSite = async () => {
    if (!user) return;
    const n = name.trim();
    if (!n) return;
    setSaving(true);
    try {
      const payload = {
        owner_id: user.id,
        name: n,
        address: address.trim() || null,
        lat: picked?.lat ?? null,
        lng: picked?.lng ?? null,
      };
      const { error } = await supabase.from("sites").insert(payload);
      if (!error) {
        setName("");
        setAddress("");
        setQ("");
        setResults([]);
        setPicked(null);
        await loadSites();
      }
    } finally {
      setSaving(false);
    }
  };

  const focusSite = (s: SiteRow) => {
    setSelectedSiteId(s.id);
    if (s.lat != null && s.lng != null) setMapFocus([s.lat, s.lng]);
  };

  const navigateLink = (s: SiteRow) => {
    if (s.lat == null || s.lng == null) return null;
    const url = new URL("https://www.google.com/maps/dir/");
    url.searchParams.set("api", "1");
    url.searchParams.set("destination", `${s.lat},${s.lng}`);
    return url.toString();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-[1600px] px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-lg font-semibold text-foreground leading-tight">Sites Map</div>
            <div className="text-xs text-muted-foreground">
              Leaflet + OpenStreetMap tiles. Address search uses Google Places (Pay-as-you-go).
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 py-5 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
        <Card className="p-4 border border-border shadow-sm">
          <div className="text-sm font-semibold text-foreground mb-2">Add site</div>

          <div className="space-y-2">
            <div className="space-y-1">
              <Label>Site name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Crown HQ - Sandton" />
            </div>

            <div className="space-y-1">
              <Label>Address search</Label>
              <div className="relative">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Start typing an address…"
                  onFocus={() => q.trim() && setOpenResults(true)}
                  onBlur={() => {
                    // allow click selection before closing
                    window.setTimeout(() => setOpenResults(false), 120);
                  }}
                />
                {openResults && (searching || results.length > 0) && (
                  <div className="absolute z-20 mt-2 w-full rounded-lg border border-border bg-background shadow-lg overflow-hidden">
                    {searching && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
                    )}
                    {!searching &&
                      results.map((r) => (
                        <button
                          key={r.place_id}
                          className="w-full text-left px-3 py-2 hover:bg-muted/40 border-b border-border last:border-b-0"
                          onMouseDown={(ev) => {
                            ev.preventDefault();
                            pickResult(r);
                          }}
                          type="button"
                        >
                          <div className="text-xs text-foreground">{r.description}</div>
                        </button>
                      ))}
                    {!searching && results.length === 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No results.</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Address (saved)</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address will fill when you pick a result" />
            </div>

            <div className="text-xs text-muted-foreground">
              Coordinates:{" "}
              <span className="text-foreground font-medium">
                {picked ? `${picked.lat.toFixed(6)}, ${picked.lng.toFixed(6)}` : "—"}
              </span>
            </div>

            <Button className="w-full" onClick={saveSite} disabled={saving || !user || !name.trim()}>
              {saving ? "Saving…" : "Save site"}
            </Button>
          </div>

          <div className="my-4 h-px bg-border" />

          <div className="text-sm font-semibold text-foreground mb-2">Sites</div>
          <div className="space-y-2">
            {sites.length === 0 ? (
              <div className="text-sm text-muted-foreground">No sites yet.</div>
            ) : (
              sites.map((s) => (
                <div key={s.id} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" className="text-left" onClick={() => focusSite(s)}>
                      <div className="text-sm font-semibold text-foreground">{s.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{s.address || "No address saved"}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {s.lat != null && s.lng != null ? `${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}` : "No coordinates"}
                      </div>
                    </button>
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="sm" onClick={() => focusSite(s)}>
                        View
                      </Button>
                      {navigateLink(s) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(navigateLink(s)!, "_blank", "noopener,noreferrer")}
                        >
                          Navigate
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-card flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm font-semibold text-foreground">Map</div>
            <div className="text-xs text-muted-foreground">
              {selectedSite ? (
                <span>
                  Selected: <span className="text-foreground font-medium">{selectedSite.name}</span>
                </span>
              ) : (
                "Select a site to focus."
              )}
            </div>
          </div>
          <div className="h-[calc(100vh-220px)] min-h-[560px]">
            <MapContainer center={DEFAULT_CENTER} zoom={6} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FlyTo center={mapFocus} />
              {sites
                .filter((s) => s.lat != null && s.lng != null)
                .map((s) => (
                  <Marker
                    key={s.id}
                    position={[s.lat as number, s.lng as number]}
                    eventHandlers={{
                      click: () => setSelectedSiteId(s.id),
                    }}
                  >
                    <Popup>
                      <div className="text-sm font-semibold">{s.name}</div>
                      <div className="text-xs">{s.address || ""}</div>
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SitesMap;

