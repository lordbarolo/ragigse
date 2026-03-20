import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, CheckCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  visible: boolean;
  leadId: string;
  referrerEmail: string;
  region: string;
  onUnlocked: () => void;
  inline?: boolean;
}

export default function ExitIntentReferral({ visible, leadId, referrerEmail, region, onUnlocked, inline = false }: Props) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!visible && !sent) return null;

  const handleSend = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: "Ange en giltig e-postadress", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-referral", {
        body: {
          lead_id: leadId,
          referrer_email: referrerEmail,
          referee_email: email,
          region,
          send_email: true,
        },
      });

      if (error) throw error;

      setSent(true);
      onUnlocked();
      toast({ title: "Tips skickat!" });
    } catch {
      toast({ title: "Något gick fel, försök igen", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (inline) {
    return (
      <div className="space-y-1.5 text-center">
        {!sent ? (
          <>
            <div className="flex items-center justify-center gap-1.5">
              <Gift className="w-4 h-4 text-accent shrink-0" />
              <h3 className="font-display text-xs font-semibold text-foreground leading-tight">
                Smygtitt gratis — tipsa en kollega
              </h3>
            </div>
            <div className="flex gap-1.5">
              <Input
                type="email"
                placeholder="Kollegans e-post"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 h-7 text-xs px-2"
              />
              <Button
                onClick={handleSend}
                disabled={sending || !email}
                variant="outline"
                size="sm"
                className="border-accent text-accent hover:bg-accent/10 shrink-0 text-xs h-7 px-2"
              >
                {sending ? "..." : <><Send className="w-3 h-3 mr-1" />Lås upp</>}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-accent" />
            <span className="text-xs font-semibold text-foreground">Upplåst!</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Card className="card-shadow border-accent/40 overflow-hidden">
        {!sent ? (
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-accent" />
              <h3 className="font-display text-lg text-foreground">
                Vill du ha en smygtitt helt gratis?
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Tipsa en kollega om tjänsten så låser vi upp den första siffran i din rekommenderade ersättning direkt.
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Kollegans e-post"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={sending || !email}
                variant="outline"
                className="border-accent text-accent hover:bg-accent/10 shrink-0"
              >
                {sending ? (
                  "Skickar..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1" />
                    Skicka tips & lås upp
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        ) : (
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-accent" />
              <h3 className="font-display text-base text-foreground">
                Tips skickat!
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Första, tredje, fjärde och femte siffran upplåst. Vill du se hela rapporten och kalkylen? Välj ett alternativ nedan.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
