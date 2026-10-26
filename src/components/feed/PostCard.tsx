"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import Button from "@/components/ui/Button";
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  BookmarkCheck,
  Send,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Globe,
  Lock,
  Users,
  Sparkles,
  BadgeCheck,
  X,
  Link2,
  Loader2,
  Check,
} from "lucide-react";

export interface PostAuthor {
  id: string;
  username: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string | null;
  role?: string;
  isVerified?: boolean;
}

export interface FeedPost {
  id: string;
  content: string;
  type: string;
  tags: string[];
  visibility?: string;
  isAIGenerated?: boolean;
  viewCount?: number;
  media?: { url: string; type?: string }[] | null;
  createdAt: string;
  author: PostAuthor;
  isLiked?: boolean;
  isBookmarked?: boolean;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
}

interface PostCardProps {
  post: FeedPost;
  currentUserId?: string;
  onDelete: (id: string) => void;
}

const VERIFIED_ROLES = ["CREATOR", "INSTRUCTOR", "MODERATOR", "ADMIN", "SUPER_ADMIN"];

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString();
}

function formatCount(n: number) {
  if (!n) return "0";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

function getAuthorName(a: PostAuthor) {
  if (a.displayName) return a.displayName;
  return [a.firstName, a.lastName].filter(Boolean).join(" ") || a.username;
}

function getInitials(a: PostAuthor) {
  if (a.displayName) return a.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  if (a.firstName || a.lastName) return [a.firstName?.[0], a.lastName?.[0]].filter(Boolean).join("").toUpperCase();
  return a.username.slice(0, 2).toUpperCase();
}

export function parseTags(input: unknown): string[] {
  if (Array.isArray(input)) return input;
  if (typeof input === "string") { try { return JSON.parse(input); } catch { return []; } }
  return [];
}

function renderInline(text: string, keyPrefix: string) {
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`)|(\*\*[^*]+\*\*)|(@[a-zA-Z0-9_.]+)|(#[a-zA-Z0-9_]+)|((?:https?:\/\/|www\.)[^\s]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={`${keyPrefix}-t${i++}`}>{text.slice(last, m.index)}</span>);
    const [full, code, bold, mention, hashtag, link] = m;
    if (code) parts.push(<code key={`${keyPrefix}-c${i++}`} className="px-1.5 py-0.5 rounded-md bg-muted text-accent font-mono text-[0.85em]">{code.slice(1, -1)}</code>);
    else if (bold) parts.push(<strong key={`${keyPrefix}-b${i++}`} className="font-semibold">{bold.slice(2, -2)}</strong>);
    else if (mention) parts.push(<Link key={`${keyPrefix}-m${i++}`} href={`/dashboard/profile?u=${encodeURIComponent(mention.slice(1))}`} className="text-primary font-medium hover:underline">{mention}</Link>);
    else if (hashtag) parts.push(<Link key={`${keyPrefix}-h${i++}`} href={`/dashboard/search?q=${encodeURIComponent(hashtag)}`} className="text-primary font-medium hover:underline">{hashtag}</Link>);
    else if (link) parts.push(<a key={`${keyPrefix}-l${i++}`} href={link.startsWith("http") ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{full}</a>);
    else parts.push(<span key={`${keyPrefix}-r${i++}`}>{full}</span>);
    last = m.index + full.length;
  }
  if (last < text.length) parts.push(<span key={`${keyPrefix}-end`}>{text.slice(last)}</span>);
  return parts;
}

function renderContent(content: string) {
  const blocks = content.split(/```/);
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < blocks.length; i++) {
    if (i % 2 === 1) {
      const codeLines = blocks[i].split("\n");
      const rest = codeLines.slice(1);
      nodes.push(
        <pre key={`pre-${i}`} className="mt-2 mb-3 p-3 rounded-xl bg-muted/70 border border-border overflow-x-auto text-xs leading-relaxed font-mono">
          <code>{rest.join("\n")}</code>
        </pre>
      );
    } else {
      blocks[i].split("\n").forEach((line, j) => {
        nodes.push(<p key={`p-${i}-${j}`} className="text-[15px] leading-relaxed">{renderInline(line, `p-${i}-${j}`) || <>&nbsp;</>}</p>);
      });
    }
  }
  return nodes;
}

function MediaCarousel({ media, onDoubleClick }: { media: { url: string; type?: string }[]; onDoubleClick: () => void }) {
  const [index, setIndex] = useState(0);
  const current = media[index];
  if (media.length === 1) {
    return (
      <div className="relative bg-muted" onDoubleClick={onDoubleClick}>
        {isVideoUrl(current) ? (
          <video src={current.url} controls className="w-full max-h-[480px] object-contain bg-black" />
        ) : (
          <img src={current.url} alt="" loading="lazy" className="w-full max-h-[480px] object-contain bg-black" />
        )}
      </div>
    );
  }
  return (
    <div className="relative bg-muted">
      <div className="relative overflow-hidden" onDoubleClick={onDoubleClick}>
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
          >
            {isVideoUrl(current) ? (
              <video src={current.url} controls className="w-full max-h-[480px] object-contain bg-black" />
            ) : (
              <img src={current.url} alt="" loading="lazy" className="w-full max-h-[480px] object-contain bg-black" />
            )}
          </motion.div>
        </AnimatePresence>
        {index > 0 && (
          <button onClick={() => setIndex((i) => i - 1)} aria-label="Previous"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        {index < media.length - 1 && (
          <button onClick={() => setIndex((i) => i + 1)} aria-label="Next"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="flex justify-center gap-1.5 py-2">
        {media.map((_, i) => (
          <button key={i} onClick={() => setIndex(i)} aria-label={`Image ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground/40"}`} />
        ))}
      </div>
    </div>
  );
}

function isVideoUrl(m: { url: string; type?: string }) {
  if (m.type === "VIDEO") return true;
  if (m.type === "IMAGE") return false;
  return /\.(mp4|webm|mov|m4v)$/i.test(m.url);
}

interface CommentItem {
  id: string;
  content: string;
  createdAt: string;
  author?: PostAuthor;
}

export default function PostCard({ post, currentUserId, onDelete }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(!!post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount ?? 0);
  const [isBookmarked, setIsBookmarked] = useState(!!post.isBookmarked);
  const [likeBurst, setLikeBurst] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commenting, setCommenting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bookmarkAnim, setBookmarkAnim] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const isOwner = !!currentUserId && post.author.id === currentUserId;
  const isVerified = !!post.author.isVerified || VERIFIED_ROLES.includes(post.author.role || "");
  const media = Array.isArray(post.media) ? post.media.filter((m) => m?.url) : [];

  const postUrl = typeof window !== "undefined" ? `${window.location.origin}/dashboard?post=${post.id}` : "";

  const triggerLike = async () => {
    setIsLiked((prev) => {
      const next = !prev;
      setLikesCount((c) => c + (next ? 1 : -1));
      return next;
    });
    try { await api.reactToPost(post.id); } catch {}
  };

  const handleDoubleClickLike = () => {
    setLikeBurst((b) => b + 1);
    if (!isLiked) triggerLike();
  };

  const toggleBookmark = async () => {
    setBookmarkAnim(true);
    setIsBookmarked((prev) => !prev);
    try { await api.toggleBookmark(post.id); } catch {}
  };

  const loadComments = async () => {
    setShowComments((prev) => !prev);
    if (comments.length > 0) return;
    setCommentsLoading(true);
    try {
      const res = await api.getPostComments(post.id);
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : Array.isArray(raw?.comments) ? raw.comments : [];
      setComments(list);
    } catch {} finally { setCommentsLoading(false); }
  };

  const submitComment = async () => {
    const text = commentText.trim();
    if (!text || commenting) return;
    setCommenting(true);
    try {
      await api.commentOnPost(post.id, text);
      setCommentText("");
      await loadComments();
    } catch {} finally { setCommenting(false); }
  };

  const handleShare = async (platform?: string) => {
    if (platform === "copy" || !navigator.share) {
      try { await navigator.clipboard.writeText(postUrl); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {}
      setShareOpen(false);
      return;
    }
    try { await navigator.share({ url: postUrl }); } catch {}
    setShareOpen(false);
  };

  const handleSend = async () => {
    try { await navigator.clipboard.writeText(postUrl); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {}
  };

  const handleDelete = async () => {
    if (!confirm("Delete this post?")) return;
    setDeleting(true);
    try { await api.deletePost(post.id); onDelete(post.id); } catch {} finally { setDeleting(false); }
  };

  const privacyIcon = post.visibility === "PRIVATE" || post.visibility === "FOLLOWERS" ? <Lock className="w-3.5 h-3.5" />
    : post.visibility === "COMMUNITY" ? <Users className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />;

  return (
    <motion.article
      layout
      id={`post-${post.id}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="glass rounded-xl sm:rounded-2xl shadow-premium animate-fade-in"
    >
      <div className="p-3 sm:p-4 pb-0">
        <div className="flex items-start gap-3">
          <Link href={`/dashboard/profile?u=${encodeURIComponent(post.author.username)}`} className="shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden ring-1 ring-border hover:opacity-90 transition-opacity">
              {post.author.avatar ? <img src={post.author.avatar} alt="" className="w-full h-full object-cover" /> : getInitials(post.author)}
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link href={`/dashboard/profile?u=${encodeURIComponent(post.author.username)}`} className="text-sm font-semibold text-foreground hover:underline">
                {getAuthorName(post.author)}
              </Link>
              {isVerified && <BadgeCheck className="w-4 h-4 text-primary" />}
              <Link href={`/dashboard/profile?u=${encodeURIComponent(post.author.username)}`} className="text-xs text-muted-foreground hover:underline">
                @{post.author.username}
              </Link>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <span>{timeAgo(post.createdAt)}</span>
              <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/40" />
              <span className="inline-flex items-center gap-1">{privacyIcon}<span className="capitalize">{post.visibility || "public"}</span></span>
            </div>
          </div>
          {isOwner && (
            <button onClick={handleDelete} disabled={deleting} aria-label="Delete post" title="Delete post"
              className="p-2 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          )}
        </div>

        {post.content && <div className="mt-3 space-y-0.5">{renderContent(post.content)}</div>}

        {post.isAIGenerated && (
          <span className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[11px] font-medium">
            <Sparkles className="w-3 h-3" /> AI Generated
          </span>
        )}

        {parseTags(post.tags).filter((t) => t !== "project").length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {parseTags(post.tags).filter((t) => t !== "project").map((tag) => (
              <Link key={tag} href={`/dashboard/search?q=${encodeURIComponent("#" + tag)}`} className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">#{tag}</Link>
            ))}
          </div>
        )}
      </div>

      {media.length > 0 && (
        <div className="mt-3 relative">
          <MediaCarousel media={media} onDoubleClick={handleDoubleClickLike} />
          <AnimatePresence>
            {likeBurst > 0 && (
              <motion.div
                key={likeBurst}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1.25, 1, 1.1] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9 }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center z-10"
              >
                <Heart className="w-20 h-20 fill-red-500 text-red-500 drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="px-4 pt-3">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 fill-current text-red-500" /> {formatCount(likesCount)}</span>
          <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {formatCount(post.commentsCount ?? 0)}</span>
          <span className="flex items-center gap-1"><Share2 className="w-3.5 h-3.5" /> {formatCount(post.sharesCount ?? 0)}</span>
          <span className="flex items-center gap-1 ml-auto"><Eye className="w-3.5 h-3.5" /> {formatCount(post.viewCount ?? 0)}</span>
        </div>

        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border">
          <button onClick={triggerLike} aria-label="Like"
            className={`flex flex-1 items-center justify-center gap-1.5 text-xs font-medium transition-all min-h-[44px] rounded-xl ${isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"} active:bg-red-500/10`}>
            <motion.span animate={{ scale: isLiked ? [1, 1.3, 1] : 1 }} transition={{ duration: 0.3 }}>
              <Heart className={`w-4 h-4 ${isLiked ? "fill-red-500" : ""}`} />
            </motion.span>
            <span className="hidden sm:inline">Like</span>
          </button>
          <button onClick={loadComments} aria-label="Comment"
            className={`flex flex-1 items-center justify-center gap-1.5 text-xs font-medium transition-all min-h-[44px] rounded-xl ${showComments ? "text-primary" : "text-muted-foreground hover:text-primary"} active:bg-primary/10`}>
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Comment</span>
          </button>
          <button onClick={() => setShareOpen(true)} aria-label="Share"
            className="flex flex-1 items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-accent min-h-[44px] rounded-xl active:bg-accent/10 transition-all">
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
          <button onClick={handleSend} aria-label="Send" title="Copy link"
            className={`flex flex-1 items-center justify-center gap-1.5 text-xs font-medium min-h-[44px] rounded-xl transition-all ${copied ? "text-success" : "text-muted-foreground hover:text-primary"} active:bg-primary/10`}>
            {copied ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">Send</span>
          </button>
          <button onClick={toggleBookmark} aria-label="Bookmark"
            className={`flex flex-1 items-center justify-center gap-1.5 text-xs font-medium min-h-[44px] rounded-xl transition-all ${isBookmarked ? "text-amber-500" : "text-muted-foreground hover:text-amber-500"} active:bg-amber-500/10`}>
            <motion.span animate={{ scale: bookmarkAnim ? [1, 1.25, 1] : 1 }} transition={{ duration: 0.35 }} onAnimationComplete={() => setBookmarkAnim(false)}>
              {isBookmarked ? <BookmarkCheck className="w-4 h-4 fill-amber-500" /> : <Bookmark className="w-4 h-4" />}
            </motion.span>
            <span className="hidden sm:inline">Bookmark</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 border-t border-border space-y-3">
              {commentsLoading ? (
                <div className="flex justify-center py-3"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
              ) : comments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No comments yet. Be the first!</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <Link href={`/dashboard/profile?u=${encodeURIComponent(c.author?.username || "")}`} className="shrink-0">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden hover:opacity-90">
                        {c.author?.avatar ? <img src={c.author.avatar} alt="" className="w-full h-full object-cover" /> : (c.author?.username?.[0] || "U").toUpperCase()}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs">
                        <Link href={`/dashboard/profile?u=${encodeURIComponent(c.author?.username || "")}`} className="font-semibold text-foreground hover:underline">@{c.author?.username || "unknown"}</Link>
                        <span className="text-muted-foreground"> · {timeAgo(c.createdAt)}</span>
                      </p>
                      <p className="text-sm text-foreground mt-0.5 leading-relaxed">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={commentsEndRef} />
              <div className="flex items-center gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitComment(); }}
                  placeholder="Write a comment..."
                  aria-label="Write a comment"
                  className="flex-1 h-9 rounded-xl bg-muted border border-border px-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <Button onClick={submitComment} disabled={!commentText.trim() || commenting} aria-label="Post comment" variant="primary" size="icon" className="w-9 h-9 shrink-0">
                  {commenting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shareOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={() => setShareOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="glass-strong rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Share post"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2"><Share2 className="w-5 h-5 text-accent" /> Share post</h3>
                <button onClick={() => setShareOpen(false)} className="p-1.5 rounded-lg hover:bg-muted" aria-label="Close"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-2">
                <button onClick={() => handleShare("copy")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/60 hover:bg-muted transition-all text-sm font-medium text-foreground">
                  <Link2 className="w-5 h-5 text-primary" /> {copied ? "Link copied!" : "Copy link"}
                </button>
                <button onClick={() => handleShare("native")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/60 hover:bg-muted transition-all text-sm font-medium text-foreground">
                  <Share2 className="w-5 h-5 text-accent" /> Share via system
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
