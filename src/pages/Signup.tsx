import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import CompcareLogo from "@/components/CompcareLogo";
import { trackEvent } from "@/lib/trackEvent";
import { getSignupIntentCopy, sanitizeRedirect } from "@/lib/authIntent";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import { translateAuthError } from "@/lib/authErrors";
import { isOAuthReturn } from "@/lib/oauthReturn";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();

  const { intentCopy, loginHref, redirectTo } = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const redirectTo = sanitizeRedirect(params.get("redirect"));
    const intent = params.get("intent");
    const intentCopy = getSignupIntentCopy(intent);
    const loginParams = new URLSearchParams();
    if (redirectTo) loginParams.set("redirect", redirectTo);
    if (intent) loginParams.set("intent", intent);
    const loginHref = loginParams.toString()
      ? `/logga-in?${loginParams.toString()}`
      : "/logga-in";
    return { intentCopy, loginHref, redirectTo };
  }, [location.search]);


  const goAfterAuth = () => {
    navigate(redirectTo ? `/onboarding?redirect=${encodeURIComponent(redirectTo)}` : "/onboarding");
  };

  // Returning from Google OAuth lands back on this page with a session set.
  useEffect(() => {
    let cancelled = false;
    if (isOAuthReturn()) {
      void (async () => {
        const { data } = await supabase.auth.getSession();
        if (!cancelled && data.session?.user) goAfterAuth();
      })();
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user && !cancelled) goAfterAuth();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        emailRedirectTo: `${window.location.origin}/consultant/profil`,
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
        navigate(loginHref);
        return;
      }

      toast({ title: "Registrering misslyckades", description: translateAuthError(error), variant: "destructive" });
      return;
    }

    setLoading(false);
    setEmail(normalizedEmail);
    setSuccess(true);

    // Intent event — user submitted signup form successfully.
    // Note: account is NOT yet active. Real activation fires `signup_confirmed`
    // from initAuthIdentitySync once the user clicks the email link.
    trackEvent("signup_initiated", { method: "email", role: "individual" });

    // Bekräftelsemailet skickas via vår egen Resend-route (Supabase egna
    // auth-mail går inte iväg utan verifierad Lovable-domän).
    fetch("/api/public/send-signup-confirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: normalizedEmail,
        redirectTo: `${window.location.origin}/consultant/profil`,
      }),
    }).catch(() => {});

    supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "welcome",
        recipientEmail: normalizedEmail,
        idempotencyKey: `welcome-${normalizedEmail}`,
      },
    }).catch(() => {});
  };

  const beigeBg = {
    backgroundColor: "#0b0c10",
    backgroundImage: [
      "radial-gradient(ellipse 70% 55% at 15% 25%, hsl(196 100% 50% / 0.18) 0%, transparent 55%)",
      "radial-gradient(ellipse 55% 50% at 85% 20%, hsl(245 58% 60% / 0.14) 0%, transparent 50%)",
      "radial-gradient(ellipse 50% 60% at 55% 85%, hsl(160 60% 45% / 0.10) 0%, transparent 50%)",
    ].join(", "),
    backgroundRepeat: "no-repeat" as const,
  };

  if (success) {
    return (
      <>
      <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden" style={beigeBg}>
        <Card className="relative z-10 w-full max-w-md border-border/40 !bg-[#121319]/95 backdrop-blur">
          <CardContent className="!bg-transparent pt-10 pb-8 px-6 text-center space-y-5">
            <CheckCircle2 className="w-12 h-12 mx-auto" style={{ color: "#1f1147" }} />
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#1f1147" }}>
              Bekräfta din e-post
            </h1>
            <div className="space-y-3">
              <p className="text-sm leading-relaxed" style={{ color: "#3a2f5c" }}>
                Vi har skickat ett verifieringsmejl till
              </p>
              <p className="text-sm font-semibold break-all" style={{ color: "#1f1147" }}>
                {email}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "#3a2f5c" }}>
                Klicka på länken i mejlet för att aktivera ditt konto.
              </p>
            </div>
            <p className="text-xs pt-2" style={{ color: "#6b5f85" }}>
              Hittar du inte mejlet? Kolla skräpposten.
            </p>
            <Link
              to={loginHref}

              className="inline-block text-sm font-semibold hover:underline pt-2"
              style={{ color: "#ffffff" }}
            >
              Gå till inloggning →
            </Link>
          </CardContent>
        </Card>
      </div>
      </>
    );
  }

  return (
    <>
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden" style={beigeBg}>

      <header className="absolute top-0 left-0 right-0 z-20 flex items-center px-4 md:px-6 lg:px-8 h-14 md:h-16">
        <Link to="/" aria-label="vårdbemanning.ai startsida">
          <CompcareLogo variant="full" inverted />
        </Link>
      </header>
      <div className="relative z-10 w-full max-w-md space-y-6">



        <Card className="border-border/40 !bg-[#121319]/85 backdrop-blur text-white">
          <CardHeader className="text-center !bg-transparent space-y-2">
            {intentCopy && (
              <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-[#22232b]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#22232b]">
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                {intentCopy.eyebrow}
              </div>
            )}
            <CardTitle className="text-xl font-semibold text-white">
              {intentCopy?.title ?? "Skapa konto"}
            </CardTitle>
            <CardDescription className="text-white/70">
              {intentCopy?.description ?? "Se marknadens villkor utifrån din roll och ort"}
            </CardDescription>
          </CardHeader>

          <CardContent className="!bg-transparent">
            <GoogleAuthButton label="Fortsätt med Google" source="signup_page" onSession={goAfterAuth} />

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-white/50">eller</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-white">Ditt namn</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Förnamn Efternamn"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="bg-white/[0.04] text-white border-border placeholder:text-white/50"
                />
              </div>
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
                  placeholder="Minst 6 tecken"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-white/[0.04] text-white border-border placeholder:text-white/50"
                />
              </div>
              <Button type="submit" variant="secondary" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Skapa konto
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-white/70">
              Har du redan ett konto?{" "}
              <Link to={loginHref} className="text-white hover:underline font-medium">
                Logga in
              </Link>
            </div>
          </CardContent>
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
