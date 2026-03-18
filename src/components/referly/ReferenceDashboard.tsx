import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRefProfile } from "@/hooks/useRefProfile";
import { TrustScoreCard } from "./TrustScoreCard";
import { ProfileStatusCard } from "./ProfileStatusCard";
import { ReferenceCard } from "./ReferenceCard";
import { InviteModal } from "./InviteModal";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

export function ReferenceDashboard() {
  const { user } = useAuth();
  const { references, trustScore, profileStatus, loading, refresh } = useRefProfile(user?.id);
  const [inviteOpen, setInviteOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const handleVerifyBankId = () => {
    toast.info("BankID-verifiering kommer snart");
  };

  return (
    <div className="space-y-5">
      {/* Trust Score */}
      {trustScore && (
        <TrustScoreCard total={trustScore.total} tier={trustScore.tier} breakdown={trustScore.breakdown} />
      )}

      {/* Profile Status */}
      {profileStatus && (
        <ProfileStatusCard
          data={profileStatus}
          onRefresh={refresh}
          onInvite={() => setInviteOpen(true)}
          onVerifyBankId={handleVerifyBankId}
        />
      )}

      {/* References list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">
            Referenser ({references.length})
          </h3>
          <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)} className="gap-1.5 text-xs h-8">
            <UserPlus className="h-3.5 w-3.5" />
            Bjud in
          </Button>
        </div>

        {references.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <p>Inga referenser ännu</p>
            <button onClick={() => setInviteOpen(true)} className="text-primary hover:underline text-sm mt-1 inline-block">
              Bjud in din första referensgivare →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {references.map((ref) => (
              <ReferenceCard
                key={ref.id}
                reference={ref}
                goldMonths={profileStatus?.gold_months}
                warnMonths={profileStatus?.warn_months}
              />
            ))}
          </div>
        )}
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
