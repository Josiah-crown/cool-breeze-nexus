import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AutocompleteReq = {
  action: "autocomplete";
  input: string;
  country?: string; // e.g. "za"
};

type DetailsReq = {
  action: "details";
  placeId: string;
};

type ReqBody = AutocompleteReq | DetailsReq;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const googleKey = Deno.env.get("GOOGLE_MAPS_API_KEY") ?? "";
    if (!supabaseUrl || !supabaseAnon) return json({ error: "Missing Supabase env" }, 500);
    if (!googleKey) return json({ error: "Missing GOOGLE_MAPS_API_KEY secret" }, 500);

    // Require auth (any authenticated user)
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const body = (await req.json()) as ReqBody;

    if (body.action === "autocomplete") {
      const input = (body.input ?? "").trim();
      if (!input) return json({ predictions: [] });

      const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
      url.searchParams.set("input", input);
      url.searchParams.set("key", googleKey);
      url.searchParams.set("types", "geocode");
      url.searchParams.set("language", "en");
      if (body.country) url.searchParams.set("components", `country:${body.country}`);

      const res = await fetch(url.toString());
      const data = await res.json();

      if (data?.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        return json({ error: "Google error", status: data.status, details: data.error_message }, 502);
      }

      return json({
        predictions: (data?.predictions ?? []).map((p: any) => ({
          place_id: p.place_id,
          description: p.description,
        })),
      });
    }

    if (body.action === "details") {
      const placeId = (body.placeId ?? "").trim();
      if (!placeId) return json({ error: "Missing placeId" }, 400);

      const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
      url.searchParams.set("place_id", placeId);
      url.searchParams.set("key", googleKey);
      url.searchParams.set("fields", "formatted_address,geometry,name");
      url.searchParams.set("language", "en");

      const res = await fetch(url.toString());
      const data = await res.json();

      if (data?.status && data.status !== "OK") {
        return json({ error: "Google error", status: data.status, details: data.error_message }, 502);
      }

      const r = data?.result;
      const lat = r?.geometry?.location?.lat;
      const lng = r?.geometry?.location?.lng;

      return json({
        place: {
          name: r?.name ?? null,
          formatted_address: r?.formatted_address ?? null,
          lat: typeof lat === "number" ? lat : null,
          lng: typeof lng === "number" ? lng : null,
        },
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message ?? "Unknown error" }, 500);
  }
});

