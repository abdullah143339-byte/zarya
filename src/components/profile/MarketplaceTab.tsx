"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Star, ShoppingBag, Loader2, ArrowRight } from "lucide-react";
import { formatPrice } from "@/components/marketplace/format";
import EmptyState from "./EmptyState";

import type { MarketItem } from "./types";

interface MarketplaceTabProps {
  items: MarketItem[];
  loading: boolean;
  isOwner: boolean;
}

function imageOf(item: MarketItem): string | null {
  const imgs = Array.isArray(item.images) ? item.images : [];
  const first = imgs[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "url" in first) return (first as { url: string }).url;
  return null;
}

export default function MarketplaceTab({ items, loading, isOwner }: MarketplaceTabProps) {
  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <EmptyState
          emoji="🛍️"
          title="No marketplace items yet"
          subtitle="List digital products and services to start earning"
          action={
            <Link href="/dashboard/marketplace/seller" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-gradient-primary text-white text-xs font-medium hover:shadow-lg hover:shadow-primary/25 transition-all">
              <ShoppingBag className="w-3.5 h-3.5" /> Open Seller Center
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item, i) => {
            const img = imageOf(item);
            const rating = item.rating ?? null;
            const sales = item.salesCount ?? null;
            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link href={`/dashboard/marketplace/product/${item.id}`} className="block glass rounded-xl overflow-hidden hover-glow group">
                  <div className="aspect-square bg-gradient-to-br from-primary/10 to-accent/10 relative overflow-hidden">
                    {img ? <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <span className="absolute inset-0 flex items-center justify-center text-3xl">📦</span>}
                    {item.isFeatured && <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-primary/90 text-white text-[9px] font-semibold">FEATURED</span>}
                  </div>
                  <div className="p-3">
                    <h4 className="text-xs font-medium text-foreground truncate">{item.title}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{item.shortDescription || item.description || item.category}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold" style={{ color: "var(--novax-accent, #6C63FF)" }}>{formatPrice(item.price)}</span>
                      {rating !== null ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {rating.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-primary font-medium">New</span>
                      )}
                    </div>
                    {sales !== null && (
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        <span>{sales} sold</span>
                      </div>
                    )}
                    {isOwner && (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = "/dashboard/marketplace/seller"; }}
                        className="mt-2 flex items-center gap-1 text-[10px] text-primary font-medium cursor-pointer"
                      >
                        Manage <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
