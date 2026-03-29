import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRefProfile } from "@/hooks/useRefProfile";
import { TrustScoreCard } from "./TrustScoreCard";
import { ReferenceVault } from "./ReferenceVault";
import { InviteModal } from "./InviteModal";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus } from "lucide-react";

export function ReferenceDashboard() {
  const { user } = useAuth();
  const { trustScore, profileStatus, loading, refresh } = useRefProfile(user?.id);
  const [inviteOpen, setInviteOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;
  return (
    <div className="space-y-5">
      {/* Trust Score */}
      {trustScore && (
        <TrustScoreCard total={trustScore.total} tier={trustScore.tier} breakdown={trustScore.breakdown} />
      )}

      {/* Reference Vault — replaces flat reference list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div />
          <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)} className="gap-1.5 text-xs h-8">
            <UserPlus className="h-3.5 w-3.5" />
            Bjud in referensgivare
          </Button>
        </div>
        <ReferenceVault />
      </div>

      {/* Invite Modal */}
      <InviteModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        userId={user.id}
        onSuccess={refresh}
      />
    </div>
  );
}
