import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { sortNewestFirst, YOUTUBE_CHANNEL_URL, type YoutubeVideoEntry } from "@/config/informationContent";
import { ChevronLeft, ChevronRight, ExternalLink, Play } from "lucide-react";

type Props = {
  videos: YoutubeVideoEntry[];
};

function isValidVideoId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(id);
}

function embedUrl(videoId: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });
  if (origin) params.set("origin", origin);
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

const YouTubeVideosCarousel: React.FC<Props> = ({ videos }) => {
  const sorted = useMemo(
    () => sortNewestFirst(videos).filter((v) => isValidVideoId(v.videoId)),
    [videos],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  useEffect(() => {
    if (activeIndex >= sorted.length) setActiveIndex(0);
  }, [sorted.length, activeIndex]);

  const active = sorted[activeIndex] ?? sorted[0];
  const canNavigate = sorted.length > 1;

  const goPrev = () => {
    setPlayingVideoId(null);
    setActiveIndex((i) => (i <= 0 ? sorted.length - 1 : i - 1));
  };

  const goNext = () => {
    setPlayingVideoId(null);
    setActiveIndex((i) => (i >= sorted.length - 1 ? 0 : i + 1));
  };

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-sm)]">
        <p className="text-sm text-muted-foreground">
          Videos will appear here once configured. Subscribe on YouTube for the latest updates.
        </p>
        <Button asChild variant="outline" className="mt-4 border-border">
          <a href={YOUTUBE_CHANNEL_URL} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open YouTube channel
          </a>
        </Button>
      </div>
    );
  }

  const isPlaying = playingVideoId === active.videoId;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 sm:gap-3">
        {canNavigate ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full border-border bg-background shadow-sm"
            onClick={goPrev}
            aria-label="Previous video"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        ) : (
          <div className="w-11 shrink-0" aria-hidden />
        )}

        <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-border bg-black shadow-[var(--shadow)]">
          <div className="aspect-video w-full">
            {isPlaying ? (
              <iframe
                key={active.videoId}
                title={active.title}
                src={embedUrl(active.videoId)}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <button
                type="button"
                className="group relative h-full w-full"
                onClick={() => setPlayingVideoId(active.videoId)}
                aria-label={`Play ${active.title}`}
              >
                <img
                  src={`https://i.ytimg.com/vi/${active.videoId}/hqdefault.jpg`}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/35 transition-colors group-hover:bg-black/45">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                    <Play className="ml-1 h-8 w-8 fill-current" />
                  </span>
                </span>
              </button>
            )}
          </div>
        </div>

        {canNavigate ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full border-border bg-background shadow-sm"
            onClick={goNext}
            aria-label="Next video"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        ) : (
          <div className="w-11 shrink-0" aria-hidden />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="min-w-0 text-sm font-medium text-foreground line-clamp-2">{active.title}</p>
        <a
          href={`https://www.youtube.com/watch?v=${active.videoId}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Open on YouTube
        </a>
      </div>
    </div>
  );
};

export default YouTubeVideosCarousel;
