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
import { CheckCircle, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/trackEvent";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  referrerEmail: string;
}

export default function ReferralDialog({ open, onOpenChange, leadId, referrerEmail }: Props) {
  const [refereeEmail, setRefereeEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [referralLink, setReferralLink] = useState<string | null>(null);

  const handleSend = async () => {
    if (!leadId || !refereeEmail) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(refereeEmail)) {
      toast({ title: "Ange en giltig e-postadress", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-referral", {
        body: {
          lead_id: leadId,
          referrer_email: referrerEmail,
          referee_email: refereeEmail,
        },
      });
      if (error) throw error;
      setReferralLink(data.confirm_link);
      trackEvent("referral_sent");
      toast({ title: "Länk skapad! När din kollega klickar på den låses en lightrapport upp för dig." });
    } catch {
      toast({ title: "Något gick fel, försök igen", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const copyLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      toast({ title: "Länk kopierad!" });
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

        {!referralLink ? (
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
              {sending ? "Skickar..." : "Skapa referenslänk"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-accent shrink-0" />
              <p className="text-sm text-foreground font-medium">Länken är redo!</p>
            </div>
            <div className="flex gap-2">
              <Input value={referralLink} readOnly className="text-xs" />
              <Button variant="outline" size="icon" onClick={copyLink}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Skicka länken till din kollega. När hen klickar på den låses en lightrapport upp åt dig.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
