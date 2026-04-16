import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import CompcareLogo from "@/components/CompcareLogo";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [pendingRecovery, setPendingRecovery] = useState<null | {
    kind: "code" | "token_hash";
    value: string;
  }>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let active = true;

    const finish = (isReady: boolean) => {
      if (!active) return;
      setReady(isReady);
      setChecking(false);
    };

    const clearRecoveryParams = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("token_hash");
      url.searchParams.delete("type");
      url.searchParams.delete("code");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    };

    const initializeRecovery = async () => {
      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        clearRecoveryParams();
        finish(true);
        return;
      }

      if (hashParams.get("type") === "recovery") {
        finish(true);
        return;
      }

      const code = url.searchParams.get("code");
      if (code) {
        setPendingRecovery({ kind: "code", value: code });
        finish(false);
        return;
      }

      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");
      if (tokenHash && type === "recovery") {
        setPendingRecovery({ kind: "token_hash", value: tokenHash });
        finish(false);
        return;
      }

      finish(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && !!session)) {
        setPendingRecovery(null);
        setReady(true);
        setChecking(false);
      }
    });

    void initializeRecovery();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleStartRecovery = async () => {
    if (!pendingRecovery) return;

    setVerifying(true);

    const { error } = pendingRecovery.kind === "code"
      ? await supabase.auth.exchangeCodeForSession(pendingRecovery.value)
      : await supabase.auth.verifyOtp({
          token_hash: pendingRecovery.value,
          type: "recovery",
        });

    setVerifying(false);

    if (error) {
      const url = new URL(window.location.href);
      url.searchParams.delete("token_hash");
      url.searchParams.delete("type");
      url.searchParams.delete("code");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      setPendingRecovery(null);
      toast({ title: "Återställningslänken är ogiltig", description: error.message, variant: "destructive" });
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("token_hash");
    url.searchParams.delete("type");
    url.searchParams.delete("code");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    setPendingRecovery(null);
    setReady(true);
    setChecking(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Lösenordet måste vara minst 6 tecken", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ title: "Något gick fel", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Lösenord uppdaterat!" });
      navigate("/profil");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Link to="/"><CompcareLogo variant="full" /></Link>
        </div>
        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-semibold text-foreground">Nytt lösenord</CardTitle>
          </CardHeader>
          <CardContent>
            {checking ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : ready ? (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nytt lösenord</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minst 6 tecken"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Uppdatera lösenord
                </Button>
              </form>
            ) : pendingRecovery ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Bekräfta återställningen för att välja ett nytt lösenord.
                </p>
                <Button type="button" className="w-full" onClick={handleStartRecovery} disabled={verifying}>
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Fortsätt
                </Button>
              </div>
            ) : (
              <p className="text-center text-muted-foreground text-sm">
                Ogiltigt eller utgånget återställningslänk.{" "}
                <Link to="/logga-in" className="text-primary hover:underline">Logga in</Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
