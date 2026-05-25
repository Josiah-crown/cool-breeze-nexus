// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("EDGE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY =
  Deno.env.get("EDGE_SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error("Missing Supabase service role credentials");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CRON_SECRET = Deno.env.get("ALERT_CRON_SECRET");

type MachineRow = {
  id: string;
  name: string | null;
  manufacturer: string | null;
  type: "evaporative" | "heatpump" | "airconditioner" | null;
  notifications_enabled: boolean | null;
  owner_id: string | null;
  temperature_setpoint: number | null;
};

type AlertConfigRow = {
  machine_id: string;
  motor_temp_critical: number | null;
  motor_temp_warning: number | null;
  motor_amps_warning: number | null;
  current_min_alert: number | null;
  current_max_alert: number | null;
  delta_t_min_cooling: number | null;
  delta_t_min_heating: number | null;
  delta_t_max_heating: number | null;
  setpoint_tolerance: number | null;
  duration_motor_temp_critical: number | null;
  duration_fan_failure: number | null;
  duration_water_empty: number | null;
  duration_compressor_failure: number | null;
  reminder_interval_hours: number | null;
  send_recovery_emails: boolean | null;
};

type LatestReading = {
  timestamp: string;
  motor_temp: number | null;
  delta_t: number | null;
  current: number | null;
  voltage: number | null;
  fan_active: boolean | null;
  pump_active: boolean | null;
  is_on: boolean | null;
  is_connected: boolean | null;
  is_cooling: boolean | null;
  has_water: boolean | null;
  water_level: number | null;
  duct_temp: number | null;
  ambient_temp: number | null;
};

function minutesBetween(aIso: string, bIso: string) {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  return Math.max(0, Math.round((b - a) / 60000));
}

function nowIso() {
  return new Date().toISOString();
}

function severityFor(alertType: string): "critical" | "warning" | "info" {
  if (alertType.includes("critical") || alertType.includes("failure") || alertType.includes("lost")) return "critical";
  if (alertType.includes("warning") || alertType.includes("inefficient") || alertType.includes("empty")) return "warning";
  return "info";
}

async function fetchLatestReading(admin: any, m: MachineRow): Promise<LatestReading | null> {
  const manufacturer = (m.manufacturer || "").toLowerCase();
  const table =
    manufacturer.includes("cirrus") ? "cirrus" : manufacturer.includes("coolbreeze") ? "coolbreeze" : "alliance";

  const { data, error } = await admin
    .from(table)
    .select(
      "timestamp,motor_temp,delta_t,current,voltage,fan_active,pump_active,is_on,is_connected,is_cooling,has_water,water_level,duct_temp,ambient_temp",
    )
    .eq("machine_id", m.id)
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return data as LatestReading;
}

async function fetchRecipients(admin: any, machineId: string) {
  const { data, error } = await admin
    .from("machine_notification_preferences")
    .select("user_id, enabled, profiles:profiles(email)")
    .eq("machine_id", machineId)
    .eq("enabled", true);
  if (error) throw error;
  return (data ?? [])
    .map((r: any) => ({ userId: r.user_id as string, email: r?.profiles?.email as string | undefined }))
    .filter((r) => Boolean(r.email));
}

async function upsertAlertState(admin: any, args: {
  machine_id: string;
  alert_type: string;
  severity: "critical" | "warning" | "info";
  current_value?: number | null;
  threshold_value?: number | null;
  additional_data?: any;
  condition_started_at?: string;
}): Promise<any> {
  const condition_started_at = args.condition_started_at ?? nowIso();
  const payload = {
    machine_id: args.machine_id,
    alert_type: args.alert_type,
    severity: args.severity,
    condition_started_at,
    last_checked_at: nowIso(),
    current_value: args.current_value ?? null,
    threshold_value: args.threshold_value ?? null,
    additional_data: args.additional_data ?? null,
    updated_at: nowIso(),
  };

  const { data, error } = await admin
    .from("alert_states")
    .upsert(payload, { onConflict: "machine_id,alert_type" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function clearAlertState(admin: any, machine_id: string, alert_type: string) {
  const { error } = await admin.from("alert_states").delete().eq("machine_id", machine_id).eq("alert_type", alert_type);
  if (error) throw error;
}

async function triggerEmail(admin: any, payload: any) {
  // Call send-alert-email via internal Edge Function invoke
  const { data, error } = await admin.functions.invoke("send-alert-email", { body: payload });
  if (error) throw error;
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (CRON_SECRET) {
    const provided = req.headers.get("x-cron-secret");
    if (!provided || provided !== CRON_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const { data: machines, error: mErr } = await admin
      .from("machines")
      .select("id,name,manufacturer,type,notifications_enabled,owner_id,temperature_setpoint")
      .eq("notifications_enabled", true);
    if (mErr) throw mErr;

    let checked = 0;
    let triggered = 0;

    for (const m of (machines ?? []) as MachineRow[]) {
      checked++;
      const { data: cfg, error: cErr } = await admin
        .from("machine_alert_config")
        .select(
          "machine_id,motor_temp_critical,motor_temp_warning,motor_amps_warning,current_min_alert,current_max_alert,delta_t_min_cooling,delta_t_min_heating,delta_t_max_heating,setpoint_tolerance,duration_motor_temp_critical,duration_fan_failure,duration_water_empty,duration_compressor_failure,reminder_interval_hours,send_recovery_emails",
        )
        .eq("machine_id", m.id)
        .maybeSingle();
      if (cErr) throw cErr;
      const config = (cfg ?? { machine_id: m.id }) as AlertConfigRow;

      const latest = await fetchLatestReading(admin, m);
      if (!latest) continue;

      const activeConditions: {
        alert_type: string;
        current_value?: number | null;
        threshold_value?: number | null;
        duration_required_min: number;
      }[] = [];

      // Common
      if (latest.is_connected === false) {
        activeConditions.push({
          alert_type: "connection_lost",
          current_value: 0,
          threshold_value: 1,
          duration_required_min: 2,
        });
      }

      // Evaporative style (cirrus/coolbreeze)
      if (m.type === "evaporative" || (m.manufacturer || "").toLowerCase().includes("cirrus") || (m.manufacturer || "").toLowerCase().includes("coolbreeze")) {
        if (latest.motor_temp != null && config.motor_temp_critical != null && latest.motor_temp >= config.motor_temp_critical) {
          activeConditions.push({
            alert_type: "motor_temp_critical",
            current_value: latest.motor_temp,
            threshold_value: config.motor_temp_critical,
            duration_required_min: config.duration_motor_temp_critical ?? 5,
          });
        }
        if (latest.is_on && latest.fan_active === false) {
          activeConditions.push({
            alert_type: "fan_failure",
            current_value: latest.current ?? null,
            threshold_value: config.current_min_alert ?? 0.5,
            duration_required_min: config.duration_fan_failure ?? 5,
          });
        }
        if (latest.is_cooling && latest.has_water === false) {
          activeConditions.push({
            alert_type: "water_empty",
            current_value: 0,
            threshold_value: 1,
            duration_required_min: config.duration_water_empty ?? 30,
          });
        }
        if (latest.is_cooling && latest.delta_t != null && config.delta_t_min_cooling != null && latest.delta_t < config.delta_t_min_cooling) {
          activeConditions.push({
            alert_type: "cooling_inefficient",
            current_value: latest.delta_t,
            threshold_value: config.delta_t_min_cooling,
            duration_required_min: config.duration_water_empty ?? 30,
          });
        }
        if ((m.manufacturer || "").toLowerCase().includes("coolbreeze") && latest.water_level != null && latest.water_level < 20) {
          activeConditions.push({
            alert_type: "water_level_low",
            current_value: latest.water_level,
            threshold_value: 20,
            duration_required_min: 10,
          });
        }
      }

      // Heatpump (alliance)
      if (m.type === "heatpump" || (m.manufacturer || "").toLowerCase().includes("alliance")) {
        if (latest.is_on && latest.pump_active === false) {
          activeConditions.push({
            alert_type: "pump_failure",
            current_value: 0,
            threshold_value: 1,
            duration_required_min: 5,
          });
        }
        if (latest.is_on && latest.current != null && config.current_min_alert != null && latest.current < config.current_min_alert) {
          activeConditions.push({
            alert_type: "compressor_failure",
            current_value: latest.current,
            threshold_value: config.current_min_alert,
            duration_required_min: config.duration_compressor_failure ?? 5,
          });
        }
        if (latest.is_on && latest.delta_t != null && config.delta_t_min_heating != null && latest.delta_t < config.delta_t_min_heating) {
          activeConditions.push({
            alert_type: "heating_inefficient",
            current_value: latest.delta_t,
            threshold_value: config.delta_t_min_heating,
            duration_required_min: 15,
          });
        }
      }

      // Load existing states for machine
      const { data: existingStates, error: sErr } = await admin
        .from("alert_states")
        .select("*")
        .eq("machine_id", m.id);
      if (sErr) throw sErr;

      const existingByType = new Map<string, any>((existingStates ?? []).map((s: any) => [s.alert_type, s]));
      const activeTypes = new Set(activeConditions.map((c) => c.alert_type));

      // Clear resolved states (and optionally send recovery email via history)
      for (const [type, state] of existingByType.entries()) {
        if (!activeTypes.has(type)) {
          await clearAlertState(admin, m.id, type);
          if (config.send_recovery_emails) {
            const recipients = await fetchRecipients(admin, m.id);
            if (recipients.length) {
              triggered++;
              await triggerEmail(admin, {
                machine_id: m.id,
                alert_type: type,
                severity: "recovery",
                subject: `Cmonitor: All clear — ${m.name ?? "Machine"} (${type})`,
                message: `All clear: ${m.name ?? "Machine"} recovered from ${type}.`,
                recipients,
                condition_started_at: state.condition_started_at,
              });
            }
          }
        }
      }

      // Upsert active states and send alert/reminders when needed
      for (const cond of activeConditions) {
        const prev = existingByType.get(cond.alert_type);
        const state = await upsertAlertState(admin, {
          machine_id: m.id,
          alert_type: cond.alert_type,
          severity: severityFor(cond.alert_type),
          current_value: cond.current_value ?? null,
          threshold_value: cond.threshold_value ?? null,
          additional_data: { manufacturer: m.manufacturer, type: m.type },
          condition_started_at: prev?.condition_started_at,
        });

        const durationMin = minutesBetween(state.condition_started_at, nowIso());
        const reminderHours = config.reminder_interval_hours ?? 24;
        const reminderDue =
          state.alert_triggered &&
          (!state.last_reminder_sent_at ||
            new Date(state.last_reminder_sent_at).getTime() + reminderHours * 3600 * 1000 <= Date.now());

        if (durationMin >= cond.duration_required_min && (!state.alert_triggered || reminderDue)) {
          const recipients = await fetchRecipients(admin, m.id);
          if (recipients.length) {
            triggered++;
            const subject = `Cmonitor alert: ${cond.alert_type.replaceAll("_", " ")} — ${m.name ?? "Machine"}`;
            const msg = [
              `Machine: ${m.name ?? m.id}`,
              `Alert: ${cond.alert_type}`,
              `Severity: ${severityFor(cond.alert_type)}`,
              cond.current_value != null && cond.threshold_value != null
                ? `Value: ${cond.current_value} (threshold ${cond.threshold_value})`
                : undefined,
              `Duration: ${durationMin} min`,
            ]
              .filter(Boolean)
              .join("\n");

            await triggerEmail(admin, {
              machine_id: m.id,
              alert_type: cond.alert_type,
              severity: severityFor(cond.alert_type),
              subject,
              message: msg,
              recipients,
              current_value: cond.current_value ?? null,
              threshold_value: cond.threshold_value ?? null,
              duration_minutes: durationMin,
              condition_started_at: state.condition_started_at,
            });

            await admin
              .from("alert_states")
              .update({
                alert_triggered: true,
                alert_triggered_at: state.alert_triggered_at ?? nowIso(),
                last_reminder_sent_at: nowIso(),
                updated_at: nowIso(),
              })
              .eq("id", state.id);
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, checked, triggered }), {
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

