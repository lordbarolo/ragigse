import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, XCircle, ArrowRight } from "lucide-react";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      setStatus("error");
      return;
    }

    const verify = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { session_id: sessionId },
        });

        if (error || !data?.verified) {
          setStatus("error");
          return;
        }

        setStatus("success");
      } catch {
        setStatus("error");
      }
    };

    verify();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="card-shadow max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="w-10 h-10 text-primary mx-auto animate-spin" />
              <h1 className="font-display text-xl text-foreground">Verifierar betalning...</h1>
              <p className="text-sm text-muted-foreground">Vänta medan vi bekräftar din betalning.</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="w-12 h-12 text-accent mx-auto" />
              <h1 className="font-display text-xl text-foreground">Betalning bekräftad!</h1>
              <p className="text-sm text-muted-foreground">
                Tack för ditt köp. Din rapport är nu tillgänglig.
              </p>
              <Button onClick={() => navigate("/rapport")} className="w-full mt-4">
                Visa din rapport
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-12 h-12 text-destructive mx-auto" />
              <h1 className="font-display text-xl text-foreground">Något gick fel</h1>
              <p className="text-sm text-muted-foreground">
                Betalningen kunde inte verifieras. Kontakta oss om du har betalat.
              </p>
              <Button variant="outline" onClick={() => navigate("/resultat")} className="w-full mt-4">
                Tillbaka till resultat
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
