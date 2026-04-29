import { useEffect, useState } from "react";
import { Stethoscope, Syringe, Brain, UserRound, ShieldCheck, Activity, Sparkles } from "lucide-react";

/**
 * Constellation Settle — agentisk nätverksanimation.
 * Tre faser:
 *   boot   (0–1.2s)   satelliter studsar in, linjer ritas
 *   settle (1.2–2.5s) broadcast-pulse, allt landar
 *   idle   (2.5s+)    center andas, en enstaka mjuk datapuls var ~4s
 */

type SatelliteNode = {
  id: number;
  angle: number;       // grader runt centrum
  radius: number;      // % från center
  size: number;
  Icon: typeof Stethoscope;
  color: string;       // hsl base
  label: string;
};

const RADIUS = 36;
const NODES: SatelliteNode[] = [
  { id: 0, angle: -90, radius: RADIUS, size: 50, Icon: Stethoscope, color: "256 100% 67%", label: "Läkare" },
  { id: 1, angle: -30, radius: RADIUS, size: 44, Icon: Brain,       color: "320 95% 65%",  label: "Specialist" },
  { id: 2, angle:  30, radius: RADIUS, size: 46, Icon: Syringe,     color: "190 95% 55%",  label: "Anestesi" },
  { id: 3, angle:  90, radius: RADIUS, size: 50, Icon: UserRound,   color: "256 100% 67%", label: "Sjuksköt." },
  { id: 4, angle: 150, radius: RADIUS, size: 44, Icon: ShieldCheck, color: "320 95% 65%",  label: "Verifierad" },
  { id: 5, angle: 210, radius: RADIUS, size: 46, Icon: Activity,    color: "190 95% 55%",  label: "Vårdpersonal" },
];

// Konvertera polar → kartesisk för SVG (procent)
function polar(angleDeg: number, r: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}

export default function AgentNetwork() {
  const [phase, setPhase] = useState<"boot" | "settle" | "idle">("boot");
  const [idlePulse, setIdlePulse] = useState<number | null>(null);

  // Fas-övergångar
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("settle"), 1200);
    const t2 = setTimeout(() => setPhase("idle"), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Lugn idle-puls var ~4s
  useEffect(() => {
    if (phase !== "idle") return;
    const tick = () => setIdlePulse((p) => {
      const next = Math.floor(Math.random() * NODES.length);
      return next === p ? (next + 1) % NODES.length : next;
    });
    tick();
    const i = setInterval(tick, 4000);
    return () => clearInterval(i);
  }, [phase]);

  const nodePositions = NODES.map((n) => ({ ...n, ...polar(n.angle, n.radius) }));
  const showBroadcast = phase === "settle";

  return (
    <div className="relative w-full h-full" aria-hidden="true">
      {/* SVG: linjer + idle-paket */}
      <svg className="absolute inset-0 w-full h-full" viewBox="-50 -50 100 100" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(256 100% 67%)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="hsl(256 100% 67%)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(256 100% 67%)" stopOpacity="0.1" />
            <stop offset="50%" stopColor="hsl(320 95% 70%)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="hsl(190 95% 60%)" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* center halo (statisk) */}
        <circle cx="0" cy="0" r="32" fill="url(#centerGlow)" />

        {/* statiska linjer — bleknar in efter boot */}
        {nodePositions.map((n, i) => (
          <line
            key={`base-${n.id}`}
            x1="0" y1="0" x2={n.x} y2={n.y}
            stroke="hsl(256 100% 80%)"
            strokeOpacity={phase === "boot" ? 0 : 0.18}
            strokeWidth="0.22"
            strokeDasharray="0.7 0.9"
            style={{ transition: "stroke-opacity 800ms ease-out", transitionDelay: `${800 + i * 80}ms` }}
          />
        ))}

        {/* boot: ritar in glödande linjer en efter en */}
        {phase === "boot" && nodePositions.map((n, i) => (
          <line
            key={`draw-${n.id}`}
            x1="0" y1="0" x2={n.x} y2={n.y}
            stroke="url(#lineGrad)"
            strokeWidth="0.5"
            className="agent-line-draw"
            style={{ animationDelay: `${i * 110}ms` }}
          />
        ))}

        {/* idle: enstaka mjuk linje-flash + paket */}
        {phase === "idle" && idlePulse !== null && (
          <g key={`idle-${idlePulse}-${Date.now()}`}>
            <line
              x1="0" y1="0"
              x2={nodePositions[idlePulse].x}
              y2={nodePositions[idlePulse].y}
              stroke="url(#lineGrad)"
              strokeWidth="0.45"
              className="agent-line-flash"
            />
            <circle r="0.85" fill="hsl(320 95% 78%)" className="agent-packet">
              <animateMotion
                dur="1.4s"
                repeatCount="1"
                path={`M 0 0 L ${nodePositions[idlePulse].x} ${nodePositions[idlePulse].y}`}
              />
            </circle>
          </g>
        )}
      </svg>

      {/* Broadcast-ring vid settle */}
      {showBroadcast && (
        <div
          className="absolute left-1/2 top-1/2 rounded-full agent-broadcast pointer-events-none"
          style={{
            width: 120, height: 120,
            border: "1.5px solid hsl(256 100% 75% / 0.6)",
            boxShadow: "0 0 30px hsl(256 100% 67% / 0.35)",
          }}
        />
      )}

      {/* Center-nod (CompCare AI) */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
        style={{ width: 100, height: 100 }}
      >
        <div className="absolute inset-0 rounded-full bg-[hsl(256_100%_67%_/_0.22)] blur-2xl" />
        <div className="relative w-full h-full rounded-full bg-gradient-to-br from-[hsl(256_100%_67%)] via-[hsl(280_95%_60%)] to-[hsl(320_95%_55%)] flex items-center justify-center shadow-[0_0_60px_-5px_hsl(256_100%_67%/0.7)] border border-white/30 agent-breathe">
          <Sparkles className="w-9 h-9 text-white drop-shadow-lg" />
        </div>
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-white/75 uppercase tracking-[0.22em] whitespace-nowrap">
          CompCare AI
        </div>
      </div>

      {/* Satellit-noder (CSS-procent från center) */}
      {nodePositions.map((n, i) => (
        <div
          key={n.id}
          className="absolute z-10 agent-boot-in"
          style={{
            left: `calc(50% + ${n.x}%)`,
            top: `calc(50% + ${n.y}%)`,
            width: n.size,
            height: n.size,
            animationDelay: `${i * 120}ms`,
          }}
        >
          {/* avatar */}
          <div
            className="relative w-full h-full rounded-full flex items-center justify-center border border-white/25 shadow-lg backdrop-blur-sm"
            style={{
              background: `linear-gradient(135deg, hsl(${n.color} / 0.92), hsl(${n.color} / 0.55))`,
              boxShadow: `0 0 24px -4px hsl(${n.color} / 0.5)`,
            }}
          >
            <n.Icon className="text-white drop-shadow" style={{ width: n.size * 0.42, height: n.size * 0.42 }} />
          </div>
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-5 text-[9px] font-semibold text-white/70 whitespace-nowrap px-1.5 py-0.5 rounded bg-black/35 backdrop-blur-sm"
          >
            {n.label}
          </div>
        </div>
      ))}
    </div>
  );
}
