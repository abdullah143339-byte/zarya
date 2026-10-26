"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, Package, Receipt, TicketPercent, RotateCcw, Star, StarOff, Pause, Play, Trash2, CheckCircle, XCircle, ClipboardList } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import api from "@/lib/api";
import { useAdmin } from "./AdminProvider";
import { SectionHeading, StatusBadge, EmptyRow, AdminSkeleton } from "./AdminShared";
import { formatMoney, formatDate, timeAgo, can } from "./data";
import type { MarketplaceProductRow, OrderRow, CouponRow, RefundRow, ReviewRow, ApiEnvelope, RawRow } from "./types";

type SubTab = "products" | "orders" | "coupons" | "refunds" | "reviews";

const SUB_TABS: { id: SubTab; label: string; icon: React.ReactNode; perm: string }[] = [
  { id: "products", label: "Products", icon: <Package className="w-4 h-4" />, perm: "marketplace.products" },
  { id: "orders", label: "Orders", icon: <Receipt className="w-4 h-4" />, perm: "marketplace.orders" },
  { id: "coupons", label: "Coupons", icon: <TicketPercent className="w-4 h-4" />, perm: "marketplace.coupons" },
  { id: "refunds", label: "Refunds", icon: <RotateCcw className="w-4 h-4" />, perm: "marketplace.refunds" },
  { id: "reviews", label: "Reviews", icon: <ClipboardList className="w-4 h-4" />, perm: "marketplace.reviews" },
];

const PRODUCT_STATUS_MAP: Record<string, MarketplaceProductRow["status"]> = {
  ACTIVE: "ACTIVE",
  DRAFT: "PENDING",
  PAUSED: "SUSPENDED",
  REMOVED: "HIDDEN",
  SOLD_OUT: "HIDDEN",
};

const COUPONS_KEY = "novax_admin_coupons";

const DEMO_COUPONS: CouponRow[] = [
  { id: "cp1", code: "NOVAX10", description: "10% off orders over 500", discount: 10, type: "PERCENT", maxUses: 500, used: 0, expiresAt: new Date(Date.now() + 90 * 864e5).toISOString(), active: true },
  { id: "cp2", code: "WELCOME15", description: "15% off orders over 1000", discount: 15, type: "PERCENT", maxUses: 300, used: 0, expiresAt: new Date(Date.now() + 60 * 864e5).toISOString(), active: true },
  { id: "cp3", code: "LAUNCH25", description: "25% off orders over 2000", discount: 25, type: "PERCENT", maxUses: 100, used: 0, expiresAt: new Date(Date.now() + 30 * 864e5).toISOString(), active: false },
];

function readCoupons(): CouponRow[] {
  try {
    const raw = window.localStorage.getItem(COUPONS_KEY);
    if (!raw) return DEMO_COUPONS;
    return JSON.parse(raw) as CouponRow[];
  } catch {
    return DEMO_COUPONS;
  }
}

export default function MarketplaceTab() {
  const { user } = useAuth();
  const { notify, addAuditAction } = useAdmin();
  const [sub, setSub] = useState<SubTab>("products");
  const [products, setProducts] = useState<MarketplaceProductRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [coupons, setCoupons] = useState<CouponRow[]>(readCoupons);
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([api.adminGetMarketplaceItems(1, 60), api.adminGetOrders(1, 60), api.adminGetReviews(1, 60)])
      .then(([itemsRes, ordersRes, reviewsRes]: ApiEnvelope[]) => {
        if (!mounted) return;
        const items = (itemsRes?.data?.items ?? itemsRes?.data) as RawRow[] | undefined;
        setProducts(
          (items ?? []).map((p: RawRow) => ({
            id: String(p.id),
            title: String(p.title || "Untitled"),
            category: String(p.category || "General"),
            price: Number(p.price ?? 0),
            type: (String(p.type) === "SERVICE" ? "SERVICE" : String(p.type) === "COURSE" ? "COURSE" : String(p.type) === "HARDWARE" ? "PRODUCT" : "DIGITAL") as MarketplaceProductRow["type"],
            seller: `@${(p.seller as { username?: string } | undefined)?.username || "unknown"}`,
            status: PRODUCT_STATUS_MAP[String(p.status)] ?? "ACTIVE",
            rating: Number(p.rating ?? 0),
            sales: Number(p.salesCount ?? p._count?.purchases ?? 0),
            stock: Number(p.stock ?? -1),
            featured: Boolean(p.isFeatured),
          }))
        );
        const orderRows = (ordersRes?.data?.orders ?? ordersRes?.data) as RawRow[] | undefined;
        const orders = (orderRows ?? []).map((o: RawRow) => {
          const firstItem = (o.items as RawRow[] | undefined)?.[0]?.item as RawRow | undefined;
          return {
            id: String(o.id),
            orderNo: String(o.id).slice(0, 8).toUpperCase(),
            buyer: `@${(o.buyer as { username?: string } | undefined)?.username || "unknown"}`,
            seller: firstItem ? `@seller` : "—",
            product: firstItem?.title ? String(firstItem.title) : `${(o.items as RawRow[] | undefined)?.length || 0} item(s)`,
            amount: Number(o.totalAmount ?? 0),
            status: (String(o.status || "PENDING")) as OrderRow["status"],
            createdAt: String(o.createdAt || new Date(0).toISOString()),
            paymentMethod: String(o.paymentMethod || "card"),
          };
        });
        setOrders(orders);
        setRefunds(
          orders
            .filter((o) => o.status === "REFUNDED")
            .map((o) => ({
              id: `ref-${o.id}`,
              orderNo: o.orderNo,
              buyer: o.buyer,
              amount: o.amount,
              reason: "Refunded order",
              status: "PROCESSED" as const,
              createdAt: o.createdAt,
            }))
        );
        const reviewRows = (reviewsRes?.data?.reviews ?? reviewsRes?.data) as RawRow[] | undefined;
        setReviews(
          (reviewRows ?? []).map((r: RawRow) => ({
            id: String(r.id),
            product: String((r.item as RawRow | undefined)?.title || "Product"),
            reviewer: r.buyerUsername ? `@${String(r.buyerUsername)}` : `@${String(r.buyerId || "unknown").slice(0, 8)}`,
            rating: Number(r.rating ?? 0),
            content: String(r.content || r.title || "—"),
            status: "PUBLISHED",
            createdAt: String(r.createdAt || new Date(0).toISOString()),
          }))
        );
      })
      .catch(() => {
        if (!mounted) return;
        setProducts([]);
        setOrders([]);
        setReviews([]);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const canProducts = can(user?.role, "marketplace.products") || can(user?.role, "marketplace.moderate");
  const canOrders = can(user?.role, "marketplace.orders") || can(user?.role, "marketplace.track");
  const canCoupons = can(user?.role, "marketplace.coupons");
  const canRefunds = can(user?.role, "marketplace.refunds");
  const canReviews = can(user?.role, "marketplace.reviews");

  const audit = (action: string, label: string, resource: string, resourceId: string) => {
    addAuditAction({
      action,
      actionLabel: label,
      adminName: user?.username || "admin",
      role: user?.role || "ADMIN",
      timestamp: new Date().toISOString(),
      ipAddress: "127.0.0.1",
      resource,
      resourceId,
    });
  };

  const toggleFeatured = async (p: MarketplaceProductRow) => {
    try {
      await api.adminToggleItemFeatured(p.id);
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, featured: !x.featured } : x)));
      notify(p.featured ? `Unfeatured ${p.title}` : `Featured ${p.title}`, "success");
      audit("TOGGLE_ITEM_FEATURED", `Product ${p.title} ${p.featured ? "unfeatured" : "featured"}`, "product", p.id);
    } catch {
      notify(`Could not update ${p.title}`, "error");
    }
  };

  const togglePause = async (p: MarketplaceProductRow) => {
    const pausing = p.status !== "SUSPENDED" && p.status !== "HIDDEN";
    try {
      await api.adminUpdateItemStatus(p.id, pausing ? "PAUSED" : "ACTIVE");
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: pausing ? "SUSPENDED" : "ACTIVE" } : x)));
      notify(`${pausing ? "Paused" : "Activated"} ${p.title}`, "success");
      audit("UPDATE_ITEM_STATUS", `Product ${p.title} ${pausing ? "paused" : "activated"}`, "product", p.id);
    } catch {
      notify(`Could not update ${p.title}`, "error");
    }
  };

  const setOrderStatus = async (id: string, status: OrderRow["status"]) => {
    try {
      await api.adminUpdateOrderStatus(id, status);
      setOrders((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
      notify(`Order status set to ${status}`, "success");
      audit("UPDATE_ORDER_STATUS", `Order ${id.slice(0, 8).toUpperCase()} -> ${status}`, "order", id);
    } catch {
      notify("Could not update order", "error");
    }
  };

  const toggleCoupon = (c: CouponRow) => {
    setCoupons((prev) => {
      const next = prev.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x));
      try { window.localStorage.setItem(COUPONS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    notify(c.active ? `Coupon ${c.code} deactivated` : `Coupon ${c.code} activated`, "success");
    audit("TOGGLE_COUPON", `Coupon ${c.code} ${c.active ? "deactivated" : "activated"}`, "coupon", c.id);
  };

  const setRefundStatus = (id: string, status: RefundRow["status"]) => {
    setRefunds((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
    notify(`Refund ${status.toLowerCase()}`, "success");
    audit("UPDATE_REFUND", `Refund ${id.slice(0, 8).toUpperCase()} ${status.toLowerCase()}`, "refund", id);
  };

  const removeReview = async (r: ReviewRow) => {
    try {
      await api.adminDeleteReview(r.id);
      setReviews((prev) => prev.filter((x) => x.id !== r.id));
      notify("Review removed", "success");
      audit("DELETE_REVIEW", "Review removed", "review", r.id);
    } catch {
      notify("Could not remove review", "error");
    }
  };

  const tabs = SUB_TABS.filter((t) => can(user?.role, t.perm) || can(user?.role, "marketplace.view"));

  if (loading) return <AdminSkeleton rows={5} />;

  return (
    <div className="space-y-4">
      <SectionHeading
        icon={<ShoppingBag className="w-4 h-4 text-primary" />}
        title="Marketplace Admin"
        subtitle="Products, orders, coupons, refunds and reviews"
      />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              sub === t.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {sub === "products" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {products.map((p) => (
            <div key={p.id} className="glass rounded-2xl p-5 hover-glow">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                    {p.title}
                    {p.featured && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.category} · {p.type}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <div className="flex items-center justify-between mt-4 text-sm">
                <span className="text-lg font-bold text-foreground">{formatMoney(p.price)}</span>
                <span className="text-xs text-muted-foreground">
                  ★ {p.rating.toFixed(1)} · {p.sales} sales
                </span>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">Seller: <span className="text-foreground font-medium">{p.seller}</span></span>
                <div className="flex items-center gap-1">
                  {canProducts && (
                    <>
                      <button onClick={() => toggleFeatured(p)} className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-all" title={p.featured ? "Unfeature" : "Feature"}>
                        {p.featured ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                      </button>
                      <button onClick={() => togglePause(p)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all" title={p.status === "SUSPENDED" || p.status === "HIDDEN" ? "Activate" : "Pause"}>
                        {p.status === "SUSPENDED" || p.status === "HIDDEN" ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && <EmptyRow text="No products to manage" />}
        </div>
      )}

      {sub === "orders" && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  {["Order", "Buyer", "Product", "Amount", "Date", "Status", "Actions"].map((c) => (
                    <th key={c} className={`p-3 font-medium ${c === "Actions" ? "text-right" : "text-left"}`}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3 text-foreground font-medium whitespace-nowrap">#{o.orderNo}</td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{o.buyer}</td>
                    <td className="p-3 text-muted-foreground truncate max-w-[180px]">{o.product}</td>
                    <td className="p-3 text-foreground font-medium">{formatMoney(o.amount)}</td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{formatDate(o.createdAt)}</td>
                    <td className="p-3"><StatusBadge status={o.status} /></td>
                    <td className="p-3">
                      {canOrders && o.status !== "CANCELLED" && o.status !== "REFUNDED" && (
                        <select
                          value={o.status}
                          onChange={(e) => setOrderStatus(o.id, e.target.value as OrderRow["status"])}
                          className="h-8 rounded-lg bg-muted border border-border px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                        >
                          {["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"].map((s) => (
                            <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {orders.length === 0 && <EmptyRow text="No orders yet" />}
        </div>
      )}

      {sub === "coupons" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {coupons.map((c) => (
            <div key={c.id} className="glass rounded-2xl p-5 hover-glow">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary">{c.code}</span>
                <StatusBadge status={c.active ? "ACTIVE" : "INACTIVE"} />
              </div>
              <p className="text-sm text-muted-foreground mt-3">{c.description}</p>
              <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                <span className="font-bold text-foreground">{c.type === "PERCENT" ? `${c.discount}%` : formatMoney(c.discount)} off</span>
                <span>{c.used}/{c.maxUses} used</span>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">Expires {formatDate(c.expiresAt)}</span>
                {canCoupons && (
                  <button
                    onClick={() => toggleCoupon(c)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${c.active ? "text-red-500 hover:bg-red-500/10" : "text-green-500 hover:bg-green-500/10"}`}
                  >
                    {c.active ? "Deactivate" : "Activate"}
                  </button>
                )}
              </div>
            </div>
          ))}
          {coupons.length === 0 && <EmptyRow text="No coupons yet" />}
        </div>
      )}

      {sub === "refunds" && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  {["Refund", "Order", "Buyer", "Amount", "Reason", "Status", "Actions"].map((c) => (
                    <th key={c} className={`p-3 font-medium ${c === "Actions" ? "text-right" : "text-left"}`}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {refunds.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3 text-foreground font-medium whitespace-nowrap">#{r.id.slice(0, 8).toUpperCase()}</td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">#{r.orderNo}</td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{r.buyer}</td>
                    <td className="p-3 text-foreground font-medium">{formatMoney(r.amount)}</td>
                    <td className="p-3 text-muted-foreground truncate max-w-[200px]">{r.reason}</td>
                    <td className="p-3"><StatusBadge status={r.status} /></td>
                    <td className="p-3">
                      {canRefunds && r.status === "PENDING" && (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setRefundStatus(r.id, "PROCESSED")} className="p-1.5 rounded-lg text-muted-foreground hover:text-green-500 hover:bg-green-500/10 transition-all" title="Approve refund">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => setRefundStatus(r.id, "REJECTED")} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all" title="Reject refund">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {refunds.length === 0 && <EmptyRow text="No refunds to review" />}
        </div>
      )}

      {sub === "reviews" && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  {["Product", "Reviewer", "Rating", "Review", "Date", "Status", "Actions"].map((c) => (
                    <th key={c} className={`p-3 font-medium ${c === "Actions" ? "text-right" : "text-left"}`}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3 text-foreground font-medium truncate max-w-[160px]">{r.product}</td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{r.reviewer}</td>
                    <td className="p-3 text-amber-500 whitespace-nowrap">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</td>
                    <td className="p-3 text-muted-foreground truncate max-w-[240px]">{r.content}</td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{timeAgo(r.createdAt)}</td>
                    <td className="p-3"><StatusBadge status={r.status} /></td>
                    <td className="p-3">
                      {canReviews && (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => removeReview(r)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all" title="Remove review">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {reviews.length === 0 && <EmptyRow text="No reviews yet" />}
        </div>
      )}
    </div>
  );
}
