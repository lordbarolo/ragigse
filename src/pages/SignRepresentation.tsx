import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck, ShieldAlert, Fingerprint, Building2,
  MapPin, FileText, CheckCircle2, Loader2, PartyPopper,
} from "lucide-react";

interface RepresentationRequest {
  id: string;
  agency_name: string;
  consultant_email: string;
  assignment_id: string;
  region: string;
  status: string;
  signed_at: string | null;
  verification_id: string | null;
}

export default function SignRepresentation() {
  const { token } = useParams<{ token: string }>();
  const [request, setRequest] = useState<RepresentationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      if (!token) return;
      try {
        const { data, error: fnError } = await supabase.functions.invoke("representation-request", {
          body: { action: "get-by-token", token },
        });
        if (fnError) throw fnError;
        const req = data.request;
        setRequest(req);
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
    fetch();
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
              <Button variant="outline" className="mt-6" asChild>
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
              <h1 className="text-2xl font-bold text-foreground">Signerat!</h1>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Du har bekräftat din representation av{" "}
                <span className="font-medium text-foreground">{request.agency_name || "bemanningsföretaget"}</span>{" "}
                för uppdrag <span className="font-mono text-xs">{request.assignment_id}</span> i{" "}
                <span className="font-medium text-foreground">{request.region}</span>.
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-primary">
                <ShieldCheck className="h-4 w-4" />
                <span>Digitalt verifierat representationsbevis</span>
              </div>
              {verificationId && (
                <Button variant="outline" className="mt-4" asChild>
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

  // Signing form
  return (
    <div className="min-h-screen bg-background">
      <div className="h-1.5 w-full bg-primary" />
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="flex items-center gap-2 mb-6">
          <Fingerprint className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            Bekräfta representation
          </h1>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            {/* Details */}
            <div className="space-y-3">
              <DetailRow
                icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
                label="Bemanningsföretag"
                value={request.agency_name || "—"}
              />
              <DetailRow
                icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                label="Uppdrags-ID"
                value={request.assignment_id}
              />
              <DetailRow
                icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                label="Region"
                value={request.region}
              />
            </div>

            {/* Signing text */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
              <p className="text-sm text-foreground leading-relaxed">
                Jag bekräftar med min signatur att jag har gjort ett{" "}
                <span className="font-semibold">aktivt val</span> att representeras av{" "}
                <span className="font-semibold">{request.agency_name || "bemanningsföretaget"}</span>{" "}
                för uppdrag{" "}
                <span className="font-mono text-xs font-medium">{request.assignment_id}</span>{" "}
                i <span className="font-semibold">{request.region}</span>.
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                Jag godkänner också att mina verifierade referenser delas i samband med detta.
              </p>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSign}
          disabled={signing}
          className="w-full h-12 text-base gap-2"
          size="lg"
        >
          {signing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Bekräftar…
            </>
          ) : (
            <>
              <Fingerprint className="h-5 w-5" />
              Bekräfta representation
            </>
          )}
        </Button>

        <p className="text-[11px] text-muted-foreground text-center mt-4">
          Ditt representationsbevis blir tillgängligt
          för bemanningsföretaget och den aktuella regionen.
        </p>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
