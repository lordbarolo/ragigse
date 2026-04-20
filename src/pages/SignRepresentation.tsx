import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck, ShieldAlert, Building2, MapPin, FileText,
  Loader2, PartyPopper, AlertTriangle, Info, Calendar, User, Briefcase,
} from "lucide-react";

interface RepresentationRequest {
  id: string;
  agency_name: string;
  agency_org_number: string | null;
  consultant_email: string;
  consultant_name: string | null;
  competence: string | null;
  assignment_id: string | null;
  region: string;
  unit: string | null;
  period_start: string | null;
  period_end: string | null;
  response_deadline: string | null;
  status: string;
  signed_at: string | null;
  verification_id: string | null;
}

interface ActiveExclusivity {
  agency_name: string;
  signed_at: string;
  verification_id: string | null;
  response_deadline: string;
  unit: string | null;
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("sv-SE", { year: "numeric", month: "short", day: "numeric" });
}

export default function SignRepresentation() {
  const { token } = useParams<{ token: string }>();
  const [request, setRequest] = useState<RepresentationRequest | null>(null);
  const [activeExclusivity, setActiveExclusivity] = useState<ActiveExclusivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRequest() {
      if (!token) return;
      try {
        const { data, error: fnError } = await supabase.functions.invoke("representation-request", {
          body: { action: "get-by-token", token },
        });
        if (fnError) throw fnError;
        const req = data.request;
        setRequest(req);
        setActiveExclusivity(data.activeExclusivity || null);
        if (req.status === "signed") {
          setSigned(true);
          setVerificationId(req.verification_id);
        }
      } catch (err: any) {
        setError(err.message || "Kunde inte hämta förfrågan");
      } finally {
        setLoading(false);
      }
    }
    fetchRequest();
  }, [token]);

  const handleSign = async () => {
    if (!token) return;
    setSigning(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("representation-request", {
        body: { action: "sign", token },
      });
      if (fnError) throw fnError;
      setSigned(true);
      setVerificationId(data.verification_id);
    } catch (err: any) {
      setError(err.message || "Signering misslyckades");
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-1.5 w-full bg-primary" />
        <div className="mx-auto max-w-lg px-4 py-12 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-1.5 w-full bg-primary" />
        <div className="flex items-center justify-center px-4 pt-24">
          <Card className="max-w-md text-center">
            <CardContent className="py-12">
              <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Förfrågan hittades inte</h2>
              <p className="mt-2 text-sm text-muted-foreground">{error || "Ogiltig eller utgången länk"}</p>
              <Button variant="outline" size="sm" className="mt-6" asChild>
                <Link to="/">Till startsidan</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success state
  if (signed) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-1.5 w-full bg-primary" />
        <div className="mx-auto max-w-lg px-4 py-12">
          <Card className="border-primary/20">
            <CardContent className="py-12 text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <PartyPopper className="h-10 w-10 text-primary" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-foreground">Bekräftat!</h1>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Du har bekräftat att{" "}
                <span className="font-medium text-foreground">{request.agency_name || "bemanningsföretaget"}</span>{" "}
                får representera dig för uppdraget i{" "}
                <span className="font-medium text-foreground">{request.region}</span>.
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-primary">
                <ShieldCheck className="h-4 w-4" />
                <span>Digitalt verifierat representationsbevis</span>
              </div>
              {verificationId && (
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link to={`/verify/${verificationId}`}>
                    Visa bevis →
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const periodText = request.period_start && request.period_end
    ? `${formatDate(request.period_start)} – ${formatDate(request.period_end)}`
    : "uppdragets period";

  // Signing form
  return (
    <div className="min-h-screen bg-background">
      <div className="h-1.5 w-full bg-primary" />
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="flex items-center gap-2 mb-6">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            Bekräfta representation
          </h1>
        </div>

        {/* Soft warning vid aktiv exklusivitet — informera, blockera inte */}
        {activeExclusivity && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  Du har redan en aktiv exklusivitet i {request.region}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Du gav <strong className="text-foreground">{activeExclusivity.agency_name}</strong>{" "}
                  exklusiv rätt {activeExclusivity.unit ? `för ${activeExclusivity.unit} ` : ""}
                  med svarsdag <strong>{formatDate(activeExclusivity.response_deadline)}</strong>.
                  Om du bekräftar detta nya intyg ersätts det tidigare automatiskt.
                </p>
              </div>
            </div>
          </div>
        )}

        <Card className="mb-4">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <DetailRow icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
                label="Bemanningsföretag"
                value={request.agency_name + (request.agency_org_number ? ` (${request.agency_org_number})` : "")} />
              <DetailRow icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                label="Region & enhet"
                value={`${request.region}${request.unit ? ` · ${request.unit}` : ""}`} />
              {request.consultant_name && (
                <DetailRow icon={<User className="h-4 w-4 text-muted-foreground" />}
                  label="Konsult"
                  value={request.consultant_name + (request.competence ? ` · ${request.competence}` : "")} />
              )}
              <DetailRow icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                label="Period" value={periodText} />
              {request.response_deadline && (
                <DetailRow icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                  label="Sista svarsdag" value={formatDate(request.response_deadline)} />
              )}
              {request.assignment_id && (
                <DetailRow icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                  label="Avropsnummer" value={request.assignment_id} />
              )}
            </div>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
              <p className="text-sm text-foreground leading-relaxed">
                Jag, <span className="font-semibold">{request.consultant_name || request.consultant_email}</span>,
                intygar härmed att jag har givit{" "}
                <span className="font-semibold">{request.agency_name || "bemanningsföretaget"}</span>
                {request.agency_org_number && ` (org.nr ${request.agency_org_number})`}{" "}
                <span className="font-semibold">exklusiv rätt</span> att förmedla detta uppdrag för enheten{" "}
                <span className="font-semibold">{request.unit || "—"}</span> i{" "}
                <span className="font-semibold">{request.region}</span> under perioden{" "}
                <span className="font-semibold">{periodText}</span>.
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                Exklusiviteten gäller fram till och med dagen efter sista svarsdag
                ({formatDate(request.response_deadline)}).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* BankID notice */}
        <div className="flex items-start gap-2 rounded-lg bg-muted/40 border border-border p-3 mb-4">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">BankID kommer snart.</span>{" "}
            Tills vidare bekräftas representationen via denna unika länk.
          </p>
        </div>

        <Button onClick={handleSign} disabled={signing}
          className="w-full h-12 text-base gap-2" size="lg">
          {signing ? (
            <><Loader2 className="h-5 w-5 animate-spin" />Bekräftar…</>
          ) : (
            <><ShieldCheck className="h-5 w-5" />Bekräfta representation</>
          )}
        </Button>

        <p className="text-[11px] text-muted-foreground text-center mt-4">
          Ditt representationsbevis blir tillgängligt för bemanningsföretaget och den aktuella regionen.
        </p>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}
