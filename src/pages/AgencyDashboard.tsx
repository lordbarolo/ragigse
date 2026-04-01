import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Copy, Clock, ShieldCheck, XCircle, FileText, Building2 } from "lucide-react";
import { toast } from "sonner";

interface RepresentationRequest {
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
}

interface Counts {
  total: number;
  pending: number;
  signed: number;
  declined: number;
}

interface OrgMembership {
  organization_id: string;
  organizations?: { name: string; org_number: string | null } | null;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  pending: {
    label: "Väntande",
    icon: <Clock className="h-3 w-3" />,
    className: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  },
  signed: {
    label: "Signerat",
    icon: <ShieldCheck className="h-3 w-3" />,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  declined: {
    label: "Avböjd",
    icon: <XCircle className="h-3 w-3" />,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  expired: {
    label: "Utgånget",
    icon: <Clock className="h-3 w-3" />,
    className: "bg-muted text-muted-foreground border-border",
  },
};

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("sv-SE", { year: "numeric", month: "short", day: "numeric" });
}

// ── Agency Onboarding ─────────────────────────────────
function AgencyOnboarding({ userId, onComplete }: { userId: string; onComplete: () => void }) {
  const [tab, setTab] = useState<"create" | "join">("create");
  const [orgName, setOrgName] = useState("");
  const [orgNumber, setOrgNumber] = useState("");
  const [creating, setCreating] = useState(false);

  // Join existing org
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; name: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const handleCreate = async () => {
    if (!orgName.trim()) {
      toast.error("Ange företagsnamn");
      return;
    }
    setCreating(true);
    try {
      const { data: org, error: orgErr } = await supabase
        .from("organizations")
        .insert({
          name: orgName.trim(),
          org_number: orgNumber.trim() || null,
          type: "staffing_agency",
        })
        .select("id")
        .single();

      if (orgErr) throw orgErr;

      const { error: memErr } = await supabase
        .from("org_members" as any)
        .insert({
          user_id: userId,
          organization_id: org.id,
          role: "admin",
        });

      if (memErr) throw memErr;

      toast.success("Organisation skapad!");
      onComplete();
    } catch (err: any) {
      console.error("[AgencyOnboarding]", err);
      toast.error(err.message || "Kunde inte skapa organisation");
    } finally {
      setCreating(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("type", "staffing_agency")
        .ilike("name", `%${searchQuery.trim()}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch {
      toast.error("Kunde inte söka");
    } finally {
      setSearching(false);
    }
  };

  const handleRequestMembership = async (orgId: string, name: string) => {
    try {
      const { error } = await supabase
        .from("org_membership_requests" as any)
        .insert({ user_id: userId, organization_id: orgId });

      if (error) throw error;
      setRequestSent(true);
      toast.success(`Förfrågan skickad till ${name}`);
    } catch (err: any) {
      if (err.code === "23505") {
        toast.info("Du har redan en aktiv förfrågan till denna organisation");
      } else {
        toast.error("Kunde inte skicka förfrågan");
      }
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center pb-2">
          <Building2 className="mx-auto h-10 w-10 text-primary mb-3" />
          <CardTitle className="text-xl">Välkommen till CompCare</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Registrera eller anslut till ditt bemanningsföretag för att komma igång.
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Tab switcher */}
          <div className="flex gap-1 bg-muted rounded-lg p-1 mb-5">
            <button
              onClick={() => setTab("create")}
              className={`flex-1 text-xs font-medium py-2 px-3 rounded-md transition-colors ${tab === "create" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Skapa nytt företag
            </button>
            <button
              onClick={() => setTab("join")}
              className={`flex-1 text-xs font-medium py-2 px-3 rounded-md transition-colors ${tab === "join" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Anslut till befintligt
            </button>
          </div>

          {tab === "create" ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="org-name">Företagsnamn *</Label>
                <Input
                  id="org-name"
                  placeholder="t.ex. Medhelp AB"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  maxLength={200}
                />
              </div>
              <div>
                <Label htmlFor="org-number">Organisationsnummer</Label>
                <Input
                  id="org-number"
                  placeholder="t.ex. 556123-4567"
                  value={orgNumber}
                  onChange={(e) => setOrgNumber(e.target.value)}
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground mt-1">Valfritt, men rekommenderas för verifiering.</p>
              </div>
              <Button onClick={handleCreate} disabled={creating} className="w-full">
                {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Skapa organisation
              </Button>
            </div>
          ) : requestSent ? (
            <div className="text-center py-8">
              <Clock className="mx-auto h-8 w-8 text-primary mb-3" />
              <p className="text-sm font-medium text-foreground">Förfrågan skickad</p>
              <p className="text-xs text-muted-foreground mt-1">En administratör i organisationen behöver godkänna din förfrågan.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="org-search">Sök efter företagsnamn</Label>
                <div className="flex gap-2">
                  <Input
                    id="org-search"
                    placeholder="t.ex. Medhelp"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    maxLength={100}
                  />
                  <Button variant="outline" size="sm" onClick={handleSearch} disabled={searching || searchQuery.trim().length < 2}>
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sök"}
                  </Button>
                </div>
              </div>
              {searchResults.length > 0 && (
                <div className="border rounded-lg divide-y">
                  {searchResults.map((org) => (
                    <div key={org.id} className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-sm font-medium text-foreground">{org.name}</span>
                      <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => handleRequestMembership(org.id, org.name)}>
                        Ansök
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {searchResults.length === 0 && searchQuery.trim().length >= 2 && !searching && (
                <p className="text-xs text-muted-foreground text-center py-4">Inga resultat. Prova ett annat sökord eller skapa ett nytt företag.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────
export default function AgencyDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [orgName, setOrgName] = useState<string | null>(null);
  const [hasOrg, setHasOrg] = useState<boolean | null>(null);
  const [requests, setRequests] = useState<RepresentationRequest[]>([]);
  const [counts, setCounts] = useState<Counts>({ total: 0, pending: 0, signed: 0, declined: 0 });
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [region, setRegion] = useState("");

  const checkOrg = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("org_members" as any)
      .select("organization_id, organizations(name)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setHasOrg(true);
      setOrgName((data as any).organizations?.name || "Organisation");
    } else {
      setHasOrg(false);
    }
  }, [user]);

  useEffect(() => {
    checkOrg();
  }, [checkOrg]);

  const refresh = useCallback(async () => {
    if (!user || !hasOrg) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("representation-request", {
        body: { action: "list" },
      });
      if (error) throw error;
      setRequests(data.requests || []);
      setCounts(data.counts || { total: 0, pending: 0, signed: 0, declined: 0 });
    } catch (err) {
      console.error("[AgencyDashboard] Error:", err);
      toast.error("Kunde inte hämta data");
    } finally {
      setLoading(false);
    }
  }, [user, hasOrg]);

  useEffect(() => {
    if (hasOrg) refresh();
  }, [hasOrg, refresh]);

  const handleCreate = async () => {
    if (!email || !assignmentId || !region) {
      toast.error("Fyll i alla fält");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("representation-request", {
        body: {
          action: "create",
          consultant_email: email,
          assignment_id: assignmentId,
          region,
          agency_name: orgName || user?.email?.split("@")[1] || "Bemanningsföretag",
        },
      });
      if (error) throw error;
      toast.success("Förfrågan skapad!");
      const signingUrl = `${window.location.origin}/sign/${data.created.secret_token}`;
      await navigator.clipboard.writeText(signingUrl);
      toast.info("Signeringslänk kopierad till urklipp");
      setEmail("");
      setAssignmentId("");
      setRegion("");
      setCreateOpen(false);
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Kunde inte skapa förfrågan");
    } finally {
      setCreating(false);
    }
  };

  const copyVerifyLink = (req: RepresentationRequest) => {
    const id = req.verification_id || req.id;
    const url = `${window.location.origin}/verify/${id}`;
    navigator.clipboard.writeText(url);
    toast.success("Verifieringslänk kopierad");
  };

  const copySigningLink = (req: RepresentationRequest) => {
    const url = `${window.location.origin}/sign/${req.secret_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Signeringslänk kopierad");
  };

  if (authLoading || hasOrg === null) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Onboarding: no organization yet
  if (!hasOrg) {
    return <AgencyOnboarding userId={user!.id} onComplete={() => checkOrg()} />;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Representationsbevis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {orgName} · Hantera intygsförfrågningar
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" />
              Ny förfrågan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Skapa ny intygsförfrågan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label htmlFor="email">Konsultens e-post</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="konsult@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="assignment">Uppdrags-ID</Label>
                <Input
                  id="assignment"
                  placeholder="t.ex. AVR-2026-1234"
                  value={assignmentId}
                  onChange={(e) => setAssignmentId(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="region">Region</Label>
                <Input
                  id="region"
                  placeholder="t.ex. Region Stockholm"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                />
              </div>
              <Button onClick={handleCreate} disabled={creating} className="w-full">
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Skicka förfrågan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* How Verify works */}
      <div className="rounded-2xl bg-primary/5 border border-primary/10 p-5 mb-6">
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            { step: "1", text: "Skapa en representations\u00ADförfrågan" },
            { step: "2", text: "Konsulten signerar med BankID" },
            { step: "3", text: "Digitalt bevis skapas automatiskt" },
          ].map((item) => (
            <div key={item.step} className="flex flex-col items-center text-center gap-2">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-foreground">{item.step}</span>
              </div>
              <p className="text-xs text-foreground leading-snug">{item.text}</p>
            </div>
          ))}
        </div>
        <h2 className="text-lg font-bold text-foreground mb-2">Så här funkar Verify</h2>
        <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
          <p>
            Verify eliminerar risken för dubbelpresentationer hos uppdragsgivare. Istället för att regioner och kommuner ska behöva hantera
            oklarheter kring vilken byrå som representerar en konsult, skapar ni ett digitalt representationsbevis som konsulten signerar med BankID.
          </p>
          <p>
            <strong className="text-foreground">Skapa en förfrågan</strong> — Ange konsultens e-post, uppdrags-ID och region. Konsulten
            får ett SMS med en signeringslänk. Ingen inloggning krävs av konsulten — bara BankID.
          </p>
          <p>
            <strong className="text-foreground">Beviset genereras automatiskt</strong> — När signeringen är klar skapas ett verifieringsbevis
            med unik URL som ni kan skicka direkt till uppdragsgivaren. Beviset innehåller konsultens verifierade meriter, BankID-signatur
            och en komplett händelselogg.
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-foreground tabular-nums">{counts.pending}</p>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Väntande</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-primary tabular-nums">{counts.signed}</p>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Signerade</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-foreground tabular-nums">{counts.total}</p>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Totalt</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alla förfrågningar</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Inga förfrågningar ännu</p>
              <p className="text-xs text-muted-foreground mt-1">Klicka "Ny förfrågan" för att skapa er första.</p>
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
                    <TableHead className="text-right">Åtgärd</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => {
                    const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                    return (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium text-sm">{req.consultant_email}</TableCell>
                        <TableCell className="font-mono text-xs">{req.assignment_id}</TableCell>
                        <TableCell className="text-sm">{req.region}</TableCell>
                        <TableCell>
                          <Badge className={`border text-[10px] font-medium gap-1 ${cfg.className}`}>
                            {cfg.icon}
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(req.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          {req.status === "signed" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-xs h-7"
                              onClick={() => copyVerifyLink(req)}
                            >
                              <Copy className="h-3 w-3" />
                              Kopiera bevis
                            </Button>
                          ) : req.status === "pending" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1 text-xs h-7"
                              onClick={() => copySigningLink(req)}
                            >
                              <Copy className="h-3 w-3" />
                              Kopiera länk
                            </Button>
                          ) : null}
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
