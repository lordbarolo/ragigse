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
import { Copy, CheckCircle, Link as LinkIcon } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateLink = async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-referral", {
        body: {
          lead_id: leadId,
          referrer_email: referrerEmail,
          referee_email: referrerEmail, // placeholder, not used for email
        },
      });
      if (error) throw error;
      setReferralLink(data.confirm_link);
      trackEvent("referral_link_created");
    } catch {
      toast({ title: "Kunde inte skapa länk, försök igen", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({ title: "Länk kopierad!" });
      trackEvent("referral_link_copied");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Generate link automatically when dialog opens
  if (open && !referralLink && !loading) {
    generateLink();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) { setReferralLink(null); setCopied(false); }
      onOpenChange(v);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dela med en kollega</DialogTitle>
          <DialogDescription>
            Kopiera länken och skicka till en kollega. När hen klickar på den låser vi upp en gratis lightrapport åt dig.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            Skapar din länk…
          </div>
        ) : referralLink ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input value={referralLink} readOnly className="text-xs" />
              <Button variant="outline" size="icon" onClick={copyLink}>
                {copied ? <CheckCircle className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Dela länken via SMS, mejl eller valfri kanal. När din kollega klickar på den låses en lightrapport upp åt dig.
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
