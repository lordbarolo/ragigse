import { useState, useEffect } from "react";
import { useSearchParams, Link } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import CompcareLogo from "@/components/CompcareLogo";
import { SEO } from "@/components/SEO";

type Status = "loading" | "valid" | "already" | "invalid" | "confirming" | "done" | "error";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    const validate = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        const data = await res.json();
        if (!res.ok) {
          setStatus("invalid");
        } else if (data.valid === false && data.reason === "already_unsubscribed") {
          setStatus("already");
        } else if (data.valid) {
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus("invalid");
      }
    };
    validate();
  }, [token]);

  const handleConfirm = async () => {
    setStatus("confirming");
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) {
        setStatus("done");
      } else if (data?.reason === "already_unsubscribed") {
        setStatus("already");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <>
    <SEO
      title="Avregistrera utskick – CompCare"
      description="Avregistrera dig från CompCares e-postutskick."
      path="/unsubscribe"
      noindex
    />
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Link to="/">
            <CompcareLogo variant="full" />
          </Link>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            {status === "loading" && (
              <>
                <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground">Verifierar...</p>
              </>
            )}

            {status === "valid" && (
              <>
                <h1 className="text-xl font-semibold text-foreground">Avsluta prenumeration</h1>
                <p className="text-muted-foreground text-sm">
                  Vill du sluta ta emot app-mejl från CompCare? Du kommer fortfarande
                  att kunna använda tjänsten.
                </p>
                <Button onClick={handleConfirm} variant="destructive" className="w-full">
                  Bekräfta avprenumeration
                </Button>
              </>
            )}

            {status === "confirming" && (
              <>
                <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground">Bearbetar...</p>
              </>
            )}

            {status === "done" && (
              <>
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                <h1 className="text-xl font-semibold text-foreground">Avprenumererad</h1>
                <p className="text-muted-foreground text-sm">
                  Du kommer inte längre att ta emot app-mejl från CompCare.
                </p>
              </>
            )}

            {status === "already" && (
              <>
                <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto" />
                <h1 className="text-xl font-semibold text-foreground">Redan avprenumererad</h1>
                <p className="text-muted-foreground text-sm">
                  Din e-post är redan borttagen från mejlutskick.
                </p>
              </>
            )}

            {(status === "invalid" || status === "error") && (
              <>
                <XCircle className="w-12 h-12 text-destructive mx-auto" />
                <h1 className="text-xl font-semibold text-foreground">
                  {status === "invalid" ? "Ogiltig länk" : "Något gick fel"}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {status === "invalid"
                    ? "Länken är ogiltig eller har redan använts."
                    : "Försök igen senare."}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Tillbaka till startsidan
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}
