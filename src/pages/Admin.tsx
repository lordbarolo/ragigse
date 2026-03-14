import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import SalaryInsights from "@/components/admin/SalaryInsights";
import ConversionFunnel from "@/components/admin/ConversionFunnel";
import DailyVisitors from "@/components/admin/DailyVisitors";
import ReferralStats from "@/components/admin/ReferralStats";
import FeedbackStats from "@/components/admin/FeedbackStats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, PlayCircle, ArrowUpDown, TrendingUp, TrendingDown, Minus, Plus, Trash2, ShieldCheck, Lock } from "lucide-react";

interface ContractVersion {
  id: string;
  catalog_name: string;
  version_label: string;
  effective_from: string;
  imported_at: string;
  is_active: boolean;
  notes: string | null;
}

interface PriceChange {
  id: string;
  yrkeskategori: string;
  zon: string;
  old_timpris: number | null;
  new_timpris: number;
  diff_abs: number;
  diff_pct: number;
  change_type: string;
}

const changeTypeLabel: Record<string, { label: string; color: string }> = {
  increase: { label: "Höjning", color: "text-red-600" },
  decrease: { label: "Sänkning", color: "text-green-600" },
  new: { label: "Ny", color: "text-blue-600" },
  removed: { label: "Borttagen", color: "text-muted-foreground" },
  unchanged: { label: "Oförändrad", color: "text-muted-foreground" },
};

const ChangeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "increase": return <TrendingUp className="w-4 h-4 text-red-600" />;
    case "decrease": return <TrendingDown className="w-4 h-4 text-green-600" />;
    case "new": return <Plus className="w-4 h-4 text-blue-600" />;
    case "removed": return <Trash2 className="w-4 h-4 text-muted-foreground" />;
    default: return <Minus className="w-4 h-4 text-muted-foreground" />;
  }
};

interface AuditOptin {
  id: string;
  report_id: string;
  email: string;
  created_at: string;
}

const ADMIN_PASS = "compcare2026";

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [versions, setVersions] = useState<ContractVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditOptins, setAuditOptins] = useState<AuditOptin[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);

  // Import form state
  const [catalogName, setCatalogName] = useState("");
  const [versionLabel, setVersionLabel] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [notes, setNotes] = useState("");
  const [ratesCsv, setRatesCsv] = useState("");
  const [importing, setImporting] = useState(false);

  // Diff state
  const [oldVersionId, setOldVersionId] = useState("");
  const [newVersionId, setNewVersionId] = useState("");
  const [diffRunning, setDiffRunning] = useState(false);
  const [diffResults, setDiffResults] = useState<PriceChange[] | null>(null);
  const [diffSummary, setDiffSummary] = useState<Record<string, number> | null>(null);

  const fetchVersions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contract_versions")
      .select("*")
      .order("effective_from", { ascending: false });

    if (error) {
      toast({ title: "Fel", description: error.message, variant: "destructive" });
    } else {
      setVersions(data || []);
    }
    setLoading(false);
  };

  const fetchAuditOptins = async () => {
    setAuditLoading(true);
    const { data, error } = await supabase
      .from("audit_optins")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setAuditOptins((data as AuditOptin[]) || []);
    setAuditLoading(false);
  };

  useEffect(() => {
    // Check sessionStorage for existing auth
    if (sessionStorage.getItem("admin_auth") === "true") {
      setAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchVersions();
      fetchAuditOptins();
    }
  }, [authenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passInput === ADMIN_PASS) {
      setAuthenticated(true);
      sessionStorage.setItem("admin_auth", "true");
    } else {
      toast({ title: "Fel lösenord", variant: "destructive" });
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <Lock className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <CardTitle>Admin</CardTitle>
            <CardDescription>Ange lösenord för att fortsätta</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                placeholder="Lösenord"
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                autoFocus
              />
              <Button type="submit" className="w-full">Logga in</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleImport = async () => {
    if (!catalogName || !versionLabel || !effectiveFrom || !ratesCsv.trim()) {
      toast({ title: "Fyll i alla fält", variant: "destructive" });
      return;
    }

    setImporting(true);
    try {
      // 1. Create version
      const { data: version, error: vErr } = await supabase
        .from("contract_versions")
        .insert({
          catalog_name: catalogName,
          version_label: versionLabel,
          effective_from: effectiveFrom,
          notes: notes || null,
        })
        .select()
        .single();

      if (vErr) throw vErr;

      // 2. Parse CSV: yrkeskategori;zon;typ;timpris_kund;detaljer
      const lines = ratesCsv.trim().split("\n").filter(l => l.trim());
      const rates = lines.map((line) => {
        const [yrkeskategori, zon, typ, timpris_kund, detaljer] = line.split(";").map(s => s.trim());
        return {
          version_id: version.id,
          yrkeskategori,
          zon,
          typ,
          timpris_kund: parseInt(timpris_kund, 10),
          detaljer: detaljer || null,
        };
      });

      if (rates.some(r => isNaN(r.timpris_kund))) {
        throw new Error("Ogiltigt timpris – kontrollera CSV-formatet");
      }

      const { error: rErr } = await supabase
        .from("contract_version_rates")
        .insert(rates);

      if (rErr) throw rErr;

      toast({ title: "Import klar", description: `${rates.length} rader importerade för ${versionLabel}` });
      setCatalogName("");
      setVersionLabel("");
      setEffectiveFrom("");
      setNotes("");
      setRatesCsv("");
      fetchVersions();
    } catch (err: any) {
      toast({ title: "Importfel", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleRunDiff = async () => {
    if (!newVersionId) {
      toast({ title: "Välj minst ny version", variant: "destructive" });
      return;
    }
    setDiffRunning(true);
    setDiffResults(null);
    setDiffSummary(null);

    try {
      const res = await supabase.functions.invoke("run-price-diff", {
        body: {
          old_version_id: oldVersionId || null,
          new_version_id: newVersionId,
        },
      });

      if (res.error) throw res.error;

      const data = res.data;
      if (!data.success) throw new Error(data.error || "Diff misslyckades");

      setDiffResults(data.changes);
      setDiffSummary(data.summary);
      toast({ title: "Diff klar", description: `${data.summary.total} rader analyserade` });
    } catch (err: any) {
      toast({ title: "Diff-fel", description: err.message, variant: "destructive" });
    } finally {
      setDiffRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin – Marknadsbevakning</h1>
        <p className="text-muted-foreground mt-1">Importera priskataloger, hantera versioner och kör diff-analyser.</p>
      </div>

      {/* Conversion Funnel */}
      <DailyVisitors />

      {/* Conversion Funnel */}
      <ConversionFunnel />

      {/* Referral Stats */}
      <ReferralStats />

      {/* Feedback Stats */}
      <FeedbackStats />

      {/* Salary Insights */}
      <SalaryInsights />

      {/* Audit Opt-ins */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Fakturaanalys – intresseanmälningar</CardTitle>
          <CardDescription>{auditOptins.length} personer har tackat ja till kostnadsfri fakturaanalys.</CardDescription>
        </CardHeader>
        <CardContent>
          {auditLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : auditOptins.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Inga intresseanmälningar ännu.</p>
          ) : (
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr className="border-b text-left">
                    <th className="p-2 font-medium">E-post</th>
                    <th className="p-2 font-medium">Rapport-ID</th>
                    <th className="p-2 font-medium">Datum</th>
                  </tr>
                </thead>
                <tbody>
                  {auditOptins.map((o) => (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="p-2 font-medium">{o.email}</td>
                      <td className="p-2 font-mono text-xs text-muted-foreground">{o.report_id.slice(0, 8)}…</td>
                      <td className="p-2 text-muted-foreground">{new Date(o.created_at).toLocaleString("sv-SE")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Version History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ArrowUpDown className="w-5 h-5" /> Versionshistorik</CardTitle>
          <CardDescription>Alla importerade priskataloger sorterade efter giltighetsdatum.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : versions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Inga versioner importerade ännu.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Katalog</th>
                    <th className="pb-2 font-medium">Version</th>
                    <th className="pb-2 font-medium">Gäller från</th>
                    <th className="pb-2 font-medium">Importerad</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Anteckningar</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((v) => (
                    <tr key={v.id} className="border-b last:border-0">
                      <td className="py-2">{v.catalog_name}</td>
                      <td className="py-2 font-mono text-xs">{v.version_label}</td>
                      <td className="py-2">{v.effective_from}</td>
                      <td className="py-2 text-muted-foreground">{new Date(v.imported_at).toLocaleDateString("sv-SE")}</td>
                      <td className="py-2">
                        <Badge variant={v.is_active ? "default" : "secondary"}>
                          {v.is_active ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </td>
                      <td className="py-2 text-muted-foreground max-w-[200px] truncate">{v.notes || "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> Importera ny priskatalog</CardTitle>
          <CardDescription>Klistra in prisdata i CSV-format: yrkeskategori;zon;typ;timpris_kund;detaljer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Katalognamn</Label>
              <Input placeholder="t.ex. Läkare – Ramavtal Region Stockholm" value={catalogName} onChange={(e) => setCatalogName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Versionsetikett</Label>
              <Input placeholder="t.ex. v1.7" value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Gäller från</Label>
              <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Anteckningar (valfritt)</Label>
              <Input placeholder="Valfria anteckningar" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Prisdata (CSV – semikolon-separerad)</Label>
            <Textarea
              rows={8}
              placeholder={"Specialistläkare Grupp A;Zon 1;Grundpris;1238;\nSpecialistläkare Grupp A;Zon 2;Grundpris;1356;"}
              value={ratesCsv}
              onChange={(e) => setRatesCsv(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <Button onClick={handleImport} disabled={importing}>
            {importing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Importera
          </Button>
        </CardContent>
      </Card>

      {/* Diff Runner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PlayCircle className="w-5 h-5" /> Kör prisanalys (diff)</CardTitle>
          <CardDescription>Jämför två versioner för att identifiera prisändringar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Gammal version (bas)</Label>
              <Select value={oldVersionId} onValueChange={setOldVersionId}>
                <SelectTrigger><SelectValue placeholder="Välj gammal version..." /></SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.catalog_name} – {v.version_label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ny version</Label>
              <Select value={newVersionId} onValueChange={setNewVersionId}>
                <SelectTrigger><SelectValue placeholder="Välj ny version..." /></SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.catalog_name} – {v.version_label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleRunDiff} disabled={diffRunning || !newVersionId}>
            {diffRunning && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Kör diff
          </Button>

          {/* Summary */}
          {diffSummary && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline">Totalt: {diffSummary.total}</Badge>
                <Badge className="bg-red-100 text-red-700 border-red-200">Höjningar: {diffSummary.increases}</Badge>
                <Badge className="bg-green-100 text-green-700 border-green-200">Sänkningar: {diffSummary.decreases}</Badge>
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">Nya: {diffSummary.new_entries}</Badge>
                <Badge variant="secondary">Borttagna: {diffSummary.removed}</Badge>
                <Badge variant="secondary">Oförändrade: {diffSummary.unchanged}</Badge>
              </div>
            </>
          )}

          {/* Results table */}
          {diffResults && diffResults.length > 0 && (
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto border rounded-md">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr className="text-left">
                    <th className="p-2 font-medium">Typ</th>
                    <th className="p-2 font-medium">Yrkeskategori</th>
                    <th className="p-2 font-medium">Zon</th>
                    <th className="p-2 font-medium text-right">Gammalt pris</th>
                    <th className="p-2 font-medium text-right">Nytt pris</th>
                    <th className="p-2 font-medium text-right">Diff (kr)</th>
                    <th className="p-2 font-medium text-right">Diff (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {diffResults
                    .filter((r) => r.change_type !== "unchanged")
                    .map((r) => {
                      const ct = changeTypeLabel[r.change_type] || changeTypeLabel.unchanged;
                      return (
                        <tr key={r.id || `${r.yrkeskategori}-${r.zon}`} className="border-t">
                          <td className="p-2">
                            <span className={`flex items-center gap-1 ${ct.color}`}>
                              <ChangeIcon type={r.change_type} />
                              {ct.label}
                            </span>
                          </td>
                          <td className="p-2">{r.yrkeskategori}</td>
                          <td className="p-2">{r.zon}</td>
                          <td className="p-2 text-right font-mono">{r.old_timpris ?? "–"}</td>
                          <td className="p-2 text-right font-mono">{r.new_timpris}</td>
                          <td className={`p-2 text-right font-mono ${r.diff_abs > 0 ? "text-red-600" : r.diff_abs < 0 ? "text-green-600" : ""}`}>
                            {r.diff_abs > 0 ? "+" : ""}{r.diff_abs}
                          </td>
                          <td className={`p-2 text-right font-mono ${r.diff_pct > 0 ? "text-red-600" : r.diff_pct < 0 ? "text-green-600" : ""}`}>
                            {r.diff_pct > 0 ? "+" : ""}{r.diff_pct}%
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
