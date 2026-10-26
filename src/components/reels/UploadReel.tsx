"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Upload, Loader2, ImagePlus, Music, MapPin, Eye, Clapperboard } from "lucide-react";
import api from "@/lib/api";

interface UploadReelProps {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

const VISIBILITY_OPTIONS = [
  { value: "PUBLIC", label: "Public" },
  { value: "FOLLOWERS", label: "Followers" },
  { value: "PRIVATE", label: "Private" },
];

function parseHashtags(input: string): string[] {
  const matches = input.match(/#[\w]+/g);
  return matches ? Array.from(new Set(matches)) : [];
}

export default function UploadReel({ open, onClose, onUploaded }: UploadReelProps) {
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const [video, setVideo] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [location, setLocation] = useState("");
  const [visibility, setVisibility] = useState("PUBLIC");
  const [allowComments, setAllowComments] = useState(true);
  const [allowRemix, setAllowRemix] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [schedule, setSchedule] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [closing, setClosing] = useState(false);

  if (!open) return null;

  const close = () => {
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      onClose();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (thumbPreview) URL.revokeObjectURL(thumbPreview);
      setVideo(null);
      setThumbnail(null);
      setPreviewUrl(null);
      setThumbPreview(null);
      setCaption("");
      setHashtags("");
      setLocation("");
      setVisibility("PUBLIC");
      setAllowComments(true);
      setAllowRemix(true);
      setAllowDownload(true);
      setSchedule("");
      setProgress(0);
      setError("");
    }, 200);
  };

  const pickVideo = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) { setError("Please choose a valid video file."); return; }
    setVideo(file);
    setError("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const pickThumbnail = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Thumbnail must be an image."); return; }
    setThumbnail(file);
    setError("");
    if (thumbPreview) URL.revokeObjectURL(thumbPreview);
    setThumbPreview(URL.createObjectURL(file));
  };

  const probeDuration = (src: string): Promise<number> =>
    new Promise((resolve) => {
      if (!src) { resolve(0); return; }
      const probe = document.createElement("video");
      probe.preload = "metadata";
      let settled = false;
      const finish = (value: number) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        probe.onloadedmetadata = null;
        probe.onerror = null;
        probe.removeAttribute("src");
        probe.load();
        resolve(Number.isFinite(value) ? value : 0);
      };
      const timer = window.setTimeout(() => finish(0), 8000);
      probe.onloadedmetadata = () => finish(probe.duration);
      probe.onerror = () => finish(0);
      probe.src = src;
    });

  const submit = async () => {
    if (!video) { setError("Please choose a video first."); return; }
    setError("");
    setUploading(true);
    setProgress(0);

    const duration = Math.round(await probeDuration(previewUrl || ""));

    if (duration > 300) {
      setUploading(false);
      setError("Reels must be 5 minutes or less.");
      return;
    }

    try {
      const uploadRes = await api.uploadFileWithProgress(video, "reel", duration || undefined, setProgress);
      let thumbUrl: string | undefined;
      if (thumbnail) {
        try {
          const thumbRes = await api.uploadFile(thumbnail, "image");
          thumbUrl = thumbRes.data?.url;
        } catch { /* optional thumbnail */ }
      }
      const media = [{ url: uploadRes.data.url, type: "VIDEO" }];
      if (thumbUrl) media.push({ url: thumbUrl, type: "THUMBNAIL" });

      await api.createPost({
        content: caption.trim() || "New reel",
        type: "VIDEO",
        tags: parseHashtags(hashtags),
        visibility,
        media,
        // TODO(backend): the Post schema has no fields for these yet — persist when added.
        location: location || undefined,
        allowComments,
        allowRemix,
        allowDownload,
        scheduledAt: schedule || undefined,
      });
      close();
      onUploaded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload reel. Please try again.");
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: closing ? 0 : 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Upload reel"
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: closing ? 0.94 : 1, opacity: closing ? 0 : 1 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg glass-strong rounded-3xl overflow-hidden max-h-[88dvh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Clapperboard className="w-4 h-4 text-primary" /> Upload Reel
          </h2>
          <button onClick={close} aria-label="Close" className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 no-scrollbar">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); pickVideo(e.dataTransfer.files?.[0]); }}
            onClick={() => videoInputRef.current?.click()}
            className={`rounded-2xl border-2 border-dashed p-5 text-center cursor-pointer transition-all ${
              dragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
            }`}
            role="button"
            aria-label="Choose video"
          >
            <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => pickVideo(e.target.files?.[0])} />
            {previewUrl ? (
              <div className="relative">
                <video src={previewUrl} className="w-full max-h-52 rounded-xl object-contain bg-black" controls playsInline muted />
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-medium">{video?.name}</span>
              </div>
            ) : (
              <div className="py-6">
                <Upload className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Drop your video here</p>
                <p className="text-xs text-muted-foreground mt-1">MP4, MOV or WebM · max 5 minutes</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div
              onClick={() => thumbInputRef.current?.click()}
              className={`rounded-xl border-2 border-dashed p-3 text-center cursor-pointer flex-1 transition-all ${
                thumbPreview ? "border-primary/40" : "border-border hover:border-primary/50"
              }`}
              role="button"
              aria-label="Choose thumbnail"
            >
              <input ref={thumbInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickThumbnail(e.target.files?.[0])} />
              {thumbPreview ? (
                <img src={thumbPreview} alt="Thumbnail" className="w-full h-16 rounded-lg object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <ImagePlus className="w-5 h-5 text-muted-foreground/50" />
                  <span className="text-[11px] text-muted-foreground">Thumbnail</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-[11px] text-muted-foreground mb-1.5">Caption</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={2}
                placeholder="Describe your reel..."
                aria-label="Caption"
                className="w-full rounded-xl bg-muted/70 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1.5">Hashtags</label>
              <input
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#nova #coding"
                aria-label="Hashtags"
                className="w-full h-10 rounded-xl bg-muted/70 border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Location
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Add a location"
                aria-label="Location"
                className="w-full h-10 rounded-xl bg-muted/70 border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1">
                <Eye className="w-3 h-3" /> Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                aria-label="Visibility"
                className="w-full h-10 rounded-xl bg-muted/70 border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {VISIBILITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1.5">Schedule (optional)</label>
              <input
                type="datetime-local"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                aria-label="Schedule"
                className="w-full h-10 rounded-xl bg-muted/70 border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            {[
              { key: "allowComments", label: "Allow comments", value: allowComments, set: setAllowComments },
              { key: "allowRemix", label: "Allow remix", value: allowRemix, set: setAllowRemix },
              { key: "allowDownload", label: "Allow download", value: allowDownload, set: setAllowDownload },
            ].map((t) => (
              <label key={t.key} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={t.value}
                  onChange={(e) => t.set(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#6C63FF]"
                />
                {t.label}
              </label>
            ))}
          </div>

          {uploading && (
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span className="flex items-center gap-1.5"><Music className="w-3 h-3 animate-pulse" /> Uploading reel...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">{error}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <button onClick={close} className="h-10 px-4 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={uploading || !video}
            className="h-10 px-6 rounded-xl bg-gradient-primary text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Uploading..." : "Upload Reel"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
