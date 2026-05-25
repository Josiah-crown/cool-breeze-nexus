// deno-lint-ignore-file no-explicit-any
/** Public feed proxy: latest videos from Crown Technologies YouTube channel (RSS). */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CHANNEL_ID = Deno.env.get("YOUTUBE_CHANNEL_ID") ?? "UCedft9aGfkgn1PVC5vpy-6A";
const MAX_VIDEOS = 20;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function decodeXml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseVideosFromRss(xml: string): { videoId: string; title: string; publishedAt: string }[] {
  const chunks = xml.split("</entry>");
  const out: { videoId: string; title: string; publishedAt: string }[] = [];

  for (const chunk of chunks) {
    if (!chunk.includes("<yt:videoId>")) continue;
    const idMatch = chunk.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = chunk.match(/<media:title>([^<]*)<\/media:title>/);
    const fallbackTitle = chunk.match(/<title>([^<]*)<\/title>/);
    const pubMatch = chunk.match(/<published>([^<]+)<\/published>/);
    if (!idMatch) continue;

    const title = decodeXml((titleMatch?.[1] ?? fallbackTitle?.[1] ?? "Video").trim());
    if (title === "Crown Technologies") continue;

    out.push({
      videoId: idMatch[1],
      title,
      publishedAt: pubMatch?.[1]?.slice(0, 10) ?? "",
    });
    if (out.length >= MAX_VIDEOS) break;
  }

  return out.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
    const resp = await fetch(feedUrl, {
      headers: {
        "User-Agent": "CmonitorYouTubeFeed/1.0 (+https://crowntechnologies.co.za)",
        Accept: "application/atom+xml, application/xml, text/xml, */*",
      },
      redirect: "follow",
    });
    if (!resp.ok) throw new Error(`YouTube RSS ${resp.status}`);

    const xml = await resp.text();
    const videos = parseVideosFromRss(xml);

    return new Response(
      JSON.stringify({
        channelId: CHANNEL_ID,
        channelUrl: "https://www.youtube.com/@crowntechnologiesZA/videos",
        videos,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("youtube-channel-feed:", e);
    return new Response(JSON.stringify({ error: e?.message || "Feed failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
