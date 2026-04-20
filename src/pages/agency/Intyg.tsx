import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Loader2, Plus, Copy, Clock, ShieldCheck, XCircle, FileText, Mail,
  AlertTriangle, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface RepRequest {
  id: string;
  consultant_email: string;
  assignment_id: string;
  region: string;
  status: string;
  secret_token: string;
  created_at: string;
  signed_at: string | null;
  agency_name: string;
  verification_id: string | null;
  email_status?: string;
  email_sent_at?: string | null;
}

interface Counts {
  total: number; pending: number; signed: number; declined: number;
}

interface CollisionInfo {
  agency_name: string;
  signed_at: string;
  verification_id: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  pending: { label: "Väntande", icon: <Clock className="h-3 w-3" />, className: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" },
  signed: { label: "Signerat", icon: <ShieldCheck className="h-3 w-3" />, className: "bg-primary/10 text-primary border-primary/20" },
  declined: { label: "Avböjd", icon: <XCircle className="h-3 w-3" />, className: "bg-destructive/10 text-destructive border-destructive/20" },
  expired: { label: "Utgånget", icon: <Clock className="h-3 w-3" />, className: "bg-muted text-muted-foreground border-border" },
};

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("sv-SE", { year: "numeric", month: "short", day: "numeric" });
}

export default function AgencyIntyg() {
  const { user } = useAuth();
  const [orgName, setOrgName] = useState<string | null>(null);
  const [requests, setRequests] = useState<RepRequest[]>([]);
  const [counts, setCounts] = useState<Counts>({ total: 0, pending: 0, signed: 0, declined: 0 });
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [collision, setCollision] = useState<CollisionInfo | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [region, setRegion] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("org_members" as any)
      .select("organizations(name)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setOrgName((data as any)?.organizations?.name || null));
  }, [user]);

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
    setEmail(""); setAssignmentId(""); setRegion(""); setCollision(null);
  };

  const handleCreate = async () => {
    if (!email || !assignmentId || !region) {
      toast.error("Fyll i alla fält");
      return;
    }
    setCreating(true);
    setCollision(null);
    try {
      const { data, error } = await supabase.functions.invoke("representation-request", {
        body: {
          action: "create",
          consultant_email: email,
          assignment_id: assignmentId,
          region,
          agency_name: orgName || "Bemanningsföretag",
        },
      });
      if (error) {
        // Edge function returns 409 on collision with body { error: "collision", collision }
        const ctx = (error as any).context;
        if (ctx) {
          try {
            const parsed = await ctx.json();
            if (parsed?.error === "collision" && parsed.collision) {
              setCollision(parsed.collision);
              return;
            }
          } catch { /* ignore */ }
        }
        throw error;
      }
      if (data?.error === "collision" && data.collision) {
        setCollision(data.collision);
        return;
      }

      toast.success("Intyg skapat – inbjudan skickas via e-post");
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Skapa representationsintyg</DialogTitle>
              <DialogDescription>
                Konsulten får en inbjudan via e-post. Ingen inloggning krävs av motparten.
              </DialogDescription>
            </DialogHeader>

            {collision ? (
              <div className="space-y-4 pt-2">
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-foreground">
                        Konsulten är redan signerad för detta uppdrag
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <strong className="text-foreground">{email}</strong> har redan bekräftat
                        representation av <strong className="text-foreground">{collision.agency_name}</strong>{" "}
                        för uppdrag <span className="font-mono">{assignmentId}</span> den{" "}
                        {formatDate(collision.signed_at)}.
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Av integritets- och dubbelpresentations­skäl kan endast ett bemanningsföretag
                        i taget representera konsulten för samma uppdrag.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setCollision(null)}>
                    Ändra uppgifter
                  </Button>
                  <Button size="sm" className="flex-1" onClick={() => { resetForm(); setCreateOpen(false); }}>
                    Stäng
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div>
                  <Label htmlFor="email">Konsultens e-post</Label>
                  <Input id="email" type="email" placeholder="konsult@example.com"
                    value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="assignment">Uppdrags-ID</Label>
                  <Input id="assignment" placeholder="t.ex. AVR-2026-1234"
                    value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="region">Region</Label>
                  <Input id="region" placeholder="t.ex. Region Stockholm"
                    value={region} onChange={(e) => setRegion(e.target.value)} />
                </div>
                <Button size="sm" onClick={handleCreate} disabled={creating} className="w-full">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                  Skapa & skicka inbjudan
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  Stark autentisering (BankID) kommer i nästa version. Idag används länk­baserad bekräftelse.
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Totalt", value: counts.total },
          { label: "Väntande", value: counts.pending },
          { label: "Signerade", value: counts.signed },
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
                    <TableHead>Uppdrag</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Skapad</TableHead>
                    <TableHead className="text-right">Åtgärder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => {
                    const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium text-sm">{r.consultant_email}</TableCell>
                        <TableCell className="font-mono text-xs">{r.assignment_id}</TableCell>
                        <TableCell className="text-sm">{r.region}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 ${cfg.className}`}>
                            {cfg.icon}{cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(r.created_at)}</TableCell>
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
