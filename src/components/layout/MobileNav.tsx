"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ui/ThemeToggle";
import Logo from "@/components/ui/Logo";
import { useAuth } from "@/providers/AuthProvider";
import {
  Home,
  User,
  MessageSquare,
  Bell,
  Video,
  Route,
  Shield,
  ShoppingCart,
  GraduationCap,
  Search,
} from "lucide-react";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

export default function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user && ADMIN_ROLES.includes(user.role || "");

  const mobileItems = [
    { label: "Feed", href: "/dashboard", icon: <Home className="w-5 h-5" /> },
    { label: "Market", href: "/dashboard/marketplace", icon: <ShoppingCart className="w-5 h-5" /> },
    { label: "Reels", href: "/dashboard/reels", icon: <Video className="w-5 h-5" /> },
    { label: "Learn", href: "/dashboard/learning", icon: <GraduationCap className="w-5 h-5" /> },
    { label: "Chat", href: "/dashboard/messages", icon: <MessageSquare className="w-5 h-5" /> },
    ...(isAdmin
      ? [
          { label: "Router", href: "/dashboard/ai-router", icon: <Route className="w-5 h-5" /> },
          { label: "Admin", href: "/dashboard/admin", icon: <Shield className="w-5 h-5" /> },
        ]
      : []),
    { label: "Me", href: "/dashboard/profile", icon: <User className="w-5 h-5" /> },
  ];

  return (
    <>
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 glass-strong border-b border-border flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] h-14">
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <Logo size={32} />
          <span className="font-bold text-gradient truncate">NOVAX</span>
        </Link>
        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            href="/dashboard/search"
            className="w-10 h-10 rounded-xl glass flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </Link>
          <ThemeToggle />
          <Link
            href="/dashboard/notifications"
            className="relative w-10 h-10 rounded-xl glass flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-background" />
          </Link>
        </div>
      </header>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch overflow-x-auto no-scrollbar">
          {mobileItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex flex-1 min-w-0 flex-col items-center justify-center gap-1 py-2 min-h-16 text-[10px] font-medium transition-all",
                  isActive ? "text-primary" : "text-muted-foreground active:bg-muted/60"
                )}
              >
                <span className={cn("flex items-center justify-center rounded-full px-2 py-0.5 transition-colors", isActive && "bg-primary/10")}>
                  {item.icon}
                </span>
                <span className="truncate max-w-full">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
