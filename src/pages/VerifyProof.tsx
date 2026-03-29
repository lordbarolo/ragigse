import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck, Shield, ShieldAlert, Clock, ArrowLeft,
  Building2, CalendarDays, Fingerprint,
} from "lucide-react";

interface AttachedReference {
  id: string;
  attached_at: string;
  giver_name: string | null;
  workplace: string;
  relationship: string;
  period: string;
  verification_level: string;
  last_confirmed_at: string | null;
  competencies: string[] | null;
  recommendation_score: number | null;
  artifact_token: string | null;
}

interface RepresentationData {
  agency_name: string;
  assignment_id: string;
  region: string;
  consultant_email: string;
  signed_at: string | null;
  bankid_ref: string | null;
  payload: Record<string, any> | null;
}

const VERIFICATION_LABELS: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  ping_confirmed: {
    label: "Bekräftad",
    icon: <ShieldCheck className="h-3 w-3" />,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  bankid: {
    label: "BankID",
    icon: <ShieldCheck className="h-3 w-3" />,
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  domain: {
    label: "Domänverifierad",
    icon: <Shield className="h-3 w-3" />,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  email: {
    label: "E-postverifierad",
    icon: <Shield className="h-3 w-3" />,
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  submitted: {
    label: "Ej verifierad",
    icon: <ShieldAlert className="h-3 w-3" />,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function VerifyProof() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [references, setReferences] = useState<AttachedReference[]>([]);
  const [representation, setRepresentation] = useState<RepresentationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!applicationId) return;
      try {
        // Try fetching attached references (existing flow)
        const { data, error: fnError } = await supabase.functions.invoke("reference-vault", {
          body: { action: "get-attached", application_id: applicationId },
        });
        if (fnError) throw fnError;
        setReferences((data as { references: AttachedReference[] }).references || []);
      } catch {
        // If no references found, try representation request by verification_id
      }
      
      try {
        // Also try fetching representation data
        const { data: reprData } = await supabase
          .from("ref_representation_requests" as any)
          .select("agency_name, assignment_id, region, consultant_email, signed_at, bankid_ref, payload")
          .eq("verification_id", applicationId)
          .eq("status", "signed")
          .maybeSingle();
        
        if (reprData) {
          setRepresentation(reprData as unknown as RepresentationData);
        }
      } catch {
        // Representation data is optional
      }
      
      setLoading(false);
    }
    fetchData();
  }, [applicationId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-1 w-full bg-primary" />
        <div className="mx-auto max-w-2xl px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-1 w-full bg-primary" />
        <div className="flex flex-1 items-center justify-center px-4 pt-24">
          <Card className="max-w-md text-center">
            <CardContent className="py-12">
              <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Bevis kunde inte laddas</h2>
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

  return (
    <div className="min-h-screen bg-background">
      {/* Top accent bar */}
      <div className="h-1 w-full bg-primary" />

      <div className="mx-auto max-w-2xl px-4 py-8">
        <Button variant="ghost" size="sm" className="mb-6 gap-1.5 text-muted-foreground" asChild>
          <Link to="/"><ArrowLeft className="h-4 w-4" /> Tillbaka</Link>
        </Button>

        {/* Proof header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Fingerprint className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Representationsbevis
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {representation
              ? `Signerat representationsbevis för ${representation.region}`
              : "Verifierade referenser bifogade till ansökan"}
          </p>
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-mono bg-muted px-2 py-1 rounded text-[11px]">
              {applicationId?.slice(0, 8)}…
            </span>
            {representation ? (
              <span className="flex items-center gap-1 text-primary">
                <ShieldCheck className="h-3 w-3" />
                BankID-signerat
              </span>
            ) : (
              <span>{references.length} verifierad{references.length !== 1 ? "e" : ""} referens{references.length !== 1 ? "er" : ""}</span>
            )}
          </div>
        </div>

        {/* Representation details (if signed) */}
        {representation && (
          <Card className="mb-6 border-primary/20 bg-primary/[0.02]">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Signerat intyg
                </h2>
              </div>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bemanningsföretag</span>
                  <span className="font-medium text-foreground">{representation.agency_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uppdrags-ID</span>
                  <span className="font-mono text-xs font-medium text-foreground">{representation.assignment_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Region</span>
                  <span className="font-medium text-foreground">{representation.region}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Signerat</span>
                  <span className="font-medium text-foreground">{formatDate(representation.signed_at)}</span>
                </div>
                {representation.bankid_ref && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">BankID-ref</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{representation.bankid_ref}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verified References section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Verified References
            </h2>
          </div>

          {references.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-12 text-center">
                <Shield className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Inga verifierade referenser bifogade till denna ansökan
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {references.map((ref) => {
                const verConfig = VERIFICATION_LABELS[ref.verification_level] || VERIFICATION_LABELS.submitted;
                const isFresh = ref.last_confirmed_at
                  ? (Date.now() - new Date(ref.last_confirmed_at).getTime()) < 6 * 30.44 * 24 * 60 * 60 * 1000
                  : false;

                return (
                  <Link
                    key={ref.id}
                    to={`/verify/artifact/${ref.artifact_token}`}
                    className="block"
                  >
                    <Card className="border-primary/15 hover:border-primary/30 transition-colors cursor-pointer">
                      <CardContent className="p-5">
                        {/* Row 1: Name + verification badge */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {ref.giver_name || "Anonym referensgivare"}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                              <Building2 className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{ref.workplace}</span>
                              <span className="text-muted-foreground/40">·</span>
                              <span>{ref.relationship}</span>
                            </div>
                          </div>
                          <Badge className={`border text-[10px] font-medium gap-1 ${verConfig.className}`}>
                            {verConfig.icon}
                            {verConfig.label}
                          </Badge>
                        </div>

                        {/* Row 2: Period + confirmation date */}
                        <div className="flex items-center gap-4 text-[11px] text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            <span>{ref.period}</span>
                          </div>
                          {ref.last_confirmed_at && (
                            <div className="flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3" />
                              <span>
                                Bekräftad {formatDate(ref.last_confirmed_at)}
                              </span>
                              {isFresh && (
                                <span className="ml-1 text-primary font-medium">✓ Aktuell</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Row 3: Competencies */}
                        {ref.competencies && ref.competencies.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {(ref.competencies as string[]).slice(0, 5).map((c, i) => (
                              <span
                                key={i}
                                className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground"
                              >
                                {c}
                              </span>
                            ))}
                            {(ref.competencies as string[]).length > 5 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{(ref.competencies as string[]).length - 5}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Row 4: Score */}
                        {ref.recommendation_score != null && (
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <span
                                key={n}
                                className={`text-xs ${n <= ref.recommendation_score! ? "text-primary" : "text-muted-foreground/20"}`}
                              >
                                ●
                              </span>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground space-y-1">
          <p>Verifierat via CompCare · Referly Vault</p>
          <p className="font-mono text-[10px] text-muted-foreground/60">
            Bevis-ID: {applicationId}
          </p>
        </div>
      </div>
    </div>
  );
}
