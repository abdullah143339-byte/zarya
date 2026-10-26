"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import Logo from "@/components/ui/Logo";
import {
  Home,
  User,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  GraduationCap,
  Video,
  ShoppingCart,
  Route,
  FolderGit2,
  Shield,
} from "lucide-react";

const bottomItems = [
  { label: "Settings", href: "/dashboard/settings", icon: <Settings className="w-5 h-5" /> },
];

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const isAdmin = user && ADMIN_ROLES.includes(user.role || "");

  const navItems = [
    { label: "Feed", href: "/dashboard", icon: <Home className="w-5 h-5" /> },
    { label: "Reels", href: "/dashboard/reels", icon: <Video className="w-5 h-5" /> },
    { label: "Profile", href: "/dashboard/profile", icon: <User className="w-5 h-5" /> },
    { label: "Marketplace", href: "/dashboard/marketplace", icon: <ShoppingCart className="w-5 h-5" /> },
    { label: "Projects", href: "/dashboard/projects", icon: <FolderGit2 className="w-5 h-5" /> },
    { label: "Learning Platform", href: "/dashboard/learning", icon: <GraduationCap className="w-5 h-5" /> },
    { label: "Messages", href: "/dashboard/messages", icon: <MessageSquare className="w-5 h-5" /> },
    { label: "Notifications", href: "/dashboard/notifications", icon: <Bell className="w-5 h-5" /> },
    ...(isAdmin
      ? [
          { label: "AI Router", href: "/dashboard/ai-router", icon: <Route className="w-5 h-5" /> },
          { label: "Admin Panel", href: "/dashboard/admin", icon: <Shield className="w-5 h-5" /> },
        ]
      : []),
  ];

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <>
    <aside className="hidden md:flex lg:hidden flex-col w-16 h-dvh fixed left-0 top-0 z-40 glass-strong border-r border-border pt-14">
      <nav className="flex-1 overflow-y-auto py-3 flex flex-col items-center gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {item.icon}
            </Link>
          );
        })}
      </nav>
      <div className="py-3 border-t border-border flex flex-col items-center gap-1">
        {bottomItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
          >
            {item.icon}
          </Link>
        ))}
        <button
          onClick={handleLogout}
          title="Log Out"
          aria-label="Log Out"
          className="w-11 h-11 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </aside>

    <aside className="hidden lg:flex flex-col w-64 h-dvh fixed left-0 top-0 glass-strong border-r border-border z-40">
      <div className="p-5 border-b border-border">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size={36} />
          <div className="min-w-0">
            <span className="block text-lg font-bold text-gradient leading-none">NOVAX</span>
            <span className="block text-[9px] text-muted-foreground tracking-wide truncate">Think Beyond Social</span>
          </div>
        </Link>
        {user && (
          <div className="mt-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center text-white text-xs font-bold">
              {user.firstName?.[0]}{user.lastName?.[0] || user.username[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        {bottomItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all duration-200 w-full text-left"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>
    </aside>
    </>
  );
}
