import type {
  AdminRole,
  AdminPermissionDef,
  FeatureFlag,
  SystemSetting,
} from "./types";

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString("en-US")}`;
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(iso);
}

// ---------------------------------------------------------------------------
// RBAC MODEL
// ---------------------------------------------------------------------------

export const PERMISSION_DEFS: AdminPermissionDef[] = [
  { module: "dashboard", moduleLabel: "Dashboard", action: "view", label: "View dashboard" },
  { module: "users", moduleLabel: "Users", action: "view", label: "View users" },
  { module: "users", moduleLabel: "Users", action: "manage", label: "Manage users" },
  { module: "users", moduleLabel: "Users", action: "warn", label: "Warn users" },
  { module: "users", moduleLabel: "Users", action: "suspend", label: "Suspend users" },
  { module: "users", moduleLabel: "Users", action: "ban", label: "Ban users" },
  { module: "users", moduleLabel: "Users", action: "roles", label: "Assign roles" },
  { module: "users", moduleLabel: "Users", action: "assist", label: "Assist users" },
  { module: "users", moduleLabel: "Users", action: "passwordReset", label: "Reset passwords" },
  { module: "users", moduleLabel: "Users", action: "recovery", label: "Account recovery" },
  { module: "roles", moduleLabel: "Roles", action: "view", label: "View roles" },
  { module: "roles", moduleLabel: "Roles", action: "manage", label: "Create / edit / delete roles" },
  { module: "roles", moduleLabel: "Roles", action: "clone", label: "Clone roles" },
  { module: "roles", moduleLabel: "Roles", action: "export", label: "Export roles" },
  { module: "moderation", moduleLabel: "Moderation", action: "view", label: "View moderation queue" },
  { module: "moderation", moduleLabel: "Moderation", action: "posts", label: "Moderate posts" },
  { module: "moderation", moduleLabel: "Moderation", action: "reels", label: "Moderate reels" },
  { module: "moderation", moduleLabel: "Moderation", action: "stories", label: "Moderate stories" },
  { module: "moderation", moduleLabel: "Moderation", action: "comments", label: "Moderate comments" },
  { module: "moderation", moduleLabel: "Moderation", action: "approve", label: "Approve content" },
  { module: "moderation", moduleLabel: "Moderation", action: "reject", label: "Reject content" },
  { module: "moderation", moduleLabel: "Moderation", action: "delete", label: "Delete content" },
  { module: "moderation", moduleLabel: "Moderation", action: "resolveReports", label: "Resolve reports" },
  { module: "content", moduleLabel: "Content", action: "posts", label: "Manage posts" },
  { module: "content", moduleLabel: "Content", action: "reels", label: "Manage reels" },
  { module: "content", moduleLabel: "Content", action: "stories", label: "Manage stories" },
  { module: "content", moduleLabel: "Content", action: "comments", label: "Manage comments" },
  { module: "content", moduleLabel: "Content", action: "trending", label: "Trending content" },
  { module: "content", moduleLabel: "Content", action: "featured", label: "Featured content" },
  { module: "content", moduleLabel: "Content", action: "aiRecommendations", label: "AI recommendations" },
  { module: "communities", moduleLabel: "Communities", action: "view", label: "View communities" },
  { module: "communities", moduleLabel: "Communities", action: "manage", label: "Manage communities" },
  { module: "communities", moduleLabel: "Communities", action: "reports", label: "Community reports" },
  { module: "communities", moduleLabel: "Communities", action: "owners", label: "Manage owners" },
  { module: "communities", moduleLabel: "Communities", action: "moderators", label: "Manage moderators" },
  { module: "communities", moduleLabel: "Communities", action: "members", label: "Manage members" },
  { module: "communities", moduleLabel: "Communities", action: "analytics", label: "Community analytics" },
  { module: "communities", moduleLabel: "Communities", action: "moderate", label: "Moderate communities" },
  { module: "marketplace", moduleLabel: "Marketplace", action: "view", label: "View marketplace" },
  { module: "marketplace", moduleLabel: "Marketplace", action: "products", label: "Manage products" },
  { module: "marketplace", moduleLabel: "Marketplace", action: "stores", label: "Manage stores" },
  { module: "marketplace", moduleLabel: "Marketplace", action: "orders", label: "Manage orders" },
  { module: "marketplace", moduleLabel: "Marketplace", action: "track", label: "Track orders" },
  { module: "marketplace", moduleLabel: "Marketplace", action: "coupons", label: "Manage coupons" },
  { module: "marketplace", moduleLabel: "Marketplace", action: "refunds", label: "Manage refunds" },
  { module: "marketplace", moduleLabel: "Marketplace", action: "featured", label: "Feature products" },
  { module: "marketplace", moduleLabel: "Marketplace", action: "reviews", label: "Manage reviews" },
  { module: "marketplace", moduleLabel: "Marketplace", action: "inventory", label: "Manage inventory" },
  { module: "marketplace", moduleLabel: "Marketplace", action: "disputes", label: "Resolve disputes" },
  { module: "marketplace", moduleLabel: "Marketplace", action: "moderate", label: "Moderate listings" },
  { module: "analytics", moduleLabel: "Analytics", action: "view", label: "View analytics" },
  { module: "analytics", moduleLabel: "Analytics", action: "export", label: "Export analytics" },
  { module: "finance", moduleLabel: "Finance", action: "view", label: "View financial reports" },
  { module: "finance", moduleLabel: "Finance", action: "reports", label: "Refund / payout reports" },
  { module: "tickets", moduleLabel: "Support", action: "view", label: "View tickets" },
  { module: "tickets", moduleLabel: "Support", action: "manage", label: "Manage tickets" },
  { module: "tickets", moduleLabel: "Support", action: "resolve", label: "Resolve tickets" },
  { module: "ai", moduleLabel: "AI", action: "view", label: "View AI management" },
  { module: "ai", moduleLabel: "AI", action: "models", label: "Manage AI models" },
  { module: "ai", moduleLabel: "AI", action: "providers", label: "Manage providers" },
  { module: "ai", moduleLabel: "AI", action: "prompts", label: "Manage prompt templates" },
  { module: "ai", moduleLabel: "AI", action: "analytics", label: "AI analytics" },
  { module: "ai", moduleLabel: "AI", action: "moderation", label: "AI moderation" },
  { module: "ai", moduleLabel: "AI", action: "logs", label: "AI logs" },
  { module: "ai", moduleLabel: "AI", action: "usage", label: "AI usage" },
  { module: "ai", moduleLabel: "AI", action: "switching", label: "Model switching" },
  { module: "ai", moduleLabel: "AI", action: "manage", label: "Manage AI settings" },
  { module: "security", moduleLabel: "Security", action: "view", label: "View security" },
  { module: "security", moduleLabel: "Security", action: "loginLogs", label: "Login logs" },
  { module: "security", moduleLabel: "Security", action: "audit", label: "Audit logs" },
  { module: "security", moduleLabel: "Security", action: "ip", label: "IP management" },
  { module: "security", moduleLabel: "Security", action: "rateLimit", label: "Rate limiting" },
  { module: "security", moduleLabel: "Security", action: "twoFactor", label: "2FA management" },
  { module: "security", moduleLabel: "Security", action: "reports", label: "Security reports" },
  { module: "security", moduleLabel: "Security", action: "suspicious", label: "Suspicious activity" },
  { module: "security", moduleLabel: "Security", action: "apiMonitoring", label: "API monitoring" },
  { module: "security", moduleLabel: "Security", action: "sessions", label: "Session management" },
  { module: "security", moduleLabel: "Security", action: "manage", label: "Manage security" },
  { module: "settings", moduleLabel: "Settings", action: "view", label: "View settings" },
  { module: "settings", moduleLabel: "Settings", action: "manage", label: "System configuration" },
  { module: "settings", moduleLabel: "Settings", action: "security", label: "Security settings" },
  { module: "settings", moduleLabel: "Settings", action: "apiKeys", label: "API keys" },
  { module: "settings", moduleLabel: "Settings", action: "database", label: "Database monitoring" },
  { module: "settings", moduleLabel: "Settings", action: "server", label: "Server settings" },
  { module: "settings", moduleLabel: "Settings", action: "featureFlags", label: "Feature flags" },
  { module: "settings", moduleLabel: "Settings", action: "backup", label: "Backup & restore" },
  { module: "settings", moduleLabel: "Settings", action: "announcements", label: "Announcements" },
  { module: "settings", moduleLabel: "Settings", action: "notifications", label: "Notifications" },
];

export const ADMIN_ROLES: AdminRole[] = [
  {
    id: "SUPER_ADMIN",
    name: "Super Admin",
    tagline: "Full platform access",
    description: "Unrestricted access to every module, resource and configuration across NOVAX.",
    color: "#8b5cf6",
    emoji: "👑",
    system: true,
    members: 0,
    permissions: ["*"],
  },
  {
    id: "MODERATOR",
    name: "Moderator",
    tagline: "Content moderation",
    description: "Approves or removes posts, reels, stories and comments; warns, suspends or temp-bans users and resolves reports.",
    color: "#f59e0b",
    emoji: "🛡️",
    members: 0,
    permissions: [
      "dashboard.view",
      "users.view", "users.warn", "users.suspend", "users.ban",
      "moderation.view", "moderation.posts", "moderation.reels", "moderation.stories", "moderation.comments",
      "moderation.approve", "moderation.reject", "moderation.delete", "moderation.resolveReports",
      "communities.view", "communities.moderate",
      "marketplace.view", "marketplace.moderate",
    ],
  },
  {
    id: "SUPPORT_ADMIN",
    name: "Support Admin",
    tagline: "Customer support",
    description: "Handles support tickets, refunds, marketplace disputes and order tracking. View-only on user profiles and no security changes.",
    color: "#0ea5e9",
    emoji: "🎧",
    members: 0,
    permissions: [
      "dashboard.view",
      "users.view", "users.assist", "users.passwordReset", "users.recovery",
      "tickets.view", "tickets.manage", "tickets.resolve",
      "marketplace.orders", "marketplace.track", "marketplace.refunds", "marketplace.disputes",
      "finance.reports",
    ],
  },
  {
    id: "MARKETPLACE_ADMIN",
    name: "Marketplace Admin",
    tagline: "Marketplace operations",
    description: "Manages products, stores, sellers, orders, coupons, refunds, featured products, reviews and inventory.",
    color: "#10b981",
    emoji: "🛍️",
    members: 0,
    permissions: [
      "dashboard.view",
      "users.view",
      "marketplace.view", "marketplace.products", "marketplace.stores", "marketplace.orders",
      "marketplace.coupons", "marketplace.refunds", "marketplace.featured", "marketplace.reviews",
      "marketplace.inventory", "marketplace.disputes",
    ],
  },
  {
    id: "COMMUNITY_ADMIN",
    name: "Community Admin",
    tagline: "Community operations",
    description: "Manages communities, community reports, owners, moderators, members and community analytics.",
    color: "#06b6d4",
    emoji: "🌐",
    members: 0,
    permissions: [
      "dashboard.view",
      "users.view",
      "communities.view", "communities.manage", "communities.reports", "communities.owners",
      "communities.moderators", "communities.members", "communities.analytics",
    ],
  },
  {
    id: "CONTENT_ADMIN",
    name: "Content Admin",
    tagline: "Content curation",
    description: "Manages posts, reels, stories, comments, trending and featured content plus AI recommendations.",
    color: "#ec4899",
    emoji: "🎬",
    members: 0,
    permissions: [
      "dashboard.view",
      "moderation.view", "moderation.posts", "moderation.reels", "moderation.stories", "moderation.comments",
      "moderation.approve", "moderation.reject", "moderation.delete",
      "content.posts", "content.reels", "content.stories", "content.comments",
      "content.trending", "content.featured", "content.aiRecommendations",
    ],
  },
  {
    id: "ANALYTICS_ADMIN",
    name: "Analytics Admin",
    tagline: "Read-only analytics",
    description: "Read-only access to revenue, growth, users, marketplace, communities, reports, traffic and performance.",
    color: "#3b82f6",
    emoji: "📊",
    members: 0,
    permissions: ["dashboard.view", "analytics.view", "analytics.export", "finance.view", "finance.reports"],
  },
  {
    id: "SECURITY_ADMIN",
    name: "Security Admin",
    tagline: "Platform security",
    description: "Login logs, audit logs, IP management, rate limiting, 2FA, security reports, suspicious activity, API monitoring and sessions.",
    color: "#ef4444",
    emoji: "🔐",
    members: 0,
    permissions: [
      "dashboard.view",
      "security.view", "security.loginLogs", "security.audit", "security.ip", "security.rateLimit",
      "security.twoFactor", "security.reports", "security.suspicious", "security.apiMonitoring",
      "security.sessions", "security.manage",
      "settings.security",
    ],
  },
  {
    id: "AI_ADMIN",
    name: "AI Admin",
    tagline: "AI operations",
    description: "Manages AI models, providers, prompt templates, AI analytics, moderation, logs, usage and model switching.",
    color: "#d946ef",
    emoji: "🤖",
    members: 0,
    permissions: [
      "dashboard.view",
      "ai.view", "ai.models", "ai.providers", "ai.prompts", "ai.analytics", "ai.moderation",
      "ai.logs", "ai.usage", "ai.switching", "ai.manage",
    ],
  },
];

export const TAB_PERMISSIONS: Record<string, string> = {
  dashboard: "dashboard.view",
  users: "users.view",
  roles: "roles.manage",
  moderation: "moderation.view",
  communities: "communities.view",
  marketplace: "marketplace.view",
  analytics: "analytics.view",
  audit: "security.audit",
  settings: "settings.view",
};

export function getRole(id: string): AdminRole {
  return ADMIN_ROLES.find((r) => r.id === id) || ADMIN_ROLES[0];
}

export function can(roleId: string | undefined, permission: string): boolean {
  if (!roleId) return false;
  const role = getRole(roleId);
  if (!role) return false;
  return role.permissions.includes("*") || role.permissions.includes(permission);
}

export function seedSettings(): SystemSetting[] {
  return [
    { key: "site_name", group: "general", label: "Platform name", description: "Display name shown across the platform", type: "text", value: "NOVAX" },
    { key: "site_tagline", group: "general", label: "Platform tagline", description: "Tagline shown across the platform", type: "text", value: "Think Beyond Social" },
    { key: "allow_registration", group: "general", label: "Open registration", description: "Allow new users to sign up without invites", type: "toggle", value: true },
    { key: "maintenance_mode", group: "general", label: "Maintenance mode", description: "Show a maintenance screen to non-admins", type: "toggle", value: false },
    { key: "default_language", group: "general", label: "Default language", description: "Fallback locale for new users", type: "select", value: "English", options: ["English", "Urdu", "Hindi", "Spanish", "Arabic", "French"] },
    { key: "default_theme", group: "general", label: "Default theme", description: "Theme applied for new visitors", type: "select", value: "Dark", options: ["Dark", "Light", "System"] },
    { key: "enforce_2fa", group: "security", label: "Enforce 2FA for admins", description: "Require two-factor authentication for all admin roles", type: "toggle", value: true },
    { key: "session_timeout", group: "security", label: "Session timeout (min)", description: "Idle minutes before an admin session expires", type: "select", value: "30", options: ["15", "30", "60", "120"] },
    { key: "rate_limiting", group: "security", label: "Global rate limiting", description: "Throttle API requests per IP per minute", type: "toggle", value: true },
    { key: "ip_logging", group: "security", label: "IP logging", description: "Record IP addresses in audit and login logs", type: "toggle", value: true },
    { key: "password_confirm", group: "security", label: "Password confirmation", description: "Require password before sensitive admin actions", type: "toggle", value: true },
    { key: "email_verification", group: "security", label: "Require email verification", description: "Block logins until email is verified", type: "toggle", value: false },
    { key: "notif_email", group: "notifications", label: "Email notifications", description: "Send transactional emails to users", type: "toggle", value: true },
    { key: "notif_push", group: "notifications", label: "Push notifications", description: "Browser push notifications for engaged users", type: "toggle", value: true },
    { key: "notif_digest", group: "notifications", label: "Weekly digest", description: "Send a weekly activity summary email", type: "toggle", value: false },
    { key: "ai_model", group: "ai", label: "Default AI model", description: "Model used by the AI router by default", type: "select", value: "Mistral 7B", options: ["Mistral 7B", "Llama 3", "GPT-4o", "Claude Sonnet", "Gemini Flash"] },
    { key: "ai_moderation", group: "ai", label: "AI content moderation", description: "Auto-screen posts and comments with AI", type: "toggle", value: true },
    { key: "ai_fallback", group: "ai", label: "AI fallback enabled", description: "Route to backup provider when primary fails", type: "toggle", value: true },
    { key: "payout_fees", group: "billing", label: "Payout fee (%)", description: "Platform fee applied to seller payouts", type: "select", value: "5", options: ["0", "3", "5", "8", "10"] },
    { key: "currency", group: "billing", label: "Default currency", description: "Marketplace and wallet currency", type: "select", value: "USD", options: ["USD", "EUR", "GBP", "PKR", "INR"] },
    { key: "tax_rate", group: "billing", label: "Tax rate (%)", description: "Sales tax applied to marketplace orders", type: "select", value: "0", options: ["0", "5", "10", "18"] },
  ];
}

export function seedFeatureFlags(): FeatureFlag[] {
  return [
    { key: "ff.reels", label: "Reels", description: "Short-form video reels across the platform", enabled: true, rollout: 100, impact: "high" },
    { key: "ff.stories", label: "Stories", description: "24-hour ephemeral stories", enabled: true, rollout: 60, impact: "high" },
    { key: "ff.marketplace", label: "Marketplace", description: "Products, services and digital goods", enabled: true, rollout: 100, impact: "high" },
    { key: "ff.communities", label: "Communities", description: "Interest-based community groups", enabled: true, rollout: 100, impact: "medium" },
    { key: "ff.ai.assistant", label: "AI Assistant", description: "Conversational AI assistant", enabled: true, rollout: 100, impact: "high" },
    { key: "ff.ai.router", label: "AI Router", description: "Model routing and provider failover", enabled: true, rollout: 80, impact: "high" },
    { key: "ff.ai.image", label: "AI Image Generation", description: "Text-to-image generation", enabled: true, rollout: 40, impact: "medium" },
    { key: "ff.voice.messages", label: "Voice Messages", description: "Voice recordings in DMs", enabled: true, rollout: 25, impact: "low" },
    { key: "ff.gamification", label: "Gamification", description: "Badges, leaderboards and XP", enabled: false, rollout: 0, impact: "low" },
    { key: "ff.live.streaming", label: "Live Streaming", description: "Live video broadcast support", enabled: false, rollout: 0, impact: "high" },
  ];
}
