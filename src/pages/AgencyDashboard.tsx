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
  const [orgName, setOrgName] = useState("");
  const [orgNumber, setOrgNumber] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!orgName.trim()) {
      toast.error("Ange företagsnamn");
      return;
    }
    setCreating(true);
    try {
      // 1. Create organization
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

      // 2. Create membership
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

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center pb-2">
          <Building2 className="mx-auto h-10 w-10 text-primary mb-3" />
          <CardTitle className="text-xl">Välkommen till CompCare</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Registrera ditt bemanningsföretag för att börja skapa representationsbevis.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
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
