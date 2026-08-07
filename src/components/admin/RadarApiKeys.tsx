import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { KeyRound, Copy, Ban, Plus, Loader2, ArrowUpFromLine } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  consumer_project: string | null;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_hour: number;
  rate_limit_per_day: number;
  max_rows_per_request: number;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  notes: string | null;
  can_write: boolean;
  write_per_hour: number;
  write_per_day: number;
  max_write_rows_per_request: number;
  share_data: boolean;
  partner_source: string | null;
}

const ALL_SCOPES = ["predictions", "customer_intelligence", "calloff_imports"];

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `radar_live_${hex}`;
}

export default function RadarApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [consumerProject, setConsumerProject] = useState("");
  const [scopes, setScopes] = useState<string[]>([...ALL_SCOPES]);
  const [perHour, setPerHour] = useState(100);
  const [perDay, setPerDay] = useState(1000);
  const [maxRows, setMaxRows] = useState(100);
  const [notes, setNotes] = useState("");

  // Write/partner state
  const [canWrite, setCanWrite] = useState(false);
  const [partnerSource, setPartnerSource] = useState("");
  const [shareData, setShareData] = useState(false);
  const [writePerHour, setWritePerHour] = useState(100);
  const [writePerDay, setWritePerDay] = useState(1000);
  const [maxWriteRows, setMaxWriteRows] = useState(100);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("radar_api_keys")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Fel", description: error.message, variant: "destructive" });
    setKeys((data ?? []) as ApiKey[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setName("");
    setConsumerProject("");
    setScopes([...ALL_SCOPES]);
    setPerHour(100);
    setPerDay(1000);
    setMaxRows(100);
    setNotes("");
    setCanWrite(false);
    setPartnerSource("");
    setShareData(false);
    setWritePerHour(100);
    setWritePerDay(1000);
    setMaxWriteRows(100);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: "Namn krävs", variant: "destructive" });
      return;
    }
    if (canWrite && !partnerSource.trim()) {
      toast({ title: "Partner-källa krävs vid skrivåtkomst", description: "T.ex. 'partner-next'", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const apiKey = generateApiKey();
      const keyHash = await sha256Hex(apiKey);
      const keyPrefix = apiKey.slice(0, 16) + "…";

      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("radar_api_keys").insert({
        name: name.trim(),
        consumer_project: consumerProject.trim() || null,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        scopes,
        rate_limit_per_hour: perHour,
        rate_limit_per_day: perDay,
        max_rows_per_request: maxRows,
        notes: notes.trim() || null,
        created_by: user?.id ?? null,
        can_write: canWrite,
        partner_source: canWrite ? partnerSource.trim().toLowerCase() : null,
        share_data: shareData,
        write_per_hour: writePerHour,
        write_per_day: writePerDay,
        max_write_rows_per_request: maxWriteRows,
      });
      if (error) throw error;

      setNewKeyValue(apiKey);
      setShowCreate(false);
      resetForm();
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Kunde inte skapa nyckel", description: msg, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revokera nyckeln? Detta går inte att ångra.")) return;
    const { error } = await supabase
      .from("radar_api_keys")
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Fel", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Nyckel revokerad" });
      load();
    }
  };

  const toggleShareData = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("radar_api_keys")
      .update({ share_data: !current })
      .eq("id", id);
    if (error) {
      toast({ title: "Fel", description: error.message, variant: "destructive" });
    } else {
      toast({ title: !current ? "Datadelning aktiverad" : "Datadelning avaktiverad" });
      load();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" /> Uppdragsradar API-nycklar
            </CardTitle>
            <CardDescription>
              Hantera externa konsumenter av Uppdragsradar-API:t (radar-public-api). Nycklar visas en gång — kopiera direkt.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" /> Ny nyckel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Laddar…</div>
        ) : keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga API-nycklar har skapats än.</p>
        ) : (
          <div className="space-y-3">
            {keys.map((k) => (
              <div key={k.id} className="border border-border rounded-lg p-4 flex flex-col md:flex-row md:items-start gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{k.name}</span>
                    {k.is_active ? (
                      <Badge variant="default">Aktiv</Badge>
                    ) : (
                      <Badge variant="destructive">Revokerad</Badge>
                    )}
                    {k.consumer_project && (
                      <Badge variant="secondary">{k.consumer_project}</Badge>
                    )}
                    {k.can_write && (
                      <Badge variant="outline" className="border-primary text-primary">
                        <ArrowUpFromLine className="w-3 h-3 mr-1" /> Skriv
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground">{k.key_prefix}</div>
                  <div className="text-xs text-muted-foreground">
                    Scopes: {k.scopes.join(", ")} · Läs {k.rate_limit_per_hour}/h · {k.rate_limit_per_day}/d · max {k.max_rows_per_request} rader
                  </div>
                  {k.can_write && (
                    <div className="text-xs text-muted-foreground">
                      Skriv {k.write_per_hour}/h · {k.write_per_day}/d · max {k.max_write_rows_per_request} rader · partner: <code>{k.partner_source}</code> · delar data: <strong>{k.share_data ? "ja" : "nej"}</strong>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Skapad {new Date(k.created_at).toLocaleString("sv-SE")}
                    {k.last_used_at && ` · Senast använd ${new Date(k.last_used_at).toLocaleString("sv-SE")}`}
                  </div>
                  {k.notes && <div className="text-xs italic text-muted-foreground">{k.notes}</div>}
                </div>
                <div className="flex flex-col gap-2">
                  {k.can_write && k.is_active && (
                    <Button size="sm" variant="outline" onClick={() => toggleShareData(k.id, k.share_data)}>
                      {k.share_data ? "Sluta dela data" : "Aktivera datadelning"}
                    </Button>
                  )}
                  {k.is_active && (
                    <Button size="sm" variant="outline" onClick={() => handleRevoke(k.id)}>
                      <Ban className="w-4 h-4 mr-1" /> Revokera
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Skapa API-nyckel</DialogTitle>
            <DialogDescription>Konfigurera scopes, rate limits och eventuell skrivåtkomst per konsument.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Namn *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="t.ex. Partner Next" />
            </div>
            <div>
              <Label>Konsumentprojekt (valfritt)</Label>
              <Input value={consumerProject} onChange={(e) => setConsumerProject(e.target.value)} placeholder="lovable-project-id eller domän" />
            </div>
            <div>
              <Label>Scopes</Label>
              <div className="space-y-2 mt-1">
                {ALL_SCOPES.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={scopes.includes(s)}
                      onCheckedChange={(c) => {
                        setScopes(c ? [...new Set([...scopes, s])] : scopes.filter((x) => x !== s));
                      }}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Läs/h</Label>
                <Input type="number" value={perHour} onChange={(e) => setPerHour(Number(e.target.value))} />
              </div>
              <div>
                <Label>Läs/dag</Label>
                <Input type="number" value={perDay} onChange={(e) => setPerDay(Number(e.target.value))} />
              </div>
              <div>
                <Label>Max rader</Label>
                <Input type="number" value={maxRows} onChange={(e) => setMaxRows(Number(e.target.value))} />
              </div>
            </div>

            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="flex items-center gap-2">
                    <ArrowUpFromLine className="w-4 h-4" /> Skrivåtkomst (POST)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tillåter partnern att skicka in egna avrop till <code>/calloff_imports</code>.
                  </p>
                </div>
                <Switch checked={canWrite} onCheckedChange={setCanWrite} />
              </div>

              {canWrite && (
                <>
                  <div>
                    <Label>Partner-källa *</Label>
                    <Input
                      value={partnerSource}
                      onChange={(e) => setPartnerSource(e.target.value)}
                      placeholder="t.ex. partner-next"
                    />
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Taggas på alla rader partnern skickar in. Används för dedup och datasynlighet.
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Dela data publikt</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Av: bara partnern ser sin egen data. På: ingår i radarns publika aggregat (märkt med källa).
                      </p>
                    </div>
                    <Switch checked={shareData} onCheckedChange={setShareData} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label>Skriv/h</Label>
                      <Input type="number" value={writePerHour} onChange={(e) => setWritePerHour(Number(e.target.value))} />
                    </div>
                    <div>
                      <Label>Skriv/dag</Label>
                      <Input type="number" value={writePerDay} onChange={(e) => setWritePerDay(Number(e.target.value))} />
                    </div>
                    <div>
                      <Label>Max rader/req</Label>
                      <Input type="number" value={maxWriteRows} onChange={(e) => setMaxWriteRows(Number(e.target.value))} />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div>
              <Label>Anteckningar</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Avbryt</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Skapa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show new key dialog */}
      <Dialog open={!!newKeyValue} onOpenChange={(o) => !o && setNewKeyValue(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API-nyckel skapad</DialogTitle>
            <DialogDescription>
              Kopiera nyckeln nu — den visas inte igen. Vi sparar endast en hash i databasen.
            </DialogDescription>
          </DialogHeader>
          {newKeyValue && (
            <div className="space-y-2">
              <div className="font-mono text-xs bg-muted p-3 rounded break-all">{newKeyValue}</div>
              <Button
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(newKeyValue);
                  toast({ title: "Kopierad" });
                }}
              >
                <Copy className="w-4 h-4 mr-1" /> Kopiera
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setNewKeyValue(null)}>Stäng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
