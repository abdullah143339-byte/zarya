"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, Truck, CheckCircle2, XCircle, RotateCcw, FileDown, ChevronDown, ShoppingBag } from "lucide-react";
import Button from "@/components/ui/Button";
import { useMarketplace } from "@/components/marketplace/MarketplaceProvider";
import { formatPrice } from "@/components/marketplace/format";
import { cn } from "@/lib/utils";
import type { Order } from "@/components/marketplace/types";

function getStep(order: Order): number {
  const status = order.status;
  if (status === "Delivered" || status === "Completed") return 3;
  if (status === "Shipped" || status === "Out for Delivery") return 2;
  if (status === "Processing") return 1;
  if (status === "Cancelled" || status === "Refunded") return -1;
  return 0;
}

function downloadInvoice(order: Order) {
  const lines = order.lines
    .map((l) => `${l.quantity} x ${l.title} @ ${formatPrice(l.price, order.currency)} = ${formatPrice(l.price * l.quantity, order.currency)}`)
    .join("\n");
  const text = [
    `NOVAX Invoice`,
    `Order: ${order.id}`,
    `Date: ${new Date(order.createdAt).toLocaleString()}`,
    `Status: ${order.status}`,
    ``,
    lines,
    ``,
    `Subtotal: ${formatPrice(order.subtotal, order.currency)}`,
    `Shipping: ${formatPrice(order.shipping, order.currency)}`,
    order.discount > 0 ? `Discount: -${formatPrice(order.discount, order.currency)}` : null,
    `Total: ${formatPrice(order.total, order.currency)}`,
    ``,
    `Deliver to: ${order.address.fullName}, ${order.address.line1}, ${order.address.city}, ${order.address.country}`,
    `Payment: ${order.paymentMethod.replace(/_/g, " ").toUpperCase()}`,
  ]
    .filter(Boolean)
    .join("\n");

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `NOVAX-invoice-${order.id}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function OrdersPage() {
  const { orders, notify } = useMarketplace();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");

  const statuses = ["All", "Processing", "Shipped", "Delivered", "Cancelled"];
  const filtered = filter === "All" ? orders : orders.filter((o) => o.status === filter);

  const handleInvoice = (order: Order) => {
    downloadInvoice(order);
    notify(`Invoice for ${order.id} downloaded`, "info");
  };

  const handleTracking = (order: Order) => {
    setExpandedId((prev) => (prev === order.id ? null : order.id));
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-20 glass rounded-3xl">
        <Package className="w-14 h-14 text-muted-foreground/40 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-foreground">No orders yet</h2>
        <p className="text-sm text-muted-foreground mt-2">When you place an order it will show up here.</p>
        <Link href="/dashboard/marketplace">
          <Button className="mt-6">Browse Products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">My Orders ({orders.length})</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track shipments, view invoices and manage returns.</p>
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all",
                filter === s ? "bg-primary text-white" : "glass text-muted-foreground hover:text-foreground"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((order) => {
          const step = getStep(order);
          const expanded = expandedId === order.id;
          return (
            <div key={order.id} className="glass rounded-2xl overflow-hidden">
              <div className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-foreground">{order.id}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Placed on {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium",
                        order.status === "Delivered"
                          ? "bg-green-500/10 text-green-500"
                          : order.status === "Cancelled"
                          ? "bg-red-500/10 text-red-500"
                          : order.status === "Shipped"
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-amber-500/10 text-amber-500"
                      )}
                    >
                      {order.status}
                    </span>
                    <span className="text-sm font-bold text-foreground">{formatPrice(order.total, order.currency)}</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {order.lines.slice(0, 3).map((line) => (
                    <div key={line.itemId} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-muted/40">
                      {line.image ? (
                        <img src={line.image} alt="" className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-sm">📦</div>
                      )}
                      <span className="text-xs text-foreground max-w-40 truncate">{line.title}</span>
                      <span className="text-[10px] text-muted-foreground">×{line.quantity}</span>
                    </div>
                  ))}
                  {order.lines.length > 3 && (
                    <span className="px-2.5 py-1.5 rounded-xl bg-muted/40 text-xs text-muted-foreground">
                      +{order.lines.length - 3} more
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="secondary" onClick={() => handleTracking(order)}>
                    <Truck className="w-3.5 h-3.5" /> Track <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", expanded && "rotate-180")} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleInvoice(order)}>
                    <FileDown className="w-3.5 h-3.5" /> Invoice
                  </Button>
                  {order.status === "Delivered" && (
                    <Button size="sm" variant="ghost" onClick={() => {
                      notify(`Return/Replace for ${order.id} — this action isn't wired to a backend endpoint yet`, "info");
                    }}>
                      <RotateCcw className="w-3.5 h-3.5" /> Return / Replace
                    </Button>
                  )}
                </div>
              </div>

              {expanded && (
                <div className="px-4 sm:px-5 pb-5 border-t border-border pt-4">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-4">
                    <ShoppingBag className="w-3.5 h-3.5 text-primary" /> Shipment Tracking
                  </div>
                  <div className="space-y-0">
                    {order.tracking?.map((t, i) => {
                      const isPast = i <= Math.max(0, step);
                      const isCurrent = i === step;
                      return (
                        <div key={t.label} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <span
                              className={cn(
                                "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                                isPast ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                              )}
                            >
                              {isPast ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />}
                            </span>
                            {i < (order.tracking?.length ?? 0) - 1 && (
                              <span className={cn("w-0.5 flex-1 min-h-6", isPast ? "bg-green-500/40" : "bg-muted")} />
                            )}
                          </div>
                          <div className={cn("pb-5", isCurrent && "rounded-xl bg-primary/5 px-3 -mx-3")}>
                            <p className={cn("text-sm font-medium", isPast ? "text-foreground" : "text-muted-foreground")}>
                              {t.label}
                              {isCurrent && <span className="ml-2 text-[10px] text-primary font-semibold">CURRENT</span>}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{t.note}</p>
                            {t.date && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{new Date(t.date).toLocaleString()}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-1 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                    <p><span className="font-medium text-foreground">Deliver to:</span> {order.address.fullName}, {order.address.line1}, {order.address.city}, {order.address.country}</p>
                    <p className="mt-1"><span className="font-medium text-foreground">Payment:</span> {order.paymentMethod.replace(/_/g, " ").toUpperCase()}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 glass rounded-3xl">
          <XCircle className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No {filter.toLowerCase()} orders</p>
          <Link href="/dashboard/marketplace" className="inline-block text-sm text-primary hover:underline mt-2">
            Browse products
          </Link>
        </div>
      )}
    </div>
  );
}
