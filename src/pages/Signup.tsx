import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import CompcareLogo from "@/components/CompcareLogo";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Lösenordet måste vara minst 6 tecken", variant: "destructive" });
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });

    setLoading(false);
    if (error) {
      toast({ title: "Registrering misslyckades", description: error.message, variant: "destructive" });
      return;
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-accent mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Kolla din inbox!</h2>
            <p className="text-muted-foreground text-sm">
              Vi har skickat en verifieringslänk till <strong className="text-foreground">{email}</strong>.
              Klicka på länken för att aktivera ditt konto.
            </p>
            <Link to="/logga-in" className="text-primary hover:underline text-sm font-medium">
              Tillbaka till inloggning
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
            <CardDescription>Få tillgång till dina rapporter och personlig profil</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
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
