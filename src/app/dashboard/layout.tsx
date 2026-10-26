"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import api from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import HeaderSearch from "@/components/layout/HeaderSearch";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { Bell, Loader2 } from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const loadUnread = () => {
      api.getNotifications(1)
        .then((res: any) => {
          const raw = res.data;
          setUnreadCount(raw?.unreadCount ?? 0);
        })
        .catch(() => {});
    };
    loadUnread();
    const interval = setInterval(loadUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading NOVAX...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar />
      <MobileNav />

      <div className="md:pl-16 lg:pl-64 pt-[calc(env(safe-area-inset-top)+3.5rem)] lg:pt-0 pb-[calc(env(safe-area-inset-bottom)+4rem)] md:pb-0">
        <header className="hidden lg:flex items-center justify-between px-8 h-16 border-b border-border bg-surface/30 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <HeaderSearch />
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/dashboard/notifications"
              className="relative w-10 h-10 rounded-xl glass flex items-center justify-center hover:bg-surface transition-all"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
            <div className="flex items-center gap-2.5 pl-3 border-l border-border">
              <Link href="/dashboard/profile" aria-label="My profile">
                <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity">
                  {user.firstName?.[0]}{user.lastName?.[0] || user.username[0]?.toUpperCase()}
                </div>
              </Link>
              <div className="hidden xl:block">
                <Link href="/dashboard/profile" className="text-sm font-medium text-foreground leading-none hover:underline">{user.firstName} {user.lastName}</Link>
                <p className="text-xs text-muted-foreground mt-0.5">@{user.username}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
