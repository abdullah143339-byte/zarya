"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, FileText, Languages, Zap, PenLine, Code, ListTodo } from "lucide-react";
import api from "@/lib/api";
import type { Conversation, ChatMessage } from "./types";
import { cn } from "@/lib/utils";
import { NOVAX_AI_RULES } from "@/lib/ai";
import Markdown from "@/components/ui/Markdown";

export function extractAiText(res: { data?: unknown }): string {
  const raw = res?.data;
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    const obj = raw as {
      content?: unknown;
      message?: { content?: unknown };
      text?: unknown;
      summary?: unknown;
      response?: unknown;
    };
    const candidate = obj.content ?? obj.message?.content ?? obj.text ?? obj.summary ?? obj.response;
    if (typeof candidate === "string") return candidate;
  }
  return "";
}

interface AiPanelProps {
  conversation: Conversation;
  messages: ChatMessage[];
  currentUserId: string | null;
  open: boolean;
  onClose: () => void;
  onUseSuggestion: (text: string) => void;
}

const QUICK_ACTIONS = [
  { key: "summarize", label: "Summarize conversation", icon: FileText },
  { key: "translate", label: "Translate last message", icon: Languages },
  { key: "suggest", label: "Suggest replies", icon: Zap },
  { key: "rewrite", label: "Rewrite my last message", icon: PenLine },
  { key: "explain", label: "Explain code", icon: Code },
  { key: "tasks", label: "Extract tasks", icon: ListTodo },
];

export default function AiPanel({ messages, currentUserId, open, onClose, onUseSuggestion }: AiPanelProps) {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<string | null>(null);
  const [output, setOutput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState("");

  const transcript = useCallback(() => {
    const recent = messages.slice(-30);
    if (recent.length === 0) return "(no messages yet)";
    return recent
      .map((m) => `${m.sender?.id === currentUserId ? "Me" : m.sender?.displayName || m.sender?.username || "User"}: ${m.content || "[media]"}`)
      .join("\n");
  }, [messages, currentUserId]);

  const run = async (key: string) => {
    setAction(key);
    setLoading(true);
    setError("");
    setOutput("");
    setSuggestions([]);

    const t = transcript();
    let prompt = "";
    switch (key) {
      case "summarize":
        prompt = `Summarize this conversation in 4-6 clear bullet points:\n\n${t}`;
        break;
      case "translate":
        prompt = `Translate the last message to English and reply with ONLY the translation:\n\n${messages[messages.length - 1]?.content || ""}`;
        break;
      case "suggest":
        prompt = `Given this conversation, reply with exactly 3 short natural reply suggestions, one per line, prefixed with "-":\n\n${t}`;
        break;
      case "rewrite":
        prompt = `Rewrite my last message to be clearer and more professional (keep the meaning):\n\n${messages[messages.length - 1]?.content || ""}`;
        break;
      case "explain":
        prompt = `Explain this code block simply and clearly:\n\n${messages[messages.length - 1]?.content || "(no code found)"}`;
        break;
      case "tasks":
        prompt = `Extract any tasks or action items from this conversation as a short checklist:\n\n${t}`;
        break;
    }

    try {
      const res = await api.aiChat([
        { role: "system", content: NOVAX_AI_RULES },
        { role: "user", content: prompt },
      ], 0.4);
      const text = extractAiText(res);
      if (!text) throw new Error("empty");
      if (key === "suggest") {
        const list = text
          .split("\n")
          .map((l) => l.replace(/^[-•*]\s*/, "").trim())
          .filter(Boolean)
          .slice(0, 3);
        setSuggestions(list.length ? list : [text]);
      }
      setOutput(text);
    } catch {
      setError("AI is unavailable right now. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="absolute bottom-full left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-30 tactile-raised rounded-3xl shadow-premium overflow-hidden flex flex-col max-h-[55vh]"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-[#6C63FF]/10">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#7C3AED] flex items-center justify-center ai-glow">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </span>
              NOVAX <span className="text-[10px] font-medium text-accent uppercase tracking-wider">AI Tools</span>
            </h4>
            <button onClick={onClose} aria-label="Close AI tools" className="w-8 h-8 rounded-full tactile-icon-btn text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 overflow-y-auto no-scrollbar">
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.key}
                  onClick={() => run(a.key)}
                  disabled={loading || messages.length === 0}
                  className={cn(
                    "flex items-center gap-1.5 h-10 px-2.5 rounded-xl text-xs font-medium transition-all text-left",
                    action === a.key
                      ? "tactile-inset text-accent ring-1 ring-accent/40"
                      : "tactile-surface text-muted-foreground hover:text-foreground hover:brightness-105"
                  )}
                >
                  <a.icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{a.label}</span>
                </button>
              ))}
            </div>

            {loading && (
              <div className="flex items-center gap-2 py-4">
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#7C3AED] flex items-center justify-center ai-glow">
                  <Sparkles className="w-3 h-3 text-white" />
                </span>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:140ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:280ms]" />
                </div>
                <span className="text-xs text-muted-foreground">Thinking...</span>
              </div>
            )}

            {error && <p className="text-xs text-red-500 py-2">{error}</p>}

            {output && !loading && (
              <div className="message-received message-tactile rounded-2xl p-3 mb-3">
                <Markdown content={output} />
              </div>
            )}

            {suggestions.length > 0 && !loading && (
              <div className="space-y-1.5">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Tap to send</p>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => onUseSuggestion(s)}
                    className="w-full text-left text-sm px-3 py-2 rounded-xl bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
