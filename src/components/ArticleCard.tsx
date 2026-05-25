import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Calendar, ExternalLink, FileText } from "lucide-react";
import type { BlogPostEntry } from "@/config/informationContent";

type ArticleCardProps = {
  post: BlogPostEntry;
};

const ArticleCard: React.FC<ArticleCardProps> = ({ post }) => {
  const dateLabel = new Date(post.publishedAt).toLocaleDateString(undefined, { dateStyle: "medium" });

  return (
    <a
      href={post.href}
      target="_blank"
      rel="noreferrer"
      className="block h-full min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
    >
      <Card
        className={cn(
          "relative flex h-full min-h-[17.5rem] flex-col p-[1rem] cursor-pointer",
          "hover:shadow-xl transition-all duration-300",
          "bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] backdrop-blur-sm border-0 shadow-[var(--shadow-sm)] w-full",
        )}
      >
        <div className="flex items-start justify-center gap-2 mb-3 px-1 pt-2 w-full">
          <div className="flex h-[8rem] w-[80%] max-w-full items-center justify-center overflow-hidden rounded-lg border border-[#8FB83D]/30 bg-muted/50">
            {post.imageUrl ? (
              <img
                src={post.imageUrl}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <FileText className="h-12 w-12 text-[#8FB83D]/70" aria-hidden />
            )}
          </div>
        </div>

        <div className="flex flex-col items-center px-[0.75rem] justify-between flex-1 py-[0.5rem] w-full min-w-0">
          <div className="flex flex-col items-center gap-[0.25rem] w-full min-w-0">
            <h3 className="text-[1rem] font-semibold text-center text-foreground leading-tight line-clamp-3 w-full px-[0.25rem]">
              {post.title}
            </h3>
            <p className="text-[0.75rem] text-muted-foreground text-center line-clamp-3 w-full px-[0.25rem]">
              {post.excerpt}
            </p>
          </div>

          <div className="text-center mt-[0.5rem] w-full space-y-1">
            <div className="flex items-center justify-center gap-1 text-[0.75rem] text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <time dateTime={post.publishedAt}>{dateLabel}</time>
            </div>
            <div
              className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold"
              style={{ color: "#8FB83D" }}
            >
              Read article
              <ExternalLink className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </Card>
    </a>
  );
};

export default ArticleCard;
