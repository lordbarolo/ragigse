import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, CheckCircle, Copy, Link as LinkIcon } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!visible && !link) return null;

  const generateAndCopy = async () => {
    if (link) {
      navigator.clipboard.writeText(link);
      setCopied(true);
      toast({ title: "Länk kopierad!" });
      setTimeout(() => setCopied(false), 2000);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-referral", {
        body: {
          lead_id: leadId,
          referrer_email: referrerEmail,
          referee_email: referrerEmail,
          region,
        },
      });
      if (error) throw error;
      setLink(data.confirm_link);
      navigator.clipboard.writeText(data.confirm_link);
      setCopied(true);
      onUnlocked();
      toast({ title: "Länk kopierad! Dela den med en kollega." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Något gick fel, försök igen", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (inline) {
    return (
      <div className="space-y-1.5 text-center">
        {!link ? (
          <>
            <div className="flex items-center justify-center gap-1.5">
              <Gift className="w-4 h-4 text-accent shrink-0" />
              <h3 className="font-display text-xs font-semibold text-foreground leading-tight">
                Smygtitt gratis — dela med en kollega
              </h3>
            </div>
            <Button
              onClick={generateAndCopy}
              disabled={loading}
              variant="outline"
              size="sm"
              className="border-accent text-accent hover:bg-accent/10 text-xs h-7 px-3"
            >
              {loading ? "..." : <><Copy className="w-3 h-3 mr-1" />Kopiera länk & lås upp</>}
            </Button>
          </>
        ) : (
          <div className="flex items-center justify-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-accent" />
            <span className="text-xs font-semibold text-foreground">
              {copied ? "Kopierad!" : "Upplåst!"}
            </span>
            <Button
              onClick={generateAndCopy}
              variant="ghost"
              size="sm"
              className="text-xs h-6 px-2 text-accent"
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Card className="card-shadow border-accent/40 overflow-hidden">
        {!link ? (
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-accent" />
              <h3 className="font-display text-lg text-foreground">
                Vill du ha en smygtitt helt gratis?
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Dela en länk med en kollega så låser vi upp den första siffran i din rekommenderade lön direkt.
            </p>
            <Button
              onClick={generateAndCopy}
              disabled={loading}
              variant="outline"
              className="w-full border-accent text-accent hover:bg-accent/10"
            >
              {loading ? "Skapar länk..." : <><Copy className="w-4 h-4 mr-2" />Kopiera länk & lås upp</>}
            </Button>
          </CardContent>
        ) : (
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-accent" />
              <h3 className="font-display text-base text-foreground">
                Länk kopierad!
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Dela länken med en kollega. Första siffrorna i din rapport är nu upplåsta.
            </p>
            <Button
              onClick={generateAndCopy}
              variant="ghost"
              size="sm"
              className="text-accent"
            >
              <Copy className="w-4 h-4 mr-1" /> Kopiera igen
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
