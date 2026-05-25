// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("EDGE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY =
  Deno.env.get("EDGE_SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// HighLevel / LeadConnector credentials (set in Supabase Function Secrets)
const GHL_API_KEY = Deno.env.get("GHL_API_KEY");
const GHL_LOCATION_ID = Deno.env.get("GHL_LOCATION_ID");
const GHL_BASE_URL = Deno.env.get("GHL_BASE_URL") ?? "https://rest.gohighlevel.com";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error("Missing Supabase credentials");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENABLE_GHL_SYNC = Deno.env.get("ENABLE_GHL_SYNC") === "true";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function computeBackoffSeconds(attemptCount: number) {
  // Exponential with cap: 10s, 20s, 40s... up to ~30m
  const base = 10 * Math.pow(2, Math.max(0, attemptCount - 1));
  return Math.min(1800, base);
}

async function ghlRequest(path: string, init: RequestInit) {
  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    throw new Error("GHL credentials not configured (GHL_API_KEY, GHL_LOCATION_ID)");
  }
  const url = `${GHL_BASE_URL}${path}`;
  const resp = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GHL_API_KEY}`,
      ...(init.headers ?? {}),
    },
  });
  const json = await resp.json().catch(() => null);
  return { resp, json };
}

async function upsertContact(payload: any, existingContactId?: string) {
  // Minimal, patch semantics: only send fields that are provided.
  // HighLevel contact create endpoint (commonly): POST /v1/contacts/ with locationId in body.
  // Update endpoint is commonly PUT /v1/contacts/{id}
  const body: any = {
    locationId: GHL_LOCATION_ID,
    ...payload,
  };

  if (!existingContactId) {
    const { resp, json } = await ghlRequest(`/v1/contacts/`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { ok: resp.ok, status: resp.status, json };
  }

  const { resp, json } = await ghlRequest(`/v1/contacts/${encodeURIComponent(existingContactId)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return { ok: resp.ok, status: resp.status, json };
}

async function getContactTags(contactId: string) {
  // Many HL APIs return tags on the contact object; attempt a GET and extract tags if present.
  const { resp, json } = await ghlRequest(`/v1/contacts/${encodeURIComponent(contactId)}`, { method: "GET" });
  if (!resp.ok) return { ok: false, status: resp.status, json, tags: [] as string[] };
  const tags = (json?.contact?.tags ?? json?.tags ?? []) as string[];
  return { ok: true, status: resp.status, json, tags: Array.isArray(tags) ? tags : [] };
}

async function setContactTags(contactId: string, desiredTags: string[]) {
  // Strategy: reconcile tags by computing add/remove.
  // For safety, ONLY manage tags in our namespace (prefix "Cmonitor-").
  const existing = await getContactTags(contactId);
  if (!existing.ok) return { ok: false, status: existing.status, json: existing.json };

  const existingTags = existing.tags;
  const managedPrefix = "Cmonitor-";
  const existingManaged = new Set(existingTags.filter((t) => t.startsWith(managedPrefix)));
  const desiredManaged = new Set(desiredTags.filter((t) => t.startsWith(managedPrefix)));

  const toAdd = Array.from(desiredManaged).filter((t) => !existingManaged.has(t));
  const toRemove = Array.from(existingManaged).filter((t) => !desiredManaged.has(t));

  // If API supports tag updates via PUT contact with tags array, do that (most stable).
  const merged = [
    ...existingTags.filter((t) => !t.startsWith(managedPrefix)),
    ...Array.from(desiredManaged),
  ];

  const { resp, json } = await ghlRequest(`/v1/contacts/${encodeURIComponent(contactId)}`, {
    method: "PUT",
    body: JSON.stringify({
      locationId: GHL_LOCATION_ID,
      tags: merged,
    }),
  });
  return { ok: resp.ok, status: resp.status, json, toAdd, toRemove };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    if (!ENABLE_GHL_SYNC) {
      return new Response(JSON.stringify({ ok: false, disabled: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { max_jobs } = (await req.json().catch(() => ({}))) as any;
    const limit = Math.min(25, Math.max(1, Number(max_jobs || 10)));

    // claim jobs (best-effort). We avoid long locks; mark processing and lock metadata.
    const nowIso = new Date().toISOString();
    const locker = `edge:${crypto.randomUUID()}`;

    const { data: jobs, error: jobsErr } = await admin
      .from("crm_sync_jobs")
      .select("*")
      .eq("status", "pending")
      .lte("next_attempt_at", nowIso)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(limit);
    if (jobsErr) throw jobsErr;

    const results: any[] = [];

    for (const job of jobs || []) {
      // Lock job
      const { error: lockErr } = await admin
        .from("crm_sync_jobs")
        .update({ status: "processing", locked_at: nowIso, locked_by: locker })
        .eq("id", job.id)
        .eq("status", "pending");
      if (lockErr) {
        results.push({ job_id: job.id, ok: false, error: lockErr.message });
        continue;
      }

      let success = false;
      let httpStatus: number | undefined;
      let responseJson: any = null;
      let requestJson: any = null;
      let errorMessage: string | undefined;

      try {
        // Ensure we have link if exists
        const { data: link } = await admin
          .from("crm_contact_links")
          .select("contact_id, location_id")
          .eq("provider", "gohighlevel")
          .eq("user_id", job.user_id)
          .eq("location_id", GHL_LOCATION_ID ?? "")
          .maybeSingle();

        const existingContactId = (link as any)?.contact_id as string | undefined;

        if (job.job_type === "upsert_contact") {
          requestJson = job.payload;
          const upsert = await upsertContact(job.payload, existingContactId);
          httpStatus = upsert.status;
          responseJson = upsert.json;
          if (!upsert.ok) throw new Error(upsert.json?.message || "Contact upsert failed");

          // Extract contact id (API dependent)
          const newContactId =
            upsert.json?.contact?.id ||
            upsert.json?.contactId ||
            upsert.json?.id ||
            existingContactId;

          if (newContactId && job.user_id) {
            await admin.from("crm_contact_links").upsert(
              {
                user_id: job.user_id,
                provider: "gohighlevel",
                location_id: GHL_LOCATION_ID,
                contact_id: String(newContactId),
              },
              { onConflict: "provider,location_id,user_id" },
            );
          }
        }

        if (job.job_type === "set_tags") {
          const contactId =
            existingContactId ||
            (await admin
              .from("crm_contact_links")
              .select("contact_id")
              .eq("provider", "gohighlevel")
              .eq("user_id", job.user_id)
              .eq("location_id", GHL_LOCATION_ID ?? "")
              .maybeSingle()).data?.contact_id;

          if (!contactId) throw new Error("No contact link exists for tag update");
          requestJson = { desired_tags: job.desired_tags ?? [] };
          const desired = Array.isArray(job.desired_tags) ? job.desired_tags : [];
          const tagRes = await setContactTags(String(contactId), desired);
          httpStatus = tagRes.status;
          responseJson = tagRes;
          if (!tagRes.ok) throw new Error(tagRes.json?.message || "Tag reconcile failed");
        }

        success = true;
      } catch (e: any) {
        success = false;
        errorMessage = e?.message || "Job failed";
      }

      // Audit attempt
      await admin.from("crm_sync_attempts").insert({
        job_id: job.id,
        success,
        http_status: httpStatus ?? null,
        error_message: errorMessage ?? null,
        request_json: requestJson ?? null,
        response_json: responseJson ?? null,
      });

      if (success) {
        await admin
          .from("crm_sync_jobs")
          .update({
            status: "succeeded",
            last_error: null,
            last_attempt_at: new Date().toISOString(),
            locked_at: null,
            locked_by: null,
            attempt_count: (job.attempt_count ?? 0) + 1,
          })
          .eq("id", job.id);
        results.push({ job_id: job.id, ok: true });
      } else {
        const nextSeconds = computeBackoffSeconds((job.attempt_count ?? 0) + 1);
        const nextAttempt = new Date(Date.now() + nextSeconds * 1000).toISOString();
        const newAttemptCount = (job.attempt_count ?? 0) + 1;
        const terminal = newAttemptCount >= (job.max_attempts ?? 12);

        await admin
          .from("crm_sync_jobs")
          .update({
            status: terminal ? "dead" : "pending",
            last_error: errorMessage ?? "Failed",
            last_attempt_at: new Date().toISOString(),
            next_attempt_at: terminal ? job.next_attempt_at : nextAttempt,
            locked_at: null,
            locked_by: null,
            attempt_count: newAttemptCount,
          })
          .eq("id", job.id);

        results.push({ job_id: job.id, ok: false, error: errorMessage, next_attempt_at: nextAttempt, dead: terminal });
      }

      // Be gentle on rate limits
      await sleep(150);
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("gohighlevel-sync-worker error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

