import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useVault } from "@/hooks/useVault";
import { VaultReferenceCard } from "./VaultReferenceCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Vault, Shield, AlertTriangle, Clock } from "lucide-react";
import type { VaultReference } from "@/types/referly";

export function ReferenceVault() {
  const { user } = useAuth();
  const { data, loading, refresh } = useVault(user?.id);
  const [filter, setFilter] = useState<"all" | "attachable" | "stale" | "pending">("all");

  useEffect(() => {
    if (user?.id) refresh();
  }, [user?.id, refresh]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  const { vault, counts } = data;
  const filtered = filter === "all" ? vault : vault.filter(r => r.group === filter);

  return (
    <div className="space-y-4">
      {/* Vault Header */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Vault className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground tracking-tight">Valvet</h3>
        </div>

        {/* Counts row */}
        <div className="grid grid-cols-3 gap-2">
          <CountBlock
            label="Verifierade"
            count={counts.attachable}
            icon={<Shield className="h-3 w-3 text-primary" />}
            active={filter === "attachable"}
            onClick={() => setFilter(f => f === "attachable" ? "all" : "attachable")}
          />
          <CountBlock
            label="Utgångna"
            count={counts.stale}
            icon={<AlertTriangle className="h-3 w-3 text-yellow-600" />}
            active={filter === "stale"}
            onClick={() => setFilter(f => f === "stale" ? "all" : "stale")}
            warn={counts.stale > 0}
          />
          <CountBlock
            label="Väntande"
            count={counts.pending}
            icon={<Clock className="h-3 w-3 text-muted-foreground" />}
            active={filter === "pending"}
            onClick={() => setFilter(f => f === "pending" ? "all" : "pending")}
          />
        </div>
      </div>

      {/* Reference list */}
      {filtered.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            {filter === "all" ? "Inga referenser i valvet" : `Inga ${filter === "attachable" ? "verifierade" : filter === "stale" ? "utgångna" : "väntande"} referenser`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ref) => (
            <VaultReferenceCard key={ref.id} reference={ref} onRefresh={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function CountBlock({ label, count, icon, active, onClick, warn }: {
  label: string; count: number; icon: React.ReactNode; active: boolean; onClick: () => void; warn?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border transition-all text-center
        ${active
          ? "border-primary bg-primary/5"
          : warn
            ? "border-yellow-500/30 bg-yellow-500/5 hover:border-yellow-500/50"
            : "border-border bg-background hover:border-primary/30"
        }`}
    >
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-lg font-semibold text-foreground tabular-nums">{count}</span>
      </div>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
    </button>
  );
}
