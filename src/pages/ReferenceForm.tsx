import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Lock, CheckCircle, ShieldX, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { COMPETENCIES } from "@/types/referly";

type InviteData = {
  id: string;
  individual_name: string;
  individual_specialty: string | null;
  workplace: string;
  relationship: string;
  period_start: string;
  period_end: string | null;
  status: string;
  giver_email: string;
  is_verification_only?: boolean;
  document_url?: string | null;
  document_name?: string | null;
};

export default function ReferenceForm() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [referenceText, setReferenceText] = useState("");
  const [selectedCompetencies, setSelectedCompetencies] = useState<string[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [bankidAcknowledged, setBankidAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [verifyComment, setVerifyComment] = useState("");

  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  useEffect(() => {
    async function fetchInvite() {
      if (!token) return;
      const { data, error } = await supabase.rpc("ref_get_reference_by_invite_token", { _token: token });
      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        setError("Denna inbjudan är ogiltig eller har redan besvarats.");
        setLoading(false);
        return;
      }
      const ref = Array.isArray(data) ? data[0] : data;
      if (ref.status !== "pending") {
        setError("Denna inbjudan är ogiltig eller har redan besvarats.");
        setLoading(false);
        return;
      }
      setInviteData(ref as InviteData);
      setRegEmail(ref.giver_email || "");
      setLoading(false);
    }
    fetchInvite();
  }, [token]);

  const toggleCompetency = (c: string) => {
    setSelectedCompetencies((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const isVerificationOnly = inviteData?.is_verification_only ?? false;

  const isValid = isVerificationOnly
    ? bankidAcknowledged
    : referenceText.trim().length > 0 &&
      selectedCompetencies.length >= 1 &&
      score !== null &&
      bankidAcknowledged;

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      toast.error("Ange mejl och lösenord");
      return false;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    if (error) {
      toast.error("Inloggningen misslyckades", { description: error.message });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!isValid || !token) return;
    setSubmitting(true);

    let giverId = user?.id;
    let giverName = user?.user_metadata?.full_name ?? "Referensgivare";

    if (!giverId) {
      if (showLogin) {
        const ok = await handleLogin();
        if (!ok) { setSubmitting(false); return; }
        const { data: { user: loggedIn } } = await supabase.auth.getUser();
        giverId = loggedIn?.id;
        giverName = loggedIn?.user_metadata?.full_name ?? "Referensgivare";
      } else {
        if (!regEmail || !regPassword || regPassword.length < 8) {
          toast.error("Ange mejl och lösenord (minst 8 tecken)");
          setSubmitting(false);
          return;
        }
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: regEmail,
          password: regPassword,
          options: {
            data: { full_name: regName || "Referensgivare", role: "reference_giver" },
            emailRedirectTo: window.location.origin,
          },
        });
        if (signUpError || !signUpData.user) {
          toast.error("Kunde inte registrera", { description: signUpError?.message });
          setSubmitting(false);
          return;
        }
        giverId = signUpData.user.id;
        giverName = regName || "Referensgivare";
      }
    }

    let error: any;

    if (isVerificationOnly) {
      // Verification-only flow: use the dedicated RPC
      const { error: verifyErr } = await supabase.rpc("ref_verify_imported_reference", {
        _token: token,
        _giver_id: giverId!,
        _giver_name: giverName,
        _comment: verifyComment.trim() || null,
      });
      error = verifyErr;
    } else {
      // Standard reference flow
      const { error: refErr } = await supabase.rpc("ref_submit_reference", {
        _token: token,
        _giver_id: giverId!,
        _giver_name: giverName,
        _reference_text: referenceText,
        _competencies: selectedCompetencies as unknown as any,
        _recommendation_score: score!,
      });
      error = refErr;
    }

    setSubmitting(false);
    if (error) {
      toast.error(isVerificationOnly ? "Kunde inte verifiera referensen" : "Kunde inte skicka referensen", { description: error.message });
      return;
    }
    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="h-1 w-full bg-primary" />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Laddar referensformulär…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="h-1 w-full bg-primary" />
        <div className="flex flex-1 items-center justify-center px-4">
          <Card className="max-w-md text-center">
            <CardContent className="py-12">
              <ShieldX className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Ogiltig eller utgången inbjudan</h2>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" className="mt-6" asChild>
                <Link to="/">Till startsidan</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="h-1 w-full bg-primary" />
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="text-center">
            <CheckCircle className="mx-auto mb-4 h-16 w-16 text-primary" />
            <h2 className="text-2xl font-semibold text-foreground">Tack!</h2>
            <p className="mt-2 text-muted-foreground">Din referens har registrerats.</p>
            {!user && (
              <p className="mt-2 text-sm text-muted-foreground">
                Ditt konto har skapats! <Link to="/logga-in" className="text-primary hover:underline">Logga in</Link> för att se dina lämnade referenser.
              </p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">Du kan stänga denna sida.</p>
          </div>
        </div>
      </div>
    );
  }

  const data = inviteData!;

  return (
    <div className="min-h-screen bg-background">
      <div className="h-1 w-full bg-primary" />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-foreground">Lämna referens</h1>
          <p className="text-sm text-muted-foreground mt-1">CompCare — Verifierade referenser</p>
        </div>

        {/* Context */}
        <div className="mb-8 rounded-xl border border-border bg-muted/50 p-5">
          <p className="text-sm text-muted-foreground">Du har blivit ombedd att lämna en referens för:</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{data.individual_name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {data.individual_specialty && (
              <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary rounded-md">{data.individual_specialty}</Badge>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{data.relationship} · {data.workplace}</p>
        </div>

        {/* Reference text */}
        <div className="mb-8">
          <h3 className="mb-3 text-base font-semibold text-foreground">Om personen</h3>
          <Textarea
            value={referenceText}
            onChange={(e) => setReferenceText(e.target.value)}
            placeholder="Beskriv din erfarenhet av att arbeta med denna person. Fokusera på klinisk kompetens, samarbetsförmåga och professionalism."
            className="min-h-[160px]"
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">{referenceText.length} tecken</p>
        </div>

        {/* Competencies */}
        <div className="mb-8">
          <h3 className="mb-1 text-base font-semibold text-foreground">Kompetensbekräftelse</h3>
          <p className="mb-3 text-sm text-muted-foreground">Markera de kompetensområden du kan intyga:</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {COMPETENCIES.map((c) => (
              <div
                key={c}
                role="button"
                tabIndex={0}
                onClick={() => toggleCompetency(c)}
                onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggleCompetency(c); } }}
                className="flex items-center gap-2 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox checked={selectedCompetencies.includes(c)} onCheckedChange={() => {}} />
                <span className="text-sm text-foreground">{c}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendation score */}
        <div className="mb-8">
          <h3 className="mb-3 text-sm font-medium text-foreground">Hur starkt rekommenderar du denna person?</h3>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setScore(n)}
                className={`flex h-12 w-12 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                  score === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-primary/5"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>Svag</span>
            <span>Godkänd</span>
            <span>Utmärkt</span>
          </div>
        </div>

        {/* BankID placeholder */}
        <div className="mb-8 rounded-xl border-2 border-dashed border-border bg-muted/30 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-7 w-7 shrink-0 text-muted-foreground" />
            <div>
              <h4 className="font-semibold text-foreground">Verifiering med BankID</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                BankID-signering integreras i nästa version. Referensen sparas som overifierad tills dess.
              </p>
              <Button type="button" variant="ghost" className="mt-3 pointer-events-none opacity-50" disabled tabIndex={-1}>
                <Lock className="h-4 w-4" />
                Verifiera med BankID
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Kommer snart</span>
              </Button>
              <div
                role="button"
                tabIndex={0}
                className="mt-4 flex items-start gap-2 cursor-pointer"
                onClick={() => setBankidAcknowledged(!bankidAcknowledged)}
                onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setBankidAcknowledged(!bankidAcknowledged); } }}
              >
                <Checkbox checked={bankidAcknowledged} onCheckedChange={() => {}} className="mt-0.5" />
                <span className="text-sm text-muted-foreground">Jag förstår att min referens sparas som overifierad tills BankID-verifiering är på plats</span>
              </div>
            </div>
          </div>
        </div>

        {/* Account section */}
        {!user && (
          <div className="mb-8 rounded-xl border border-border bg-card p-5">
            {showLogin ? (
              <>
                <p className="text-sm font-medium text-foreground mb-3">Har du redan ett konto? Logga in.</p>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="login-email">E-postadress</Label>
                    <Input id="login-email" type="email" placeholder="din@mejl.se" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="login-password">Lösenord</Label>
                    <Input id="login-password" type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                  </div>
                </div>
                <button onClick={() => setShowLogin(false)} className="mt-3 text-xs text-primary hover:underline">Har inget konto? Skapa ett</button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3">Skapa ett konto för att kunna se och hantera dina lämnade referenser.</p>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="reg-name">Ditt namn</Label>
                    <Input id="reg-name" type="text" placeholder="Förnamn Efternamn" value={regName} onChange={(e) => setRegName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="reg-email">E-postadress</Label>
                    <Input id="reg-email" type="email" placeholder="din@mejl.se" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="reg-password">Lösenord (minst 8 tecken)</Label>
                    <Input id="reg-password" type="password" placeholder="••••••••" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
                  </div>
                </div>
                <button onClick={() => setShowLogin(true)} className="mt-3 text-xs text-primary hover:underline">Har redan ett konto? Logga in</button>
              </>
            )}
          </div>
        )}

        <Button className="w-full" size="lg" disabled={!isValid || submitting} onClick={handleSubmit}>
          {submitting ? "Skickar referens…" : "Skicka referens"}
        </Button>
      </div>
    </div>
  );
}
