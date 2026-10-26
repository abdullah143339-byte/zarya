"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { UserPlus, UserCheck, X, Loader2, Users } from "lucide-react";

interface RecommendedUser {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  headline?: string | null;
  bio?: string | null;
  followersCount: number;
  isFollowing: boolean;
  followsYou: boolean;
  mutualCount: number;
}

export default function RecommendedPeople() {
  const router = useRouter();
  const [people, setPeople] = useState<RecommendedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    api.getRecommendedPeople(5)
      .then((res) => {
        const raw = res.data;
        setPeople(Array.isArray(raw) ? raw : Array.isArray(raw?.users) ? raw.users : []);
      })
      .catch(() => setPeople([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleFollow = async (u: RecommendedUser) => {
    setPeople((prev) => prev.map((p) => p.id === u.id ? { ...p, isFollowing: !p.isFollowing } : p));
    try { await api.followUser(u.id); } catch {}
  };

  const visible = people.filter((p) => !dismissed.has(p.id));
  if (loading && visible.length === 0) {
    return (
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">Recommended People</h2>
          <Users className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
      </div>
    );
  }
  if (visible.length === 0) return null;

  return (
    <section className="glass rounded-2xl p-4" aria-label="Recommended people">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-foreground">Recommended People</h2>
        <Users className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {visible.map((u) => (
            <motion.div
              key={u.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="flex items-center gap-3"
            >
              <button onClick={() => router.push(`/dashboard/profile?u=${u.username}`)} className="shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                  {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : (u.displayName?.[0] || u.username[0] || "U").toUpperCase()}
                </div>
              </button>
              <button onClick={() => router.push(`/dashboard/profile?u=${u.username}`)} className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-foreground truncate">{u.displayName || u.username}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {u.headline || `@${u.username}`}
                </p>
                <p className="text-[11px] text-muted-foreground/70">
                  {u.mutualCount > 0 ? `${u.mutualCount} mutual` : `${u.followersCount} followers`}
                </p>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleFollow(u)}
                  className={`h-8 px-3 rounded-xl text-xs font-medium flex items-center gap-1 transition-all ${u.isFollowing ? "bg-muted text-foreground hover:bg-muted/70" : "bg-gradient-primary text-white hover:scale-105"}`}
                >
                  {u.isFollowing ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                  {u.isFollowing ? "Following" : "Follow"}
                </button>
                <button onClick={() => setDismissed((prev) => new Set(prev).add(u.id))} aria-label={`Dismiss ${u.username}`}
                  className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
