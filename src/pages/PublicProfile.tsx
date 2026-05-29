import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck, ShieldX, ArrowLeft, Eye, Building2,
  Vault, Shield, FileText, Briefcase, Clock,
  CheckCircle, ExternalLink,
} from "lucide-react";

interface PublicDocument {
  file_name: string;
  document_type: string;
  uploaded_at: string;
}

interface PublicReference {
  relationship: string;
  workplace: string;
  period_start: string;
  period_end: string | null;
  recommendation_score: number;
  competencies: string[] | null;
  confirmed_at: string;
  verification_level?: string;
  last_confirmed_at?: string;
  attachable?: boolean;
}

interface PublicProfileData {
  full_name: string;
  specialty: string | null;
  trust_score: number;
  trust_tier: string;
  score_updated_at: string | null;
  reference_count: number;
  verifications: { bankid: boolean; ivo: boolean; hosp: boolean };
  references: PublicReference[];
  documents: PublicDocument[];
}

const DOC_TYPE_LABELS: Record<string, string> = {
  cv: "CV",
  certificate: "Certifikat / Intyg",
  license: "Legitimation",
  contract: "Avtal",
  ivo: "IVO-intyg",
  hosp: "HOSP-intyg",
  other: "Övrigt",
};

const TIER_LABEL: Record<string, string> = {
  elite: "Elite",
  verified_pro: "Verifierad Pro",
  basic: "Grundnivå",
  incomplete: "Ofullständig",
};

export default function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const sessionKey = `pp_gate_${id}`;
  const alreadyIdentified = typeof window !== "undefined" && sessionStorage.getItem(sessionKey) === "1";
  const [gateOpen, setGateOpen] = useState(!alreadyIdentified);
  const [viewerName, setViewerName] = useState("");
  const [viewerOrg, setViewerOrg] = useState("");

  const handleIdentify = async () => {
    if (!viewerName.trim() || !viewerOrg.trim()) return;
    if (id) {
      await supabase.from("ref_access_logs").insert({
        resource_type: "public_profile",
        resource_id: id,
        viewer_name: viewerName.trim(),
        viewer_org: viewerOrg.trim(),
      });
    }
    sessionStorage.setItem(sessionKey, "1");
    setGateOpen(false);
  };

  useEffect(() => {
    async function fetchProfile() {
      if (!id) return;
      const { data: result, error } = await supabase.rpc("ref_get_public_profile", { _profile_id: id });
      if (error || !result) {
        setNotFound(true);
      } else {
        setData(result as unknown as PublicProfileData);
      }
      setLoading(false);
    }
    fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
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
    );
  }

  if (gateOpen) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 px-6">
            <div className="text-center mb-6">
              <Eye className="mx-auto h-10 w-10 text-primary mb-3" />
              <h2 className="text-lg font-bold text-foreground">Identifiera dig</h2>
              <p className="text-sm text-muted-foreground mt-2">
                För att skydda konsultens integritet behöver vi veta vem som granskar profilen. Uppgifterna loggas och kan ses av konsulten.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="viewer-name">Ditt namn *</Label>
                <Input id="viewer-name" placeholder="Anna Andersson" value={viewerName} onChange={(e) => setViewerName(e.target.value)} maxLength={100} autoFocus />
              </div>
              <div>
                <Label htmlFor="viewer-org">Organisation *</Label>
                <Input id="viewer-org" placeholder="t.ex. Region Stockholm" value={viewerOrg} onChange={(e) => setViewerOrg(e.target.value)} maxLength={200} />
              </div>
              <Button onClick={handleIdentify} disabled={!viewerName.trim() || !viewerOrg.trim()} className="w-full gap-2">
                <Building2 className="h-4 w-4" /> Visa referenser
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                Genom att fortsätta godkänner du att ditt besök loggas i enlighet med vår integritetspolicy.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Vault-only view ────────────────────────────────
  const activeRefs = data.references.filter((r) => r.attachable !== false);
  const tierLabel = TIER_LABEL[data.trust_tier] ?? TIER_LABEL.incomplete;
  const documents = data.documents || [];

  // ── JSON-LD for AI agents and search engines ────────
  const profileJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    identifier: id,
    name: data.full_name,
    jobTitle: data.specialty || undefined,
    url: `https://compcare.se/profil/${id}`,
    hasCredential: [
      ...(data.verifications.bankid
        ? [{
            "@type": "EducationalOccupationalCredential",
            credentialCategory: "Digital identity verification",
            recognizedBy: { "@type": "Organization", name: "CompCare" },
          }]
        : []),
      ...(data.verifications.ivo
        ? [{
            "@type": "EducationalOccupationalCredential",
            credentialCategory: "IVO certificate",
            recognizedBy: { "@type": "Organization", name: "Inspektionen för vård och omsorg" },
          }]
        : []),
      ...(data.verifications.hosp
        ? [{
            "@type": "EducationalOccupationalCredential",
            credentialCategory: "HOSP certificate",
            recognizedBy: { "@type": "Organization", name: "Socialstyrelsen" },
          }]
        : []),
    ],
    additionalProperty: [
      { "@type": "PropertyValue", name: "trust_tier", value: data.trust_tier },
      { "@type": "PropertyValue", name: "trust_score", value: data.trust_score },
      { "@type": "PropertyValue", name: "verified_reference_count", value: activeRefs.length },
      { "@type": "PropertyValue", name: "total_reference_count", value: data.reference_count },
    ],
    subjectOf: {
      "@type": "DataFeed",
      name: "Machine-readable profile data",
      url: `https://ubhhlunhdqbokjvwfebb.supabase.co/functions/v1/get-public-profile?id=${id}`,
      encodingFormat: "application/json",
    },
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(profileJsonLd) }}
      />
      <link
        rel="alternate"
        type="application/json"
        href={`https://ubhhlunhdqbokjvwfebb.supabase.co/functions/v1/get-public-profile?id=${id}`}
      />
      <Button variant="ghost" size="sm" className="mb-6 gap-1.5 text-muted-foreground" asChild>
        <Link to="/"><ArrowLeft className="h-4 w-4" /> Tillbaka</Link>
      </Button>

      {/* Compact header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">{data.full_name}</h1>
          {data.specialty && <p className="text-sm text-muted-foreground">{data.specialty}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 text-xs">
            <ShieldCheck className="h-3 w-3 text-primary" />
            {tierLabel}
          </Badge>
        </div>
      </div>

      {/* Vault */}
      <Card className="border-border mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Vault className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground tracking-tight">Valvet</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {activeRefs.length} verifierad{activeRefs.length !== 1 ? "e" : ""} referens{activeRefs.length !== 1 ? "er" : ""} &middot; {data.reference_count} totalt
          </p>
        </CardContent>
      </Card>

      {/* Reference list */}
      {data.references.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">Inga referenser i valvet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.references.map((ref, i) => (
            <PublicVaultCard key={i} reference={ref} />
          ))}
        </div>
      )}

      {/* Documents section */}
      {documents.length > 0 && (
        <div className="mt-6">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground tracking-tight">Dokument</h2>
                <Badge variant="secondary" className="text-[10px] ml-auto">{documents.length} st</Badge>
              </div>
              <div className="space-y-2">
                {documents.map((doc, i) => (
                  <div key={i} className="flex items-center gap-3 bg-secondary/50 rounded-lg px-3 py-2.5">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {DOC_TYPE_LABELS[doc.document_type] || doc.document_type} · {new Date(doc.uploaded_at).toLocaleDateString("sv-SE")}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
                      <ShieldCheck className="h-3 w-3 text-primary" /> Uppladdad
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Viewer badge */}
      <div className="mt-8 p-3 rounded-lg bg-muted/50 border border-border flex items-center gap-2 text-xs text-muted-foreground">
        <Eye className="h-3 w-3 shrink-0" />
        <span>Granskad av <strong className="text-foreground">{viewerName}</strong> ({viewerOrg})</span>
      </div>

      <div className="mt-6 text-center text-xs text-muted-foreground">
        {data.score_updated_at && (
          <p>Senast uppdaterad: {new Date(data.score_updated_at).toLocaleDateString("sv-SE")}</p>
        )}
        <p className="mt-1">Verifierad profil via CompCare</p>
      </div>
    </div>
  );
}

/* ── Vault card for public view ─────────────────────── */
function PublicVaultCard({ reference }: { reference: PublicReference }) {
  const isAttachable = reference.attachable !== false;
  const isFresh = reference.last_confirmed_at
    ? (Date.now() - new Date(reference.last_confirmed_at).getTime()) < 6 * 30.44 * 86400 * 1000
    : false;

  return (
    <Card className={`border transition-colors ${isAttachable ? "border-primary/20 bg-primary/[0.02]" : "border-border"}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] rounded-md shrink-0">{reference.relationship}</Badge>
              <span className="text-sm font-medium text-foreground truncate">{reference.workplace}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {reference.period_start}{reference.period_end ? ` → ${reference.period_end}` : " → pågående"}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isAttachable ? (
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] gap-1">
                <Shield className="h-3 w-3" /> Verifierad
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
                <Clock className="h-3 w-3" /> Väntande
              </Badge>
            )}
          </div>
        </div>

        {/* Competencies */}
        {reference.competencies && reference.competencies.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {(Array.isArray(reference.competencies) ? reference.competencies : []).map((c: string) => (
              <Badge key={c} variant="secondary" className="text-[10px] rounded-md">{c}</Badge>
            ))}
          </div>
        )}

        {/* Score dots */}
        {reference.recommendation_score > 0 && (
          <div className="mt-2 flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={`text-xs ${n <= reference.recommendation_score ? "text-primary" : "text-muted-foreground/20"}`}>●</span>
            ))}
          </div>
        )}

        {/* Freshness */}
        {isAttachable && reference.last_confirmed_at && (
          <p className="mt-2 text-[10px] text-muted-foreground">
            <CheckCircle className="inline h-3 w-3 mr-0.5 text-primary" />
            Bekräftad {new Date(reference.last_confirmed_at).toLocaleDateString("sv-SE")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
