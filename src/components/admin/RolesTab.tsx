"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ShieldCheck, Plus, Copy, Trash2, Download, LayoutGrid, ListChecks, Check, X } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useAdmin } from "./AdminProvider";
import { SearchBox, SectionHeading, Modal, MatrixCell, downloadTextFile, toCsv, EmptyRow } from "./AdminShared";
import { ADMIN_ROLES, PERMISSION_DEFS, can, formatCount } from "./data";
import api from "@/lib/api";
import type { AdminRole, AdminRoleId, ApiEnvelope, RawRow } from "./types";

const CUSTOM_KEY = "novax_admin_custom_roles";

function readCustomRoles(): AdminRole[] {
  try {
    const raw = window.localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AdminRole[];
  } catch {
    return [];
  }
}

function permissionLabel(permission: string): string {
  if (permission === "*") return "Full access to every module and action";
  const def = PERMISSION_DEFS.find((p) => `${p.module}.${p.action}` === permission);
  return def ? `${def.moduleLabel} — ${def.label}` : permission;
}

const MODULES = Array.from(new Set(PERMISSION_DEFS.map((p) => p.module)));

export default function RolesTab() {
  const { user } = useAuth();
  const { notify, addAuditAction } = useAdmin();
  const [customRoles, setCustomRoles] = useState<AdminRole[]>([]);
  const [view, setView] = useState<"roles" | "matrix">("roles");
  const [search, setSearch] = useState("");
  const [detailRole, setDetailRole] = useState<AdminRole | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating] = useState<AdminRole | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setCustomRoles(readCustomRoles());
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const [realMemberCounts, setRealMemberCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let mounted = true;
    api
      .adminGetRoles()
      .then((res: ApiEnvelope) => {
        if (!mounted) return;
        const raw = (res?.data?.roles ?? res?.data?.items) as RawRow[] | undefined;
        const map: Record<string, number> = {};
        (raw ?? []).forEach((r) => {
          map[String(r.name)] = Number(r.count ?? 0);
        });
        setRealMemberCounts(map);
      })
      .catch(() => {
        if (!mounted) return;
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(customRoles));
  }, [customRoles]);

  const allRoles = useMemo(
    () => [
      ...ADMIN_ROLES.map((r) => ({ ...r, members: realMemberCounts[r.id] ?? r.members })),
      ...customRoles,
    ],
    [customRoles, realMemberCounts]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return allRoles;
    return allRoles.filter((r) => r.name.toLowerCase().includes(q) || r.tagline.toLowerCase().includes(q));
  }, [allRoles, search]);

  const canManage = can(user?.role, "roles.manage");

  const audit = (action: string, label: string, resourceId: string) => {
    addAuditAction({
      action,
      actionLabel: label,
      adminName: user?.username || "admin",
      role: user?.role || "ADMIN",
      timestamp: new Date().toISOString(),
      ipAddress: "127.0.0.1",
      resource: "role",
      resourceId,
    });
  };

  const handleCreate = (role: AdminRole) => {
    const exists = allRoles.some((r) => r.id.toLowerCase().replace(/[^a-z]/g, "") === role.id.toLowerCase().replace(/[^a-z]/g, ""));
    if (exists) {
      notify("A role with this name already exists", "error");
      return;
    }
    setCustomRoles((prev) => [...prev, role]);
    notify(`Role "${role.name}" created`, "success");
    audit("ROLE_CREATED", `Role ${role.name} created`, role.id);
    setCreateOpen(false);
  };

  const handleClone = (role: AdminRole) => {
    const id = `${role.id}_COPY` as AdminRoleId;
    const clone: AdminRole = {
      ...role,
      id,
      name: `${role.name} (Copy)`,
      system: false,
      members: 0,
      permissions: [...role.permissions],
    };
    setCustomRoles((prev) => [...prev, clone]);
    notify(`Role "${clone.name}" cloned`, "success");
    audit("ROLE_CLONED", `Role ${clone.name} cloned`, clone.id);
  };

  const handleDelete = (role: AdminRole) => {
    if (role.system) {
      notify("System roles cannot be deleted", "error");
      return;
    }
    setCustomRoles((prev) => prev.filter((r) => r.id !== role.id));
    notify(`Role "${role.name}" deleted`, "info");
    audit("ROLE_DELETED", `Role ${role.name} deleted`, role.id);
  };

  const handleExport = () => {
    const rows: (string | number)[][] = [["Role", "Tagline", "Permissions"]];
    filtered.forEach((r) => rows.push([r.name, r.tagline, r.permissions.includes("*") ? "ALL" : r.permissions.length]));
    downloadTextFile("novax-roles.csv", toCsv(rows));
    const json = JSON.stringify(filtered, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "novax-roles.json";
    a.click();
    URL.revokeObjectURL(url);
    notify("Roles exported", "info");
  };

  return (
    <div className="space-y-4">
      <SectionHeading
        icon={<ShieldCheck className="w-4 h-4 text-primary" />}
        title="Roles & Permissions"
        subtitle={`${allRoles.length} roles · ${PERMISSION_DEFS.length} permission definitions`}
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => setView("matrix")} className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-medium border transition-all ${view === "matrix" ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground"}`}>
              <LayoutGrid className="w-3.5 h-3.5" /> Matrix
            </button>
            <button onClick={() => setView("roles")} className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-medium border transition-all ${view === "roles" ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground"}`}>
              <ListChecks className="w-3.5 h-3.5" /> Roles
            </button>
            {canManage && (
              <button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-gradient-primary text-white text-xs font-medium hover:opacity-90 transition-all">
                <Plus className="w-3.5 h-3.5" /> Create Role
              </button>
            )}
            <button onClick={handleExport} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border text-xs font-medium text-foreground hover:bg-muted transition-all">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        }
      />

      <SearchBox value={search} onChange={setSearch} placeholder="Search roles..." className="max-w-md" />

      {view === "roles" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((role) => (
            <div key={role.id} className="glass rounded-2xl p-5 hover-glow flex flex-col">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: `${role.color}18` }}>
                  {role.emoji}
                </div>
                {role.system && <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground uppercase tracking-wide">System</span>}
              </div>
              <h4 className="mt-3 font-bold text-foreground" style={{ color: role.color }}>{role.name}</h4>
              <p className="text-xs text-primary font-medium">{role.tagline}</p>
              <p className="text-sm text-muted-foreground mt-2 flex-1 leading-relaxed">{role.description}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatCount(role.members)} members</span>
                  <span>{role.permissions.includes("*") ? "All permissions" : `${role.permissions.length} permissions`}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setDetailRole(role)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all" title="View permissions">
                    <ShieldCheck className="w-4 h-4" />
                  </button>
                  {canManage && (
                    <>
                      <button onClick={() => handleClone(role)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all" title="Clone role">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(role)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all" title="Delete role">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left p-3 font-medium sticky left-0 bg-surface/80 backdrop-blur min-w-[180px]">Permission</th>
                  {allRoles.map((r) => (
                    <th key={r.id} className="p-3 font-medium text-center min-w-[110px]" style={{ color: r.color }}>{r.emoji} {r.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map((mod) => {
                  const defs = PERMISSION_DEFS.filter((p) => p.module === mod);
                  return (
                    <Fragment key={mod}>
                      <tr key={mod} className="border-b border-border/50 bg-muted/20">
                        <td className="p-2.5 px-3 font-bold text-foreground uppercase tracking-wide sticky left-0 bg-muted/30">{mod}</td>
                        {allRoles.map((r) => (
                          <td key={`${mod}-${r.id}`} className="p-2.5 text-center" />
                        ))}
                      </tr>
                      {defs.map((def) => (
                        <tr key={def.module + def.action} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                          <td className="p-2.5 px-3 text-muted-foreground sticky left-0 bg-surface/80 backdrop-blur">{def.label}</td>
                          {allRoles.map((r) => (
                            <td key={`${r.id}-${def.action}`} className="p-2.5">
                              <MatrixCell on={r.permissions.includes("*") || r.permissions.includes(`${def.module}.${def.action}`)} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length === 0 && view === "roles" && <EmptyRow text="No roles match your search" />}

      <Modal open={!!detailRole} onClose={() => setDetailRole(null)} title={`${detailRole?.emoji || ""} ${detailRole?.name || ""} — Permissions`} wide>
        {detailRole && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{detailRole.description}</p>
            {detailRole.permissions.includes("*") ? (
              <div className="p-4 rounded-xl bg-gradient-primary/10 text-primary font-medium">Full access to the entire NOVAX platform.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {detailRole.permissions.map((p) => (
                  <div key={p} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="text-foreground">{permissionLabel(p)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {createOpen && (
        <CreateRoleModal
          role={creating}
          onClose={() => setCreateOpen(false)}
          onCreate={(role) => handleCreate(role)}
        />
      )}
    </div>
  );
}

function CreateRoleModal({
  role,
  onClose,
  onCreate,
}: {
  role: AdminRole | null;
  onClose: () => void;
  onCreate: (role: AdminRole) => void;
}) {
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#8b5cf6");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!role) return;
    const raf = requestAnimationFrame(() => {
      setName(role.name.replace(/ \(Copy\)$/, ""));
      setTagline(role.tagline);
      setDescription(role.description);
      setColor(role.color);
      const map: Record<string, boolean> = {};
      role.permissions.forEach((p) => (map[p] = true));
      setSelected(map);
    });
    return () => cancelAnimationFrame(raf);
  }, [role]);

  const grouped = useMemo(() => {
    const g: { module: string; defs: typeof PERMISSION_DEFS }[] = [];
    MODULES.forEach((mod) => {
      const defs = PERMISSION_DEFS.filter((p) => p.module === mod);
      if (defs.length) g.push({ module: mod, defs });
    });
    return g;
  }, []);

  const toggleModule = (mod: string) => {
    const defs = grouped.find((g) => g.module === mod)?.defs || [];
    const allOn = defs.every((d) => selected[`${d.module}.${d.action}`]);
    setSelected((prev) => {
      const next = { ...prev };
      defs.forEach((d) => (next[`${d.module}.${d.action}`] = !allOn));
      return next;
    });
  };

  const submit = () => {
    if (!name.trim()) return;
    const permissions = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    const roleId = name.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_") as AdminRoleId;
    onCreate({
      id: roleId,
      name: name.trim(),
      tagline: tagline.trim() || "Custom role",
      description: description.trim() || "Custom role created by an admin.",
      color,
      emoji: "🛡️",
      permissions: permissions.length ? permissions : ["dashboard.view"],
      members: 0,
      system: false,
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={role ? `Clone "${role.name}"` : "Create a new role"}
      wide
      footer={
        <>
          <button onClick={onClose} className="h-9 px-4 rounded-xl border border-border text-sm text-foreground hover:bg-muted transition-all">Cancel</button>
          <button onClick={submit} className="h-9 px-4 rounded-xl bg-gradient-primary text-white text-sm font-medium hover:opacity-90 transition-all">
            {role ? "Clone Role" : "Create Role"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Role name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Payments Admin" className="w-full h-10 rounded-xl bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tagline</label>
            <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Short descriptor" className="w-full h-10 rounded-xl bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What this role can do..." className="w-full rounded-xl bg-muted border border-border p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Color</label>
          <div className="flex items-center gap-2 flex-wrap">
            {["#8b5cf6", "#f59e0b", "#0ea5e9", "#10b981", "#06b6d4", "#ec4899", "#3b82f6", "#ef4444", "#d946ef"].map((c) => (
              <button key={c} onClick={() => setColor(c)} className="w-7 h-7 rounded-lg transition-all" style={{ backgroundColor: c, outline: color === c ? `2px solid ${c}` : "none", outlineOffset: 2, opacity: color === c ? 1 : 0.6 }} aria-label={`Color ${c}`} />
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted-foreground">Permissions</label>
            <span className="text-xs text-muted-foreground">{Object.values(selected).filter(Boolean).length} selected</span>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {grouped.map((g) => {
              const allOn = g.defs.every((d) => selected[`${d.module}.${d.action}`]);
              return (
                <div key={g.module} className="border border-border rounded-xl overflow-hidden">
                  <button onClick={() => toggleModule(g.module)} className="w-full flex items-center justify-between px-3 py-2 bg-muted/40 text-xs font-semibold text-foreground uppercase tracking-wide">
                    {g.module}
                    <span className="flex items-center gap-1.5">
                      <span className="text-muted-foreground normal-case">{allOn ? "All" : `${g.defs.filter((d) => selected[`${d.module}.${d.action}`]).length}/${g.defs.length}`}</span>
                      {allOn ? <Check className="w-3.5 h-3.5 text-green-500" /> : <X className="w-3.5 h-3.5 text-muted-foreground/50" />}
                    </span>
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-2">
                    {g.defs.map((d) => {
                      const key = `${d.module}.${d.action}`;
                      const on = !!selected[key];
                      return (
                        <label key={key} className={`flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer text-sm transition-all ${on ? "bg-primary/5" : "hover:bg-muted/40"}`}>
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => setSelected((prev) => ({ ...prev, [key]: !prev[key] }))}
                            className="accent-[#8b5cf6]"
                          />
                          <span className={on ? "text-foreground" : "text-muted-foreground"}>{d.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
