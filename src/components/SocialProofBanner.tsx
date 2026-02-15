import { useEffect, useState } from "react";
import { Users } from "lucide-react";

/**
 * Subtle animated social proof banner.
 * Shows a plausible number of people who checked their salary today.
 */
export default function SocialProofBanner({ occupation }: { occupation?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Generate a plausible daily count based on time of day
    const hour = new Date().getHours();
    const base = 18 + Math.floor(hour * 1.8);
    setCount(base + Math.floor(Math.random() * 12));
  }, []);

  if (!count) return null;

  // Simplify occupation to base role name (e.g. "Läkare från grupp B" → "läkare")
  const simplifyRole = (raw?: string): string => {
    if (!raw) return "sjuksköterskor";
    const lower = raw.toLowerCase();
    if (lower.includes("läkare")) return "läkare";
    if (lower.includes("sjukskötersk")) return "sjuksköterskor";
    if (lower.includes("fysioterapeut")) return "fysioterapeuter";
    if (lower.includes("psykolog")) return "psykologer";
    if (lower.includes("arbetsterapeut")) return "arbetsterapeuter";
    if (lower.includes("logoped")) return "logopeder";
    if (lower.includes("dietist")) return "dietister";
    return "personer";
  };

  const role = simplifyRole(occupation);

  return (
    <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-accent/5 border border-accent/15 rounded-lg text-xs text-muted-foreground">
      <Users className="w-3.5 h-3.5 text-accent shrink-0" />
      <span>
        <span className="font-semibold text-foreground">{count}</span> {role} har också kollat sin lön idag
      </span>
    </div>
  );
}
