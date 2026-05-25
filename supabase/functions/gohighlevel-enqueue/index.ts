// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("EDGE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY =
  Deno.env.get("EDGE_SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_ANON_KEY = Deno.env.get("EDGE_SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) throw new Error("Missing Supabase credentials");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_TAGS = ["Cmonitor-Account"];
const ENABLE_GHL_SYNC = Deno.env.get("ENABLE_GHL_SYNC") === "true";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (!ENABLE_GHL_SYNC) {
      return new Response(JSON.stringify({ ok: false, disabled: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as any;
    const reason = String(body.reason || "profile");
    const userId = userData.user.id;

    // Load profile fields we are allowed to mirror
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("name, email, cell_number, full_name_business, email_subscribed")
      .eq("id", userId)
      .single();
    if (profileErr) throw profileErr;

    // Compute desired tags (industry standard: desired set → reconcile)
    const desiredTags = new Set<string>(DEFAULT_TAGS);
    if (profile.email_subscribed) desiredTags.add("Cmonitor-EmailOptIn");

    // If they've paid monitoring, tag them. (simple rule: any paid order for monitoring)
    const { data: paidOrder } = await admin
      .from("billing_orders")
      .select("id")
      .eq("user_id", userId)
      .eq("offer_id", "monitoring")
      .eq("status", "paid")
      .limit(1);
    if ((paidOrder || []).length > 0) desiredTags.add("Cmonitor-Monitoring-Paid");

    // Multiple sites consideration:
    // We do NOT tag each site (too noisy). Instead: one summary tag.
    // If site_memberships exists, add a generic multi-site tag if count > 1.
    // (If table not present in this environment, we silently skip.)
    try {
      const { count } = await admin
        .from("site_memberships")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if ((count ?? 0) > 1) desiredTags.add("Cmonitor-MultiSite");
    } catch {
      // ignore if sites system not available
    }

    // Enqueue jobs: upsert_contact then set_tags
    const subject = `user:${userId}`;
    const jobs = [
      {
        provider: "gohighlevel",
        job_type: "upsert_contact",
        status: "pending",
        user_id: userId,
        subject_key: subject,
        payload: {
          // patch semantics: only send values we have
          email: profile.email,
          name: profile.name,
          phone: profile.cell_number || undefined,
          companyName: profile.full_name_business || undefined,
          source: `cmonitor:${reason}`,
          customField: {
            supabase_user_id: userId,
          },
        },
        desired_tags: null,
        priority: 50,
      },
      {
        provider: "gohighlevel",
        job_type: "set_tags",
        status: "pending",
        user_id: userId,
        subject_key: subject,
        payload: {},
        desired_tags: Array.from(desiredTags),
        priority: 60,
      },
    ];

    const { data: inserted, error: insertErr } = await admin.from("crm_sync_jobs").insert(jobs).select("id");
    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({ ok: true, queued: (inserted || []).map((r: any) => r.id) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("gohighlevel-enqueue error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

