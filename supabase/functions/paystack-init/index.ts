// deno-lint-ignore-file no-explicit-any
/**
 * Partner storefront → Cmonitor billing + Paystack.
 * Call from your other website's server before redirecting the buyer to Paystack.
 * On payment success, paystack-webhook creates the Cmonitor account and copies checkout_snapshot → profiles.
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  parseCheckoutSnapshot,
  snapshotForPaystackMetadata,
  type CheckoutSnapshot,
} from "../_shared/checkoutSnapshot.ts";

const SUPABASE_URL =
  Deno.env.get("EDGE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY =
  Deno.env.get("EDGE_SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_ANON_KEY =
  Deno.env.get("EDGE_SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
const PAYSTACK_BASE_URL = "https://api.paystack.co";
const PARTNER_CHECKOUT_API_KEY = Deno.env.get("PARTNER_CHECKOUT_API_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase credentials in function environment");
}
if (!PAYSTACK_SECRET_KEY) {
  throw new Error("Missing PAYSTACK_SECRET_KEY in function environment");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cmonitor-checkout-key",
};

type InitRequest = {
  offer_id: string;
  quantity: number;
  billing_period?: "monthly" | "annual";
  success_url: string;
  cancel_url: string;
  email?: string;
  customer?: Record<string, unknown>;
  /** When true, only creates billing_orders + snapshot; partner initializes Paystack on their site. */
  register_only?: boolean;
};

function partnerKeyOk(req: Request): boolean {
  if (!PARTNER_CHECKOUT_API_KEY) return true;
  return req.headers.get("x-cmonitor-checkout-key") === PARTNER_CHECKOUT_API_KEY;
}

function computeAmountCents(offer_id: string, quantity: number, billing_period: "monthly" | "annual"): number {
  if (offer_id !== "monitoring") return -1;
  const unitPrice =
    quantity >= 10
      ? billing_period === "annual"
        ? 390
        : 39
      : billing_period === "annual"
        ? 499
        : 49;
  return unitPrice * 100 * quantity;
}

async function createPendingOrder(
  admin: ReturnType<typeof createClient>,
  params: {
    offer_id: string;
    quantity: number;
    amount_cents: number;
    snapshot: CheckoutSnapshot;
    user_id: string | null;
  },
) {
  const orderInsert: Record<string, unknown> = {
    offer_id: params.offer_id,
    quantity: params.quantity,
    currency: "ZAR",
    amount_cents: params.amount_cents,
    status: "pending_payment",
    checkout_email: params.snapshot.email,
    checkout_snapshot: params.snapshot,
  };
  if (params.user_id) orderInsert.user_id = params.user_id;

  const { data: order, error } = await admin
    .from("billing_orders")
    .insert(orderInsert)
    .select("id")
    .single();
  if (error) throw error;
  return order.id as string;
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
    const authHeader = req.headers.get("Authorization");
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const body = (await req.json()) as InitRequest;

    const snapshot = parseCheckoutSnapshot(body as Record<string, unknown>);
    if (!snapshot) {
      return new Response(JSON.stringify({ error: "customer.email (valid) is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let orderUserId: string | null = null;

    if (authHeader) {
      const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "Invalid auth token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      orderUserId = userData.user.id;
    } else {
      if (!partnerKeyOk(req)) {
        return new Response(JSON.stringify({ error: "Unauthorized partner checkout" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const offer_id = String(body.offer_id || "");
    const quantity = Number(body.quantity || 0);
    const billing_period = (body.billing_period === "annual" ? "annual" : "monthly") as
      | "monthly"
      | "annual";
    const success_url = String(body.success_url || "");
    const cancel_url = String(body.cancel_url || "");
    const register_only = body.register_only === true;

    if (!offer_id || !Number.isFinite(quantity) || quantity < 1) {
      return new Response(JSON.stringify({ error: "Invalid offer_id or quantity" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!register_only && (!success_url || !cancel_url)) {
      return new Response(JSON.stringify({ error: "Missing success_url or cancel_url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amount_cents = computeAmountCents(offer_id, quantity, billing_period);
    if (amount_cents < 0) {
      return new Response(JSON.stringify({ error: "Offer not purchasable online" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderId = await createPendingOrder(supabaseAdmin, {
      offer_id,
      quantity,
      amount_cents,
      snapshot,
      user_id: orderUserId,
    });

    if (register_only) {
      return new Response(
        JSON.stringify({
          order_id: orderId,
          amount_cents,
          currency: "ZAR",
          checkout_email: snapshot.email,
          message:
            "Include order_id in Paystack metadata when initializing payment on your site. Webhook URL must point to paystack-webhook.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const metaExtras = snapshotForPaystackMetadata(snapshot);
    const initResp = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: snapshot.email,
        amount: amount_cents,
        currency: "ZAR",
        callback_url: success_url,
        metadata: {
          order_id: orderId,
          offer_id,
          quantity,
          billing_period,
          cancel_url,
          ...metaExtras,
        },
      }),
    });

    const initJson = await initResp.json();
    if (!initResp.ok || !initJson?.status) {
      await supabaseAdmin.from("billing_orders").update({ status: "failed" }).eq("id", orderId);
      return new Response(JSON.stringify({ error: initJson?.message || "Paystack init failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reference = initJson.data.reference as string;
    const authorization_url = initJson.data.authorization_url as string;

    const { error: paymentErr } = await supabaseAdmin.from("billing_payments").insert({
      order_id: orderId,
      provider: "paystack",
      provider_reference: reference,
      status: "initialized",
      authorization_url,
      provider_payload: initJson,
    });
    if (paymentErr) throw paymentErr;

    return new Response(
      JSON.stringify({
        order_id: orderId,
        reference,
        authorization_url,
        amount_cents,
        guest_checkout: !orderUserId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("paystack-init error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
