"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Ban, RotateCcw, Trash2, AlertTriangle, Download, UserCog } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import api from "@/lib/api";
import { useAdmin } from "./AdminProvider";
import { RoleBadge, StatusBadge, SearchBox, SectionHeading, AdminSkeleton, EmptyRow, downloadTextFile, toCsv } from "./AdminShared";
import { formatDate, can } from "./data";
import type { AdminUserRow, ApiEnvelope, RawRow } from "./types";

const ROLE_FILTERS = ["All roles", "SUPER_ADMIN", "ADMIN", "MODERATOR", "CONTENT_ADMIN", "MARKETPLACE_ADMIN", "SUPPORT_ADMIN", "COMMUNITY_ADMIN", "SECURITY_ADMIN", "AI_ADMIN", "ANALYTICS_ADMIN", "CREATOR", "INSTRUCTOR", "USER"];
const STATUS_FILTERS = ["All statuses", "ACTIVE", "SUSPENDED", "BANNED", "INACTIVE", "DEACTIVATED"];

function normalize(raw: RawRow[]): AdminUserRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((u) => ({
    id: String(u.id),
    username: String(u.username || "unknown"),
    email: String(u.email || ""),
    firstName: String(u.firstName || ""),
    lastName: String(u.lastName || ""),
    role: String(u.role || "USER"),
    status: (String(u.status || (u.isSuspended ? "SUSPENDED" : "ACTIVE"))) as AdminUserRow["status"],
    isSuspended: Boolean(u.isSuspended),
    createdAt: String(u.createdAt || new Date(0).toISOString()),
    lastActiveAt: String(u.lastActiveAt || u.updatedAt || u.createdAt || new Date(0).toISOString()),
    postsCount: Number(u._count?.posts ?? u.postsCount ?? 0),
    followersCount: Number(u._count?.followers ?? u.followersCount ?? 0),
    followingCount: Number(u._count?.following ?? u.followingCount ?? 0),
  }));
}

export default function UsersTab() {
  const { user } = useAuth();
  const { notify, addAuditAction } = useAdmin();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All roles");
  const [statusFilter, setStatusFilter] = useState("All statuses");

  useEffect(() => {
    let mounted = true;
    api.adminGetAllUsers(1, 60)
      .then((res: ApiEnvelope) => {
        if (!mounted) return;
        const raw = (res?.data?.users ?? res?.data?.items) as RawRow[] | undefined;
        setUsers(normalize(raw ?? []));
      })
      .catch(() => {
        if (!mounted) return;
        setUsers([]);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      const matchQ = !q || u.username.toLowerCase().includes(q) || `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole = roleFilter === "All roles" || u.role === roleFilter;
      const matchStatus = statusFilter === "All statuses" || u.status === statusFilter;
      return matchQ && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const canWarn = can(user?.role, "users.warn");
  const canBan = can(user?.role, "users.ban");
  const canDelete = can(user?.role, "users.manage") || can(user?.role, "users.ban");
  const canAssignRole = can(user?.role, "users.roles");

  const auditFor = (action: string, resourceId: string) => {
    addAuditAction({
      action,
      actionLabel: action.split("_").map((w) => w[0] + w.slice(1).toLowerCase()).join(" "),
      adminName: user?.username || "admin",
      role: user?.role || "ADMIN",
      timestamp: new Date().toISOString(),
      ipAddress: "127.0.0.1",
      resource: "user",
      resourceId,
    });
  };

  const handleWarn = async (u: AdminUserRow) => {
    try {
      await api.adminWarnUser(u.id, "Warning from moderators");
      notify(`Warning sent to @${u.username}`, "success");
      auditFor("WARN_USER", u.id);
    } catch {
      notify(`Could not warn @${u.username}`, "error");
    }
  };

  const handleSuspend = async (u: AdminUserRow) => {
    const suspending = u.status !== "SUSPENDED";
    try {
      if (suspending) await api.adminSuspendUser(u.id);
      else await api.adminUnbanUser(u.id);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, status: suspending ? "SUSPENDED" : "ACTIVE", isSuspended: suspending } : x)));
      notify(`${suspending ? "Suspended" : "Re-activated"} @${u.username}`, "success");
      auditFor(suspending ? "SUSPEND_USER" : "REACTIVATE_USER", u.id);
    } catch {
      notify(`Could not ${suspending ? "suspend" : "re-activate"} @${u.username}`, "error");
    }
  };

  const handleBanToggle = async (u: AdminUserRow) => {
    const banning = u.status !== "BANNED";
    if (u.id === user?.id) {
      notify("You cannot ban your own account", "error");
      return;
    }
    try {
      if (banning) await api.adminBanUser(u.id);
      else await api.adminUnbanUser(u.id);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, status: banning ? "BANNED" : "ACTIVE", isSuspended: banning } : x)));
      notify(`${banning ? "Banned" : "Unbanned"} @${u.username}`, "success");
      auditFor(banning ? "BAN_USER" : "UNBAN_USER", u.id);
    } catch {
      notify(`Could not ${banning ? "ban" : "unban"} @${u.username}`, "error");
    }
  };

  const handleDelete = async (u: AdminUserRow) => {
    if (u.id === user?.id) {
      notify("You cannot delete your own account", "error");
      return;
    }
    if (!window.confirm(`Delete @${u.username} permanently? This cannot be undone.`)) return;
    try {
      await api.adminDeleteUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      notify(`User @${u.username} deleted`, "success");
      auditFor("DELETE_USER", u.id);
    } catch {
      notify(`Could not delete @${u.username}`, "error");
    }
  };

  const handleRoleChange = async (u: AdminUserRow, role: string) => {
    try {
      await api.adminUpdateUserRole(u.id, role);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role } : x)));
      notify(`Role of @${u.username} set to ${role}`, "success");
      auditFor("ROLE_UPDATED", u.id);
    } catch {
      notify(`Could not update role of @${u.username}`, "error");
    }
  };

  const handleExport = () => {
    const rows: (string | number)[][] = [["Username", "Name", "Email", "Role", "Status", "Posts", "Followers", "Joined"]];
    filtered.forEach((u) => rows.push([u.username, `${u.firstName} ${u.lastName}`, u.email, u.role, u.status, u.postsCount, u.followersCount, formatDate(u.createdAt)]));
    downloadTextFile("novax-users.csv", toCsv(rows));
    notify("Users exported to CSV", "info");
  };

  if (loading) return <AdminSkeleton rows={6} />;

  return (
    <div className="space-y-4">
      <SectionHeading
        icon={<Users className="w-4 h-4 text-primary" />}
        title="User Management"
        subtitle="All platform users"
        action={
          <button onClick={handleExport} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border text-xs font-medium text-foreground hover:bg-muted transition-all">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Search by name, username or email..." className="flex-1" />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-10 px-3 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {ROLE_FILTERS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <th className="text-left p-3 font-medium">User</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Role</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Posts</th>
                <th className="text-left p-3 font-medium">Joined</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {(u.firstName?.[0] || u.username[0] || "?").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {u.firstName} {u.lastName}
                          {u.id === user?.id && <span className="ml-1.5 text-[10px] text-primary">(You)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <RoleBadge role={u.role} />
                      {canAssignRole && u.role === "USER" && (
                        <select
                          value=""
                          onChange={(e) => e.target.value && handleRoleChange(u, e.target.value)}
                          className="w-8 h-8 rounded bg-transparent text-muted-foreground hover:text-primary cursor-pointer"
                          aria-label={`Assign role to ${u.username}`}
                        >
                          <option value="">⋯</option>
                          {["MODERATOR", "SUPPORT_ADMIN", "MARKETPLACE_ADMIN", "CONTENT_ADMIN", "SECURITY_ADMIN", "AI_ADMIN"].map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </td>
                  <td className="p-3"><StatusBadge status={u.status} /></td>
                  <td className="p-3 text-muted-foreground">{u.postsCount}</td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">{formatDate(u.createdAt)}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      {u.id !== user?.id && (
                        <>
                          {canWarn && (
                            <button onClick={() => handleWarn(u)} className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-all" title="Warn user">
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          )}
                          {canBan && u.status !== "BANNED" && (
                            <button onClick={() => handleSuspend(u)} className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-all" title={u.status === "SUSPENDED" ? "Re-activate user" : "Suspend user"}>
                              <UserCog className="w-4 h-4" />
                            </button>
                          )}
                          {canBan && (
                            <button onClick={() => handleBanToggle(u)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all" title={u.status === "BANNED" ? "Unban user" : "Ban user"}>
                              {u.status === "BANNED" ? <RotateCcw className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => handleDelete(u)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all" title="Delete user">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <EmptyRow text="No users match your filters" />}
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {users.length} users
      </p>
    </div>
  );
}
