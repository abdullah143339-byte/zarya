"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Copy, Link2, AtSign, MessageSquare } from "lucide-react";
import { getProfileUrl } from "./data";
import { cn } from "@/lib/utils";

interface ShareProfileModalProps {
  open: boolean;
  onClose: () => void;
  username: string;
  accent: string;
  notify: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function ShareProfileModal({ open, onClose, username, notify }: ShareProfileModalProps) {
  const router = useRouter();
  const url = getProfileUrl(username);
  const [copied, setCopied] = useState(false);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      notify("Profile link copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(`Check out ${username} on NOVAX`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
    onClose();
  };

  const dmUser = () => {
    router.push(`/dashboard/messages?user=${encodeURIComponent(username)}`);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 sheet-overlay bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 40 }}
            className="glass-strong rounded-2xl w-full max-w-sm sheet-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">Share Profile</h3>
              <button onClick={onClose} aria-label="Close share dialog" className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center">
              <div className="flex items-center gap-2 w-full mb-3">
                <div className="flex-1 min-w-0 flex items-center gap-2 h-10 px-3 rounded-xl bg-muted border border-border">
                  <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-foreground truncate">{url}</span>
                </div>
                <button onClick={copyUrl} aria-label="Copy profile link" className="w-10 h-10 rounded-xl bg-gradient-primary text-white flex items-center justify-center hover:shadow-lg hover:shadow-primary/25 transition-all">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 w-full">
                <button onClick={shareToTwitter} className={cn("flex flex-col items-center gap-1.5 py-3 rounded-xl border border-border hover:bg-muted transition-all")}>
                  <AtSign className="w-4 h-4 text-sky-400" />
                  <span className="text-[10px] text-muted-foreground">X / Twitter</span>
                </button>
                <button onClick={dmUser} className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-border hover:bg-muted transition-all">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] text-muted-foreground">DM</span>
                </button>
                <button onClick={copyUrl} className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-border hover:bg-muted transition-all">
                  <Link2 className="w-4 h-4 text-primary" />
                  <span className="text-[10px] text-muted-foreground">Copy</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
