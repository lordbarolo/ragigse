import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, CheckCircle2, User, Building2 } from "lucide-react";
import CompcareLogo from "@/components/CompcareLogo";
import { trackEvent } from "@/lib/trackEvent";

export default function Signup() {
  const selectedRole = "individual";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

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
          role: selectedRole,
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

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    setLoading(false);

    if (loginError) {
      setEmail(normalizedEmail);
      setSuccess(true);
      return;
    }

    trackEvent("signup_completed", { method: "email", role: selectedRole });

    // Send welcome email (fire-and-forget)
    supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "welcome",
        recipientEmail: normalizedEmail,
        idempotencyKey: `welcome-${normalizedEmail}`,
      },
    }).catch(() => {});

    toast({ title: "Konto skapat", description: "Du är nu inloggad." });
    navigate(selectedRole === "agency" ? "/agency/dashboard" : "/profil");
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-accent mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Konto skapat</h2>
            <p className="text-muted-foreground text-sm">
              Ditt konto för <strong className="text-foreground">{email}</strong> är aktivt.
              Ingen verifieringsmejl krävs längre.
            </p>
            <Link to="/logga-in" className="text-primary hover:underline text-sm font-medium">
              Gå till inloggning
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 1: Role selection
  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-6">
          <div className="flex justify-center">
            <Link to="/">
              <CompcareLogo variant="full" />
            </Link>
          </div>

          <Card className="border-border/50 bg-card/80 backdrop-blur">
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-semibold text-foreground">Skapa konto</CardTitle>
              <CardDescription>Välj din roll för att komma igång</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <button
                onClick={() => setSelectedRole("individual")}
                className="w-full p-5 rounded-xl border-2 border-border hover:border-primary/60 bg-card hover:bg-primary/5 transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Jag är konsult</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Hantera dina referenser, se marknadsdata och förhandla ditt arvode.
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedRole("agency")}
                className="w-full p-5 rounded-xl border-2 border-border hover:border-primary/60 bg-card hover:bg-primary/5 transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Jag representerar ett bemanningsföretag</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Skicka representationsförfrågningar, hantera konsulter och verifiera kompetenser.
                    </p>
                  </div>
                </div>
              </button>

              <div className="mt-6 text-center text-sm text-muted-foreground">
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

  // Step 2: Email/password form
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
            <CardTitle className="text-xl font-semibold text-foreground">
              {selectedRole === "agency" ? "Registrera bemanningsföretag" : "Skapa konsultkonto"}
            </CardTitle>
            <CardDescription>
              {selectedRole === "agency"
                ? "Få tillgång till CompCare:s verifieringsinfrastruktur"
                : "Få tillgång till dina rapporter och personlig profil direkt"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">
                  {selectedRole === "agency" ? "Kontaktperson" : "Ditt namn"}
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder={selectedRole === "agency" ? "Anna Svensson" : "Förnamn Efternamn"}
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
                  placeholder={selectedRole === "agency" ? "kontakt@foretag.se" : "din@email.se"}
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

            <button
              type="button"
              onClick={() => setSelectedRole(null)}
              className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              ← Byt roll
            </button>

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
