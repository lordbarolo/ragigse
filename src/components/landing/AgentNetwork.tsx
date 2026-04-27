import { useEffect, useState } from "react";
import { Stethoscope, HeartPulse, Syringe, Baby, Brain, Activity, UserRound, ShieldCheck, FileText, Sparkles } from "lucide-react";

/**
 * Make.com-inspirerad "agent network"-animation.
 * Centrumnod (CompCare brain) + 12 satellitnoder med vårdroller.
 * Pulserande halos, animerade förbindelselinjer, mjuka float-rörelser.
 */
type Node = {
  id: number;
  x: number; // % från center
  y: number;
  size: number;
  Icon: typeof Stethoscope;
  color: string; // hsl base
  delay: number;
  label?: string;
};

const NODES: Node[] = [
  { id: 1,  x:  -38, y: -34, size: 44, Icon: Stethoscope, color: "256 100% 67%", delay: 0,    label: "Läkare" },
  { id: 2,  x:   12, y: -42, size: 36, Icon: HeartPulse,  color: "320 95% 65%",  delay: 0.4 },
  { id: 3,  x:   42, y: -28, size: 52, Icon: Syringe,     color: "256 100% 67%", delay: 0.8,  label: "Anestesi" },
  { id: 4,  x:  -48, y:  -8, size: 32, Icon: Baby,        color: "190 95% 55%",  delay: 1.2 },
  { id: 5,  x:   48, y:   4, size: 40, Icon: Brain,       color: "320 95% 65%",  delay: 1.6,  label: "Specialist" },
  { id: 6,  x:  -42, y:  20, size: 36, Icon: Activity,    color: "256 100% 67%", delay: 2.0 },
  { id: 7,  x:    0, y:  34, size: 56, Icon: UserRound,   color: "190 95% 55%",  delay: 2.4,  label: "Sjuksköt." },
  { id: 8,  x:   38, y:  28, size: 34, Icon: ShieldCheck, color: "256 100% 67%", delay: 2.8 },
  { id: 9,  x:  -22, y: -22, size: 28, Icon: FileText,    color: "320 95% 65%",  delay: 3.2 },
  { id: 10, x:   24, y:  14, size: 30, Icon: Sparkles,    color: "190 95% 55%",  delay: 1.0 },
  { id: 11, x:  -14, y:  10, size: 26, Icon: HeartPulse,  color: "256 100% 67%", delay: 2.2 },
  { id: 12, x:   18, y: -18, size: 28, Icon: Stethoscope, color: "320 95% 65%",  delay: 0.6 },
];

export default function AgentNetwork() {
  const [activeLine, setActiveLine] = useState(0);

  // Roterande "datapulse" mellan nod och centrum
  useEffect(() => {
    const i = setInterval(() => setActiveLine((p) => (p + 1) % NODES.length), 600);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="relative w-full h-full" aria-hidden="true">
      {/* SVG-förbindelser */}
      <svg className="absolute inset-0 w-full h-full" viewBox="-50 -50 100 100" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(256 100% 67%)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(256 100% 67%)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(256 100% 67%)" stopOpacity="0.05" />
            <stop offset="50%" stopColor="hsl(320 95% 65%)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="hsl(190 95% 55%)" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* center halo */}
        <circle cx="0" cy="0" r="35" fill="url(#centerGlow)" />

        {/* statiska linjer */}
        {NODES.map((n) => (
          <line
            key={`l-${n.id}`}
            x1="0" y1="0"
            x2={n.x} y2={n.y}
            stroke="hsl(256 100% 80% / 0.12)"
            strokeWidth="0.25"
            strokeDasharray="0.6 0.8"
          />
        ))}

        {/* aktiv "puls"-linje */}
        {NODES[activeLine] && (
          <line
            x1="0" y1="0"
            x2={NODES[activeLine].x}
            y2={NODES[activeLine].y}
            stroke="url(#lineGrad)"
            strokeWidth="0.6"
            className="agent-line-pulse"
          />
        )}

        {/* pulser-paket längs aktiv linje */}
        {NODES[activeLine] && (
          <circle r="0.9" fill="hsl(320 95% 75%)" className="agent-packet">
            <animateMotion
              dur="0.55s"
              repeatCount="1"
              path={`M 0 0 L ${NODES[activeLine].x} ${NODES[activeLine].y}`}
            />
          </circle>
        )}
      </svg>

      {/* Center-nod (CompCare) */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
        style={{ width: 96, height: 96 }}
      >
        <div className="absolute inset-0 rounded-full bg-[hsl(256_100%_67%_/_0.25)] blur-2xl agent-center-pulse" />
        <div className="relative w-full h-full rounded-full bg-gradient-to-br from-[hsl(256_100%_67%)] via-[hsl(280_95%_60%)] to-[hsl(320_95%_55%)] flex items-center justify-center shadow-[0_0_60px_-5px_hsl(256_100%_67%/0.7)] border border-white/30">
          <Sparkles className="w-9 h-9 text-white drop-shadow-lg" />
        </div>
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-white/80 uppercase tracking-[0.2em] whitespace-nowrap">
          CompCare AI
        </div>
      </div>

      {/* Satellit-noder */}
      {NODES.map((n) => (
        <div
          key={n.id}
          className="absolute z-10 agent-float"
          style={{
            left: `calc(50% + ${n.x}%)`,
            top: `calc(50% + ${n.y}%)`,
            transform: "translate(-50%, -50%)",
            width: n.size,
            height: n.size,
            animationDelay: `${n.delay}s`,
          }}
        >
          {/* halo-pulse */}
          <div
            className="absolute inset-0 rounded-full agent-halo"
            style={{
              background: `hsl(${n.color} / 0.35)`,
              animationDelay: `${n.delay}s`,
            }}
          />
          {/* avatar */}
          <div
            className="relative w-full h-full rounded-full flex items-center justify-center border border-white/20 shadow-lg backdrop-blur-sm"
            style={{
              background: `linear-gradient(135deg, hsl(${n.color} / 0.9), hsl(${n.color} / 0.55))`,
            }}
          >
            <n.Icon className="text-white drop-shadow" style={{ width: n.size * 0.45, height: n.size * 0.45 }} />
          </div>
          {n.label && (
            <div
              className="absolute left-1/2 -translate-x-1/2 -bottom-4 text-[8px] font-semibold text-white/70 whitespace-nowrap px-1.5 py-0.5 rounded bg-black/30 backdrop-blur-sm"
            >
              {n.label}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
