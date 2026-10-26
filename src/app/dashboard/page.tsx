"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import api from "@/lib/api";
import PostCard, { type FeedPost, parseTags } from "@/components/feed/PostCard";
import StoryStrip from "@/components/feed/StoryStrip";
import FeedSkeleton from "@/components/feed/FeedSkeleton";
import { EmptyFeed, ErrorFeed } from "@/components/feed/FeedStates";
import RightSidebar from "@/components/sidebar/RightSidebar";
import { Loader2 } from "lucide-react";

interface PostAuthorPayload {
  id?: string;
  username?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string | null;
  role?: string;
  isVerified?: boolean;
}

interface PostPayload {
  id: string;
  content?: string;
  type?: string;
  tags?: unknown;
  visibility?: string;
  isAIGenerated?: boolean;
  viewCount?: number;
  media?: unknown;
  createdAt?: string;
  isLiked?: boolean;
  isBookmarked?: boolean;
  likesCount?: number;
  reactionsCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  author?: PostAuthorPayload;
}

function normalizePost(raw: PostPayload): FeedPost {
  const author = raw.author || {};
  return {
    id: raw.id,
    content: raw.content || "",
    type: raw.type || "TEXT",
    tags: parseTags(raw.tags),
    visibility: raw.visibility || "PUBLIC",
    isAIGenerated: !!raw.isAIGenerated,
    viewCount: raw.viewCount ?? 0,
    media: Array.isArray(raw.media) ? raw.media : null,
    createdAt: raw.createdAt || new Date().toISOString(),
    author: {
      id: author.id || "unknown",
      username: author.username || "unknown",
      displayName: author.displayName,
      firstName: author.firstName,
      lastName: author.lastName,
      avatar: author.avatar,
      role: author.role,
      isVerified: author.isVerified,
    },
    isLiked: !!raw.isLiked,
    isBookmarked: !!raw.isBookmarked,
    likesCount: raw.likesCount ?? raw.reactionsCount ?? 0,
    commentsCount: raw.commentsCount ?? 0,
    sharesCount: raw.sharesCount ?? 0,
  };
}

export default function FeedPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrolledToPost = useRef(false);

  const loadPosts = useCallback(async (p: number, replace = false) => {
    try {
      const res = await api.getFeed(p);
      const raw = res.data;
      let items: PostPayload[] = [];
      if (Array.isArray(raw)) items = raw;
      else if (Array.isArray(raw?.posts)) items = raw.posts;
      else if (Array.isArray(raw?.items)) items = raw.items;
      else if (Array.isArray(raw?.data)) items = raw.data;

      const normalized = items.map((item) => normalizePost(item));
      setPosts((prev) => (replace ? normalized : [...prev, ...normalized]));
      setHasMore(items.length === 20);
      setError(false);
    } catch {
      if (p === 1) { setError(true); setHasMore(false); }
    }
  }, []);

  useEffect(() => {
    let active = true;
    api.getFeed(1)
      .then((res) => {
        if (!active) return;
        const raw = res.data;
        let items: PostPayload[] = [];
        if (Array.isArray(raw)) items = raw;
        else if (Array.isArray(raw?.posts)) items = raw.posts;
        else if (Array.isArray(raw?.items)) items = raw.items;
        else if (Array.isArray(raw?.data)) items = raw.data;
        const normalized = items.map((item) => normalizePost(item));
        setPosts(normalized);
        setHasMore(items.length === 20);
        setError(false);
      })
      .catch(() => { setError(true); setHasMore(false); })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
        setLoadingMore(true);
        const next = page + 1;
        loadPosts(next).finally(() => { setPage(next); setLoadingMore(false); });
      }
    }, { rootMargin: "600px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, loadPosts]);

  useEffect(() => {
    if (scrolledToPost.current || posts.length === 0) return;
    const target = searchParams.get("post");
    if (!target) { scrolledToPost.current = true; return; }
    const t = setTimeout(() => {
      document.getElementById(`post-${target}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      scrolledToPost.current = true;
    }, 300);
    return () => clearTimeout(t);
  }, [posts, searchParams]);

  const handleDelete = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const refreshFeed = useCallback(() => {
    setPage(1);
    setPosts([]);
    setHasMore(true);
    setLoading(true);
    loadPosts(1, true).finally(() => setLoading(false));
  }, [loadPosts]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px] gap-6 max-w-6xl mx-auto items-start">
      <div className="space-y-4 min-w-0">
        <h1 className="sr-only">Feed</h1>
        <StoryStrip />

        {loading ? (
          <FeedSkeleton />
        ) : (
          <>
            {posts.length === 0 ? (
              error ? <ErrorFeed onRetry={refreshFeed} /> : <EmptyFeed />
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} currentUserId={user?.id} onDelete={handleDelete} />
                ))}
              </div>
            )}
            {error && posts.length > 0 && <ErrorFeed onRetry={refreshFeed} />}

            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-4">
                {loadingMore && <Loader2 className="w-6 h-6 text-primary animate-spin" />}
              </div>
            )}
          </>
        )}
      </div>

      <div className="hidden lg:block">
        <div className="sticky top-20">
          <RightSidebar />
        </div>
      </div>
    </div>
  );
}
