"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { X, Send, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { NOVAX_AI_RULES } from "@/lib/ai";
import Markdown from "@/components/ui/Markdown";

const WEBSITE_KNOWLEDGE = `You are NOVAX, the intelligent assistant of the NOVAX platform.
You have complete knowledge of the entire website and its features.

== PLATFORM OVERVIEW ==
NOVAX is a premium AI-powered social ecosystem where users can Connect, Learn, Build, Collaborate, and Grow.
It combines Social Media, AI, Learning, Portfolio, Community, and Collaboration in one platform.

== PAGES & FEATURES ==

1. Dashboard (/) - Main feed showing posts from followed users, trending content, and personalized AI recommendations.

2. AI Router (/dashboard/ai-router) - Routes user requests to the best AI provider:
   - Chat: Groq → Gemini → OpenRouter → DeepSeek → Mistral
   - Code generation/review/debug/explain/refactor
   - Image generation: Flux (BFL) → FAL AI → Stability AI
   - Translation & language detection
   - Deep search with AI-powered summaries

3. AI Search (/dashboard/learning/ai-search) - AI-powered educational search inside the Learning Platform: explains topics with diagrams, key points, related topics and generated images.

4. Communities (/dashboard/communities) - Interest-based groups in categories: AI, Programming, Cyber Security, Design, Gaming, Business. Features: posts, discussions, events, collaboration.

5. Portfolio (/dashboard/portfolio) - Users showcase projects, GitHub links, skills, achievements, certifications. AI-generated portfolio system.

7. Messages (/dashboard/messages) - Private chat, group chat, file sharing, voice/video call ready structure.

8. Notifications (/dashboard/notifications) - Activity notifications, mentions, follows, likes, comments.

9. Search (/dashboard/search) - Intelligent search for people, projects, communities, skills, learning content.

10. Profile (/dashboard/profile) - User profile with reputation scores (skills, helpful, project, community, trust), posts, projects.

11. Settings (/dashboard/settings) - Account settings, 2FA setup, security, appearance, notifications preferences.

12. Projects (/dashboard/projects) - GitHub-style project showcase with URLs, descriptions, and contact buttons.

14. Marketplace (/dashboard/marketplace) - Digital marketplace for services and products.

16. Security features: JWT auth, Google OAuth, 2FA (authenticator app), rate limiting, input validation.

17. Login (/login) - Email/password & Google OAuth sign in.
18. Signup (/signup) - New user registration.
19. Forgot Password (/forgot-password) - Password reset.

== AI PROVIDERS INTEGRATED ==
- Groq: 7,200 req/day free (mixtral-8x7b, llama-3.1-70b)
- Gemini: 1,500 req/day free (gemini-1.5-flash, gemini-1.5-pro)
- OpenRouter: Free tier models (mistral-7b, gpt-3.5-turbo)
- DeepSeek: $5 free credits (deepseek-chat, deepseek-coder)
- Mistral: 500k tokens/day free (mistral-small, codestral)
- Flux (BFL): Image generation via API
- FAL AI: Image generation via fal-ai/flux
- Stability AI: Image generation via SD3
- Google Search: Web search API

== TECH STACK ==
- Frontend: Next.js 16 with Turbopack, Tailwind CSS v4, Framer Motion, Three.js/React Three Fiber
- Backend: NestJS with Prisma ORM (SQLite), WebSocket support
- Auth: JWT + Google OAuth with refresh tokens

== SITE WIDE FEATURES ==
- Dark theme with glassmorphism design
- 3D animations with Three.js
- Mobile responsive with sidebar + bottom nav
- Real-time notifications
- User reputation system
- AI-powered recommendations

Answer questions helpfully about any part of the website. Guide users to the right pages and features based on their needs. Keep responses concise and actionable.${NOVAX_AI_RULES}`;

export default function ChatBotWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "system", content: WEBSITE_KNOWLEDGE }, { role: "assistant", content: "Hi! I'm NOVAX. Ask me anything about the platform." }]);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const chatHistory = [...messages, userMsg];
      const res = await api.aiChat(chatHistory) as any;
      const reply = res?.data?.content || "I'm not sure about that. Try asking differently!";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+8rem)] md:bottom-24 right-4 md:right-6 left-4 md:left-auto z-50 sm:w-96 max-h-[60dvh] md:max-h-[500px] tactile-raised rounded-3xl shadow-elevated overflow-hidden animate-scale-in flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-[#6C63FF]/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center ai-glow overflow-hidden">
                <img src="/novax.png" alt="NOVAX" className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground block">NOVAX</span>
                <span className="text-[10px] text-accent flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online · AI Assistant
                </span>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full tactile-icon-btn text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 overflow-y-auto no-scrollbar space-y-3 chat-canvas" style={{ height: "340px" }}>
            {messages.filter(m => m.role !== "system").map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3 py-2 text-sm message-tactile ${
                  msg.role === "user"
                    ? "message-sent rounded-br-md"
                    : "message-received rounded-bl-md"
                }`}>
                  <Markdown content={msg.content} />
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="message-received message-tactile rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2b2417]/50 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2b2417]/50 animate-bounce [animation-delay:140ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2b2417]/50 animate-bounce [animation-delay:280ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-border tactile-surface">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="Ask me about NOVAX..."
                aria-label="Ask NOVAX AI"
                className="flex-1 rounded-2xl tactile-inset px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/40 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                aria-label="Send message"
                className="w-11 h-11 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#7C3AED] flex items-center justify-center disabled:opacity-40 shadow-lg shadow-[#6C63FF]/30 hover:brightness-110 transition-all shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
        className="fixed z-50 w-14 h-14 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#7C3AED] shadow-lg shadow-[#6C63FF]/25 flex items-center justify-center hover:scale-105 active:scale-95 transition-all bottom-6 right-4 md:right-6"
        style={
          pathname?.startsWith("/dashboard") && isMobile
            ? { bottom: "calc(env(safe-area-inset-bottom) + 5rem)", right: "1rem" }
            : undefined
        }
      >
        {open ? <X className="w-6 h-6 text-white" /> : <img src="/novax.png" alt="NOVAX" className="w-11 h-11 rounded-full object-cover" />}
      </button>
    </>
  );
}
