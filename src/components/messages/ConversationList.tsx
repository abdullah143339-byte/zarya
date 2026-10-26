"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, Pin, Search, Users, Plus, ChevronRight } from "lucide-react";
import type { Conversation } from "./types";
import { isVerifiedUser } from "./types";
import { formatConversationTime } from "./format";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  currentUserId: string | null;
  search: string;
  unreadOnly: boolean;
  loading: boolean;
  error: boolean;
  connected: boolean;
  onlineIds: Set<string>;
  typingMap: Record<string, Record<string, string>>;
  onSearch: (q: string) => void;
  onToggleUnread: () => void;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onRetry: () => void;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ConversationRow({
  conv,
  active,
  currentUserId,
  online,
  typingName,
  onSelect,
}: {
  conv: Conversation;
  active: boolean;
  currentUserId: string | null;
  online: boolean;
  typingName?: string;
  onSelect: () => void;
}) {
  const other = conv.participants.find((p) => p.userId !== currentUserId)?.user;
  const verified = conv.type === "DIRECT" ? isVerifiedUser(other) : false;
  const unread = conv.unreadCount > 0;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all duration-200 group",
        active
          ? "tactile-raised ring-1 ring-[#6C63FF]/25"
          : "tactile-surface hover:shadow-[0_6px_14px_rgba(0,0,0,0.2)] hover:brightness-105 active:scale-[0.99]"
      )}
    >
      <div className="relative shrink-0">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold text-white overflow-hidden shadow-md", conv.avatar ? "bg-transparent" : "bg-gradient-primary")}>
          {conv.avatar ? (
            <img src={conv.avatar} alt="" className="w-full h-full rounded-2xl object-cover" />
          ) : (
            initials(conv.name)
          )}
        </div>
        {online && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-background" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-foreground truncate flex items-center gap-1">
            {conv.name}
            {verified && <span className="w-4 h-4 shrink-0 rounded-full bg-accent text-white flex items-center justify-center text-[9px] font-bold">✓</span>}
          </span>
          <span className="text-[11px] text-muted-foreground shrink-0">{formatConversationTime(conv.lastMessageAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          {typingName ? (
            <span className="text-xs text-primary font-medium truncate flex items-center gap-1">
              <span className="inline-flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:120ms]" />
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:240ms]" />
              </span>
              {typingName} is typing...
            </span>
          ) : (
            <span className={cn("text-xs truncate", unread ? "text-foreground font-medium" : "text-muted-foreground")}>
              {conv.lastMessage || "No messages yet"}
            </span>
          )}
          <div className="flex items-center gap-1.5 shrink-0">
            {conv.isPinned && <Pin className="w-3 h-3 text-muted-foreground" />}
            {conv.isMuted && <BellOff className="w-3 h-3 text-muted-foreground" />}
            {unread && (
              <span className="tactile-badge">
                {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

export default function ConversationList({
  conversations,
  activeId,
  currentUserId,
  search,
  unreadOnly,
  loading,
  error,
  connected,
  onlineIds,
  typingMap,
  onSearch,
  onToggleUnread,
  onSelect,
  onNewChat,
  onRetry,
}: ConversationListProps) {
  const query = search.trim().toLowerCase();
  const filtered = conversations.filter((c) => {
    if (unreadOnly && c.unreadCount === 0) return false;
    if (!query) return true;
    return (
      c.name.toLowerCase().includes(query) ||
      (c.lastMessage || "").toLowerCase().includes(query)
    );
  });

  const pinned = filtered.filter((c) => c.isPinned);
  const rest = filtered.filter((c) => !c.isPinned);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">Messages</h2>
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                connected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
              )}
              title={connected ? "Connected" : "Reconnecting"}
            />
          </div>
          <button
            onClick={onNewChat}
            aria-label="New chat"
            className="w-10 h-10 rounded-2xl tactile-icon-btn text-primary"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="relative mb-2.5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search conversations..."
            aria-label="Search conversations"
            className="w-full h-11 rounded-2xl tactile-inset pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/40 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleUnread}
            className={cn(
              "h-8 px-3.5 rounded-full text-xs font-medium transition-all flex items-center gap-1",
              unreadOnly
                ? "tactile-inset text-primary ring-1 ring-[#6C63FF]/30"
                : "tactile-surface text-muted-foreground hover:text-foreground"
            )}
          >
            <Bell className="w-3 h-3" /> Unread
          </button>
        </div>

        {/* AI Assistant — separate section from conversations */}
        <div className="mt-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 px-1">AI</p>
          <button
            onClick={() => onSelect("__ai__")}
            aria-label="Open AI Assistant"
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all duration-200 group",
              activeId === "__ai__"
                ? "tactile-raised ring-1 ring-[#6C63FF]/30"
                : "tactile-raised hover:brightness-105 active:scale-[0.99]"
            )}
            style={{
              background:
                "linear-gradient(120deg, rgba(108,99,255,0.14), rgba(124,58,237,0.08)), linear-gradient(150deg, var(--surface), var(--muted))",
            }}
          >
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center ai-glow overflow-hidden shrink-0">
              <img src="/novax.png" alt="NOVAX" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5 truncate">
                NOVAX AI Assistant
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#6C63FF]/15 text-accent font-bold uppercase tracking-wide shrink-0">AI</span>
              </p>
              <p className="text-xs text-muted-foreground truncate">Ask anything, get instant answers</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-2.5 py-2.5 space-y-1.5">
        {loading && (
          <div className="space-y-2 px-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-2xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 rounded bg-muted" />
                  <div className="h-2.5 w-1/2 rounded bg-muted/70" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground mb-3">Couldn&apos;t load conversations.</p>
            <button
              onClick={onRetry}
              className="h-8 px-4 rounded-xl bg-gradient-primary text-white text-xs font-medium hover:shadow-lg hover:shadow-primary/25 transition-all"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <AnimatePresence mode="popLayout">
            {pinned.length > 0 && (
              <div key="pinned-group">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground px-2 py-1.5">Pinned</p>
                {pinned.map((c) => (
                  <ConversationRow
                    key={c.id}
                    conv={c}
                    active={activeId === c.id}
                    currentUserId={currentUserId}
                    online={onlineIds.has(c.participants.find((p) => p.userId !== currentUserId)?.userId || "")}
typingName={Object.values(typingMap[c.id] || {}).join(" and ") || undefined}
                    onSelect={() => onSelect(c.id)}
                  />
                ))}
              </div>
            )}
            <div key="recent-group">
              {pinned.length > 0 && rest.length > 0 && (
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground px-2 py-1.5">Recent</p>
              )}
              {rest.map((c) => (
                <ConversationRow
                  key={c.id}
                  conv={c}
                  active={activeId === c.id}
                  currentUserId={currentUserId}
                  online={onlineIds.has(c.participants.find((p) => p.userId !== currentUserId)?.userId || "")}
                  typingName={Object.values(typingMap[c.id] || {}).join(" and ") || undefined}
                  onSelect={() => onSelect(c.id)}
                />
              ))}
            </div>

            {filtered.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-12 text-center">
                <div className="w-14 h-14 rounded-3xl tactile-raised flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {search ? "No conversations found" : "No conversations yet"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {search ? "Try a different search" : "Start a new chat to begin"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
