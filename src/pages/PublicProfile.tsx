import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  ShieldCheck, ShieldX, Star, Briefcase, Clock,
  CheckCircle, XCircle, Award, Users, ArrowLeft,
} from "lucide-react";

interface PublicProfileData {
  full_name: string;
  specialty: string | null;
  bio: string | null;
  years_licensed: number | null;
  trust_score: number;
  trust_tier: string;
  score_updated_at: string | null;
  score_breakdown: {
    role: { earned: number; max: number; chiefs: number; colleagues: number };
    domain: { earned: number; max: number; verified_count: number };
    recency: { earned: number; max: number; freshest_months: number };
    ping: { earned: number; max: number; has_active_ping: boolean };
    compliance: { earned: number; max: number };
  } | null;
  reference_count: number;
  avg_recommendation: number;
  competencies: Record<string, number>;
  verifications: { bankid: boolean; ivo: boolean; hosp: boolean };
  references: Array<{
    relationship: string;
    workplace: string;
    period_start: string;
    period_end: string | null;
    recommendation_score: number;
    competencies: string[] | null;
    confirmed_at: string;
  }>;
}

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  elite: { label: "Elite", color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
  verified_pro: { label: "Verifierad Pro", color: "text-primary", bg: "bg-primary/5", border: "border-primary/20" },
  basic: { label: "Grundnivå", color: "text-foreground", bg: "bg-muted", border: "border-border" },
  incomplete: { label: "Ofullständig", color: "text-muted-foreground", bg: "bg-muted/50", border: "border-border/50" },
};

export default function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetch() {
      if (!id) return;
      const { data: result, error } = await supabase.rpc("ref_get_public_profile", { _profile_id: id });
      if (error || !result) {
        setNotFound(true);
      } else {
        setData(result as unknown as PublicProfileData);
      }
      setLoading(false);
    }
    fetch();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-1 w-full bg-primary" />
        <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="h-1 w-full bg-primary" />
        <div className="flex flex-1 items-center justify-center px-4">
          <Card className="max-w-md text-center">
            <CardContent className="py-12">
              <ShieldX className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Profil hittades inte</h2>
              <p className="mt-2 text-sm text-muted-foreground">Denna profil finns inte eller har inte aktiverats ännu.</p>
              <Button variant="outline" className="mt-6" asChild>
                <Link to="/">Till startsidan</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const tier = TIER_CONFIG[data.trust_tier] ?? TIER_CONFIG.incomplete;
  const competencyEntries = Object.entries(data.competencies).sort(([, a], [, b]) => b - a);

  return (
    <div className="min-h-screen bg-background">
      <div className="h-1 w-full bg-primary" />
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Back */}
        <Button variant="ghost" size="sm" className="mb-6 gap-1.5 text-muted-foreground" asChild>
          <Link to="/"><ArrowLeft className="h-4 w-4" /> Tillbaka</Link>
        </Button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{data.full_name}</h1>
              {data.specialty && (
                <p className="mt-1 text-sm text-muted-foreground">{data.specialty}</p>
              )}
              {data.years_licensed != null && (
                <p className="mt-0.5 text-xs text-muted-foreground">{data.years_licensed} års erfarenhet</p>
              )}
            </div>
            <Badge className={`${tier.bg} ${tier.color} ${tier.border} border rounded-lg px-3 py-1.5 text-sm font-semibold`}>
              {tier.label}
            </Badge>
          </div>
          {data.bio && (
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{data.bio}</p>
          )}
        </div>

        {/* Trust Score */}
        <Card className={`mb-6 border ${tier.border}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className={`h-5 w-5 ${tier.color}`} />
                <h2 className="font-semibold text-foreground">Trust Score</h2>
              </div>
              <span className={`text-3xl font-bold ${tier.color}`}>{data.trust_score}</span>
            </div>
            <Progress value={data.trust_score} className="h-2 mb-4" />

            {data.score_breakdown && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <ScorePill label="Referensroller" earned={data.score_breakdown.role.earned} max={data.score_breakdown.role.max} />
                <ScorePill label="Verifierade domäner" earned={data.score_breakdown.domain.earned} max={data.score_breakdown.domain.max} />
                <ScorePill label="Aktualitet" earned={data.score_breakdown.recency.earned} max={data.score_breakdown.recency.max} />
                <ScorePill label="Ping-bekräftelse" earned={data.score_breakdown.ping.earned} max={data.score_breakdown.ping.max} />
                <ScorePill label="Myndighetskontroll" earned={data.score_breakdown.compliance.earned} max={data.score_breakdown.compliance.max} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <Users className="mx-auto mb-1 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold text-foreground">{data.reference_count}</p>
              <p className="text-xs text-muted-foreground">Referenser</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <Star className="mx-auto mb-1 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold text-foreground">{data.avg_recommendation}</p>
              <p className="text-xs text-muted-foreground">Snittbetyg</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <Award className="mx-auto mb-1 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold text-foreground">{competencyEntries.length}</p>
              <p className="text-xs text-muted-foreground">Kompetenser</p>
            </CardContent>
          </Card>
        </div>

        {/* Verifications */}
        <Card className="mb-6 border-border/50">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Verifieringar</h3>
            <div className="space-y-2">
              <VerificationRow label="BankID" verified={data.verifications.bankid} />
              <VerificationRow label="IVO Tillsyn" verified={data.verifications.ivo} />
              <VerificationRow label="HOSP" verified={data.verifications.hosp} />
            </div>
          </CardContent>
        </Card>

        {/* Competencies */}
        {competencyEntries.length > 0 && (
          <Card className="mb-6 border-border/50">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Bekräftade kompetenser</h3>
              <div className="space-y-2">
                {competencyEntries.map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{name}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 rounded-full bg-muted w-24 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.min(100, (count / data.reference_count) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{count}/{data.reference_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* References */}
        {data.references.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Referenshistorik</h3>
            <div className="space-y-2">
              {data.references.map((ref, i) => (
                <Card key={i} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs rounded-md">{ref.relationship}</Badge>
                          <span className="text-sm font-medium text-foreground">{ref.workplace}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {ref.period_start}{ref.period_end ? ` → ${ref.period_end}` : " → pågående"}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span key={n} className={`text-sm ${n <= ref.recommendation_score ? "text-primary" : "text-muted-foreground/20"}`}>●</span>
                        ))}
                      </div>
                    </div>
                    {ref.competencies && ref.competencies.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(Array.isArray(ref.competencies) ? ref.competencies : []).map((c: string) => (
                          <Badge key={c} variant="secondary" className="text-[10px] rounded-md">{c}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-muted-foreground">
          <p>Verifierad profil via CompCare</p>
        </div>
      </div>
    </div>
  );
}

function ScorePill({ label, earned, max }: { label: string; earned: number; max: number }) {
  const pct = max > 0 ? (earned / max) * 100 : 0;
  return (
    <div className="rounded-lg bg-muted/50 p-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{earned}/{max}</span>
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function VerificationRow({ label, verified }: { label: string; verified: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-foreground">{label}</span>
      {verified ? (
        <div className="flex items-center gap-1 text-primary">
          <CheckCircle className="h-4 w-4" />
          <span className="text-xs font-medium">Verifierad</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-muted-foreground/50">
          <XCircle className="h-4 w-4" />
          <span className="text-xs">Ej verifierad</span>
        </div>
      )}
    </div>
  );
}
