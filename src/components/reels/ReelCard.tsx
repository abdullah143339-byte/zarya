"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Trash2, Link2, X, Check, Flag, EyeOff } from "lucide-react";
import ReelPlayer from "./ReelPlayer";
import ReelActionRail from "./ReelActionRail";
import ReelInfo from "./ReelInfo";
import ReelComments from "./ReelComments";
import ReelShare from "./ReelShare";
import api from "@/lib/api";
import type { Reel } from "./types";

const REPORT_REASONS = ["Inappropriate", "Spam", "Misleading", "Harassment", "Other"];

interface ReelCardProps {
  reel: Reel;
  active: boolean;
  currentUserId?: string;
  preload?: "none" | "metadata" | "auto";
  requireAuth?: boolean;
  onRequireAuth?: (action: "like" | "comment" | "bookmark" | "profile" | "follow") => void;
  muted?: boolean;
  onToggleMute?: () => void;
  playerRef?: React.Ref<HTMLVideoElement>;
  onNotInterested?: () => void;
  onLike: () => void;
  onBookmark: () => void;
  onCommented: () => void;
  onShared: () => void;
  onDelete: () => void;
}

export default function ReelCard({ reel, active, currentUserId, preload = "metadata", requireAuth = false, onRequireAuth, muted, onToggleMute, playerRef, onNotInterested, onLike, onBookmark, onCommented, onShared, onDelete }: ReelCardProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [longPaused, setLongPaused] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const longPressTimer = useRef<number | null>(null);

  const videoUrl = reel.media?.find((m) => m.type !== "THUMBNAIL")?.url || reel.media?.[0]?.url;
  const posterUrl = reel.media?.find((m) => m.type === "THUMBNAIL")?.url || undefined;

  const isOwner = !!currentUserId && reel.author.id === currentUserId;

  const gate = (action: "like" | "comment" | "bookmark" | "profile" | "follow") => {
    if (requireAuth && onRequireAuth) {
      onRequireAuth(action);
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (!commentsOpen && !shareOpen && !moreOpen && !aiOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCommentsOpen(false);
        setShareOpen(false);
        setMoreOpen(false);
        setAiOpen(false);
        setReportOpen(false);
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [commentsOpen, shareOpen, moreOpen, aiOpen]);

  const openComments = () => {
    if (gate("comment")) return;
    setCommentsOpen(true);
  };

  const openAiSummary = async () => {
    setAiOpen(true);
    if (aiSummary || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await api.aiChat([{ role: "user", content: `Summarize this short video caption in 2-3 clear sentences: ${reel.content || "No caption"}` }], 0.3);
      const raw = res?.data;
      const text = typeof raw === "string" ? raw : raw?.content || raw?.message?.content || raw?.text || raw?.summary || null;
      setAiSummary(typeof text === "string" ? text : null);
    } catch {
      setAiSummary(null);
    } finally {
      setAiLoading(false);
    }
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/dashboard?post=${reel.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };

  const submitReport = async (reason: string) => {
    if (reportBusy) return;
    setReportBusy(true);
    try {
      await api.reportPost(reel.id, reason);
      setReportDone(true);
    } catch {
      /* keep list for retry */
    } finally {
      setReportBusy(false);
    }
  };

  const handleTouchStart = () => {
    longPressTimer.current = window.setTimeout(() => setLongPaused(true), 600);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) { window.clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    setLongPaused(false);
  };

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <ReelPlayer ref={playerRef} src={videoUrl || ""} poster={posterUrl} active={active} paused={longPaused} muted={muted} onToggleMute={onToggleMute} onDoubleTap={onLike} preload={active ? "auto" : preload} />

      <ReelInfo
        reel={reel}
        onProfile={() => { if (gate("profile")) return; window.location.href = `/dashboard/profile?u=${reel.author.username}`; }}
        currentUserId={currentUserId}
        onFollowAuth={() => { gate("follow"); setMoreOpen(false); }}
      />

      <ReelActionRail
        reel={reel}
        currentUserId={currentUserId}
        onLike={onLike}
        onComment={openComments}
        onShare={() => setShareOpen(true)}
        onBookmark={onBookmark}
        onProfile={() => { if (gate("profile")) return; window.location.href = `/dashboard/profile?u=${reel.author.username}`; }}
        onOpenAiSummary={openAiSummary}
        onMore={() => setMoreOpen((v) => !v)}
      />

      <AnimatePresence>
        {aiOpen && (
          <motion.div
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="absolute left-4 bottom-24 w-64 z-30 glass-strong rounded-2xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" /> AI Summary
              </span>
              <button onClick={() => setAiOpen(false)} aria-label="Close AI summary" className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            {aiLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-accent animate-spin" /></div>
            ) : aiSummary ? (
              <p className="text-sm text-foreground/90 leading-relaxed">{aiSummary}</p>
            ) : (
              <p className="text-sm text-muted-foreground">AI summary is not available for this reel right now.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute right-3 bottom-20 z-30 glass-strong rounded-2xl p-1.5 min-w-[180px]"
          >
            {reportOpen ? (
              <>
                <div className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  {reportDone ? "Reported" : "Report reason"}
                </div>
                {reportDone ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary" /> Thanks for your report
                  </div>
                ) : (
                  REPORT_REASONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => submitReport(r)}
                      disabled={reportBusy}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {reportBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4 text-muted-foreground" />}
                      {r}
                    </button>
                  ))
                )}
              </>
            ) : (
              <>
                <button
                  onClick={copyLink}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-primary" /> : <Link2 className="w-4 h-4 text-muted-foreground" />}
                  {copied ? "Copied" : "Copy link"}
                </button>
                <button
                  onClick={() => { setMoreOpen(false); onNotInterested?.(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <EyeOff className="w-4 h-4 text-muted-foreground" /> Not interested
                </button>
                <button
                  onClick={() => setReportOpen(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <Flag className="w-4 h-4" /> Report
                </button>
                {isOwner && (
                  <button
                    onClick={onDelete}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete reel
                  </button>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {commentsOpen && (
        <ReelComments reelId={reel.id} currentUserId={currentUserId} onClose={() => setCommentsOpen(false)} onCommented={onCommented} />
      )}
      {shareOpen && (
        <ReelShare reel={reel} onClose={() => setShareOpen(false)} onShared={onShared} />
      )}
    </div>
  );
}
