"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import {
  Image as ImageIcon,
  Video,
  Sparkles,
  Film,
  ListChecks,
  MapPin,
  Smile,
  Send,
  Mic,
  Globe,
  Lock,
  X,
  Loader2,
} from "lucide-react";

interface PostComposerProps {
  onPostCreated: () => void;
}

export default function PostComposer({ onPostCreated }: PostComposerProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [aiModal, setAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiMediaUrls, setAiMediaUrls] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const initial = user
    ? [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join("") || user.username[0]?.toUpperCase() || "U"
    : "U";

  const addFiles = (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setMediaFiles((prev) => [...prev, ...list]);
    setMediaPreviews((prev) => [...prev, ...list.map((f) => URL.createObjectURL(f))]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleEmoji = () => {
    const emojis = ["🔥", "✨", "💜", "🚀", "👏", "🤖", "💡", "🎯", "❤️"];
    setContent((prev) => prev + (prev && !prev.endsWith(" ") ? " " : "") + emojis[Math.floor(Math.random() * emojis.length)]);
  };

  const handleAI = async () => {
    if (!aiPrompt.trim() || aiGenerating) return;
    setAiGenerating(true);
    try {
      const res = await api.aiGenerateImage(aiPrompt.trim());
      const url = res?.data?.url || res?.data?.imageUrl || res?.data?.image;
      if (!url) throw new Error("No image returned");
      setMediaPreviews((prev) => [...prev, url]);
      setAiMediaUrls((prev) => [...prev, url]);
      setAiModal(false);
      setAiPrompt("");
      setHint("AI image attached to your post");
    } catch {
      setHint("AI generation is unavailable right now");
    } finally {
      setAiGenerating(false);
    }
  };

  const handlePost = async () => {
    if ((!content.trim() && mediaFiles.length === 0) || posting) return;
    setPosting(true);
    try {
      const uploadedUrls: string[] = [...aiMediaUrls];
      const hasVideo = mediaFiles.some((f) => f.type.startsWith("video/"));
      for (const file of mediaFiles) {
        const isVideo = file.type.startsWith("video/");
        let duration = 0;
        if (isVideo && file.size > 0) {
          const el = document.createElement("video");
          el.src = URL.createObjectURL(file);
          await new Promise<void>((resolve) => { el.onloadedmetadata = () => resolve(); });
          duration = Math.round(el.duration);
          URL.revokeObjectURL(el.src);
        }
        const uploadRes = await api.uploadFile(file, isVideo ? "reel" : "post", duration || undefined);
        uploadedUrls.push(uploadRes.data.url);
      }
      const finalType = hasVideo ? "VIDEO" : uploadedUrls.length > 0 ? "IMAGE" : "TEXT";
      await api.createPost({
        content,
        type: finalType,
        visibility,
        media: uploadedUrls.map((url) => ({ url, type: finalType })),
      });
      setContent("");
      setMediaFiles([]);
      setAiMediaUrls([]);
      setMediaPreviews((prev) => { prev.forEach((u) => u.startsWith("blob:") && URL.revokeObjectURL(u)); return []; });
      onPostCreated();
    } catch {
      setHint("Failed to create post");
    } finally {
      setPosting(false);
    }
  };

  return (
    <section className="glass rounded-2xl p-4 shadow-premium" aria-label="Create post">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
          {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : initial}
        </div>
        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            rows={2}
            placeholder="What's on your mind? What's happening today?"
            aria-label="What's on your mind"
            className={`w-full resize-none bg-transparent outline-none text-[15px] text-foreground placeholder:text-muted-foreground/50 transition-all ${dragging ? "ring-2 ring-primary/50 rounded-xl p-2" : ""}`}
          />

          {dragging && (
            <p className="text-xs text-primary font-medium mb-1">Drop photos or videos here</p>
          )}

          {mediaPreviews.length > 0 && (
            <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
              {mediaPreviews.map((url, i) => (
                <div key={i} className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted">
                  {url.match(/\.(mp4|webm|mov)$/i) || mediaFiles[i]?.type.startsWith("video/") ? (
                    <video src={url} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => {
                      const removed = mediaPreviews[i];
                      setMediaPreviews((p) => p.filter((_, j) => j !== i));
                      setMediaFiles((f) => f.filter((_, j) => j !== i));
                      if (removed && !removed.startsWith("blob:")) setAiMediaUrls((p) => p.filter((u) => u !== removed));
                    }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
                    aria-label="Remove media"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-0.5">
              <button onClick={() => photoInputRef.current?.click()} aria-label="Add photo" title="Photo"
                className="p-2 rounded-xl text-primary hover:bg-primary/10 transition-all">
                <ImageIcon className="w-5 h-5" />
              </button>
              <button onClick={() => videoInputRef.current?.click()} aria-label="Add video" title="Video"
                className="p-2 rounded-xl text-accent hover:bg-accent/10 transition-all">
                <Video className="w-5 h-5" />
              </button>
              <button onClick={() => setAiModal(true)} aria-label="Generate with AI" title="AI Generate"
                className="p-2 rounded-xl text-pink-500 hover:bg-pink-500/10 transition-all">
                <Sparkles className="w-5 h-5" />
              </button>
              <button onClick={() => setHint("GIFs are coming soon")} aria-label="Add GIF" title="GIF"
                className="p-2 rounded-xl text-amber-500 hover:bg-amber-500/10 transition-all">
                <Film className="w-5 h-5" />
              </button>
              <button onClick={() => setHint("Polls are coming soon")} aria-label="Add poll" title="Poll"
                className="p-2 rounded-xl text-emerald-500 hover:bg-emerald-500/10 transition-all">
                <ListChecks className="w-5 h-5" />
              </button>
              <button onClick={() => setHint("Location tagging is coming soon")} aria-label="Add location" title="Location"
                className="p-2 rounded-xl text-sky-500 hover:bg-sky-500/10 transition-all">
                <MapPin className="w-5 h-5" />
              </button>
              <button onClick={handleEmoji} aria-label="Add emoji" title="Emoji"
                className="p-2 rounded-xl text-yellow-500 hover:bg-yellow-500/10 transition-all">
                <Smile className="w-5 h-5" />
              </button>
              <button onClick={() => setHint("Voice notes are coming soon")} aria-label="Voice post" title="Voice"
                className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all">
                <Mic className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setVisibility((v) => (v === "PUBLIC" ? "PRIVATE" : "PUBLIC"))}
                aria-label="Public"
                title={visibility === "PUBLIC" ? "Public" : "Only me"}
                className="flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                {visibility === "PUBLIC" ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                {visibility === "PUBLIC" ? "Public" : "Only me"}
              </button>
              <button
              onClick={handlePost}
              disabled={(!content.trim() && mediaFiles.length === 0) || posting}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-gradient-primary text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Post
            </button>
            </div>
          </div>

          <AnimatePresence>
            {hint && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs text-muted-foreground mt-2">
                {hint}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />

      <AnimatePresence>
        {aiModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { if (!aiGenerating) setAiModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
              className="glass-strong rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-pink-500" />
                  Generate with NOVAX
                </h3>
                <button onClick={() => setAiModal(false)} className="p-1.5 rounded-lg hover:bg-muted" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe the image to generate..."
                rows={3}
                autoFocus
                className="w-full rounded-xl bg-muted border border-border p-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
              <button
                onClick={handleAI}
                disabled={!aiPrompt.trim() || aiGenerating}
                className="mt-4 w-full h-10 rounded-xl bg-gradient-primary text-white text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {aiGenerating ? "Generating..." : "Generate"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
