import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, Trash2 } from "lucide-react";

interface UserToken {
  id: string;
  label: string;
  token_prefix: string;
  expires_at: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

const TTL_OPTIONS = [
  { label: "7 dagar", days: 7 },
  { label: "30 dagar", days: 30 },
  { label: "90 dagar", days: 90 },
  { label: "1 år", days: 365 },
];

export default function AgentAccess() {
  const [tokens, setTokens] = useState<UserToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [newTtl, setNewTtl] = useState(30);
  const [created, setCreated] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("agent-api-user-tokens", { method: "GET" as any });
    if (error) toast.error("Kunde inte ladda tokens");
    else setTokens((data as any)?.tokens || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!newLabel.trim()) { toast.error("Etikett krävs"); return; }
    const { data, error } = await supabase.functions.invoke("agent-api-user-tokens?action=create", {
      body: { label: newLabel, ttl_days: newTtl },
    });
    if (error || (data as any)?.error) { toast.error("Kunde inte skapa"); return; }
    setCreated((data as any).token);
    setNewLabel("");
    load();
  }

  async function handleRevoke(id: string) {
    if (!confirm("Återkalla denna token?")) return;
    const { error } = await supabase.functions.invoke("agent-api-user-tokens?action=revoke", { body: { id } });
    if (error) toast.error("Kunde inte återkalla");
    else { toast.success("Återkallad"); load(); }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Agentåtkomst</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Skapa personliga tokens som du kan ge till en AI-agent (t.ex. Claude eller ChatGPT). Agenten kan då
        läsa din professionella profil (roll, region, erfarenhetsnivå) — men aldrig ditt namn, e-post eller dokument.
        Tokens kan återkallas när som helst.
      </p>

      {created && (
        <Card className="p-4 mb-6 bg-accent/10 border-accent">
          <div className="text-sm font-semibold mb-2">Token skapad — kopiera nu, den visas aldrig igen</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-background p-2 rounded text-xs break-all">{created}</code>
            <Button
              variant="outline"
              className="text-sm font-semibold px-6 py-3"
              onClick={() => { navigator.clipboard.writeText(created); toast.success("Kopierad"); }}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            className="text-sm font-semibold px-6 py-3 mt-3"
            onClick={() => setCreated(null)}
          >
            Jag har sparat den
          </Button>
        </Card>
      )}

      <Card className="p-4 mb-6 space-y-3">
        <div>
          <Label>Etikett</Label>
          <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="t.ex. Min Claude-agent" />
        </div>
        <div>
          <Label>Giltighetstid</Label>
          <div className="flex gap-2 mt-1">
            {TTL_OPTIONS.map((o) => (
              <Button
                key={o.days}
                variant={newTtl === o.days ? "default" : "outline"}
                className="text-sm font-semibold px-6 py-3"
                onClick={() => setNewTtl(o.days)}
              >
                {o.label}
              </Button>
            ))}
          </div>
        </div>
        <Button className="text-sm font-semibold px-6 py-3" onClick={handleCreate}>Skapa token</Button>
      </Card>

      {loading ? (
        <div className="text-sm text-muted-foreground">Laddar…</div>
      ) : tokens.length === 0 ? (
        <div className="text-sm text-muted-foreground">Inga tokens skapade än.</div>
      ) : (
        <div className="space-y-2">
          {tokens.map((t) => {
            const expired = new Date(t.expires_at) < new Date();
            return (
              <Card key={t.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{t.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <code>{t.token_prefix}…</code> · går ut {new Date(t.expires_at).toLocaleDateString("sv-SE")}
                      {expired && " · UTGÅNGEN"}
                      {t.revoked_at && " · ÅTERKALLAD"}
                    </div>
                    {t.last_used_at && (
                      <div className="text-xs text-muted-foreground">
                        Senast använd {new Date(t.last_used_at).toLocaleString("sv-SE")}
                      </div>
                    )}
                  </div>
                  {!t.revoked_at && !expired && (
                    <Button
                      variant="ghost"
                      className="text-sm font-semibold px-6 py-3"
                      onClick={() => handleRevoke(t.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
