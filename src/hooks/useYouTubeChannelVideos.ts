import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  sortNewestFirst,
  YOUTUBE_CHANNEL_ID,
  YOUTUBE_VIDEOS,
  type YoutubeVideoEntry,
} from "@/config/informationContent";

const FALLBACK_VIDEOS = sortNewestFirst(YOUTUBE_VIDEOS);

type FeedResponse = {
  videos?: { videoId: string; title: string; publishedAt: string }[];
  error?: string;
};

async function fetchChannelVideos(): Promise<YoutubeVideoEntry[]> {
  try {
    const { data, error } = await supabase.functions.invoke<FeedResponse>("youtube-channel-feed");
    if (error) {
      console.warn("[useYouTubeChannelVideos] invoke error:", error.message);
      return FALLBACK_VIDEOS;
    }
    if (data?.error) {
      console.warn("[useYouTubeChannelVideos] feed error:", data.error);
      return FALLBACK_VIDEOS;
    }
    const list = data?.videos ?? [];
    if (list.length === 0) return FALLBACK_VIDEOS;
    return list.map((v) => ({
      videoId: v.videoId,
      title: v.title,
      publishedAt: v.publishedAt,
    }));
  } catch (e) {
    console.warn("[useYouTubeChannelVideos] failed, using fallback list:", e);
    return FALLBACK_VIDEOS;
  }
}

export function useYouTubeChannelVideos() {
  return useQuery({
    queryKey: ["youtube-channel-feed", YOUTUBE_CHANNEL_ID],
    queryFn: fetchChannelVideos,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    retry: false,
    initialData: FALLBACK_VIDEOS,
    placeholderData: FALLBACK_VIDEOS,
  });
}
