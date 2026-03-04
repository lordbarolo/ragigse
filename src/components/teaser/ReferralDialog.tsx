import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/trackEvent";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  referrerEmail: string;
  region?: string;
}

export default function ReferralDialog({ open, onOpenChange, leadId, referrerEmail, region }: Props) {
  const [refereeEmail, setRefereeEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!leadId || !refereeEmail) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(refereeEmail)) {
      toast({ title: "Ange en giltig e-postadress", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-referral", {
        body: {
          lead_id: leadId,
          referrer_email: referrerEmail,
          referee_email: refereeEmail,
          region,
          send_email: true,
        },
      });
      if (error) throw error;
      setSent(true);
      trackEvent("referral_sent");
      toast({ title: "E-post skickat till din kollega!" });
    } catch {
      toast({ title: "Något gick fel, försök igen", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tipsa en kollega</DialogTitle>
          <DialogDescription>
            Ange din kollegas e-postadress. När hen klickar på länken låser vi upp en gratis lightrapport åt dig.
          </DialogDescription>
        </DialogHeader>

        {!sent ? (
          <div className="space-y-4">
            <Input
              type="email"
              placeholder="kollegans@email.se"
              value={refereeEmail}
              onChange={(e) => setRefereeEmail(e.target.value)}
            />
            <Button
              onClick={handleSend}
              disabled={sending || !refereeEmail}
              className="w-full"
            >
              {sending ? "Skickar..." : "Skicka tips via e-post"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-accent shrink-0" />
              <p className="text-sm text-foreground font-medium">E-post skickat!</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Din kollega har fått ett mejl med en länk till CompCare. När hen gör en ersättningskoll låses en lightrapport upp åt dig.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
