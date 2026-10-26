"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import api from "@/lib/api";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import {
  Search, Star, ShoppingCart, Sparkles, Code, Palette, BookOpen, Bot, Plus, Package,
  MessageSquare, Send, X, RefreshCw, DollarSign, Image as ImageIcon, Clock, CheckCircle,
  TrendingUp, Filter, Grid3X3, List, ChevronDown, Heart, Eye, Loader2, Zap, Truck,
  Shield, Globe, Tag, Percent,
} from "lucide-react";

const TYPE_MAP: Record<string, string> = {
  TEMPLATE: "Templates", COMPONENT: "Components", PLUGIN: "Plugins", COURSE: "Courses",
  EBOOK: "E-Books", CODE_SNIPPET: "Code", AI_MODEL: "AI Models", SERVICE: "Services",
  HARDWARE: "Hardware", DIGITAL_ART: "Digital Art",
};

const TYPE_ICONS: Record<string, any> = {
  TEMPLATE: Code, COMPONENT: Grid3X3, PLUGIN: Zap, COURSE: BookOpen, EBOOK: BookOpen,
  CODE_SNIPPET: Code, AI_MODEL: Bot, SERVICE: Globe, HARDWARE: Package, DIGITAL_ART: Palette,
};

const TYPE_COLORS: Record<string, string> = {
  TEMPLATE: "from-violet-500 to-purple-600", COMPONENT: "from-blue-500 to-cyan-500",
  PLUGIN: "from-amber-500 to-orange-500", COURSE: "from-emerald-500 to-green-600",
  EBOOK: "from-rose-500 to-pink-500", CODE_SNIPPET: "from-gray-500 to-slate-600",
  AI_MODEL: "from-fuchsia-500 to-pink-500", SERVICE: "from-teal-500 to-cyan-500",
  HARDWARE: "from-zinc-500 to-gray-600", DIGITAL_ART: "from-indigo-500 to-violet-500",
};

const featuredDeals = [
  { title: "AI Engineering Bundle", discount: 40, color: "from-primary/20 to-accent/20", emoji: "🚀", category: "AI Models" },
  { title: "Design System Pro", discount: 25, color: "from-amber-500/10 to-orange-500/10", emoji: "🎨", category: "Digital Art" },
  { title: "Starter Kits Sale", discount: 50, color: "from-emerald-500/10 to-teal-500/10", emoji: "⚡", category: "Templates" },
];

const categories = [
  { label: "All", icon: Sparkles },
  { label: "Templates", icon: Code },
  { label: "Courses", icon: BookOpen },
  { label: "Digital Art", icon: Palette },
  { label: "AI Models", icon: Bot },
  { label: "Services", icon: Globe },
];

type TabType = "buy" | "sell" | "my-listings" | "contacts";

export default function MarketplacePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("buy");
  const [activeCategory, setActiveCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [contactSent, setContactSent] = useState(false);
  const [myListings, setMyListings] = useState<any[]>([]);
  const [buyerMessages, setBuyerMessages] = useState<any[]>([]);
  const [showSellForm, setShowSellForm] = useState(false);
  const [sellForm, setSellForm] = useState({ title: "", description: "", price: "", category: "TEMPLATE", type: "TEMPLATE" });
  const [sellSubmitting, setSellSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const [res, myRes] = await Promise.allSettled([
        api.getMarketplaceItems(1),
        user?.id ? api.getMarketplaceItems(1, undefined, undefined, user.id) : Promise.resolve(null),
      ]);
      if (res.status === "fulfilled" && res.value?.data) {
        const raw = res.value.data;
        setItems(Array.isArray(raw) ? raw : raw?.items || raw?.data || []);
      }
      if (myRes.status === "fulfilled" && myRes.value?.data) {
        const raw = myRes.value.data;
        setMyListings(Array.isArray(raw) ? raw : raw?.items || raw?.data || []);
      }
    } catch { setItems([]); } finally { setLoading(false); }
  };

  const filteredItems = items.filter((item) => {
    const matchesCategory = !activeCategory || item.category === activeCategory || item.type === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || item.title?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const handleSellSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSellSubmitting(true);
    try {
      const res = await api.createMarketplaceItem({
        title: sellForm.title,
        description: sellForm.description,
        price: parseFloat(sellForm.price),
        category: sellForm.category,
        type: sellForm.type,
      });
      const created = res.data;
      setMyListings((prev) => [created, ...prev]);
      setItems((prev) => [created, ...prev]);
      setShowSellForm(false);
      setSellForm({ title: "", description: "", price: "", category: "TEMPLATE", type: "TEMPLATE" });
    } catch { alert("Failed to create listing"); } finally { setSellSubmitting(false); }
  };

  const handleContactSeller = (item: any) => {
    setSelectedItem(item);
    setContactMessage("");
    setContactSent(false);
    setShowContactModal(true);
  };

  const handleBuyProduct = (item: any) => {
    setSelectedItem(item);
    setContactMessage(`Hi! I'm interested in buying "${item.title}". Is it still available?`);
    setContactSent(false);
    setShowContactModal(true);
  };

  const handleSendContact = () => {
    if (!contactMessage.trim() || !selectedItem) return;
    setBuyerMessages((prev) => [{
      product: selectedItem.title,
      buyer: user?.username || "You",
      message: contactMessage,
      date: new Date().toLocaleDateString(),
    }, ...prev]);
    setContactSent(true);
  };

  const getItemIcon = (item: any) => {
    const Icon = TYPE_ICONS[item.type] || Package;
    return <Icon className="w-8 h-8" />;
  };

  const getItemColor = (item: any) => TYPE_COLORS[item.type] || "from-primary/10 to-accent/10";
  const getItemTypeLabel = (item: any) => TYPE_MAP[item.type] || item.type || "Item";

  const tabs = [
    { id: "buy" as const, label: "Buy", icon: ShoppingCart },
    { id: "sell" as const, label: "Sell", icon: Plus },
    { id: "my-listings" as const, label: "My Listings", icon: Package },
    { id: "contacts" as const, label: "Contacts", icon: MessageSquare },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">NOVAX Marketplace</h1>
          <p className="text-sm text-muted-foreground mt-1">Buy and sell digital products for creators, by creators.</p>
        </div>
        {activeTab !== "sell" && (
          <Button size="sm" onClick={() => setActiveTab("sell")}>
            <Plus className="w-4 h-4" /> Sell a Product
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "glass text-muted-foreground hover:text-foreground"
              }`}
            ><Icon className="w-4 h-4" /> {tab.label}</button>
          );
        })}
      </div>

      {/* BUY TAB */}
      {activeTab === "buy" && (
        <>
          {/* Featured Deals Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {featuredDeals.map((deal, i) => (
              <button
                key={i}
                onClick={() => { setActiveCategory(deal.category); setSearchQuery(""); }}
                className={`rounded-2xl p-5 bg-gradient-to-r ${deal.color} border border-border/50 relative overflow-hidden group cursor-pointer hover-glow text-left`}
              >
                <span className="text-3xl mb-2 block">{deal.emoji}</span>
                <p className="text-sm font-semibold text-foreground">{deal.title}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Percent className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-lg font-bold text-red-500">-{deal.discount}%</span>
                </div>
                <span className="text-[10px] text-muted-foreground mt-2 inline-block group-hover:text-primary transition-colors">
                  Shop {deal.category} →
                </span>
                <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-foreground/5" />
              </button>
            ))}
          </div>

          {/* Search + Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, categories..."
                className="w-full h-11 rounded-xl bg-muted border border-border pl-11 pr-11 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-muted-foreground/10 flex items-center justify-center text-muted-foreground hover:text-foreground"
                ><X className="w-3.5 h-3.5" /></button>
              )}
            </div>
            <button onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              className="w-11 h-11 rounded-xl glass flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
              title={viewMode === "grid" ? "List view" : "Grid view"}
            >{viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}</button>
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button key={cat.label} onClick={() => setActiveCategory(activeCategory === cat.label ? "" : cat.label)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    activeCategory === cat.label ? "bg-primary text-primary-foreground" : "glass text-muted-foreground hover:text-foreground"
                  }`}
                ><Icon className="w-4 h-4" /> {cat.label}</button>
              );
            })}
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16 glass rounded-2xl">
              <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No products found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {items.length === 0 ? "The marketplace is empty. Be the first to list something!" : "Try a different search or category."}
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button size="sm" variant="secondary" onClick={() => { setSearchQuery(""); setActiveCategory(""); }}><RefreshCw className="w-3.5 h-3.5" /> Reset</Button>
                {items.length === 0 && <Button size="sm" onClick={() => setActiveTab("sell")}><Plus className="w-3.5 h-3.5" /> Create Listing</Button>}
              </div>
            </div>
          ) : (
            <div className={viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              : "space-y-3"
            }>
              {filteredItems.map((item) => (
                viewMode === "grid" ? (
                  <GlassCard key={item.id} className="group">
                    <div className={`h-32 rounded-xl bg-gradient-to-r ${getItemColor(item)} flex items-center justify-center mb-4 relative overflow-hidden`}>
                      <div className="text-white/80">{getItemIcon(item)}</div>
                      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/30 text-white text-[10px] font-medium backdrop-blur-sm">
                        {getItemTypeLabel(item)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-1 line-clamp-1">{item.title}</h3>
                    <p className="text-xs text-muted-foreground/70 mb-3 line-clamp-2 h-8">{item.description}</p>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span className="text-sm font-medium text-foreground">{item.rating?.toFixed(1) || "0.0"}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">({item.reviewCount || 0})</span>
                      {item.salesCount > 0 && (
                        <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> {item.salesCount} sold
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="text-lg font-bold text-foreground">
                        {item.isFree ? "Free" : `$${item.price?.toFixed(2) || "0.00"}`}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="ghost" className="px-2" onClick={() => handleContactSeller(item)}>
                          <MessageSquare className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => handleBuyProduct(item)}>
                          <ShoppingCart className="w-3.5 h-3.5" /> Buy
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                ) : (
                  <GlassCard key={item.id} className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${getItemColor(item)} flex items-center justify-center shrink-0`}>
                      <div className="text-white/80 scale-75">{getItemIcon(item)}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{getItemTypeLabel(item)}</p>
                        </div>
                        <span className="text-base font-bold text-foreground shrink-0">
                          {item.isFree ? "Free" : `$${item.price?.toFixed(2)}`}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-1">{item.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span className="text-xs font-medium">{item.rating?.toFixed(1) || "0.0"}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">({item.reviewCount || 0} reviews)</span>
                        {item.salesCount > 0 && (
                          <span className="text-xs text-muted-foreground">{item.salesCount} sold</span>
                        )}
                        <div className="ml-auto flex gap-1.5">
                          <Button size="sm" variant="ghost" className="px-2" onClick={() => handleContactSeller(item)}>
                            <MessageSquare className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => handleBuyProduct(item)}>
                            <ShoppingCart className="w-3.5 h-3.5" /> Buy
                          </Button>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                )
              ))}
            </div>
          )}
        </>
      )}

      {/* SELL TAB */}
      {activeTab === "sell" && (
        <div className="max-w-2xl mx-auto">
          {!showSellForm ? (
            <div className="text-center py-16 glass rounded-2xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto">
                <Plus className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">List Your Product</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Sell templates, courses, AI models, and more to the NOVAX community.
              </p>
              <Button onClick={() => setShowSellForm(true)}><Plus className="w-4 h-4" /> Create Listing</Button>
            </div>
          ) : (
            <GlassCard hover={false}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" /> New Product Listing
                </h2>
                <Button size="sm" variant="ghost" onClick={() => setShowSellForm(false)}><X className="w-4 h-4" /></Button>
              </div>
              <form onSubmit={handleSellSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Product Title</label>
                  <input type="text" value={sellForm.title} onChange={(e) => setSellForm({ ...sellForm, title: e.target.value })}
                    placeholder="e.g., Complete AI Engineering Course" required
                    className="w-full h-10 rounded-xl bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
                  <textarea value={sellForm.description} onChange={(e) => setSellForm({ ...sellForm, description: e.target.value })}
                    placeholder="Describe what you're selling..." rows={3} required
                    className="w-full rounded-xl bg-muted border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Price ($)</label>
                    <input type="number" value={sellForm.price} onChange={(e) => setSellForm({ ...sellForm, price: e.target.value })}
                      placeholder="29.99" min="0" step="0.01" required
                      className="w-full h-10 rounded-xl bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Type</label>
                    <select value={sellForm.type} onChange={(e) => setSellForm({ ...sellForm, type: e.target.value })}
                      className="w-full h-10 rounded-xl bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    >
                      {Object.entries(TYPE_MAP).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Category</label>
                  <input type="text" value={sellForm.category} onChange={(e) => setSellForm({ ...sellForm, category: e.target.value })}
                    placeholder="e.g., Web Development, AI, Design" required
                    className="w-full h-10 rounded-xl bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button type="submit" disabled={!sellForm.title.trim() || !sellForm.price.trim() || !sellForm.category.trim() || sellSubmitting}>
                    {sellSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Publish Listing
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowSellForm(false)}>Cancel</Button>
                </div>
              </form>
            </GlassCard>
          )}

          {myListings.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" /> Your Recent Listings
              </h3>
              <div className="space-y-3">
                {myListings.map((item) => (
                  <GlassCard key={item.id}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${getItemColor(item)} flex items-center justify-center text-white shrink-0`}>
                        {getItemIcon(item)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground text-sm">{item.title}</h4>
                        <p className="text-xs text-muted-foreground">{getItemTypeLabel(item)} — ${item.price?.toFixed(2)}</p>
                      </div>
                      <span className="px-2 py-1 rounded-lg bg-green-500/10 text-green-500 text-xs font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MY LISTINGS TAB */}
      {activeTab === "my-listings" && (
        <div className="max-w-3xl mx-auto">
          {myListings.length === 0 ? (
            <div className="text-center py-16 glass rounded-2xl space-y-4">
              <Package className="w-12 h-12 text-muted-foreground/40 mx-auto" />
              <p className="text-muted-foreground">You haven&apos;t listed any products yet.</p>
              <Button onClick={() => setActiveTab("sell")}><Plus className="w-4 h-4" /> Sell a Product</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" /> My Products ({myListings.length})
              </h2>
              {myListings.map((item) => (
                <GlassCard key={item.id}>
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${getItemColor(item)} flex items-center justify-center text-white shrink-0`}>
                      {getItemIcon(item)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground">{item.title}</h3>
                          <p className="text-xs text-muted-foreground">{getItemTypeLabel(item)}</p>
                        </div>
                        <span className="text-lg font-bold text-foreground">${item.price?.toFixed(2)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{item.description}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-500 text-xs font-medium flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Listed
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground">
                          Category: {item.category}
                        </span>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONTACTS TAB */}
      {activeTab === "contacts" && (
        <div className="max-w-3xl mx-auto">
          {buyerMessages.length === 0 ? (
            <div className="text-center py-16 glass rounded-2xl space-y-4">
              <MessageSquare className="w-12 h-12 text-muted-foreground/40 mx-auto" />
              <p className="text-muted-foreground">No conversations yet.</p>
              <Button onClick={() => setActiveTab("buy")}><ShoppingCart className="w-4 h-4" /> Browse Products</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" /> Contact History
              </h2>
              {buyerMessages.map((msg, i) => (
                <GlassCard key={i}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {msg.buyer[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">
                          Regarding: <span className="text-primary">{msg.product}</span>
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {msg.date}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{msg.message}</p>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[10px] font-medium mt-2">
                        <CheckCircle className="w-2.5 h-2.5" /> Message Sent
                      </span>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowContactModal(false)}>
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <GlassCard hover={false}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" /> Contact Seller
                </h3>
                <button onClick={() => setShowContactModal(false)}
                  className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                ><X className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 mb-4">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${getItemColor(selectedItem)} flex items-center justify-center text-white shrink-0`}>
                  {getItemIcon(selectedItem)}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{selectedItem.title}</p>
                  <p className="text-xs text-muted-foreground">{getItemTypeLabel(selectedItem)} — ${selectedItem.price?.toFixed(2)}</p>
                </div>
              </div>
              {contactSent ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Message Sent!</p>
                  <p className="text-xs text-muted-foreground">The seller will contact you at your registered email.</p>
                  <Button size="sm" variant="secondary" onClick={() => setShowContactModal(false)}>Close</Button>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-foreground mb-1.5">Your Message</label>
                    <textarea value={contactMessage} onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Hi! I'm interested in this product. Is it still available?" rows={3}
                      className="w-full rounded-xl bg-muted border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={handleSendContact} disabled={!contactMessage.trim()}>
                      <Send className="w-4 h-4" /> Send Message
                    </Button>
                    <Button variant="secondary" onClick={() => setShowContactModal(false)}>Cancel</Button>
                  </div>
                </>
              )}
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
}
