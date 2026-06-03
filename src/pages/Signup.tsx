import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import CompcareLogo from "@/components/CompcareLogo";
import { trackEvent } from "@/lib/trackEvent";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ title: "Lösenordet måste vara minst 6 tecken", variant: "destructive" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          role: "individual",
          full_name: fullName.trim(),
        },
      },
    });

    if (error) {
      const errorMessage = error.message.toLowerCase();
      const accountExists =
        errorMessage.includes("already registered") ||
        errorMessage.includes("already been registered") ||
        errorMessage.includes("user already registered");

      setLoading(false);

      if (accountExists) {
        toast({
          title: "Kontot finns redan",
          description: "Logga in med din e-post och ditt lösenord istället.",
          variant: "destructive",
        });
        navigate("/logga-in");
        return;
      }

      toast({ title: "Registrering misslyckades", description: error.message, variant: "destructive" });
      return;
    }

    setLoading(false);
    setEmail(normalizedEmail);
    setSuccess(true);

    // Intent event — user submitted signup form successfully.
    // Note: account is NOT yet active. Real activation fires `signup_confirmed`
    // from initAuthIdentitySync once the user clicks the email link.
    trackEvent("signup_initiated", { method: "email", role: "individual" });

    supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "welcome",
        recipientEmail: normalizedEmail,
        idempotencyKey: `welcome-${normalizedEmail}`,
      },
    }).catch(() => {});
  };

  const beigeBg = {
    backgroundColor: "#EEEBE4",
    backgroundImage: [
      "radial-gradient(ellipse 70% 55% at 15% 25%, hsl(196 100% 50% / 0.18) 0%, transparent 55%)",
      "radial-gradient(ellipse 55% 50% at 85% 20%, hsl(245 58% 60% / 0.14) 0%, transparent 50%)",
      "radial-gradient(ellipse 50% 60% at 55% 85%, hsl(160 60% 45% / 0.10) 0%, transparent 50%)",
    ].join(", "),
    backgroundRepeat: "no-repeat" as const,
  };

  if (success) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden" style={beigeBg}>
        <Card className="relative z-10 w-full max-w-md border-border/40 !bg-[#F5F2EA]/85 backdrop-blur text-foreground">
          <CardContent className="!bg-transparent pt-8 pb-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-accent mx-auto" />
            <h1 className="text-xl font-semibold text-foreground">Bekräfta din e-post</h1>
            <p className="text-muted-foreground text-sm">
              Vi har skickat ett verifieringsmejl till <strong className="text-foreground">{email}</strong>.
              Klicka på länken i mejlet för att aktivera ditt konto.
            </p>
            <p className="text-muted-foreground text-xs">
              Hittar du inte mejlet? Kolla skräpposten.
            </p>
            <Link to="/logga-in" className="text-primary hover:underline text-sm font-medium">
              Gå till inloggning
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden" style={beigeBg}>
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Link to="/">
            <CompcareLogo variant="full" inverted={false} />
          </Link>
        </div>


        <Card className="border-border/40 !bg-[#F5F2EA]/85 backdrop-blur text-black">
          <CardHeader className="text-center !bg-transparent">
            <CardTitle className="text-xl font-semibold text-black">Skapa konto</CardTitle>
            <CardDescription className="text-black/70">
              Få tillgång till dina rapporter och personlig profil direkt
            </CardDescription>
          </CardHeader>
          <CardContent className="!bg-transparent">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-black">Ditt namn</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Förnamn Efternamn"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="bg-white/70 text-black border-border placeholder:text-black/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-black">E-post</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="din@email.se"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/70 text-black border-border placeholder:text-black/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-black">Lösenord</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minst 6 tecken"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-white/70 text-black border-border placeholder:text-black/50"
                />
              </div>
              <Button type="submit" variant="secondary" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Skapa konto
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-black/70">
              Har du redan ett konto?{" "}
              <Link to="/logga-in" className="text-black hover:underline font-medium">
                Logga in
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link to="/" className="text-sm text-black/70 hover:text-black inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Tillbaka till startsidan
          </Link>
        </div>
      </div>
    </div>
  );
}
