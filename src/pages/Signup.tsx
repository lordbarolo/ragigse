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

    trackEvent("signup_completed", { method: "email", role: "individual" });

    supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "welcome",
        recipientEmail: normalizedEmail,
        idempotencyKey: `welcome-${normalizedEmail}`,
      },
    }).catch(() => {});
  };

  if (success) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d0b2a] via-[#1a1545] via-40% to-[#2a2070]" />
        <div className="absolute pointer-events-none" style={{ top: '-100px', right: '-100px', width: '1000px', height: '900px', zIndex: 1, background: 'radial-gradient(ellipse at 75% 10%, rgba(110,95,230,0.55) 0%, rgba(90,78,210,0.25) 25%, rgba(70,60,190,0.08) 50%, transparent 70%)' }} />
        <div className="absolute top-0 right-0 pointer-events-none" style={{ width: '520px', height: '600px', zIndex: 1, background: 'radial-gradient(ellipse at 90% 15%, rgba(140,125,245,0.3) 0%, rgba(110,95,220,0.12) 40%, transparent 65%)' }} />
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 39px,#fff 39px,#fff 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,#fff 39px,#fff 40px)" }} />
        <Card className="relative z-10 w-full max-w-md border-border/50 bg-card/80 backdrop-blur">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-accent mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Bekräfta din e-post</h2>
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Link to="/">
            <CompcareLogo variant="full" />
          </Link>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-semibold text-foreground">Skapa konto</CardTitle>
            <CardDescription>
              Få tillgång till dina rapporter och personlig profil direkt
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Ditt namn</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Förnamn Efternamn"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-post</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="din@email.se"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Lösenord</Label>
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
                Skapa konto
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              Har du redan ett konto?{" "}
              <Link to="/logga-in" className="text-primary hover:underline font-medium">
                Logga in
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Tillbaka till startsidan
          </Link>
        </div>
      </div>
    </div>
  );
}
