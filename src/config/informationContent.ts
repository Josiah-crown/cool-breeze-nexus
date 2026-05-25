/**
 * Information page — YouTube + articles.
 * Videos auto-load from channel RSS via edge function `youtube-channel-feed`.
 * Fallback list used if the feed is unavailable (keep in sync occasionally).
 */

export type YoutubeVideoEntry = {
  videoId: string;
  title: string;
  publishedAt: string;
};

export type BlogPostEntry = {
  id: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  href: string;
  imageUrl?: string;
};

/** @crowntechnologiesZA — https://www.youtube.com/@crowntechnologiesZA/videos */
export const YOUTUBE_CHANNEL_ID = "UCedft9aGfkgn1PVC5vpy-6A";

export const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@crowntechnologiesZA/videos";

/** Offline fallback (newest first) — from channel RSS */
export const YOUTUBE_VIDEOS: YoutubeVideoEntry[] = [
  {
    videoId: "P8b5mJ0g2p8",
    title: "How to reduce energy consumption - a Crown Technologies Case Study at Afrihost",
    publishedAt: "2025-09-09",
  },
  {
    videoId: "76UcWDc9t8Y",
    title: "Evaporative Air Cooling for Warehouses, Retail and Industrial Spaces",
    publishedAt: "2025-09-01",
  },
  {
    videoId: "-5gZ7frEaik",
    title: "Industrial cooling system - Case Study Alpha Pharm - Seeley H15 Climate Wizard",
    publishedAt: "2025-09-01",
  },
  {
    videoId: "VxiEWt3LXYA",
    title: "FoxEss Solar System | Crown Technologies Case Study & Testimonial | BBC",
    publishedAt: "2025-08-04",
  },
  {
    videoId: "gue-AAZ9g74",
    title: "Crown Tech Testimonials - FOX 60KW 8E",
    publishedAt: "2025-08-04",
  },
  {
    videoId: "btCriFlLODg",
    title: "Crown Technologies Solar Panel System - Case Study: Level Products 30kw & 70kw PV",
    publishedAt: "2025-08-04",
  },
  {
    videoId: "zOAbkIeLl08",
    title: "Crown Tech Testimonials - Level Products | Sean",
    publishedAt: "2025-08-04",
  },
  {
    videoId: "WptLxewO9eA",
    title: "Fox Ess Solar Panel System. Crown Technologies Case Study South Africa",
    publishedAt: "2025-08-04",
  },
  {
    videoId: "rLJItsm6qkw",
    title: "Why We Choose Fox Ess Solar | Crown Technologies South Africa",
    publishedAt: "2025-08-04",
  },
  {
    videoId: "n1TsqcDPJIc",
    title: "Crown Tech Testimonial - Fox MSPD | Sean",
    publishedAt: "2025-08-04",
  },
  {
    videoId: "e2Ge-EsqIHo",
    title: "Crown Tech Testimonials - Fox Solar | Voigh",
    publishedAt: "2025-08-04",
  },
  {
    videoId: "wLu7kwzuFpc",
    title: "Solar Panel System, worth it or not? Crown Technologies Case Study - Level Products",
    publishedAt: "2025-08-04",
  },
  {
    videoId: "6sxKzikqmcU",
    title: "Crown Tech - Solar Basics | Surge protection",
    publishedAt: "2025-08-01",
  },
  {
    videoId: "WHAZtZ6M_PQ",
    title: "solar panels for beginners by Crown Technologies South Africa",
    publishedAt: "2025-08-01",
  },
  {
    videoId: "I4a0oLICn78",
    title: "How To Understand Evaporative Cooling Output by Sean from Crown Technologies.",
    publishedAt: "2025-08-01",
  },
];

export const BLOG_POSTS: BlogPostEntry[] = [
  {
    id: "resources-hub",
    title: "Crown Technologies resources",
    excerpt:
      "Guides on solar, evaporative cooling, water filtration, and maintenance — practical articles for commercial and industrial sites.",
    publishedAt: "2026-01-01",
    href: "https://crowntechnologies.co.za/resources",
    imageUrl:
      "https://assets.cdn.filesafe.space/yRndWd17Giuslxd9Si8Q/media/6908bc0708b94cbdff130390.jpeg",
  },
  {
    id: "solar-category",
    title: "Solar panel systems",
    excerpt: "Planning, installation context, and maintenance considerations for solar on your site.",
    publishedAt: "2025-10-15",
    href: "https://crowntechnologies.co.za/resources/category/solar-panel",
    imageUrl:
      "https://assets.cdn.filesafe.space/yRndWd17Giuslxd9Si8Q/media/6908bc0708b94cbdff130390.jpeg",
  },
  {
    id: "contact",
    title: "Talk to Crown Technologies",
    excerpt: "Request a site assessment or ask about monitoring, SLA, and BMS options.",
    publishedAt: "2025-09-01",
    href: "https://crowntechnologies.co.za/contact-us",
    imageUrl:
      "https://assets.cdn.filesafe.space/yRndWd17Giuslxd9Si8Q/media/68a87c1b36a70d47fd260a05.jpeg",
  },
];

export function sortNewestFirst<T extends { publishedAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function youtubeThumbnailUrl(videoId: string, quality: "default" | "mq" | "hq" = "hq") {
  const map = { default: "default", mq: "mqdefault", hq: "hqdefault" } as const;
  return `https://img.youtube.com/vi/${videoId}/${map[quality]}.jpg`;
}

export function youtubeWatchUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** Tailwind classes — pair with machine-card grid `style` on Information page */
export const INFORMATION_CARD_GRID_CLASS = "grid gap-3 sm:gap-4";

export const INFORMATION_CARD_GRID_STYLE = {
  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 17.5rem), 1fr))",
} as const;
