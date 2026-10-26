"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { Search, Loader2 } from "lucide-react";

interface Suggestion {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  headline?: string | null;
}

export default function HeaderSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const q = query.trim();
    const t = setTimeout(async () => {
      if (!q) { setResults([]); setOpen(false); setSearching(false); return; }
      setSearching(true);
      try {
        const res = await api.globalSearch(q, "users");
        const raw = res.data;
        const list = Array.isArray(raw) ? raw : Array.isArray(raw?.users) ? raw.users : [];
        setResults(list.slice(0, 5));
        setOpen(true);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [query]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/dashboard/search?q=${encodeURIComponent(query.trim())}`);
    setOpen(false);
  };

  return (
    <form
      ref={wrapRef}
      onSubmit={submit}
      className="relative"
      role="search"
      aria-label="Search NOVAX"
    >
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search NOVAX..."
        aria-label="Search NOVAX"
        className="w-72 xl:w-96 h-10 rounded-xl bg-muted/50 border border-border pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-surface transition-all"
      />
      {searching && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />}

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute z-40 mt-2 w-72 xl:w-96 glass-strong rounded-2xl shadow-elevated overflow-hidden"
          >
            {results.map((u) => (
              <button
                key={u.id}
                onClick={() => { router.push(`/dashboard/profile?u=${u.username}`); setOpen(false); setQuery(""); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/70 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-[10px] font-bold overflow-hidden shrink-0">
                  {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : (u.displayName?.[0] || u.username[0] || "U").toUpperCase()}
                </div>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground truncate">{u.displayName || u.username}</span>
                  <span className="block text-[11px] text-muted-foreground truncate">@{u.username}{u.headline ? ` · ${u.headline}` : ""}</span>
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}