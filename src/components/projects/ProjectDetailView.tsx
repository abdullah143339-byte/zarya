"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  Bookmark,
  Share2,
  Flag,
  Sparkles,
  MessageSquare,
  GitFork,
  Rocket,
  Eye,
  ExternalLink,
  FileText,
  Download,
  Trash2,
  Edit3,
  Send,
  Clock,
  Calendar,
  Users,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { Modal } from "@/components/admin/AdminShared";
import { useAuth } from "@/providers/AuthProvider";
import api from "@/lib/api";
import { normalizePostToProject, extractPost, extractPostList, parseTags } from "@/components/projects/data";
import { findSimilarProjects } from "@/components/projects/ai";
import type { ProjectRow, ProjectCommentRow } from "@/components/projects/types";
import { StatusPill, VerifiedBadge, ProjectAvatar, TechChips, TagChips, type ProjectSocial } from "@/components/projects/ProjectShared";
import { ProjectAIAssistant } from "@/components/projects/ProjectAIAssistant";
import { ShareSheet } from "@/components/projects/ShareSheet";
import { CommentsPanel } from "@/components/projects/CommentsPanel";

function normalizeComment(raw: {
  id: string;
  content?: string;
  createdAt?: string;
  author?: { id?: string; username?: string; displayName?: string; avatar?: string };
}): ProjectCommentRow {
  return {
    id: raw.id,
    user: {
      name: raw.author?.displayName || raw.author?.username || "User",
      username: raw.author?.username || "user",
      avatar: raw.author?.avatar || "🧑‍🚀",
    },
    content: raw.content || "",
    createdAt: raw.createdAt || new Date().toISOString(),
    likes: 0,
  };
}

export function ProjectDetailView({ id }: { id: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [related, setRelated] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [social, setSocial] = useState<ProjectSocial>({ liked: false, bookmarked: false, followed: false });
  const [comments, setComments] = useState<ProjectCommentRow[]>([]);
  const [addingComment, setAddingComment] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Spam or misleading content");
  const [reportDetail, setReportDetail] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [origin, setOrigin] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [contactMsg, setContactMsg] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  useEffect(() => {
    if (origin) return;
    const raf = requestAnimationFrame(() => {
      if (typeof window !== "undefined") setOrigin(window.location.origin);
    });
    return () => cancelAnimationFrame(raf);
  }, [origin]);

  useEffect(() => {
    let mounted = true;
    const raf = requestAnimationFrame(() => {
      async function load() {
        if (!user) {
          if (mounted) {
            setLoading(false);
            setNotFound(true);
          }
          return;
        }
        try {
          const res = await api.getPost(id);
          const post = extractPost(res.data);
          if (!post || !parseTags(post.tags).includes("project")) {
            if (mounted) {
              setLoading(false);
              setNotFound(true);
            }
            return;
          }
          const found = normalizePostToProject(post);
          const viewed = { ...found, stats: { ...found.stats, views: found.stats.views + 1 } };
          if (mounted) setProject(viewed);
          if (mounted) setSocial({ liked: false, bookmarked: false, followed: Boolean(viewed.creator.isFollowed) });
          if (viewed.postId) {
            try {
              const cres = await api.getPostComments(viewed.postId);
              const cdata = cres.data as { data?: { id: string; content?: string; createdAt?: string; author?: { id?: string; username?: string; displayName?: string; avatar?: string } }[] };
              const items = Array.isArray(cdata?.data) ? cdata.data.map(normalizeComment) : [];
              if (mounted) setComments(items);
            } catch {
              if (mounted) setComments([]);
            }
          }
          try {
            const pres = await api.getUserPosts(user.id);
            const pool = extractPostList(pres.data)
              .filter((p) => parseTags(p.tags).includes("project"))
              .map((p) => normalizePostToProject(p));
            if (mounted) setRelated(findSimilarProjects(viewed, pool));
          } catch {
            if (mounted) setRelated([]);
          }
          if (mounted) setLoading(false);
        } catch {
          if (mounted) {
            setLoading(false);
            setNotFound(true);
          }
        }
      }
      void load();
    });
    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
    };
  }, [id, user]);

  const handleLike = useCallback(() => {
    setSocial((prev) => ({ ...prev, liked: !prev.liked }));
    if (project && project.source === "post" && project.postId) void api.reactToPost(project.postId, "LIKE").catch(() => {});
  }, [project]);

  const handleBookmark = useCallback(() => {
    setSocial((prev) => ({ ...prev, bookmarked: !prev.bookmarked }));
    if (project && project.source === "post" && project.postId) void api.toggleBookmark(project.postId).catch(() => {});
  }, [project]);

  const handleFollow = useCallback(() => {
    if (!project) return;
    const prev = social.followed;
    setSocial((s) => ({ ...s, followed: !s.followed }));
    if (project.creator.id) {
      void api.followUser(project.creator.id)
        .then((res) => {
          const next = res?.data?.following ?? !prev;
          setSocial((s) => ({ ...s, followed: next }));
        })
        .catch(() => setSocial((s) => ({ ...s, followed: prev })));
    }
  }, [project, social.followed]);

  const addComment = useCallback(
    async (content: string) => {
      if (!user) return;
      setAddingComment(true);
      try {
        if (project && project.source === "post" && project.postId) {
          const res = await api.commentOnPost(project.postId, content);
          const created = (res.data as { data?: { id: string; content?: string; createdAt?: string; author?: { id?: string; username?: string; displayName?: string; avatar?: string } } }).data;
          if (created) {
            setComments((prev) => [normalizeComment(created), ...prev]);
            setProject((prev) => (prev ? { ...prev, stats: { ...prev.stats, comments: prev.stats.comments + 1 } } : prev));
          }
        } else {
          const local: ProjectCommentRow = {
            id: `c-local-${Date.now()}`,
            user: { name: user.displayName || user.username || "You", username: user.username || "you", avatar: "🧑‍🚀" },
            content,
            createdAt: new Date().toISOString(),
            likes: 0,
          };
          setComments((prev) => [local, ...prev]);
          setProject((prev) => (prev ? { ...prev, stats: { ...prev.stats, comments: prev.stats.comments + 1 } } : prev));
        }
      } catch {
        alert("Failed to post comment");
      } finally {
        setAddingComment(false);
      }
    },
    [project, user]
  );

  const likeComment = useCallback((commentId: string) => {
    if (project && project.source === "post") void api.reactToComment(commentId, "LIKE").catch(() => {});
  }, [project]);

  async function handleDelete() {
    if (!project || project.source !== "post" || !project.postId) return;
    if (!confirm("Delete this project permanently?")) return;
    setDeleting(true);
    try {
      await api.deletePost(project.postId);
      router.push("/dashboard/projects");
    } catch {
      alert("Failed to delete project");
      setDeleting(false);
    }
  }

  async function handleContact() {
    if (!user || !project || project.source !== "post") return;
    setSendingMsg(true);
    try {
      const conv = await api.createConversation({ participantId: project.creator.id });
      const convId = (conv.data as { id?: string; conversation?: { id?: string } }).id || (conv.data as { conversation?: { id?: string } }).conversation?.id;
      if (!convId) throw new Error("No conversation id");
      await api.sendMessage(convId, contactMsg.trim() || `Hi! I found your project "${project.title}" on NOVAX and would love to connect.`);
      setContactMsg("");
      alert("Message sent!");
    } catch {
      alert("Failed to send message");
    } finally {
      setSendingMsg(false);
    }
  }

  const isOwner = Boolean(user && project && project.creator.id && project.creator.id === user.id);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-44 rounded-3xl bg-muted/50 animate-pulse" />
        <div className="h-24 rounded-2xl bg-muted/40 animate-pulse" />
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 h-64 rounded-2xl bg-muted/40 animate-pulse" />
          <div className="h-64 rounded-2xl bg-muted/40 animate-pulse" />
        </div>
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <GlassCard className="p-12 text-center">
        <p className="text-sm text-muted-foreground">Project not found. It may have been deleted.</p>
        <Button className="mt-4" onClick={() => router.push("/dashboard/projects")}>
          Back to Projects
        </Button>
      </GlassCard>
    );
  }

  const primaryLink = project.links.github || project.links.demo || project.links.docs || "";

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.push("/dashboard/projects")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> All Projects
      </button>

      <div className={cn("relative overflow-hidden rounded-3xl bg-gradient-to-br", project.cover)}>
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:18px_18px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        <div className="relative p-6 md:p-8 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={project.status} className="bg-black/40 text-white border-white/20 backdrop-blur" />
            <span className="px-2 py-0.5 rounded-md bg-black/40 text-white text-[11px] font-medium backdrop-blur">{project.category}</span>
            {project.isOpenSource && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/40 text-white text-[11px] font-semibold backdrop-blur">
                <GitFork className="w-3 h-3" /> Open Source
              </span>
            )}
            {project.isAI && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/40 text-white text-[11px] font-semibold backdrop-blur">✨ AI</span>
            )}
            {project.isStartup && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/40 text-white text-[11px] font-semibold backdrop-blur">
                <Rocket className="w-3 h-3" /> Startup
              </span>
            )}
            {project.visibility === "PRIVATE" && <span className="px-2 py-0.5 rounded-md bg-black/40 text-white text-[11px] font-semibold backdrop-blur">🔒 Private</span>}
          </div>
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <span className="w-16 h-16 rounded-2xl bg-white/15 border border-white/20 backdrop-blur flex items-center justify-center text-3xl select-none shrink-0">
              {project.logo}
            </span>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow">{project.title}</h1>
              <p className="text-sm text-white/85 mt-1">{project.tagline}</p>
            </div>
            {primaryLink && (
              <a
                href={primaryLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 h-11 rounded-xl bg-white text-slate-900 text-sm font-semibold shadow-lg hover:scale-[1.02] transition-transform shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
                {project.links.github ? "View on GitHub" : project.links.demo ? "Live Demo" : "View Docs"}
              </a>
            )}
          </div>
        </div>
      </div>

      <GlassCard className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <ProjectAvatar avatar={project.creator.avatar} name={project.creator.name} size={11} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground truncate">{project.creator.name}</span>
              {project.creator.verified && <VerifiedBadge />}
            </div>
            <p className="text-xs text-muted-foreground truncate">@{project.creator.username}</p>
          </div>
          <button
            type="button"
            onClick={handleFollow}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              social.followed ? "glass text-muted-foreground" : "bg-gradient-primary text-white"
            )}
          >
            {social.followed ? "Following" : "Follow"}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> {new Date(project.createdAt).toLocaleDateString()}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Updated {new Date(project.updatedAt).toLocaleDateString()}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> {project.stats.views.toLocaleString()} views
          </span>
          {project.license && (
            <span className="inline-flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" /> {project.license}
            </span>
          )}
        </div>
      </GlassCard>

      <div className="flex flex-wrap gap-2">
        <Button variant={social.liked ? "primary" : "secondary"} size="sm" onClick={handleLike}>
          <Heart className={cn("w-4 h-4", social.liked && "fill-white")} /> {project.stats.likes + (social.liked ? 1 : 0)}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => document.getElementById("comments-section")?.scrollIntoView({ behavior: "smooth" })}>
          <MessageSquare className="w-4 h-4" /> {project.stats.comments}
        </Button>
        <Button variant={social.bookmarked ? "primary" : "secondary"} size="sm" onClick={handleBookmark}>
          <Bookmark className={cn("w-4 h-4", social.bookmarked && "fill-white")} /> Bookmark
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setShareOpen(true)}>
          <Share2 className="w-4 h-4" /> Share
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setAiOpen(true)}>
          <Sparkles className="w-4 h-4 text-primary" /> AI Assistant
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setReportOpen(true)}>
          <Flag className="w-4 h-4 text-red-500" /> Report
        </Button>
        {isOwner && (
          <>
            <Button variant="secondary" size="sm" onClick={() => router.push(`/dashboard/projects/edit/${project.id}`)}>
              <Edit3 className="w-4 h-4" /> Edit
            </Button>
            <Button variant="danger" size="sm" onClick={() => void handleDelete()}>
              <Trash2 className="w-4 h-4" /> {deleting ? "Deleting..." : "Delete"}
            </Button>
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <GlassCard>
            <h2 className="font-bold text-foreground mb-3">About</h2>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{project.description}</p>
          </GlassCard>

          {project.features.length > 0 && (
            <GlassCard>
              <h2 className="font-bold text-foreground mb-3">Features</h2>
              <div className="grid sm:grid-cols-2 gap-2">
                {project.features.map((f) => (
                  <div key={f} className="flex items-start gap-2 text-sm text-foreground/90">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {project.gallery.length > 0 && (
            <GlassCard>
              <h2 className="font-bold text-foreground mb-3">Screenshots</h2>
              <div className="grid grid-cols-2 gap-3">
                {project.gallery.map((g, i) => (
                  <div key={i} className="relative rounded-xl aspect-video overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g} alt={`Screenshot ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                    <span className="absolute bottom-2 left-2 text-[11px] text-white/90 font-medium drop-shadow">Screenshot {i + 1}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {project.demoVideo && (
            <GlassCard>
              <h2 className="font-bold text-foreground mb-3">Demo Video</h2>
              <div className="relative rounded-xl aspect-video bg-muted flex items-center justify-center">
                <span className="text-sm text-muted-foreground">Video placeholder — media upload connects to the uploads API.</span>
              </div>
            </GlassCard>
          )}

          {project.roadmap.length > 0 && (
            <GlassCard>
              <h2 className="font-bold text-foreground mb-4">Roadmap</h2>
              <ol className="relative space-y-4 border-l border-border ml-2">
                {project.roadmap.map((phase) => (
                  <li key={phase.phase} className="pl-6 relative">
                    <span
                      className={cn(
                        "absolute -left-[11px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center",
                        phase.done ? "bg-green-500/15 text-green-500" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {phase.done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </span>
                    <span className={cn("text-[11px] font-bold", phase.done ? "text-green-500" : "text-muted-foreground")}>PHASE {phase.phase}</span>
                    <p className={cn("text-sm mt-0.5", phase.done ? "text-foreground/90" : "text-muted-foreground")}>{phase.title}</p>
                  </li>
                ))}
              </ol>
            </GlassCard>
          )}

          {project.changelog.length > 0 && (
            <GlassCard>
              <h2 className="font-bold text-foreground mb-4">Changelog</h2>
              <div className="space-y-4">
                {project.changelog.map((entry) => (
                  <div key={entry.version} className="rounded-xl bg-muted/50 border border-border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-semibold">v{entry.version}</span>
                      <span className="text-[11px] text-muted-foreground">{new Date(entry.date).toLocaleDateString()}</span>
                    </div>
                    <ul className="space-y-1">
                      {entry.notes.map((n, i) => (
                        <li key={i} className="text-sm text-foreground/85 flex gap-2">
                          <span className="text-muted-foreground">•</span>
                          {n}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>

        <div className="space-y-5 lg:sticky lg:top-24">
          <GlassCard>
            <h2 className="font-bold text-foreground mb-3">Links</h2>
            <div className="space-y-2">
              {[
                { label: "Source Code", href: project.links.github, icon: <GitFork className="w-4 h-4" /> },
                { label: "Live Demo", href: project.links.demo, icon: <ExternalLink className="w-4 h-4" /> },
                { label: "Documentation", href: project.links.docs, icon: <FileText className="w-4 h-4" /> },
                { label: "Download", href: project.links.download, icon: <Download className="w-4 h-4" /> },
              ].map(
                (l) =>
                  l.href && (
                    <a
                      key={l.label}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted text-sm text-foreground transition-colors"
                    >
                      {l.icon} {l.label}
                    </a>
                  )
              )}
              {Object.values(project.links).every((v) => !v) && <p className="text-xs text-muted-foreground">No external links shared.</p>}
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="font-bold text-foreground mb-3">Tech Stack</h2>
            <TechChips stack={project.techStack} max={12} />
            <h3 className="font-semibold text-foreground text-sm mt-4 mb-2">Tags</h3>
            <TagChips tags={project.tags} max={12} />
          </GlassCard>

          {project.team.length > 0 && (
            <GlassCard>
              <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Team ({project.team.length})
              </h2>
              <div className="space-y-2.5">
                {project.team.map((m) => (
                  <div key={m.username} className="flex items-center gap-2.5">
                    <ProjectAvatar avatar="👤" name={m.name} size={8} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                      <p className="text-[11px] text-muted-foreground">{m.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {project.source === "post" && user && (
            <GlassCard>
              <h2 className="font-bold text-foreground mb-2">Contact Creator</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Send a message to <span className="text-foreground">@{project.creator.username}</span> about this project.
              </p>
              <textarea
                value={contactMsg}
                onChange={(e) => setContactMsg(e.target.value)}
                rows={3}
                placeholder="Hi! I really liked your project..."
                className="w-full rounded-xl bg-muted border border-border p-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 mb-3"
              />
              <Button size="sm" className="w-full" onClick={() => void handleContact()} disabled={sendingMsg}>
                <Send className="w-3.5 h-3.5" /> {sendingMsg ? "Sending..." : "Send Message"}
              </Button>
            </GlassCard>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <GlassCard>
          <h2 className="font-bold text-foreground mb-3">Similar Projects</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {related.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => router.push(`/dashboard/projects/${p.id}`)}
                className="text-left rounded-xl border border-border bg-muted/30 hover:bg-muted p-3 transition-colors"
              >
                <span className="text-2xl">{p.logo}</span>
                <p className="text-sm font-semibold text-foreground mt-2 truncate">{p.title}</p>
                <p className="text-[11px] text-muted-foreground truncate">{p.tagline}</p>
                <p className="text-[11px] text-primary mt-1">
                  {p.stats.likes.toLocaleString()} likes · {p.stats.views.toLocaleString()} views
                </p>
              </button>
            ))}
          </div>
        </GlassCard>
      )}

      <div id="comments-section" className="scroll-mt-24">
        <GlassCard>
          <CommentsPanel comments={comments} adding={addingComment} onAdd={addComment} onLike={likeComment} />
        </GlassCard>
      </div>

      <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} title={project.title} url={`${origin}/dashboard/projects/${project.id}`} />
      {aiOpen && <ProjectAIAssistant project={project} open={aiOpen} onClose={() => setAiOpen(false)} />}
      <Modal open={reportOpen} onClose={() => { setReportOpen(false); setReportSent(false); setReportDetail(""); }} title={reportSent ? "Report submitted" : "Report this project"}>
        {reportSent ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-sm font-medium text-foreground">Thanks — your report was submitted for review.</p>
            <Button size="sm" variant="secondary" onClick={() => { setReportOpen(false); setReportSent(false); setReportDetail(""); }}>Close</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              aria-label="Reason"
              className="w-full h-10 px-3 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {["Spam or misleading content", "Inappropriate content", "Stolen / copied work", "Harassment", "Other"].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <textarea
              rows={3}
              value={reportDetail}
              onChange={(e) => setReportDetail(e.target.value)}
              placeholder="Add details (optional)"
              className="w-full rounded-xl bg-muted border border-border p-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <Button
              size="sm"
              variant="danger"
              className="w-full"
              disabled={reportSubmitting}
              onClick={async () => {
                setReportSubmitting(true);
                try {
                  if (project.postId) {
                    await api.reportPost(project.postId, reportReason, reportDetail.trim() || undefined);
                  } else {
                    throw new Error("no-post");
                  }
                  setReportSent(true);
                } catch {
                  alert("TODO(backend): could not submit the report — please try again later.");
                } finally {
                  setReportSubmitting(false);
                }
              }}
            >
              <Flag className="w-3.5 h-3.5" /> {reportSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
