import { cn } from "@/lib/utils";

const PALETTES = {
  stats: [
    { className: "bg-gradient-to-br from-violet-600/50 to-purple-900/30", opts: "top-[-18%] left-[-12%] w-[520px] h-[520px] blur-[130px] opacity-30", anim: "12s" },
    { className: "bg-gradient-to-tr from-cyan-500/40 to-blue-600/25", opts: "bottom-[-22%] right-[-8%] w-[480px] h-[480px] blur-[120px] opacity-25", anim: "15s" },
    { className: "bg-gradient-to-r from-fuchsia-500/40 to-indigo-500/30", opts: "top-1/3 left-1/2 -translate-x-1/2 w-[420px] h-[260px] blur-[110px] opacity-20", anim: "18s" },
    { className: "bg-gradient-to-br from-blue-500/35 to-emerald-500/20", opts: "top-[6%] right-[16%] w-[320px] h-[320px] blur-[120px] opacity-20", anim: "21s" },
    { className: "bg-gradient-to-tl from-pink-500/30 to-rose-600/15", opts: "bottom-[12%] left-[14%] w-[300px] h-[300px] blur-[110px] opacity-15", anim: "16s" },
  ],
  features: [
    { className: "bg-gradient-to-br from-violet-600/60 to-purple-900/35", opts: "top-[-18%] left-[-12%] w-[540px] h-[540px] blur-[135px] opacity-25", anim: "14s" },
    { className: "bg-gradient-to-tr from-cyan-500/45 to-blue-700/25", opts: "bottom-[-24%] right-[-10%] w-[580px] h-[580px] blur-[140px] opacity-20", anim: "18s" },
    { className: "bg-gradient-to-r from-fuchsia-600/40 to-indigo-600/30", opts: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[360px] blur-[125px] opacity-15", anim: "22s" },
    { className: "bg-gradient-to-br from-emerald-500/30 to-teal-600/20", opts: "top-[-4%] right-[18%] w-[320px] h-[320px] blur-[115px] opacity-15", anim: "20s" },
    { className: "bg-gradient-to-br from-amber-500/25 to-orange-600/15", opts: "bottom-[10%] left-[10%] w-[300px] h-[300px] blur-[120px] opacity-12", anim: "17s" },
  ],
} as const;

const PARTICLES = [
  { left: "12%", top: "18%", size: 5, anim: "6s", delay: "0s", op: "bg-white/50" },
  { left: "78%", top: "12%", size: 3, anim: "7s", delay: "1.2s", op: "bg-violet-300/60" },
  { left: "24%", top: "72%", size: 4, anim: "6.5s", delay: "0.6s", op: "bg-cyan-300/60" },
  { left: "60%", top: "82%", size: 3, anim: "7.5s", delay: "2s", op: "bg-white/40" },
  { left: "88%", top: "58%", size: 5, anim: "6.8s", delay: "0.8s", op: "bg-fuchsia-300/50" },
  { left: "40%", top: "10%", size: 3, anim: "8s", delay: "1.6s", op: "bg-white/40" },
  { left: "8%", top: "45%", size: 4, anim: "7.2s", delay: "2.4s", op: "bg-violet-300/50" },
  { left: "68%", top: "30%", size: 3, anim: "6.2s", delay: "0.2s", op: "bg-white/50" },
  { left: "34%", top: "86%", size: 4, anim: "7.8s", delay: "1s", op: "bg-cyan-300/50" },
  { left: "92%", top: "24%", size: 3, anim: "6.9s", delay: "1.8s", op: "bg-white/40" },
];

interface PremiumBackgroundProps {
  variant?: keyof typeof PALETTES;
}

export default function PremiumBackground({ variant = "stats" }: PremiumBackgroundProps) {
  const palette = PALETTES[variant];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {palette.map((orb, i) => (
        <div
          key={i}
          className={cn("absolute rounded-full mix-blend-screen", orb.className, orb.opts)}
          style={{ animation: `drift ${orb.anim} ease-in-out ${i % 2 === 0 ? "0s" : `${i * 1.4}s`} infinite${i % 2 === 1 ? " reverse" : ""}` }}
        />
      ))}

      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[120%] opacity-20 mix-blend-screen"
        style={{
          background:
            "conic-gradient(from 0deg at 50% 50%, rgba(139,92,246,0.18), transparent 25%, rgba(34,211,238,0.14), transparent 50%, rgba(217,70,239,0.16), transparent 75%, rgba(139,92,246,0.18))",
          animation: "orbit-slow 46s linear infinite",
          filter: "blur(70px)",
        }}
      />

      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[46%] opacity-[0.07]"
        style={{
          background:
            "conic-gradient(from 180deg at 50% 50%, rgba(255,255,255,0.9), transparent 30%, rgba(34,211,238,0.8), transparent 60%, rgba(139,92,246,0.8), transparent 80%)",
          animation: "orbit-slow 70s linear infinite reverse",
          filter: "blur(40px)",
        }}
      />

      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className={cn("absolute rounded-full blur-[1px]", p.op)}
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animation: `floaty ${p.anim} ease-in-out ${p.delay} infinite`,
            boxShadow: "0 0 12px rgba(255,255,255,0.6)",
          }}
        />
      ))}

      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.55) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(ellipse_at_center, black 25%, transparent 72%)",
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}