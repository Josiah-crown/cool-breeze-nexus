// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  displayNameFromSnapshot,
  isBlank,
  normalizeEmail,
  profilePatchFromSnapshot,
  type CheckoutSnapshot,
} from "../_shared/checkoutSnapshot.ts";

const SUPABASE_URL =
  Deno.env.get("EDGE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY =
  Deno.env.get("EDGE_SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
const PAYSTACK_WEBHOOK_SECRET = Deno.env.get("PAYSTACK_WEBHOOK_SECRET");
const PAYSTACK_BASE_URL = "https://api.paystack.co";
const ENABLE_GHL_SYNC = Deno.env.get("ENABLE_GHL_SYNC") === "true";
const CMONITOR_APP_URL =
  Deno.env.get("CMONITOR_APP_URL") ?? Deno.env.get("SITE_URL") ?? "https://app.cmonitor.co.za";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase credentials in function environment");
}
if (!PAYSTACK_SECRET_KEY) {
  throw new Error("Missing PAYSTACK_SECRET_KEY in function environment");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

async function verifyTransaction(reference: string) {
  const resp = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
  });
  const json = await resp.json();
  if (!resp.ok || !json?.status) throw new Error(json?.message || "Paystack verify failed");
  return json.data;
}

async function findUserIdByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (error) {
    console.warn("findUserIdByEmail:", error.message);
    return null;
  }
  return data?.id ?? null;
}

async function ensureClientRole(admin: ReturnType<typeof createClient>, userId: string) {
  const { data: existing } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing?.role) return;

  const { error } = await admin.from("user_roles").insert({
    user_id: userId,
    role: "client",
  });
  if (error && !String(error.message).includes("duplicate")) {
    console.warn("ensureClientRole:", error.message);
  }
}

async function applySnapshotToProfile(
  admin: ReturnType<typeof createClient>,
  userId: string,
  snapshot: CheckoutSnapshot,
  mode: "provision" | "merge",
) {
  const { data: prof } = await admin
    .from("profiles")
    .select("name, email, cell_number, full_name_business, country, state, city, street, suburb, po_box")
    .eq("id", userId)
    .maybeSingle();

  const patch = profilePatchFromSnapshot(snapshot, prof, mode);
  if (Object.keys(patch).length === 0) return;

  if (prof) {
    await admin.from("profiles").update(patch).eq("id", userId);
  } else {
    await admin.from("profiles").insert({
      id: userId,
      name: patch.name ?? displayNameFromSnapshot(snapshot),
      email: patch.email ?? snapshot.email,
      cell_number: patch.cell_number ?? "",
      country: patch.country ?? "",
      state: patch.state ?? "",
      city: patch.city ?? "",
      street: patch.street ?? "",
      suburb: patch.suburb ?? "",
      po_box: patch.po_box ?? null,
      full_name_business: patch.full_name_business ?? patch.name ?? displayNameFromSnapshot(snapshot),
    });
  }
}

function payerNameFromVerified(verified: Record<string, unknown>): string {
  const customer = verified?.customer as
    | { first_name?: string; last_name?: string; email?: string }
    | undefined;
  const first = (customer?.first_name ?? "").trim();
  const last = (customer?.last_name ?? "").trim();
  const full = [first, last].filter(Boolean).join(" ").trim();
  if (full) return full;
  const email = (customer?.email ?? "").trim();
  return email.split("@")[0] || "User";
}

async function mergeProfileFromVerified(
  admin: ReturnType<typeof createClient>,
  userId: string,
  verified: Record<string, unknown>,
) {
  const customer = verified?.customer as
    | { first_name?: string; last_name?: string; phone?: string }
    | undefined;
  if (!customer) return;

  const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim();
  const phone = (customer.phone ?? "").trim();

  const { data: prof } = await admin
    .from("profiles")
    .select("name, cell_number, full_name_business")
    .eq("id", userId)
    .maybeSingle();
  if (!prof) return;

  const patch: Record<string, string> = {};
  if (isBlank(prof.cell_number) && phone) patch.cell_number = phone;
  if (isBlank(prof.name) && fullName) patch.name = fullName;
  if (isBlank(prof.full_name_business) && fullName) patch.full_name_business = fullName;

  if (Object.keys(patch).length > 0) {
    await admin.from("profiles").update(patch).eq("id", userId);
  }
}

async function provisionCmonitorAccount(
  admin: ReturnType<typeof createClient>,
  email: string,
  snapshot: CheckoutSnapshot | null,
  verified: Record<string, unknown>,
): Promise<string | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const snap = snapshot ?? ({ email: normalized } as CheckoutSnapshot);
  const displayName = snap.name ?? displayNameFromSnapshot(snap) ?? payerNameFromVerified(verified);

  let userId = await findUserIdByEmail(admin, normalized);
  const isNew = !userId;

  if (!userId) {
    const redirectTo = `${CMONITOR_APP_URL.replace(/\/$/, "")}/login`;
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(normalized, {
      data: { name: displayName },
      redirectTo,
    });

    if (inviteErr) {
      const msg = inviteErr.message?.toLowerCase() ?? "";
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        userId = await findUserIdByEmail(admin, normalized);
      } else {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: normalized,
          email_confirm: true,
          user_metadata: { name: displayName },
        });
        if (createErr || !created?.user) {
          console.error("provisionCmonitorAccount failed", inviteErr.message, createErr?.message);
          return null;
        }
        userId = created.user.id;
      }
    } else {
      userId = invited?.user?.id ?? null;
    }
  }

  if (!userId) return null;

  await ensureClientRole(admin, userId);
  await applySnapshotToProfile(admin, userId, { ...snap, email: normalized }, isNew ? "provision" : "merge");
  await mergeProfileFromVerified(admin, userId, verified);

  return userId;
}

function parseSnapshotFromOrder(raw: unknown): CheckoutSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const email = normalizeEmail(String(o.email ?? ""));
  if (!email) return null;
  return { ...o, email } as CheckoutSnapshot;
}

function resolveCheckoutEmail(
  order: { checkout_email?: string | null; checkout_snapshot?: unknown },
  verified: Record<string, unknown>,
): string | null {
  const snap = parseSnapshotFromOrder(order.checkout_snapshot);
  if (snap?.email) return snap.email;

  if (order.checkout_email) return normalizeEmail(order.checkout_email);

  const customer = verified?.customer as { email?: string } | undefined;
  if (customer?.email) return normalizeEmail(customer.email);

  const meta = verified?.metadata as { checkout_email?: string } | undefined;
  if (meta?.checkout_email) return normalizeEmail(meta.checkout_email);

  return null;
}

async function resolvePayment(
  admin: ReturnType<typeof createClient>,
  reference: string,
  verified: Record<string, unknown>,
) {
  const { data: payment, error: payErr } = await admin
    .from("billing_payments")
    .select("id, order_id, status")
    .eq("provider", "paystack")
    .eq("provider_reference", reference)
    .maybeSingle();
  if (payErr) throw payErr;
  if (payment) return payment;

  const orderId = (verified?.metadata as { order_id?: string } | undefined)?.order_id;
  if (!orderId) return null;

  const { data: order } = await admin
    .from("billing_orders")
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return null;

  const { data: inserted, error: insErr } = await admin
    .from("billing_payments")
    .insert({
      order_id: orderId,
      provider: "paystack",
      provider_reference: reference,
      status: "initialized",
      provider_payload: verified,
    })
    .select("id, order_id, status")
    .single();

  if (insErr) {
    const { data: again } = await admin
      .from("billing_payments")
      .select("id, order_id, status")
      .eq("provider", "paystack")
      .eq("provider_reference", reference)
      .maybeSingle();
    return again;
  }
  return inserted;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const signature = req.headers.get("x-paystack-signature");
    const rawBody = await req.text();

    if (PAYSTACK_WEBHOOK_SECRET) {
      if (!signature) {
        return new Response(JSON.stringify({ error: "Missing signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(PAYSTACK_WEBHOOK_SECRET),
        { name: "HMAC", hash: "SHA-512" },
        false,
        ["sign"],
      );
      const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
      const computed = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
      if (computed !== signature) {
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const event = JSON.parse(rawBody);
    const reference = event?.data?.reference as string | undefined;
    if (!reference) {
      return new Response(JSON.stringify({ error: "Missing reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const verified = await verifyTransaction(reference);
    const success = verified?.status === "success";

    const payment = await resolvePayment(admin, reference, verified as Record<string, unknown>);
    if (!payment) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin
      .from("billing_payments")
      .update({
        status: success ? "success" : "failed",
        provider_payload: verified,
      })
      .eq("id", payment.id);

    await admin
      .from("billing_orders")
      .update({ status: success ? "paid" : "failed" })
      .eq("id", payment.order_id);

    if (success) {
      const { data: orderRow } = await admin
        .from("billing_orders")
        .select("user_id, checkout_email, checkout_snapshot")
        .eq("id", payment.order_id)
        .maybeSingle();

      const snapshot = parseSnapshotFromOrder(orderRow?.checkout_snapshot);
      let uid = orderRow?.user_id ?? null;

      if (!uid) {
        const checkoutEmail = resolveCheckoutEmail(orderRow ?? {}, verified as Record<string, unknown>);
        if (checkoutEmail) {
          uid = await provisionCmonitorAccount(
            admin,
            checkoutEmail,
            snapshot,
            verified as Record<string, unknown>,
          );
          if (uid) {
            await admin.from("billing_orders").update({ user_id: uid }).eq("id", payment.order_id);
          }
        } else {
          console.warn("paystack-webhook: paid order missing email / snapshot");
        }
      } else {
        if (snapshot) {
          await applySnapshotToProfile(admin, uid, snapshot, "merge");
        }
        await mergeProfileFromVerified(admin, uid, verified as Record<string, unknown>);
        await ensureClientRole(admin, uid);
      }

      if (ENABLE_GHL_SYNC && uid) {
        try {
          await admin.from("crm_sync_jobs").insert([
            {
              provider: "gohighlevel",
              job_type: "set_tags",
              status: "pending",
              user_id: uid,
              subject_key: `user:${uid}`,
              payload: {},
              desired_tags: ["Cmonitor-Account", "Cmonitor-Monitoring-Paid"],
              priority: 40,
            },
          ]);
        } catch {
          // ignore
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("paystack-webhook error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
