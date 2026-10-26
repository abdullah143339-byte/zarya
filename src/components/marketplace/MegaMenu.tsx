"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Menu, ChevronRight, Sparkles, Package, Handshake } from "lucide-react";
import { MEGA_CATEGORIES } from "./catalog";
import { cn } from "@/lib/utils";

interface MegaMenuProps {
  location: string;
}

export default function MegaMenu({ location }: MegaMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(MEGA_CATEGORIES[0].id);
  const closeTimer = useRef<number | null>(null);

  const openMenu = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setOpen(true);
  };

  const scheduleClose = () => {
    closeTimer.current = window.setTimeout(() => setOpen(false), 200);
  };

  const activeCat = MEGA_CATEGORIES.find((c) => c.id === active) ?? MEGA_CATEGORIES[0];

  return (
    <div className="relative" onMouseEnter={openMenu} onMouseLeave={scheduleClose}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 h-10 px-3.5 rounded-xl bg-gradient-primary text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/25 transition-all"
      >
        <Menu className="w-4 h-4" />
        <span className="hidden xl:inline">All Categories</span>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-11 z-50 w-[680px] max-w-[calc(100vw-2rem)]">
          <div className="flex h-[460px] overflow-hidden rounded-2xl glass-strong border border-border shadow-xl">
            <div className="w-56 bg-muted/30 overflow-y-auto no-scrollbar p-2">
              {MEGA_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onMouseEnter={() => setActive(cat.id)}
                  onClick={() => {
                    setOpen(false);
                    router.push(`/dashboard/marketplace/search?q=${encodeURIComponent(cat.label)}`);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all text-left",
                    active === cat.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <span className="text-base">{cat.emoji}</span>
                  <span className="flex-1 truncate">{cat.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-5">
              <div className="mb-4">
                <p className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span>{activeCat.emoji}</span> {activeCat.label}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {activeCat.sub.map((s) => (
                    <Link
                      key={s}
                      href={`/dashboard/marketplace/search?q=${encodeURIComponent(s)}`}
                      onClick={() => setOpen(false)}
                      className="text-xs text-muted-foreground hover:text-primary py-1 transition-colors"
                    >
                      {s}
                    </Link>
                  ))}
                </div>
              </div>
              <Link
                href={`/dashboard/marketplace/search?q=${encodeURIComponent(activeCat.label)}`}
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary hover:text-white transition-all"
              >
                Browse all {activeCat.label} <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2">
            <Link
              href="/dashboard/marketplace/seller"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-primary text-white text-xs font-medium hover:shadow-lg hover:shadow-primary/25 transition-all"
            >
              <Handshake className="w-4 h-4" /> Sell on NOVAX
            </Link>
            <Link
              href="/dashboard/marketplace/search?q=AI"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl glass-strong text-xs font-medium text-foreground hover:bg-surface transition-all"
            >
              <Sparkles className="w-4 h-4 text-primary" /> AI Products
            </Link>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl glass-strong text-xs text-muted-foreground">
              <Package className="w-4 h-4" /> Shipping to <span className="font-medium text-foreground">{location}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
