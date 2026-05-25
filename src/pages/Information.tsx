import React from "react";
import TopTaskbar from "@/components/TopTaskbar";
import YouTubeVideosCarousel from "@/components/YouTubeVideosCarousel";
import ArticleCard from "@/components/ArticleCard";
import {
  INFORMATION_CARD_GRID_CLASS,
  INFORMATION_CARD_GRID_STYLE,
  YOUTUBE_CHANNEL_URL,
} from "@/config/informationContent";
import { useYouTubeChannelVideos } from "@/hooks/useYouTubeChannelVideos";
import { useBlogPostsWithImages } from "@/hooks/useBlogPostsWithImages";

const Information: React.FC = () => {
  const { data: posts } = useBlogPostsWithImages();
  const { data: videos, isFetching } = useYouTubeChannelVideos();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopTaskbar subtitle="Information" />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <header className="mx-auto max-w-2xl text-center">
          <div className="font-mono text-[11px] uppercase tracking-wider text-accent">Crown Technologies</div>
          <h1 className="mt-3 font-serif text-3xl font-medium tracking-tight sm:text-4xl">Information</h1>
          <p className="mt-3 text-[15px] font-light leading-relaxed text-muted-foreground">
            Product updates, how-to videos, and articles from our team — monitoring, cooling, and site operations.
          </p>
        </header>

        <section className="mt-10" aria-labelledby="videos-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <h2 id="videos-heading" className="font-serif text-xl font-medium text-foreground">
              YouTube
            </h2>
            <span className="text-xs text-muted-foreground">
              {isFetching ? "Refreshing channel…" : "Latest video shown first"} ·{" "}
              <a href={YOUTUBE_CHANNEL_URL} className="text-primary underline-offset-2 hover:underline" target="_blank" rel="noreferrer">
                @crowntechnologiesZA
              </a>
            </span>
          </div>
          <YouTubeVideosCarousel videos={videos ?? []} />
        </section>

        <section className="mt-14 border-t border-border pt-12" aria-labelledby="blog-heading">
          <h2 id="blog-heading" className="font-serif text-xl font-medium text-foreground">
            Articles
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Newest first</p>

          <div className={`mt-6 ${INFORMATION_CARD_GRID_CLASS}`} style={INFORMATION_CARD_GRID_STYLE}>
            {(posts ?? []).map((post) => (
              <ArticleCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Information;
