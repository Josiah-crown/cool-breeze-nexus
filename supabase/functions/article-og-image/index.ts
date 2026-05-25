// deno-lint-ignore-file no-explicit-any
/** Returns og:image (or first <img>) for a Crown article URL — used by Information page cards. */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeArticleImageUrl(url: string): string {
  const wrapped = url.match(/u_(https?%3A%2F%2F[^/&\s"']+)/i)?.[1];
  if (wrapped) {
    try {
      return decodeURIComponent(wrapped);
    } catch {
      return url;
    }
  }
  return url;
}

/** 2nd content image — skips Crown logo / default OG (first img on site). */
function pickImageFromHtml(html: string): string | null {
  const SKIP_SRC =
    /logo|favicon|icon\.|\/icon|companyphotos|68c107a744a663683ce0e7c7|689cc9904687e1b0eeabea9d/i;
  const imgs: string[] = [];
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const src = m[1].trim();
    if (!src || src.startsWith("data:")) continue;
    imgs.push(normalizeArticleImageUrl(src));
  }
  const candidates = [...new Set(imgs)].filter((src) => !SKIP_SRC.test(src));
  if (candidates.length >= 2) return candidates[1];
  if (candidates.length === 1) return candidates[0];
  if (imgs.length >= 2) return imgs[1];
  return imgs[0] ?? null;
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
    const { url } = (await req.json()) as { url?: string };
    if (!url || !url.startsWith("http")) {
      return new Response(JSON.stringify({ error: "Missing url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch(url, {
      headers: { "User-Agent": "CmonitorInformationBot/1.0" },
    });
    if (!resp.ok) throw new Error(`Fetch ${resp.status}`);

    const html = await resp.text();
    const imageUrl = pickImageFromHtml(html);

    return new Response(JSON.stringify({ imageUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("article-og-image:", e);
    return new Response(JSON.stringify({ imageUrl: null, error: e?.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
