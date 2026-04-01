import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRefProfile } from "@/hooks/useRefProfile";
import { TrustScoreCard } from "./TrustScoreCard";
import { ReferenceVault } from "./ReferenceVault";
import { InviteModal } from "./InviteModal";
import { ImportVerifyModal } from "./ImportVerifyModal";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, FileUp } from "lucide-react";

export function ReferenceDashboard() {
  const { user } = useAuth();
  const { trustScore, profileStatus, loading, refresh } = useRefProfile(user?.id);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

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

      {/* Valvet — replaces flat reference list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} className="gap-1.5 text-xs h-8">
              <FileUp className="h-3.5 w-3.5" />
              Importera & verifiera
            </Button>
            <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)} className="gap-1.5 text-xs h-8">
              <UserPlus className="h-3.5 w-3.5" />
              Bjud in referensgivare
            </Button>
          </div>
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

      {/* Import & Verify Modal */}
      <ImportVerifyModal
        open={importOpen}
        onOpenChange={setImportOpen}
        userId={user.id}
        onSuccess={refresh}
      />
    </div>
  );
}