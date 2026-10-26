"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, ChevronLeft, ChevronRight, Trash2, Users } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import api from "@/lib/api";

interface StoryItem {
  id: string;
  media: string;
  mediaType: string;
  caption?: string | null;
  createdAt: string;
  expiresAt: string;
  viewed: boolean;
}

interface StoryUser {
  id: string;
  username: string;
  displayName: string;
  avatar?: string | null;
}

interface StoryGroup {
  user: StoryUser;
  stories: StoryItem[];
  hasUnviewed: boolean;
}

export default function StoryStrip() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [viewers, setViewers] = useState<{ user: StoryUser; viewedAt: string }[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getStoryFeed();
      setGroups(res?.data?.users || []);
    } catch {
      setError("Could not load stories");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [loadFeed]);

  const handleAddStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setUploading(true);
    setUploadError(null);
    try {
      const isVideo = file.type.startsWith("video/");
      const up = await api.uploadFile(file, "post", isVideo ? 60 : undefined);
      const mediaType = isVideo ? "VIDEO" : "IMAGE";
      await api.createStory(up.data.url, mediaType);
      await loadFeed();
    } catch (err: any) {
      setUploadError(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const openViewer = (groupIndex: number) => {
    setViewingIndex(groupIndex);
    setStoryIndex(0);
    setViewers(null);
    const group = groups[groupIndex];
    const story = group?.stories?.[0];
    if (story && !story.viewed) {
      api.markStoryViewed(story.id).catch(() => {});
      setGroups((prev) => prev.map((g, i) => i === groupIndex ? { ...g, stories: g.stories.map((s, j) => j === 0 ? { ...s, viewed: true } : s), hasUnviewed: g.stories.some((s, j) => j !== 0 && !s.viewed) } : g));
    }
  };

  const handleViewers = async () => {
    const group = groups[viewingIndex!];
    const story = group?.stories?.[storyIndex];
    if (!story) return;
    if (group.user.id !== user?.id) return;
    try {
      const res = await api.getStoryViews(story.id);
      setViewers(res?.data || []);
    } catch {}
  };

  const goNext = () => {
    if (viewingIndex === null) return;
    const group = groups[viewingIndex];
    if (storyIndex < group.stories.length - 1) {
      const next = storyIndex + 1;
      setStoryIndex(next);
      const story = group.stories[next];
      if (!story.viewed) {
        api.markStoryViewed(story.id).catch(() => {});
        setGroups((prev) => prev.map((g, i) => i === viewingIndex ? { ...g, stories: g.stories.map((s, j) => j === next ? { ...s, viewed: true } : s), hasUnviewed: g.stories.some((s, j) => j !== next && !s.viewed) } : g));
      }
      setViewers(null);
    } else if (viewingIndex < groups.length - 1) {
      openViewer(viewingIndex + 1);
    } else {
      setViewingIndex(null);
    }
  };

  const goPrev = () => {
    if (viewingIndex === null) return;
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
      setViewers(null);
    } else if (viewingIndex > 0) {
      const prevGroup = viewingIndex - 1;
      setViewingIndex(prevGroup);
      setStoryIndex(groups[prevGroup].stories.length - 1);
      setViewers(null);
    }
  };

  const handleDeleteStory = async () => {
    const group = groups[viewingIndex!];
    const story = group?.stories?.[storyIndex];
    if (!story) return;
    if (!window.confirm("Delete this story?")) return;
    try {
      await api.deleteStory(story.id);
      await loadFeed();
      setViewingIndex(null);
    } catch {}
  };

  const restartTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(goNext, 5000);
  };

  useEffect(() => {
    if (viewingIndex !== null) {
      restartTimer();
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [viewingIndex, storyIndex]);

  const initial = user ? [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join("") || user.username[0]?.toUpperCase() || "U" : "U";

  const currentGroup = viewingIndex !== null ? groups[viewingIndex] : null;
  const currentStory = currentGroup?.stories?.[storyIndex];

  return (
    <section aria-label="Stories" className="glass rounded-2xl p-4">
      <div className="flex gap-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label="Add story"
          className="group flex flex-col items-center gap-2.5 shrink-0 w-[68px] disabled:opacity-60"
        >
          <span className="relative w-14 h-14 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-foreground border-2 border-dashed border-border transition-all group-hover:border-primary group-hover:scale-105">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              initial
            )}
            <motion.span
              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-primary flex items-center justify-center text-white shadow-premium"
              animate={uploading ? { scale: [1, 1.15, 1] } : { scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: uploading ? 0.5 : 1.8, ease: "easeInOut" }}
            >
              {uploading ? <span className="text-[9px] animate-pulse">UP</span> : <Plus className="w-3 h-3" />}
            </motion.span>
          </span>
          <span className="text-[11px] text-muted-foreground">{uploading ? "Uploading..." : "Add Story"}</span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleAddStory} />

        {uploadError && <p className="text-xs text-red-400 self-center">{uploadError}</p>}

        {loading ? (
          <div className="flex items-center pl-4 text-sm text-muted-foreground">
            <span className="animate-pulse">Loading stories...</span>
          </div>
        ) : error && groups.length === 0 ? (
          <p className="flex items-center pl-4 text-sm text-muted-foreground">{error}</p>
        ) : (
          <AnimatePresence>
            {groups.map((group, gi) => (
              <motion.button
                key={group.user.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => openViewer(gi)}
                className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] group"
                aria-label={`View stories by ${group.user.displayName}`}
              >
                <span className={`relative p-[2.5px] rounded-full transition-transform group-hover:scale-105 ${group.hasUnviewed ? "bg-gradient-to-tr from-primary via-accent to-pink-500" : "bg-border"}`}>
                  <span className="block w-[52px] h-[52px] rounded-full bg-surface overflow-hidden ring-2 ring-background">
                    {group.user.avatar ? (
                      <img src={group.user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center text-sm font-bold text-foreground">
                        {group.user.displayName[0]?.toUpperCase()}
                      </span>
                    )}
                  </span>
                </span>
                <span className="text-[11px] text-muted-foreground truncate w-full text-center">{group.user.displayName}</span>
              </motion.button>
            ))}
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {currentGroup && currentStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex items-center justify-center p-0 sm:p-4"
            onClick={() => setViewingIndex(null)}
          >
            <div className="relative max-w-lg w-full h-full sm:h-[80vh] aspect-auto sm:aspect-[9/16] rounded-none sm:rounded-2xl overflow-hidden bg-black" onClick={(e) => e.stopPropagation()}>
              {/* Progress bars */}
              <div className="absolute top-0 inset-x-0 z-20 flex gap-1 p-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] sm:p-3">
                {currentGroup.stories.map((s, i) => (
                  <div key={s.id} className="h-1 flex-1 rounded-full bg-white/20 overflow-hidden">
                    <motion.div
                      className="h-full bg-white"
                      initial={{ width: i < storyIndex ? "100%" : i === storyIndex ? "0%" : "0%" }}
                      animate={{ width: i < storyIndex ? "100%" : i === storyIndex ? "100%" : "0%" }}
                      transition={{ duration: i === storyIndex ? 5 : 0, ease: "linear" }}
                    />
                  </div>
                ))}
              </div>

              {/* Header */}
              <div className="absolute top-4 sm:top-5 inset-x-0 z-20 flex items-center gap-2 px-3 sm:px-4 pt-[env(safe-area-inset-top)]">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-surface ring-2 ring-white/20 shrink-0">
                  {currentGroup.user.avatar ? (
                    <img src={currentGroup.user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-xs font-bold">
                      {currentGroup.user.displayName[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white drop-shadow truncate">{currentGroup.user.displayName}</p>
                  <p className="text-[11px] text-white/60">@{currentGroup.user.username}</p>
                </div>
                {currentGroup.user.id === user?.id && (
                  <>
                    <button
                      onClick={handleViewers}
                      className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/90 hover:text-white"
                      aria-label="View story viewers"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleDeleteStory}
                      className="w-8 h-8 rounded-full glass flex items-center justify-center text-red-300 hover:text-red-400"
                      aria-label="Delete story"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setViewingIndex(null)}
                  className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/90 hover:text-white"
                  aria-label="Close story"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Media */}
              <div className="absolute inset-0 z-10">
                {currentStory.mediaType === "VIDEO" || /\.(mp4|webm|mov)$/i.test(currentStory.media) ? (
                  <video src={currentStory.media} autoPlay muted playsInline className="w-full h-full object-contain" />
                ) : (
                  <img src={currentStory.media} alt="" className="w-full h-full object-contain" />
                )}
              </div>

              {currentStory.caption && (
                <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+3.5rem)] inset-x-0 z-20 flex justify-center px-4">
                  <p className="text-sm text-white/90 bg-black/40 backdrop-blur rounded-xl px-4 py-2 text-center max-w-md">{currentStory.caption}</p>
                </div>
              )}

              {/* Navigation */}
              {currentGroup.stories.length > 1 && (
                <>
                  <button
                    onClick={goPrev}
                    aria-label="Previous story"
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full glass flex items-center justify-center text-white/90 hover:text-white"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={goNext}
                    aria-label="Next story"
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full glass flex items-center justify-center text-white/90 hover:text-white"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Viewers panel */}
              {viewers && (
                <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewers(null)}>
                  <div className="w-full max-w-sm glass rounded-2xl overflow-hidden max-h-[70vh]" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <h3 className="font-semibold text-foreground">Story viewers</h3>
                      <button onClick={() => setViewers(null)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-2 max-h-[55vh] overflow-y-auto">
                      {viewers.length > 0 ? (
                        viewers.map((v) => (
                          <button
                            key={v.user.id}
                            onClick={() => { setViewingIndex(null); setViewers(null); window.location.href = `/dashboard/profile?u=${encodeURIComponent(v.user.username)}`; }}
                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted/60 transition-colors"
                          >
                            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0">
                              {v.user.avatar ? <img src={v.user.avatar} alt="" className="w-full h-full object-cover" /> : (v.user.displayName || v.user.username).slice(0, 2).toUpperCase()}
                            </div>
                            <div className="text-left min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{v.user.displayName || v.user.username}</p>
                              <p className="text-xs text-muted-foreground">@{v.user.username}</p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-6">No views yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}