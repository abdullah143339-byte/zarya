"use client";

import { useEffect, useState } from "react";
import { Users, FileText, Globe, FolderGit2, CircleDollarSign, ShoppingCart, Cpu, Flag, Server, Database, HardDrive, ShieldAlert, Activity } from "lucide-react";
import { useAdmin } from "./AdminProvider";
import { StatCard, SectionHeading, LoadingCard } from "./AdminShared";
import { formatMoney, timeAgo, formatCount, can } from "./data";
import api from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import type { AdminTabId, ApiEnvelope, AuditLogItem, RawRow } from "./types";

type HealthData = {
  status?: string;
  uptime?: number;
  memory?: { rss: number; heapUsed: number; heapTotal: number };
  database?: { users: number; posts: number; communities: number; orders: number; aiMessages: number; messages: number; auditLogs: number };
};

export default function DashboardTab({ onNavigate }: { onNavigate: (tab: AdminTabId) => void }) {
  const { user } = useAuth();
  const { sessionAudit } = useAdmin();
  const [liveStats, setLiveStats] = useState<Record<string, number> | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [roleCounts, setRoleCounts] = useState<{ name: string; count: number }[]>([]);
  const [audit, setAudit] = useState<AuditLogItem[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.adminGetSystemStats(),
      api.adminGetHealth(),
      api.adminGetRoles(),
      api.adminGetAllAuditLogs(1, 8),
      api.adminGetFinancials(),
    ])
      .then(([statsRes, healthRes, rolesRes, auditRes, finRes]: ApiEnvelope[]) => {
        if (!mounted) return;
        setLiveStats((statsRes?.data as Record<string, number> | undefined) ?? null);
        setHealth((healthRes?.data as HealthData | undefined) ?? null);
        const roles = (rolesRes?.data?.roles as { name: string; count: number }[] | undefined) ?? [];
        setRoleCounts(roles);
        const rawAudit = (auditRes?.data?.logs ?? auditRes?.data?.items ?? auditRes?.data) as RawRow[] | undefined;
        setAudit(
          (rawAudit ?? []).map((l: RawRow) => ({
            id: String(l.id),
            action: String(l.action),
            actionLabel: String(l.action).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            adminName: l.adminUsername ? String(l.adminUsername) : l.userId ? String(l.userId).slice(0, 8) : "system",
            role: "SYSTEM",
            timestamp: String(l.createdAt || new Date(0).toISOString()),
            ipAddress: String(l.ipAddress || "—"),
            resource: String(l.resource || "system"),
            resourceId: l.resourceId ? String(l.resourceId) : undefined,
          }))
        );
        setRevenue(Number(finRes?.data?.revenue ?? 0));
      })
      .catch(() => {
        if (!mounted) return;
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <LoadingCard label="Fetching system stats..." />;

  const stats = liveStats ?? {};
  const usersTotal = stats.totalUsers ?? 0;
  const pendingReports = stats.pendingReports ?? 0;
  const db = health?.database;
  const mem = health?.memory;

  const cards = [
    { label: "Total Users", value: formatCount(usersTotal), icon: <Users className="w-5 h-5" />, color: "from-blue-500 to-cyan-500", sublabel: `${db ? db.users : 0} in database` },
    { label: "Total Posts", value: formatCount(stats.totalPosts ?? 0), icon: <FileText className="w-5 h-5" />, color: "from-purple-500 to-pink-500" },
    { label: "Communities", value: formatCount(stats.totalCommunities ?? 0), icon: <Globe className="w-5 h-5" />, color: "from-green-500 to-emerald-500" },
    { label: "Projects", value: formatCount(stats.totalProjects ?? 0), icon: <FolderGit2 className="w-5 h-5" />, color: "from-amber-500 to-orange-500", sublabel: "Portfolio projects" },
    { label: "Revenue (30d)", value: formatMoney(revenue), icon: <CircleDollarSign className="w-5 h-5" />, color: "from-emerald-500 to-teal-500" },
    { label: "Orders", value: formatCount(stats.totalOrders ?? 0), icon: <ShoppingCart className="w-5 h-5" />, color: "from-rose-500 to-red-500" },
    { label: "AI Requests", value: formatCount(stats.totalAIMessages ?? 0), icon: <Cpu className="w-5 h-5" />, color: "from-fuchsia-500 to-purple-500", sublabel: "All-time messages" },
    { label: "Pending Reports", value: formatCount(pendingReports), icon: <Flag className="w-5 h-5" />, color: "from-sky-500 to-blue-500", sublabel: "Awaiting moderation" },
  ];

  const healthItems = [
    { label: "API Server", icon: <Server className="w-4 h-4" />, status: "Operational", ok: true, latency: health ? `${Math.round(health.uptime ?? 0)}s uptime` : "—" },
    { label: "Database", icon: <Database className="w-4 h-4" />, status: health?.status || "Unknown", ok: health?.status === "OK", latency: db ? `${db.users} users · ${db.posts} posts` : "—" },
    { label: "AI Messages", icon: <Cpu className="w-4 h-4" />, status: "Tracked", ok: true, latency: db ? `${formatCount(db.aiMessages)} messages` : "—" },
    { label: "Audit Trail", icon: <HardDrive className="w-4 h-4" />, status: "Tracking", ok: true, latency: db ? `${formatCount(db.auditLogs)} entries` : "—" },
    { label: "Memory", icon: <Activity className="w-4 h-4" />, status: "In use", ok: true, latency: mem ? `${Math.round(mem.heapUsed)} MB heap` : "—" },
  ];

  const quick = [
    { label: "Moderate Queue", tab: "moderation" as AdminTabId, icon: <ShieldAlert className="w-4 h-4" />, perm: "moderation.view" },
    { label: "Manage Users", tab: "users" as AdminTabId, icon: <Users className="w-4 h-4" />, perm: "users.view" },
    { label: "Roles & Permissions", tab: "roles" as AdminTabId, icon: <Activity className="w-4 h-4" />, perm: "roles.manage" },
    { label: "Audit Logs", tab: "audit" as AdminTabId, icon: <Activity className="w-4 h-4" />, perm: "security.audit" },
  ].filter((q) => can(user?.role, q.perm));

  const maxRole = Math.max(1, ...roleCounts.map((r) => r.count));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <SectionHeading
          icon={<Activity className="w-4 h-4 text-primary" />}
          title="Platform Overview"
          subtitle="Live metrics from the NOVAX control plane"
        />
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground glass rounded-lg px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass rounded-2xl p-5 hover-glow">
          <SectionHeading icon={<Activity className="w-4 h-4 text-primary" />} title="Quick Actions" subtitle="Jump into the most common admin tasks" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {quick.map((q) => (
              <button
                key={q.label}
                onClick={() => onNavigate(q.tab)}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted hover:border-primary/40 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-primary/10 flex items-center justify-center text-primary">{q.icon}</div>
                <span className="text-sm font-medium text-foreground">{q.label}</span>
              </button>
            ))}
            <button
              onClick={() => onNavigate("marketplace")}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted hover:border-primary/40 transition-all text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-primary/10 flex items-center justify-center text-primary"><ShoppingCart className="w-4 h-4" /></div>
              <span className="text-sm font-medium text-foreground">Marketplace</span>
            </button>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 hover-glow">
          <SectionHeading icon={<Server className="w-4 h-4 text-primary" />} title="System Health" subtitle="Live backend health monitor" />
          <div className="space-y-3 mt-4">
            {healthItems.map((h) => (
              <div key={h.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{h.icon}</span>
                  <span className="text-foreground">{h.label}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={h.ok ? "text-green-500" : "text-amber-500"}>{h.status}</span>
                  <span className="text-muted-foreground">{h.latency}</span>
                  <span className={`w-2 h-2 rounded-full ${h.ok ? "bg-green-500" : "bg-amber-500 animate-pulse"}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5 hover-glow">
          <SectionHeading icon={<Users className="w-4 h-4 text-primary" />} title="Role Distribution" subtitle="Real users across roles" />
          <div className="space-y-3 mt-4">
            {roleCounts.map((r) => (
              <div key={r.name} className="flex items-center gap-3">
                <span className="w-28 text-xs text-muted-foreground truncate">{r.name.replace(/_/g, " ")}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${Math.min(100, (r.count / maxRole) * 100)}%` }} />
                </div>
                <span className="text-xs text-foreground font-medium">{r.count}</span>
              </div>
            ))}
            {roleCounts.length === 0 && <p className="text-sm text-muted-foreground">No role data yet</p>}
          </div>
        </div>

        <div className="glass rounded-2xl p-5 hover-glow">
          <SectionHeading icon={<Activity className="w-4 h-4 text-primary" />} title="Recent Admin Activity" subtitle="Latest audit actions" />
          <div className="space-y-3 mt-4">
            {[...sessionAudit, ...audit].slice(0, 6).map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{log.actionLabel}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{log.adminName} · <span className="text-muted-foreground">{log.resource}</span>
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{timeAgo(log.timestamp)}</span>
              </div>
            ))}
            {sessionAudit.length === 0 && audit.length === 0 && <p className="text-sm text-muted-foreground">No admin activity yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
