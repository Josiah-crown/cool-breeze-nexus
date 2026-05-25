import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BLOG_POSTS, sortNewestFirst, type BlogPostEntry } from "@/config/informationContent";

async function enrichPostImage(post: BlogPostEntry): Promise<BlogPostEntry> {
  if (post.imageUrl) return post;
  try {
    const { data, error } = await supabase.functions.invoke<{ imageUrl?: string | null }>("article-og-image", {
      body: { url: post.href },
    });
    if (error || !data?.imageUrl) return post;
    return { ...post, imageUrl: data.imageUrl };
  } catch {
    return post;
  }
}

async function loadPosts(): Promise<BlogPostEntry[]> {
  const sorted = sortNewestFirst(BLOG_POSTS);
  return Promise.all(sorted.map(enrichPostImage));
}

export function useBlogPostsWithImages() {
  return useQuery({
    queryKey: ["blog-posts-with-images"],
    queryFn: loadPosts,
    initialData: sortNewestFirst(BLOG_POSTS),
    placeholderData: sortNewestFirst(BLOG_POSTS),
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
}
