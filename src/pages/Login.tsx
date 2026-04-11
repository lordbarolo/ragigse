import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import CompcareLogo from "@/components/CompcareLogo";
import { trackEvent } from "@/lib/trackEvent";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    trackEvent("login_clicked", { source: "login_page" });

    const { error, data } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({
        title: "Inloggning misslyckades",
        description: error.message === "Invalid login credentials"
          ? "Fel e-post eller lösenord"
          : error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    toast({ title: "Inloggad!" });

    // Redirect based on role
    const userId = data.user?.id;
    if (userId) {
      const { data: roleData } = await supabase
        .from("ref_user_roles")
        .select("role")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if ((roleData?.role as string) === "agency") {
        navigate("/agency/dashboard");
        return;
      }
    }
    navigate("/profil");
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ title: "Ange din e-postadress först", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/aterstall-losenord`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Något gick fel", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Återställningslänk skickad", description: "Kolla din inbox" });
    }
  };

  const features = [
    { icon: "📊", title: "Marknadsrapport", desc: "Se faktiska ersättningsnivåer för din roll och ort baserat på ramavtalsdata." },
    { icon: "🧾", title: "Fakturakontroll", desc: "Ladda upp din faktura och få en automatisk granskning mot gällande avtal." },
    { icon: "🤖", title: "Löneassistent", desc: "Ställ frågor om din ersättning och få svar baserade på avtalsdata." },
    { icon: "🛡️", title: "Referensvalv", desc: "Samla och dela verifierade referenser med bemanningsföretag." },
    { icon: "📡", title: "Uppdragsprognos", desc: "Bevaka kommande avrop och få notiser innan de publiceras." },
    { icon: "📁", title: "Dokument & Profil", desc: "Lagra legitimationer, intyg och bygg din verifierade konsultprofil." },
  ];

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Background layers matching landing-v2 hero */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d0b2a] via-[#1a1545] via-40% to-[#2a2070]" />
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-100px', right: '-100px',
          width: '1000px', height: '900px',
          zIndex: 1,
          background: 'radial-gradient(ellipse at 75% 10%, rgba(110,95,230,0.55) 0%, rgba(90,78,210,0.25) 25%, rgba(70,60,190,0.08) 50%, transparent 70%)',
        }}
      />
      <div
        className="absolute top-0 right-0 pointer-events-none"
        style={{
          width: '520px', height: '600px',
          zIndex: 1,
          background: 'radial-gradient(ellipse at 90% 15%, rgba(140,125,245,0.3) 0%, rgba(110,95,220,0.12) 40%, transparent 65%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 39px,#fff 39px,#fff 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,#fff 39px,#fff 40px)",
        }}
      />
      <div className="relative z-10 w-full max-w-lg space-y-6">
        <div className="flex justify-center">
          <Link to="/">
            <CompcareLogo variant="full" />
          </Link>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-semibold text-foreground">Logga in</CardTitle>
            <CardDescription>Logga in för att se dina rapporter och profil</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Logga in
              </Button>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Glömt lösenord?
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Har du inget konto?{" "}
              <Link to="/registrera" className="text-primary hover:underline font-medium">
                Skapa konto
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Feature showcase */}
        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg font-semibold text-foreground">Ditt personliga kontrollcenter</CardTitle>
            <CardDescription>Logga in för att få tillgång till alla verktyg</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {features.map((f) => (
                <div key={f.title} className="flex items-start gap-2.5 rounded-lg border border-border/40 bg-muted/30 p-3">
                  <span className="text-xl leading-none mt-0.5">{f.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight">{f.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{f.desc}</p>
                  </div>
                </div>
              ))}
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
