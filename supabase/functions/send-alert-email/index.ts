// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const SUPABASE_URL = Deno.env.get("EDGE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY =
  Deno.env.get("EDGE_SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const SMTP_HOST = Deno.env.get("SMTP_HOST");
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") ?? "465");
const SMTP_USER = Deno.env.get("SMTP_USER");
const SMTP_PASS = Deno.env.get("SMTP_PASS");
const SMTP_FROM = Deno.env.get("SMTP_FROM") ?? "alerts@iotnexus.site";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error("Missing Supabase service role credentials");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  machine_id: string;
  alert_type: string;
  severity: "critical" | "warning" | "info" | "recovery";
  subject: string;
  message: string;
  html?: string;
  recipients: { userId: string; email: string; role?: string }[];
  current_value?: number | null;
  threshold_value?: number | null;
  duration_minutes?: number | null;
  condition_started_at?: string | null;
};

async function sendSmtpEmail(to: string[], subject: string, text: string, html?: string) {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error("Missing SMTP env vars (SMTP_HOST/SMTP_USER/SMTP_PASS)");
  }
  const client = new SmtpClient();
  try {
    await client.connectTLS({
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      username: SMTP_USER,
      password: SMTP_PASS,
    });

    const content = html
      ? [
          "MIME-Version: 1.0",
          "Content-Type: multipart/alternative; boundary=cm-boundary",
          "",
          "--cm-boundary",
          "Content-Type: text/plain; charset=utf-8",
          "",
          text,
          "",
          "--cm-boundary",
          "Content-Type: text/html; charset=utf-8",
          "",
          html,
          "",
          "--cm-boundary--",
          "",
        ].join("\r\n")
      : text;

    await client.send({
      from: SMTP_FROM,
      to,
      subject,
      content,
    });
  } finally {
    try {
      await client.close();
    } catch {
      // ignore
    }
  }
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
    const body = (await req.json()) as Payload;
    const recipients = Array.isArray(body.recipients) ? body.recipients : [];
    const to = recipients.map((r) => r.email).filter(Boolean);
    if (!body.machine_id || !body.alert_type || !body.severity || !body.subject || !body.message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (to.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "No recipients" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let emailError: string | null = null;
    try {
      await sendSmtpEmail(to, body.subject, body.message, body.html);
    } catch (e: any) {
      emailError = e?.message || "SMTP send failed";
    }

    await admin.from("alert_history").insert({
      machine_id: body.machine_id,
      alert_type: body.alert_type,
      severity: body.severity,
      message: body.message,
      current_value: body.current_value ?? null,
      threshold_value: body.threshold_value ?? null,
      duration_minutes: body.duration_minutes ?? null,
      recipients: body.recipients ?? [],
      email_sent: emailError ? false : true,
      email_error: emailError,
      condition_started_at: body.condition_started_at ?? null,
      alert_sent_at: new Date().toISOString(),
    });

    if (emailError) {
      return new Response(JSON.stringify({ ok: false, error: emailError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, to }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

