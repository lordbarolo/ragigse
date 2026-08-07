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
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled && data.session?.user) goAfterAuth();
    })();
    return () => {
      cancelled = true;
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
      <>
      <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden" style={beigeBg}>
        <Card className="relative z-10 w-full max-w-md border-border/40 !bg-[#F5F2EA]/95 backdrop-blur">
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
              style={{ color: "#534AB7" }}
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
          <CompcareLogo variant="full" inverted={false} />
        </Link>
      </header>
      <div className="relative z-10 w-full max-w-md space-y-6">



        <Card className="border-border/40 !bg-[#F5F2EA]/85 backdrop-blur text-black">
          <CardHeader className="text-center !bg-transparent space-y-2">
            {intentCopy && (
              <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-[#3D3491]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#3D3491]">
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                {intentCopy.eyebrow}
              </div>
            )}
            <CardTitle className="text-xl font-semibold text-black">
              {intentCopy?.title ?? "Skapa konto"}
            </CardTitle>
            <CardDescription className="text-black/70">
              {intentCopy?.description ?? "Få tillgång till dina rapporter och personlig profil direkt"}
            </CardDescription>
          </CardHeader>

          <CardContent className="!bg-transparent">
            <GoogleAuthButton label="Fortsätt med Google" source="signup_page" onSession={goAfterAuth} />

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-black/10" />
              <span className="text-xs text-black/50">eller</span>
              <span className="h-px flex-1 bg-black/10" />
            </div>

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
              <Link to={loginHref} className="text-black hover:underline font-medium">
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
    </>
  );
}
