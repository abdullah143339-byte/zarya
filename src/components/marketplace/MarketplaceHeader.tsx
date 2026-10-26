"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  Heart,
  ShoppingCart,
  Package,
  Store,
  ChevronDown,
  Sparkles,
  MessageSquare,
  TrendingUp,
  Clock,
  Check,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useMarketplace } from "./MarketplaceProvider";
import MegaMenu from "./MegaMenu";
import { LOCATIONS, SEARCH_SUGGESTIONS } from "./catalog";
import { cn } from "@/lib/utils";

function resolveLocation(id: string): string {
  return LOCATIONS.find((l) => l.id === id)?.label ?? LOCATIONS[0].label;
}

export default function MarketplaceHeader() {
  const router = useRouter();
  const { user } = useAuth();
  const { cartCount, wishlist, prefs, setPrefs } = useMarketplace();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const submitSearch = (q: string) => {
    const term = q.trim();
    if (!term) return;
    router.push(`/dashboard/marketplace/search?q=${encodeURIComponent(term)}`);
    setQuery("");
    setSearchOpen(false);
  };

  const quickSearch = (s: string) => {
    setQuery(s);
    setSearchOpen(false);
    router.push(`/dashboard/marketplace/search?q=${encodeURIComponent(s)}`);
  };

  return (
    <header className="sticky top-14 lg:top-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border">
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2.5">
        <Link href="/dashboard/marketplace" className="flex items-center gap-2 shrink-0" aria-label="Marketplace home">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="hidden md:block">
            <span className="block text-sm font-bold text-gradient leading-none">NOVAX Market</span>
            <span className="block text-[9px] text-muted-foreground mt-0.5">Shop · Sell · Earn</span>
          </span>
        </Link>

        <div className="hidden xl:block shrink-0">
          <MegaMenu location={resolveLocation(prefs.location)} />
        </div>

        {/* Search box with suggestion dropdown */}
        <div className="relative flex-1 min-w-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch(query);
            }}
            className="relative flex items-center"
          >
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search products, brands, stores, AI tools..."
              aria-label="Search marketplace"
              className="w-full h-10 rounded-xl bg-muted border border-border pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </form>

          {searchOpen && (
            <div className="absolute left-0 right-0 top-11 z-50 rounded-2xl glass-strong border border-border shadow-xl overflow-hidden">
              <div className="max-h-80 overflow-y-auto no-scrollbar p-2">
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Popular Searches
                </p>
                {SEARCH_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => quickSearch(s)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all text-left"
                  >
                    <Search className="w-3.5 h-3.5 opacity-60" /> {s}
                  </button>
                ))}
                <p className="px-3 py-1.5 mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Quick Filters
                </p>
                {["AI Products", "Free Shipping", "Under Rs 5,000"].map((s) => (
                  <button
                    key={s}
                    onClick={() => quickSearch(s)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all text-left"
                  >
                    <Check className="w-3.5 h-3.5 opacity-60" /> {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Delivery city selector (Pakistan only) + PKR label */}
        <div className="hidden lg:flex items-center gap-1.5 shrink-0">
          <Dropdown
            trigger={
              <>
                <MapPin className="w-4 h-4 text-primary" />
                <span className="max-w-28 truncate hidden xl:inline">{resolveLocation(prefs.location)}</span>
                <ChevronDown className="w-3 h-3" />
              </>
            }
            buttonClassName="flex items-center gap-1.5 h-10 px-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all text-xs"
            ariaLabel="Select delivery city"
            menuClassName="w-52"
          >
            {LOCATIONS.map((l) => (
              <button
                key={l.id}
                onClick={() => setPrefs({ location: l.id })}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left transition-all",
                  prefs.location === l.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <MapPin className="w-3.5 h-3.5" /> {l.label}
              </button>
            ))}
          </Dropdown>

          <span className="h-10 px-2.5 rounded-xl flex items-center text-xs font-bold text-foreground">
            PKR ₨
          </span>
        </div>

        {/* Shortcut icons */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Link
            href="/dashboard/marketplace/messages"
            aria-label="Seller inbox"
            className="relative w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <MessageSquare className="w-[18px] h-[18px]" />
          </Link>
          <Link
            href="/dashboard/marketplace/wishlist"
            aria-label="Wishlist"
            className="relative w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <Heart className="w-[18px] h-[18px]" />
            {wishlist.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {wishlist.length > 9 ? "9+" : wishlist.length}
              </span>
            )}
          </Link>
          <Link
            href="/dashboard/marketplace/cart"
            aria-label="Shopping cart"
            className="relative w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <ShoppingCart className="w-[18px] h-[18px]" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </Link>
          <Link
            href="/dashboard/marketplace/orders"
            aria-label="Orders"
            className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <Package className="w-[18px] h-[18px]" />
          </Link>
          <Link
            href="/dashboard/marketplace/seller"
            aria-label="Seller center"
            className="hidden md:flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-medium text-primary hover:bg-primary/10 transition-all"
          >
            <Store className="w-4 h-4" /> Sell
          </Link>
          <Link
            href="/dashboard/profile"
            aria-label="Your profile"
            className="ml-1 w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center text-white text-xs font-bold"
          >
            {user?.firstName?.[0]}
            {user?.lastName?.[0] || user?.username?.[0]?.toUpperCase()}
          </Link>
        </div>
      </div>
    </header>
  );
}

// ---- Dropdown ---------------------------------------------------------------
// A small self-contained dropdown: a trigger button that toggles a panel.
// The panel closes when an item is clicked or when clicking outside.

interface DropdownProps {
  trigger: ReactNode;
  buttonClassName?: string;
  ariaLabel?: string;
  menuClassName?: string;
  children: ReactNode;
}

function Dropdown({ trigger, buttonClassName, ariaLabel, menuClassName, children }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
        aria-expanded={open}
        className={buttonClassName}
      >
        {trigger}
      </button>
      {open && (
        <div className={cn("absolute right-0 top-11 z-50 rounded-2xl glass-strong border border-border shadow-xl p-2", menuClassName)}>
          {children}
        </div>
      )}
    </div>
  );
}
