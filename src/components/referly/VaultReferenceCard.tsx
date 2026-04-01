import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ShieldCheck, ShieldAlert, RefreshCw, Paperclip, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { VaultReference } from "@/types/referly";

interface VaultReferenceCardProps {
  reference: VaultReference;
  onRefresh: () => void;
}

const VERIFICATION_CONFIG: Record<string, { label: string; icon: React.ReactNode; badgeClass: string }> = {
  submitted: {
    label: "Inskickad",
    icon: <Clock className="h-3 w-3" />,
    badgeClass: "bg-muted text-muted-foreground border-0 text-[10px]",
  },
  email: {
    label: "E-post",
    icon: <Shield className="h-3 w-3" />,
    badgeClass: "bg-blue-500/10 text-blue-600 border-0 text-[10px]",
  },
  domain: {
    label: "Domän",
    icon: <ShieldCheck className="h-3 w-3" />,
    badgeClass: "bg-primary/10 text-primary border-0 text-[10px]",
  },
  bankid: {
    label: "BankID",
    icon: <ShieldCheck className="h-3 w-3" />,
    badgeClass: "bg-emerald-500/10 text-emerald-600 border-0 text-[10px]",
  },
  ping_confirmed: {
    label: "Bekräftad",
    icon: <ShieldCheck className="h-3 w-3" />,
    badgeClass: "bg-emerald-500/10 text-emerald-600 border-0 text-[10px]",
  },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("sv-SE", { year: "numeric", month: "short", day: "numeric" });
}

export function VaultReferenceCard({ reference, onRefresh }: VaultReferenceCardProps) {
  const config = VERIFICATION_CONFIG[reference.verification_level] || VERIFICATION_CONFIG.submitted;
  const isPending = reference.group === "pending";
  const isStale = reference.group === "stale";
  const isAttachable = reference.group === "attachable";

  const handlePingRefresh = async () => {
    try {
      const { error } = await supabase.rpc("ref_create_ping", {
        _reference_id: reference.id,
        _requester_name: "Förnyelse",
      });
      if (error) throw error;
      toast.success("Förnyelse-förfrågan skickad");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Kunde inte skicka förfrågan");
    }
  };

  return (
    <div className={`bg-card rounded-xl border p-4 transition-all ${
      isStale
        ? "border-yellow-500/30 bg-yellow-500/[0.02]"
        : isAttachable
          ? "border-primary/20"
          : "border-border"
    }`}>
      {/* Header row */}
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">
            {reference.giver_name || reference.giver_email}
          </p>
          <p className="text-xs text-muted-foreground">
            {reference.relationship} · {reference.workplace}
          </p>
        </div>
        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
          <Badge className={config.badgeClass}>
            <span className="flex items-center gap-1">
              {config.icon}
              {config.label}
            </span>
          </Badge>
        </div>
      </div>

      {/* Data row */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
        <span>{reference.period_start}–{reference.period_end || "pågående"}</span>
        {reference.last_confirmed_at && (
          <span>Bekräftad {formatDate(reference.last_confirmed_at)}</span>
        )}
        {reference.days_until_expiry !== null && reference.days_until_expiry > 0 && isAttachable && (
          <span className="text-primary/70">{reference.days_until_expiry} dagar kvar</span>
        )}
      </div>

      {/* Competencies */}
      {reference.competencies && reference.competencies.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {(reference.competencies as string[]).slice(0, 4).map((c, i) => (
            <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
              {c}
            </span>
          ))}
          {(reference.competencies as string[]).length > 4 && (
            <span className="text-[10px] text-muted-foreground">+{(reference.competencies as string[]).length - 4}</span>
          )}
        </div>
      )}

      {/* Score dots */}
      {reference.recommendation_score && isAttachable && (
        <div className="flex items-center gap-0.5 mb-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={`text-xs ${i <= reference.recommendation_score! ? "text-primary" : "text-muted-foreground/20"}`}>●</span>
          ))}
        </div>
      )}

      {/* Status bar */}
      {isStale && (
        <div className="flex items-center justify-between bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-yellow-600" />
            <span className="text-xs text-yellow-700 font-medium">Utgången — kan inte bifogas</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 border-yellow-500/40 text-yellow-700 hover:bg-yellow-500/10"
            onClick={handlePingRefresh}
          >
            <RefreshCw className="h-3 w-3" />
            Förnya
          </Button>
        </div>
      )}

      {isPending && (
        <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-3 py-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Inväntar svar från referensgivare</span>
        </div>
      )}

      {isAttachable && (
        <div className="flex items-center gap-1.5 text-[11px] text-primary/70">
          <Paperclip className="h-3 w-3" />
          <span>Redo att bifogas</span>
        </div>
      )}
    </div>
  );
}
