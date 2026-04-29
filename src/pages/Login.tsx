import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, FileText, Clock, TrendingUp, MessageSquare, Link2 } from "lucide-react";
import CompcareLogo from "@/components/CompcareLogo";
import { trackEvent } from "@/lib/trackEvent";
import posthog from "@/lib/posthog";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error, data } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      trackEvent("login_failed", {
        error_code: error.message.includes("Invalid") ? "invalid_credentials" : "other",
      });
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

    // Determine role
    const userId = data.user?.id;
    let userRole: string = "individual";
    if (userId) {
      const { data: roleData } = await supabase
        .from("ref_user_roles")
        .select("role")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      if (roleData?.role) userRole = roleData.role as string;
    }

    try {
      if (data.user) {
        posthog.identify(data.user.id, {
          email: data.user.email,
          role: userRole,
        });
      }
    } catch {}

    trackEvent("login_succeeded", { role: userRole });

    if (userRole === "agency") {
      navigate("/agency/dashboard");
      return;
    }
    navigate("/profil");
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ title: "Ange din e-postadress först", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.functions.invoke("send-password-recovery", {
      body: { email },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Något gick fel", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Om kontot finns har en återställningslänk skickats", description: "Kolla din inbox" });
    }
  };

  const features = [
    { icon: FileText, title: "Dokumentvalvet", desc: "Säker lagring av legitimationer, specialistbevis och tjänstgöringsintyg. Dela tillgång till en miljö du kontrollerar istället för att sprida filer via mail.", badge: "Ingår gratis", badgeColor: "text-green-700 bg-green-100" },
    { icon: Clock, title: "Referensplattformen", desc: "Enu styr vem som får tillgång och när. Uppgifter verifieras med Bank-ID istället för återkommande intervjuer.", badge: "Ingår gratis", badgeColor: "text-green-700 bg-green-100" },
    { icon: TrendingUp, title: "Ersättningsanalys - Se aktuella arvoden", desc: "Förhandlingstips baserat på din specialitet, region och erfarenhet.", badge: "Insight — 149 kr/mån", badgeColor: "text-amber-700 bg-amber-100" },
    { icon: MessageSquare, title: "Fakturagranskning", desc: "Automatiserad revision av fakturor du skickat senaste 2 åren. Hittar vi inget, betalar du inget.", badge: "Prestationsbaserat", badgeColor: "text-purple-700 bg-purple-100" },
    { icon: Link2, title: "Uppdragsprognos", desc: "Öka chansen att få uppdraget du verkligen vill ha. AI ger oss träffsäkra prognoser om kommande behov baserat på 5 års historik och över 30 000 bemanningsuppdrag.", badge: "Beta", badgeColor: "text-slate-600 bg-slate-100" },
  ];

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Deep Space-bakgrund — matchar landningssidan */}
      <div className="absolute inset-0 bg-[#0D001A]" />
      {/* Spotlight — violett glow uppe till höger */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-100px', right: '-100px',
          width: '1000px', height: '900px',
          zIndex: 1,
          background: 'radial-gradient(ellipse at 75% 10%, hsl(256 100% 67% / 0.45) 0%, hsl(256 100% 67% / 0.18) 25%, hsl(256 100% 67% / 0.05) 50%, transparent 70%)',
        }}
      />
      {/* Sekundär glow — hot pink, nere till vänster */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-150px', left: '-150px',
          width: '700px', height: '700px',
          zIndex: 1,
          background: 'radial-gradient(ellipse at 20% 80%, hsl(320 95% 65% / 0.18) 0%, hsl(320 95% 65% / 0.06) 40%, transparent 65%)',
        }}
      />
      <div className="relative z-10 w-full max-w-lg space-y-6">
        <div className="flex justify-center">
          <Link to="/">
            <CompcareLogo variant="full" inverted />
          </Link>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-semibold text-foreground">Logga in</CardTitle>
            <CardDescription>Ta del av rapporter och smarta verktyg</CardDescription>
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

        <div className="text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Tillbaka till startsidan
          </Link>
        </div>
      </div>
    </div>
  );
}
