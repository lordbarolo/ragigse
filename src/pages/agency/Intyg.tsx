import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Loader2, Plus, Copy, Clock, ShieldCheck, XCircle, FileText, Mail,
  AlertTriangle, ExternalLink, Sparkles, ImageIcon, Type,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { SWEDISH_REGIONS } from "@/lib/swedishRegions";
import { trackEvent } from "@/lib/trackEvent";

interface RepRequest {
  id: string;
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
  secret_token: string;
  created_at: string;
  signed_at: string | null;
  agency_name: string;
  agency_org_number: string | null;
  verification_id: string | null;
  superseded_by: string | null;
  email_status?: string;
}

interface Counts { total: number; pending: number; signed: number; declined: number; }

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  pending: { label: "Väntande", icon: <Clock className="h-3 w-3" />, className: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" },
  signed: { label: "Signerat", icon: <ShieldCheck className="h-3 w-3" />, className: "bg-primary/10 text-primary border-primary/20" },
  declined: { label: "Avböjd", icon: <XCircle className="h-3 w-3" />, className: "bg-destructive/10 text-destructive border-destructive/20" },
  superseded: { label: "Ersatt", icon: <Clock className="h-3 w-3" />, className: "bg-muted text-muted-foreground border-border" },
};

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("sv-SE", { year: "numeric", month: "short", day: "numeric" });
}

interface FormState {
  consultant_email: string;
  consultant_name: string;
  competence: string;
  region: string;
  unit: string;
  period_start: string;
  period_end: string;
  response_deadline: string;
  assignment_id: string;
  agency_org_number: string;
}

const EMPTY_FORM: FormState = {
  consultant_email: "", consultant_name: "", competence: "", region: "",
  unit: "", period_start: "", period_end: "", response_deadline: "",
  assignment_id: "", agency_org_number: "",
};

export default function AgencyIntyg() {
  const { user } = useAuth();
  const [orgName, setOrgName] = useState<string | null>(null);
  const [orgNumber, setOrgNumber] = useState<string | null>(null);
  const [requests, setRequests] = useState<RepRequest[]>([]);
  const [counts, setCounts] = useState<Counts>({ total: 0, pending: 0, signed: 0, declined: 0 });
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const updateField = (field: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  // AI-import state
  const [aiText, setAiText] = useState("");
  const [aiImageDataUrl, setAiImageDataUrl] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [intelligenceId, setIntelligenceId] = useState<string | null>(null);
  const [usedAi, setUsedAi] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    trackEvent("intyg_dashboard_viewed");
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("org_members" as any)
      .select("organizations(name, org_number)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const o = (data as any)?.organizations;
        setOrgName(o?.name || null);
        setOrgNumber(o?.org_number || null);
      });
  }, [user]);

  useEffect(() => {
    if (orgNumber && !form.agency_org_number) {
      setForm((f) => ({ ...f, agency_org_number: orgNumber }));
    }
  }, [orgNumber, form.agency_org_number]);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("representation-request", {
        body: { action: "list" },
      });
      if (error) throw error;
      setRequests(data.requests || []);
      setCounts(data.counts || { total: 0, pending: 0, signed: 0, declined: 0 });
    } catch (err) {
      console.error(err);
      toast.error("Kunde inte hämta intyg");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const resetForm = () => {
    setForm({ ...EMPTY_FORM, agency_org_number: orgNumber || "" });
    setAiText(""); setAiImageDataUrl(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Bilden är för stor (max 5 MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAiImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const runAiExtract = async () => {
    if (!aiText.trim() && !aiImageDataUrl) {
      toast.error("Klistra in text eller ladda upp en bild först");
      return;
    }
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-avrop", {
        body: { text: aiText.trim() || undefined, imageDataUrl: aiImageDataUrl || undefined },
      });
      if (error) throw error;
      const ex = data?.extracted || {};
      setForm((f) => ({
        ...f,
        region: ex.region || f.region,
        unit: ex.unit || f.unit,
        competence: ex.competence || f.competence,
        period_start: ex.period_start || f.period_start,
        period_end: ex.period_end || f.period_end,
        response_deadline: ex.response_deadline || f.response_deadline,
        assignment_id: ex.assignment_id || f.assignment_id,
      }));
      toast.success("Fält ifyllda – granska och justera vid behov");
    } catch (err: any) {
      console.error(err);
      toast.error("AI-extraktion misslyckades. Fyll i manuellt.");
    } finally {
      setAiBusy(false);
    }
  };

  const handleCreate = async () => {
    if (!form.consultant_email || !form.region || !form.response_deadline) {
      toast.error("Konsultens e-post, region och sista svarsdag är obligatoriska");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("representation-request", {
        body: {
          action: "create",
          consultant_email: form.consultant_email,
          consultant_name: form.consultant_name || null,
          competence: form.competence || null,
          region: form.region,
          unit: form.unit || null,
          period_start: form.period_start || null,
          period_end: form.period_end || null,
          response_deadline: form.response_deadline,
          assignment_id: form.assignment_id || null,
          agency_name: orgName || "Bemanningsföretag",
          agency_org_number: form.agency_org_number || orgNumber || null,
        },
      });
      if (error) throw error;

      if (data?.warning?.type === "active_exclusivity") {
        toast.warning(
          `Obs: konsulten har redan en aktiv exklusivitet hos ${data.warning.agency_name} ` +
          `i samma region (svar senast ${formatDate(data.warning.response_deadline)}). ` +
          `Intyget skickas ändå – konsulten avgör vid signering.`,
          { duration: 8000 }
        );
      } else {
        toast.success("Intyg skapat – inbjudan skickas via e-post");
      }

      const signingUrl = `${window.location.origin}/sign/${data.created.secret_token}`;
      try { await navigator.clipboard.writeText(signingUrl); } catch { /* noop */ }
      toast.info("Signeringslänk kopierad till urklipp");
      resetForm();
      setCreateOpen(false);
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Kunde inte skapa intyg");
    } finally {
      setCreating(false);
    }
  };

  const copy = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    toast.success(`${label} kopierad`);
  };

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Representationsintyg
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {orgName ? `${orgName} · ` : ""}Skapa och hantera digitala representationsbevis
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Nytt intyg
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Skapa representationsintyg</DialogTitle>
              <DialogDescription>
                Klistra in avropet eller ladda upp en bild så fyller AI:n i fälten åt dig. Du kan
                också fylla i manuellt.
              </DialogDescription>
            </DialogHeader>

            {/* AI-import sektion */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">AI-import (valfritt)</p>
              </div>
              <Textarea
                placeholder="Klistra in avropets text här…"
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                rows={4}
                className="text-sm"
              />
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  {aiImageDataUrl ? "Bild vald ✓" : "Lägg till bild"}
                </Button>
                {aiImageDataUrl && (
                  <Button type="button" variant="ghost" size="sm"
                    onClick={() => setAiImageDataUrl(null)}>
                    Ta bort bild
                  </Button>
                )}
                <div className="flex-1" />
                <Button
                  type="button" size="sm" onClick={runAiExtract}
                  disabled={aiBusy || (!aiText.trim() && !aiImageDataUrl)}
                  className="gap-1.5"
                >
                  {aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Type className="h-3.5 w-3.5" />}
                  Fyll i fält
                </Button>
              </div>
            </div>

            {/* Formulär */}
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="email">Konsultens e-post *</Label>
                  <Input id="email" type="email" placeholder="konsult@example.com"
                    value={form.consultant_email}
                    onChange={(e) => updateField("consultant_email", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="cname">Konsultens namn</Label>
                  <Input id="cname" placeholder="Anna Andersson"
                    value={form.consultant_name}
                    onChange={(e) => updateField("consultant_name", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="competence">Kompetens</Label>
                  <Input id="competence" placeholder="t.ex. Specialistläkare allmänmedicin"
                    value={form.competence}
                    onChange={(e) => updateField("competence", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="region">Region *</Label>
                  <Select value={form.region} onValueChange={(v) => updateField("region", v)}>
                    <SelectTrigger id="region">
                      <SelectValue placeholder="Välj region" />
                    </SelectTrigger>
                    <SelectContent>
                      {SWEDISH_REGIONS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="unit">Enhet</Label>
                  <Input id="unit" placeholder="t.ex. Vårdcentralen Liljeholmen"
                    value={form.unit}
                    onChange={(e) => updateField("unit", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="pstart">Period från</Label>
                  <Input id="pstart" type="date"
                    value={form.period_start}
                    onChange={(e) => updateField("period_start", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="pend">Period till</Label>
                  <Input id="pend" type="date"
                    value={form.period_end}
                    onChange={(e) => updateField("period_end", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="deadline">Sista svarsdag *</Label>
                  <Input id="deadline" type="date"
                    value={form.response_deadline}
                    onChange={(e) => updateField("response_deadline", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="assignment">Avropsnummer (valfritt)</Label>
                  <Input id="assignment" placeholder="t.ex. KS-2026-0142"
                    value={form.assignment_id}
                    onChange={(e) => updateField("assignment_id", e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="orgnr">Bemanningsföretagets org.nr</Label>
                  <Input id="orgnr" placeholder="556677-8899"
                    value={form.agency_org_number}
                    onChange={(e) => updateField("agency_org_number", e.target.value)} />
                </div>
              </div>

              <Button size="sm" onClick={handleCreate} disabled={creating} className="w-full">
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                Skapa & skicka inbjudan
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Stark autentisering (BankID) kommer i nästa version. Idag används länkbaserad bekräftelse.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Totalt", value: counts.total },
          { label: "Väntande", value: counts.pending },
          { label: "Aktiva", value: counts.signed },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5 pb-4 text-center">
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-16 px-4">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-foreground">Inga intyg ännu</p>
              <p className="text-xs text-muted-foreground mt-1">
                Skapa ditt första representationsintyg för att komma igång.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Konsult</TableHead>
                    <TableHead>Region / Enhet</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Åtgärder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => {
                    const effectiveStatus = r.superseded_by ? "superseded" : r.status;
                    const cfg = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.pending;
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="text-sm font-medium">{r.consultant_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{r.consultant_email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{r.region}</div>
                          <div className="text-xs text-muted-foreground">{r.unit || "—"}</div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(r.period_start)} – {formatDate(r.period_end)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDate(r.response_deadline)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 ${cfg.className}`}>
                            {cfg.icon}{cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {r.status === "pending" && (
                              <Button variant="ghost" size="sm" className="h-7 px-2"
                                onClick={() => copy(`${window.location.origin}/sign/${r.secret_token}`, "Signeringslänk")}>
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {r.status === "signed" && r.verification_id && (
                              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1" asChild>
                                <Link to={`/verify/${r.verification_id}`}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
