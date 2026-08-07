import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link, useLocation } from "@/lib/router-compat";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, FileText, Clock, TrendingUp, MessageSquare, Link2, MailCheck, AlertTriangle, Sparkles } from "lucide-react";
import CompcareLogo from "@/components/CompcareLogo";
import { trackEvent } from "@/lib/trackEvent";
import posthog from "@/lib/posthog";
import { getAuthIntentCopy, sanitizeRedirect } from "@/lib/authIntent";
import { translateAuthError } from "@/lib/authErrors";
import { isOAuthReturn } from "@/lib/oauthReturn";

type RecoveryStatus = "idle" | "sending" | "sent" | "error";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<RecoveryStatus>("idle");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();

  const { redirectTo, intentCopy, signupHref } = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const redirectTo = sanitizeRedirect(params.get("redirect"));
    const intent = params.get("intent");
    const intentCopy = getAuthIntentCopy(intent);
    const signupParams = new URLSearchParams();
    if (redirectTo) signupParams.set("redirect", redirectTo);
    if (intent) signupParams.set("intent", intent);
    const signupHref = signupParams.toString()
      ? `/registrera?${signupParams.toString()}`
      : "/registrera";
    return { redirectTo, intentCopy, signupHref };
  }, [location.search]);



  const continueAfterAuth = async (user: { id: string; email?: string | null }) => {
    // Determine role
    let userRole: string = "individual";
    const { data: roleData } = await supabase
      .from("ref_user_roles")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (roleData?.role) userRole = roleData.role as string;

    try {
      posthog.identify(user.id, { email: user.email, role: userRole });
    } catch {}

    trackEvent("login_succeeded", { role: userRole });

    if (userRole === "agency") {
      navigate(redirectTo ?? "/agency/dashboard");
      return;
    }
    navigate(redirectTo ? `/onboarding?redirect=${encodeURIComponent(redirectTo)}` : "/onboarding");
  };

  // Auto-fortsätt ENDAST vid retur från Google OAuth. En kvarliggande session
  // ska inte skicka bort någon som medvetet öppnar inloggningsformuläret.
  useEffect(() => {
    let cancelled = false;
    if (isOAuthReturn()) {
      void (async () => {
        const { data } = await supabase.auth.getSession();
        if (!cancelled && data.session?.user) {
          await continueAfterAuth(data.session.user);
        }
      })();
    }
    // Popup-flödet (preview) sätter sessionen utan omdirigering.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user && !cancelled) {
        void continueAfterAuth(session.user);
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        description: translateAuthError(error),
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    toast({ title: "Inloggad!" });

    if (data.user) await continueAfterAuth(data.user);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ title: "Ange din e-postadress först", variant: "destructive" });
      return;
    }
    setRecoveryStatus("sending");
    setRecoveryError(null);
    setRecoveryEmail(email);
    try {
      const { error } = await supabase.functions.invoke("send-password-recovery", {
        body: { email },
      });
      // Always show "sent" on a successful request — backend tystar `user_not_found`
      // för att inte avslöja om e-posten finns.
      if (error) {
        setRecoveryStatus("error");
        setRecoveryError("Tjänsten är tillfälligt otillgänglig. Försök igen om en stund.");
        return;
      }
      setRecoveryStatus("sent");
    } catch (err) {
      setRecoveryStatus("error");
      setRecoveryError(err instanceof Error ? err.message : "Nätverksfel. Försök igen.");
    }
  };

  const resetRecovery = () => {
    setRecoveryStatus("idle");
    setRecoveryError(null);
  };



  const features = [
    { icon: FileText, title: "Dokumentvalvet", desc: "Säker lagring av legitimationer, specialistbevis och tjänstgöringsintyg. Dela tillgång till en miljö du kontrollerar istället för att sprida filer via mail.", badge: "Ingår gratis", badgeColor: "text-green-700 bg-green-100" },
    { icon: Clock, title: "Referensplattformen", desc: "Enu styr vem som får tillgång och när. Uppgifter verifieras med Bank-ID istället för återkommande intervjuer.", badge: "Ingår gratis", badgeColor: "text-green-700 bg-green-100" },
    { icon: TrendingUp, title: "Ersättningsanalys - Se aktuella arvoden", desc: "Förhandlingstips baserat på din specialitet, region och erfarenhet.", badge: "Insight — 149 kr/mån", badgeColor: "text-amber-700 bg-amber-100" },
    { icon: MessageSquare, title: "Fakturagranskning", desc: "Automatiserad revision av fakturor du skickat senaste 2 åren. Hittar vi inget, betalar du inget.", badge: "Prestationsbaserat", badgeColor: "text-purple-700 bg-purple-100" },
    { icon: Link2, title: "Uppdragsprognos", desc: "Öka chansen att få uppdraget du verkligen vill ha. AI ger oss träffsäkra prognoser om kommande behov baserat på 5 års historik och över 30 000 bemanningsuppdrag.", badge: "Beta", badgeColor: "text-slate-600 bg-slate-100" },
  ];

  return (
    <>
    <div
      className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden"
      style={{
        backgroundColor: "#0b0c10",
        backgroundImage: [
          "radial-gradient(ellipse 70% 55% at 15% 25%, hsl(196 100% 50% / 0.18) 0%, transparent 55%)",
          "radial-gradient(ellipse 55% 50% at 85% 20%, hsl(245 58% 60% / 0.14) 0%, transparent 50%)",
          "radial-gradient(ellipse 50% 60% at 55% 85%, hsl(160 60% 45% / 0.10) 0%, transparent 50%)",
        ].join(", "),
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="relative z-10 w-full max-w-lg space-y-6">
        <div className="flex justify-center">
          <Link to="/">
            <CompcareLogo variant="full" inverted={false} />
          </Link>
        </div>


        <Card className="border-border/40 !bg-[#121319]/85 backdrop-blur text-white">
          {recoveryStatus === "sent" || recoveryStatus === "error" ? (
            <CardContent className="!bg-transparent pt-8 pb-8">
              {recoveryStatus === "sent" ? (
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
                    <MailCheck className="w-6 h-6 text-emerald-700" aria-hidden="true" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Återställningslänk skickad</h2>
                  <p className="text-sm text-white/70">
                    Om <strong className="text-white">{recoveryEmail}</strong> finns hos oss har vi skickat en
                    återställningslänk dit. Kolla även skräpposten.
                  </p>
                  <p className="text-xs text-white/50">
                    Av säkerhetsskäl bekräftar vi inte om e-postadressen är registrerad.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="text-sm font-semibold px-6 py-3"
                      onClick={handleForgotPassword}
                    >
                      Skicka igen
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-sm font-semibold px-6 py-3"
                      onClick={resetRecovery}
                    >
                      Tillbaka till inloggning
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4" role="alert">
                  <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-amber-700" aria-hidden="true" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Vi kunde inte skicka länken</h2>
                  <p className="text-sm text-white/70">
                    {recoveryError ?? "Tjänsten är tillfälligt otillgänglig."} Försök igen om en stund.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="text-sm font-semibold px-6 py-3"
                      onClick={handleForgotPassword}
                    >
                      Försök igen
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-sm font-semibold px-6 py-3"
                      onClick={resetRecovery}
                    >
                      Tillbaka till inloggning
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          ) : (
            <>
              <CardHeader className="text-center !bg-transparent space-y-2">
                {intentCopy && (
                  <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-[#22232b]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#22232b]">
                    <Sparkles className="w-3 h-3" aria-hidden="true" />
                    {intentCopy.eyebrow}
                  </div>
                )}
                <CardTitle className="text-xl font-semibold text-white">
                  {intentCopy?.title ?? "Logga in"}
                </CardTitle>
                <CardDescription className="text-white/70">
                  {intentCopy?.description ?? "Ta del av rapporter och smarta verktyg"}
                </CardDescription>
              </CardHeader>

              <CardContent className="!bg-transparent">
                <GoogleAuthButton label="Logga in med Google" source="login_page" />

                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-white/10" />
                  <span className="text-xs text-white/50">eller</span>
                  <span className="h-px flex-1 bg-white/10" />
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white">E-post</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="din@email.se"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-white/[0.04] text-white border-border placeholder:text-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white">Lösenord</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-white/[0.04] text-white border-border placeholder:text-white/50"
                    />
                  </div>
                  <Button type="submit" variant="secondary" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Logga in
                  </Button>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={recoveryStatus === "sending"}
                    className="w-full text-sm text-white/70 hover:text-white transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
                  >
                    {recoveryStatus === "sending" ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" /> Skickar återställningslänk…
                      </>
                    ) : (
                      "Glömt lösenord?"
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center text-sm text-white/70">
                  Har du inget konto?{" "}
                  <Link to={signupHref} className="text-white hover:underline font-medium">
                    Skapa konto
                  </Link>
                </div>
              </CardContent>
            </>
          )}
        </Card>


        <div className="text-center">
          <Link to="/" className="text-sm text-white/70 hover:text-white inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Tillbaka till startsidan
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}
