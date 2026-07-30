import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2 } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";

export default function ReferralLanding() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    const confirm = async () => {
      const { error } = await supabase.functions.invoke("confirm-referral", {
        body: { token },
      });

      if (error) {
        setStatus("error");
      } else {
        setStatus("success");
        trackEvent("referral_confirmed", { token: token || "" });
      }
    };

    confirm();
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="card-shadow max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="w-10 h-10 text-primary mx-auto animate-spin" />
              <p className="text-muted-foreground">Bekräftar din referens...</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle className="w-12 h-12 text-accent mx-auto" />
              <h1 className="text-xl font-display text-foreground">Tack!</h1>
              <p className="text-muted-foreground text-sm">
                Din kollegas rapport har låsts upp. Vill du också se vad du borde tjäna?
              </p>
              <button
                onClick={() => navigate("/")}
                className="mt-4 w-full py-3 rounded-xl font-semibold hero-gradient text-primary-foreground"
              >
                Gör din egen ersättningsanalys
              </button>
            </>
          )}
          {status === "error" && (
            <>
              <p className="text-destructive font-semibold">Ogiltig eller utgången länk</p>
              <button
                onClick={() => navigate("/")}
                className="mt-4 w-full py-3 rounded-xl font-semibold hero-gradient text-primary-foreground"
              >
                Gör en ersättningsanalys
              </button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
