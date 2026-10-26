"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BadgeCheck, MapPin, Music, Sparkles, UserPlus, Check, Loader2 } from "lucide-react";
import api from "@/lib/api";
import type { Reel } from "./types";

const MAX_CHARS = 120;

function extractHashtags(content: string): string[] {
  const matches = content.match(/#[\w]+/g);
  return matches ? Array.from(new Set(matches)) : [];
}

interface ReelInfoProps {
  reel: Reel;
  onProfile: () => void;
  currentUserId?: string;
  onFollowAuth?: () => void;
}

export default function ReelInfo({ reel, onProfile, currentUserId, onFollowAuth }: ReelInfoProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const canFollow = !!currentUserId && !!reel.author?.id && reel.author.id !== currentUserId;

  const toggleFollow = async () => {
    if (!currentUserId) { onFollowAuth?.(); return; }
    if (followBusy) return;
    const next = !isFollowing;
    setIsFollowing(next);
    setFollowBusy(true);
    try {
      const res = await api.followUser(reel.author.id);
      setIsFollowing(res?.data?.following === true);
    } catch {
      setIsFollowing(!next);
    } finally {
      setFollowBusy(false);
    }
  };

  const caption = reel.content || "";
  const long = caption.length > MAX_CHARS;
  const visible = expanded || !long ? caption : caption.slice(0, MAX_CHARS).trimEnd() + "…";
  const hashtags = extractHashtags(caption);

  return (
    <div className="absolute left-0 right-16 bottom-24 z-20 px-4 pb-2">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-2">
        <div className="flex items-center gap-2 max-w-full">
          <button onClick={onProfile} className="flex items-center gap-2 group min-w-0" aria-label={`View ${reel.author.username}`}>
            <span className="text-[15px] font-bold text-white group-hover:underline truncate">@{reel.author.username}</span>
            {reel.author.isVerified && <BadgeCheck className="w-4 h-4 text-accent shrink-0" />}
          </button>
          {canFollow && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleFollow(); }}
              disabled={followBusy}
              aria-label={isFollowing ? "Unfollow" : "Follow"}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                isFollowing
                  ? "bg-white/10 text-white border border-white/25 hover:bg-white/20"
                  : "bg-gradient-to-r from-accent to-secondary text-white shadow-lg shadow-accent/25 hover:opacity-90"
              }`}
            >
              {followBusy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isFollowing ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Following
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" /> Follow
                </>
              )}
            </button>
          )}
        </div>

        {caption && (
          <p className="text-sm leading-relaxed text-white/95">
            {visible}
            {long && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="ml-1 text-white/60 font-medium hover:text-white transition-colors"
                aria-label={expanded ? "Show less" : "Show more"}
              >
                {expanded ? "less" : "more"}
              </button>
            )}
          </p>
        )}

        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {hashtags.slice(0, 5).map((tag) => (
              <button
                key={tag}
                onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/search?q=${encodeURIComponent(tag)}`); }}
                className="text-[13px] font-medium text-accent hover:underline"
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/70">
          {reel.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {reel.location}
            </span>
          )}
          <span className="flex items-center gap-1 truncate max-w-[220px]">
            <Music className="w-3 h-3 shrink-0" /> {reel.music || "Original Sound"}
          </span>
          {reel.isAIGenerated && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent/20 text-accent">
              <Sparkles className="w-3 h-3" /> AI
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
