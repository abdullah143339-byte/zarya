"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  MapPin,
  CreditCard,
  Truck,
  Store,
  CheckCircle2,
  Check,
  Landmark,
  Wallet,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { useMarketplace } from "@/components/marketplace/MarketplaceProvider";
import { getPrimaryImage, formatPrice } from "@/components/marketplace/format";
import { calcShipping, calcTotals } from "@/components/marketplace/pricing";
import { cn } from "@/lib/utils";
import type { DeliveryOption, PaymentMethod } from "@/components/marketplace/types";

const DELIVERY_OPTIONS: { id: DeliveryOption; label: string; price: number; eta: string }[] = [
  { id: "standard", label: "Standard Delivery", price: 5, eta: "3–5 business days" },
  { id: "express", label: "Express Delivery", price: 12, eta: "1–2 business days" },
  { id: "pickup", label: "Pickup Point", price: 0, eta: "Ready in 24 hours" },
];

const PAYMENT_METHODS: { id: PaymentMethod; label: string; emoji: string; note: string }[] = [
  { id: "card", label: "Credit / Debit Card", emoji: "💳", note: "Visa, Mastercard, Amex" },
  { id: "paypal", label: "PayPal", emoji: "🅿️", note: "Fast & secure checkout" },
  { id: "apple_pay", label: "Apple Pay", emoji: "", note: "One-tap payment" },
  { id: "google_pay", label: "Google Pay", emoji: "", note: "Pay with Google" },
  { id: "bank", label: "Bank Transfer", emoji: "🏦", note: "Direct bank deposit" },
  { id: "cod", label: "Cash on Delivery", emoji: "💵", note: "Pay when you receive" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, cartSubtotal, placeOrder, prefs, notify } = useMarketplace();
  const [delivery, setDelivery] = useState<DeliveryOption>("standard");
  const [payment, setPayment] = useState<PaymentMethod>("card");
  const [placing, setPlacing] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    country: "Pakistan",
    zip: "",
  });

  const shipping = calcShipping(cartSubtotal, delivery);
  const { tax, total } = calcTotals(cartSubtotal, 0, shipping);

  const formValid = useMemo(
    () =>
      form.fullName.trim().length > 1 &&
      form.phone.trim().length > 6 &&
      form.line1.trim().length > 2 &&
      form.city.trim().length > 1 &&
      form.state.trim().length > 1 &&
      form.country.trim().length > 1 &&
      form.zip.trim().length > 2,
    [form]
  );

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const handlePlaceOrder = async () => {
    if (!formValid || placing) return;
    setPlacing(true);
    try {
      const order = await placeOrder({
        address: { ...form, zip: form.zip },
        payment,
        delivery,
      });
      if (order) {
        setOrderId(order.id);
        notify("Order placed successfully");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      notify("Something went wrong placing your order", "error");
    } finally {
      setPlacing(false);
    }
  };

  if (orderId) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 glass rounded-3xl px-6">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-9 h-9 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Order Confirmed!</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Thank you for shopping with NOVAX Market. Your order <span className="font-semibold text-foreground">{orderId}</span> is
          being processed.
        </p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button onClick={() => router.push("/dashboard/marketplace/orders")}>Track Order</Button>
          <Button variant="secondary" onClick={() => router.push("/dashboard/marketplace")}>Continue Shopping</Button>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 glass rounded-3xl px-6">
        <ShoppingCart className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-foreground">Your cart is empty</h1>
        <p className="text-sm text-muted-foreground mt-2">Add some products before checking out.</p>
        <Button className="mt-6" onClick={() => router.push("/dashboard/marketplace")}>Browse Products</Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-5">Checkout</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="glass rounded-2xl p-5">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-primary" /> Shipping Address
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <input value={form.fullName} onChange={update("fullName")} placeholder="Full name" aria-label="Full name"
                  className="w-full h-10 rounded-xl bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
              </div>
              <div>
                <input value={form.phone} onChange={update("phone")} placeholder="Phone number" aria-label="Phone number"
                  className="w-full h-10 rounded-xl bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
              </div>
              <div>
                <input value={form.zip} onChange={update("zip")} placeholder="ZIP / Postal code" aria-label="ZIP code"
                  className="w-full h-10 rounded-xl bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
              </div>
              <div className="sm:col-span-2">
                <input value={form.line1} onChange={update("line1")} placeholder="Street address" aria-label="Street address"
                  className="w-full h-10 rounded-xl bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
              </div>
              <div className="sm:col-span-2">
                <input value={form.line2} onChange={update("line2")} placeholder="Apartment, suite, etc. (optional)" aria-label="Apartment"
                  className="w-full h-10 rounded-xl bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
              </div>
              <div>
                <input value={form.city} onChange={update("city")} placeholder="City" aria-label="City"
                  className="w-full h-10 rounded-xl bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
              </div>
              <div>
                <input value={form.state} onChange={update("state")} placeholder="State / Province" aria-label="State"
                  className="w-full h-10 rounded-xl bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-4">
              <Truck className="w-4 h-4 text-primary" /> Delivery Options
            </h2>
            <div className="space-y-2">
              {DELIVERY_OPTIONS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDelivery(d.id)}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all text-left",
                    delivery === d.id ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", delivery === d.id ? "border-primary" : "border-muted-foreground/40")}>
                      {delivery === d.id && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{d.label}</p>
                      <p className="text-[11px] text-muted-foreground">{d.eta}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{d.price === 0 ? "Free" : formatPrice(d.price)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-primary" /> Payment Method
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPayment(p.id)}
                  className={cn(
                    "flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left",
                    payment === p.id ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:bg-muted"
                  )}
                >
                  <span className="text-lg">{p.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{p.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{p.note}</p>
                  </div>
                  <span className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0", payment === p.id ? "border-primary" : "border-muted-foreground/40")}>
                    {payment === p.id && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </span>
                </button>
              ))}
            </div>
            {payment === "card" && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <input placeholder="Card number" aria-label="Card number" inputMode="numeric"
                    className="w-full h-10 rounded-xl bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                </div>
                <div>
                  <input placeholder="MM / YY" aria-label="Expiry date"
                    className="w-full h-10 rounded-xl bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                </div>
                <div>
                  <input placeholder="CVC" aria-label="CVC"
                    className="w-full h-10 rounded-xl bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                </div>
              </div>
            )}
            {payment === "cod" && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/40 text-xs text-muted-foreground">
                <Wallet className="w-4 h-4 text-primary" /> Pay with cash when your order arrives.
              </div>
            )}
            {payment === "bank" && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/40 text-xs text-muted-foreground">
                <Landmark className="w-4 h-4 text-primary" /> Account details will be emailed after placing the order.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass rounded-2xl p-5 lg:sticky lg:top-40">
            <h2 className="text-base font-bold text-foreground mb-4">Order Summary</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto no-scrollbar">
              {cart.map((line) => (
                <div key={line.item.id} className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-muted/40 shrink-0">
                    {getPrimaryImage(line.item) ? (
                      <img src={getPrimaryImage(line.item) ?? undefined} alt={line.item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600 text-lg">📦</div>
                    )}
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">
                      {line.quantity}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground line-clamp-1">{line.item.title}</p>
                    <p className="text-[10px] text-muted-foreground">{line.item.category}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground shrink-0">
                    {formatPrice(line.item.price * line.quantity, line.item.currency)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium text-foreground">{formatPrice(cartSubtotal, prefs.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium text-foreground">{shipping === 0 ? "Free" : formatPrice(shipping, prefs.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-medium text-foreground">{formatPrice(tax, prefs.currency)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-border text-base">
                <span className="font-bold text-foreground">Total</span>
                <span className="font-bold text-foreground">{formatPrice(total, prefs.currency)}</span>
              </div>
            </div>

            <Button size="lg" className="w-full mt-5" onClick={handlePlaceOrder} disabled={!formValid || placing}>
              <Check className="w-4 h-4" /> {placing ? "Placing Order..." : "Place Order"}
            </Button>
            {!formValid && <p className="text-[11px] text-amber-500 mt-2 text-center">Fill in your shipping address to continue</p>}

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground mt-3">
              <Store className="w-3 h-3" /> 100% Buyer Protection
            </div>
          </div>

          <Link href="/dashboard/marketplace/cart" className="block text-center text-sm text-primary hover:underline">
            ← Back to Cart
          </Link>
        </div>
      </div>
    </div>
  );
}
