import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, Trash2 } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_daily: number;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  notes: string | null;
}

const SCOPE_OPTIONS = ["rates:read", "market:read"];

export default function AgentApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScopes, setNewScopes] = useState<string[]>(["rates:read"]);
  const [newRate, setNewRate] = useState(1000);
  const [newNotes, setNewNotes] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("agent-api-admin", { method: "GET" as any });
    if (error) toast.error("Kunde inte ladda nycklar");
    else setKeys((data as any)?.keys || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!newName.trim()) { toast.error("Namn krävs"); return; }
    const { data, error } = await supabase.functions.invoke("agent-api-admin?action=create", {
      body: { name: newName, scopes: newScopes, rate_limit_daily: newRate, notes: newNotes },
    });
    if (error || (data as any)?.error) { toast.error("Kunde inte skapa"); return; }
    setCreatedToken((data as any).token);
    setNewName(""); setNewNotes(""); setNewScopes(["rates:read"]);
    load();
  }

  async function handleRevoke(id: string) {
    if (!confirm("Återkalla denna nyckel? Den slutar fungera direkt.")) return;
    const { error } = await supabase.functions.invoke("agent-api-admin?action=revoke", { body: { id } });
    if (error) toast.error("Kunde inte återkalla");
    else { toast.success("Återkallad"); load(); }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Agent API-nycklar</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Externa AI-agenter använder dessa nycklar för att läsa SKR-priser och marknadshistorik.
        Endast hashen sparas — visa originalet bara en gång.
      </p>

      {createdToken && (
        <Card className="p-4 mb-6 bg-accent/10 border-accent">
          <div className="text-sm font-semibold mb-2">Ny nyckel skapad — kopiera nu, den visas aldrig igen</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-background p-2 rounded text-xs break-all">{createdToken}</code>
            <Button
              variant="outline"
              className="text-sm font-semibold px-6 py-3"
              onClick={() => { navigator.clipboard.writeText(createdToken); toast.success("Kopierad"); }}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            className="text-sm font-semibold px-6 py-3 mt-3"
            onClick={() => setCreatedToken(null)}
          >
            Jag har sparat den
          </Button>
        </Card>
      )}

      {!showCreate ? (
        <Button className="text-sm font-semibold px-6 py-3 mb-6" onClick={() => setShowCreate(true)}>
          + Skapa nyckel
        </Button>
      ) : (
        <Card className="p-4 mb-6 space-y-3">
          <div>
            <Label>Namn</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="t.ex. Claude Agent — kund X" />
          </div>
          <div>
            <Label>Scopes</Label>
            <div className="flex gap-4 mt-1">
              {SCOPE_OPTIONS.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={newScopes.includes(s)}
                    onCheckedChange={(c) =>
                      setNewScopes(c ? [...newScopes, s] : newScopes.filter((x) => x !== s))
                    }
                  />
                  <code>{s}</code>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label>Anrop per dag</Label>
            <Input type="number" value={newRate} onChange={(e) => setNewRate(Number(e.target.value))} />
          </div>
          <div>
            <Label>Anteckningar (valfritt)</Label>
            <Input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button className="text-sm font-semibold px-6 py-3" onClick={handleCreate}>Skapa</Button>
            <Button variant="ghost" className="text-sm font-semibold px-6 py-3" onClick={() => setShowCreate(false)}>Avbryt</Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Laddar…</div>
      ) : keys.length === 0 ? (
        <div className="text-sm text-muted-foreground">Inga nycklar skapade än.</div>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => (
            <Card key={k.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{k.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <code>{k.key_prefix}…</code> · scopes: {k.scopes.join(", ")} · {k.rate_limit_daily}/dag
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Skapad {new Date(k.created_at).toLocaleDateString("sv-SE")} ·{" "}
                    {k.last_used_at ? `senast använd ${new Date(k.last_used_at).toLocaleDateString("sv-SE")}` : "aldrig använd"}
                    {k.revoked_at && " · ÅTERKALLAD"}
                  </div>
                  {k.notes && <div className="text-xs mt-2">{k.notes}</div>}
                </div>
                {!k.revoked_at && (
                  <Button
                    variant="ghost"
                    className="text-sm font-semibold px-6 py-3"
                    onClick={() => handleRevoke(k.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
