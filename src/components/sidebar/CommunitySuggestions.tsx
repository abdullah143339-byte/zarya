"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Users, Loader2, UserPlus, UserCheck } from "lucide-react";

interface Community {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  image?: string | null;
  membersCount?: number;
  isMember?: boolean;
}

export default function CommunitySuggestions() {
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    api.getCommunities(1)
      .then((res) => {
        if (!active) return;
        const raw = res.data;
        const list = Array.isArray(raw) ? raw : Array.isArray(raw?.communities) ? raw.communities : Array.isArray(raw?.items) ? raw.items : [];
        setCommunities(list.slice(0, 3));
      })
      .catch(() => setCommunities([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const toggleJoin = async (c: Community) => {
    setJoining((prev) => new Set(prev).add(c.id));
    try {
      await api.joinCommunity(c.id);
      setCommunities((prev) => prev.map((x) => x.id === c.id ? { ...x, isMember: true, membersCount: (x.membersCount ?? 0) + 1 } : x));
    } catch {}
    finally { setJoining((prev) => { const s = new Set(prev); s.delete(c.id); return s; }); }
  };

  if (loading) {
    return (
      <section className="glass rounded-2xl p-4" aria-label="Suggested communities">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">Suggested Communities</h2>
          <Users className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
      </section>
    );
  }
  if (communities.length === 0) return null;

  return (
    <section className="glass rounded-2xl p-4" aria-label="Suggested communities">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-foreground">Suggested Communities</h2>
        <Users className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="space-y-3">
        {communities.map((c) => (
          <div key={c.id} className="flex items-center gap-3">
            <button onClick={() => router.push(`/dashboard/search?type=communities&q=${encodeURIComponent(c.name)}`)} className="shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                {c.icon || c.image ? <img src={c.icon || c.image || ""} alt="" className="w-full h-full object-cover" /> : c.name[0]?.toUpperCase()}
              </div>
            </button>
            <button onClick={() => router.push(`/dashboard/search?type=communities&q=${encodeURIComponent(c.name)}`)} className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.membersCount ?? 0} members</p>
            </button>
            <button
              onClick={() => toggleJoin(c)}
              disabled={c.isMember || joining.has(c.id)}
              className={`h-8 px-3 rounded-xl text-xs font-medium flex items-center gap-1 shrink-0 transition-all ${c.isMember ? "bg-muted text-foreground" : "bg-gradient-primary text-white hover:scale-105"}`}
            >
              {joining.has(c.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : c.isMember ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
              {c.isMember ? "Joined" : "Join"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
