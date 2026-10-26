"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Copy, Check, Link2, Download, MessageCircle, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { Reel } from "./types";

interface ReelShareProps {
  reel: Reel;
  onClose: () => void;
  onShared?: () => void;
}

export default function ReelShare({ reel, onClose, onShared }: ReelShareProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [closing, setClosing] = useState(false);

  const reelUrl = typeof window !== "undefined" ? `${window.location.origin}/dashboard?post=${reel.id}` : "";

  const close = () => {
    setClosing(true);
    window.setTimeout(() => { setClosing(false); onClose(); }, 200);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(reelUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
      api.sharePost(reel.id, "copy").catch(() => {});
      onShared?.();
    } catch { /* clipboard unavailable */ }
  };

  const shareExternal = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Check out this reel on NOVAX", url: reelUrl });
      } else {
        await copyLink();
      }
      api.sharePost(reel.id, "external").catch(() => {});
      onShared?.();
    } catch { /* user cancelled */ }
  };

  const shareInternal = () => {
    router.push(`/dashboard/messages?share=${encodeURIComponent(reelUrl)}`);
    api.sharePost(reel.id, "internal").catch(() => {});
    onShared?.();
    close();
  };

  const mediaUrl = reel.media?.[0]?.url;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: closing ? 0 : 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Share reel"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: closing ? 0.92 : 1, opacity: closing ? 0 : 1 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm glass-strong rounded-3xl p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Share2 className="w-4 h-4 text-primary" /> Share reel
          </h2>
          <button onClick={close} aria-label="Close" className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button onClick={shareInternal} className="flex flex-col items-center gap-2 py-4 rounded-2xl hover:bg-muted/70 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground">Internal</span>
          </button>

          <button onClick={shareExternal} className="flex flex-col items-center gap-2 py-4 rounded-2xl hover:bg-muted/70 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-accent/15 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-accent" />
            </div>
            <span className="text-xs font-medium text-foreground">External</span>
          </button>

          <a
            href={mediaUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => { api.sharePost(reel.id, "download").catch(() => {}); onShared?.(); }}
            className="flex flex-col items-center gap-2 py-4 rounded-2xl hover:bg-muted/70 transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
              <Download className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-foreground">Download</span>
          </a>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 h-11 rounded-xl bg-muted/70 border border-border text-xs text-muted-foreground overflow-hidden">
            <Link2 className="w-4 h-4 shrink-0" />
            <span className="truncate">{reelUrl || "..."}</span>
          </div>
          <button
            onClick={copyLink}
            aria-label="Copy link"
            className="h-11 px-4 rounded-xl bg-gradient-primary flex items-center gap-1.5 text-white text-xs font-medium hover:shadow-lg hover:shadow-primary/25 transition-all"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
