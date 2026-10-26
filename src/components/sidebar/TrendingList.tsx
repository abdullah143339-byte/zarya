"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { TrendingUp, Loader2, Flame } from "lucide-react";

interface TrendItem {
  tag?: string;
  name?: string;
  count?: number;
  postCount?: number;
  topic?: string;
}

export default function TrendingList() {
  const router = useRouter();
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.getTrendingTags()
      .then((res) => {
        if (!active) return;
        const raw = res.data;
        const list = Array.isArray(raw) ? raw : Array.isArray(raw?.tags) ? raw.tags : [];
        setTrends(list);
      })
      .catch(() => setTrends([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const name = (t: TrendItem) => (t.tag || t.name || t.topic || "").replace(/^#/, "");
  const count = (t: TrendItem) => t.count ?? t.postCount ?? 0;

  if (loading) {
    return (
      <section className="glass rounded-2xl p-4" aria-label="Trending">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">Trending</h2>
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
      </section>
    );
  }
  if (trends.length === 0) return null;

  return (
    <section className="glass rounded-2xl p-4" aria-label="Trending">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-foreground">Trending</h2>
        <TrendingUp className="w-4 h-4 text-muted-foreground" />
      </div>
      <ul className="space-y-1">
        {trends.map((t, i) => {
          const n = name(t);
          if (!n) return null;
          return (
            <li key={n + i}>
              <button
                onClick={() => router.push(`/dashboard/search?q=${encodeURIComponent("#" + n)}`)}
                className="w-full flex items-start gap-2.5 px-2 py-2 rounded-xl hover:bg-muted/60 transition-all text-left"
              >
                {i < 3 ? <Flame className="w-4 h-4 text-accent mt-0.5 shrink-0" /> : <TrendingUp className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />}
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground truncate">#{n}</span>
                  {count(t) > 0 && <span className="block text-[11px] text-muted-foreground">{count(t)} posts</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
