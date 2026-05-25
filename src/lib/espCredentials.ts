/**
 * ESP32 ingest uses Bearer token = same string as `machines.api_key` / `api_keys.key`.
 */
export function generateEsp32ApiKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `esp32_${crypto.randomUUID().replace(/-/g, "")}`;
  }
  const hex = "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  return `esp32_${hex}`;
}

export function espIngestUrl(): string {
  const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "") || "";
  return `${base}/functions/v1/esp32-data-receiver`;
}
