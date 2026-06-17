import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureFlag } from "@/lib/featureFlags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Navigate, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

type Listing = {
  id: string;
  status: "draft" | "published" | "paused" | "closed";
  role: string;
  specialization: string | null;
  region: string | null;
  kommun: string | null;
  available_from: string | null;
  available_to: string | null;
  hours_per_week: number | null;
  employment_type: "anstalld" | "foretagare";
  price_min_sek: number;
  price_max_sek: number;
  terms_md: string | null;
  verified_at_publish: boolean;
  published_at: string | null;
};

type Offer = {
  id: string;
  listing_id: string;
  agent_id: string;
  agent_org: string | null;
  offered_price_sek: number;
  start_date: string | null;
  end_date: string | null;
  hours_per_week: number | null;
  message_md: string | null;
  status: "pending" | "accepted" | "rejected" | "countered" | "withdrawn";
  created_at: string;
};

export default function MarketplaceHome() {
  const flag = useFeatureFlag("marketplace_enabled");
  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<Listing | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    role: "",
    specialization: "",
    region: "",
    kommun: "",
    available_from: "",
    available_to: "",
    hours_per_week: 40,
    employment_type: "foretagare" as "anstalld" | "foretagare",
    price_min_sek: 900,
    price_max_sek: 1100,
    terms_md: "",
  });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { setLoading(false); return; }
      const { data: l } = await supabase
        .from("mp_listings" as any)
        .select("*")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (l) {
        setListing(l as any);
        setForm({
          role: (l as any).role,
          specialization: (l as any).specialization ?? "",
          region: (l as any).region ?? "",
          kommun: (l as any).kommun ?? "",
          available_from: (l as any).available_from ?? "",
          available_to: (l as any).available_to ?? "",
          hours_per_week: (l as any).hours_per_week ?? 40,
          employment_type: (l as any).employment_type,
          price_min_sek: (l as any).price_min_sek,
          price_max_sek: (l as any).price_max_sek,
          terms_md: (l as any).terms_md ?? "",
        });
        const { data: o } = await supabase
          .from("mp_offers" as any)
          .select("id,listing_id,agent_id,agent_org,offered_price_sek,start_date,end_date,hours_per_week,message_md,status,created_at")
          .eq("listing_id", (l as any).id)
          .order("created_at", { ascending: false });
        setOffers((o ?? []) as any);
      }
      setLoading(false);
    })();
  }, []);

  if (!flag) return <Navigate to="/" replace />;

  async function save(targetStatus: "draft" | "published") {
    setSaving(true);
    const payload: any = {
      ...form,
      status: targetStatus,
      specialization: form.specialization || null,
      region: form.region || null,
      kommun: form.kommun || null,
      available_from: form.available_from || null,
      available_to: form.available_to || null,
      terms_md: form.terms_md || null,
    };
    if (listing?.id) payload.id = listing.id;
    const { data, error } = await supabase.functions.invoke("marketplace-listing-upsert", { body: payload });
    setSaving(false);
    if (error) { toast.error(error.message ?? "Kunde inte spara"); return; }
    if ((data as any)?.error) { toast.error((data as any).error); return; }
    toast.success(targetStatus === "published" ? "Listing publicerad" : "Sparad som utkast");
    setListing((data as any).listing);
  }

  async function respond(offerId: string, decision: "accepted" | "rejected") {
    const { data, error } = await supabase.functions.invoke("marketplace-offer-respond", {
      body: { offer_id: offerId, decision },
    });
    if (error || (data as any)?.error) { toast.error("Kunde inte uppdatera bud"); return; }
    setOffers((prev) => prev.map((o) => o.id === offerId ? { ...o, status: decision } : o));
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Marketplace · steg 1 (privat)</p>
          <h1 className="text-3xl font-semibold">Din ask</h1>
          <p className="text-sm text-muted-foreground">
            Definiera roll, geografi, tillgänglighet och prisspann. När du publicerar blir den läsbar för agenter via en signerad endpoint.
          </p>
        </header>

        <Card className="p-6 space-y-4 backdrop-blur-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Roll</Label>
              <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Anestesisjuksköterska" />
            </div>
            <div>
              <Label>Subspecialitet</Label>
              <Input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
            </div>
            <div>
              <Label>Region</Label>
              <Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
            </div>
            <div>
              <Label>Kommun</Label>
              <Input value={form.kommun} onChange={(e) => setForm({ ...form, kommun: e.target.value })} />
            </div>
            <div>
              <Label>Tillgänglig från</Label>
              <Input type="date" value={form.available_from} onChange={(e) => setForm({ ...form, available_from: e.target.value })} />
            </div>
            <div>
              <Label>Tillgänglig till</Label>
              <Input type="date" value={form.available_to} onChange={(e) => setForm({ ...form, available_to: e.target.value })} />
            </div>
            <div>
              <Label>Timmar/vecka</Label>
              <Input type="number" min={1} max={80} value={form.hours_per_week} onChange={(e) => setForm({ ...form, hours_per_week: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Anställningsform</Label>
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.employment_type}
                onChange={(e) => setForm({ ...form, employment_type: e.target.value as any })}>
                <option value="foretagare">Företagare</option>
                <option value="anstalld">Anställd</option>
              </select>
            </div>
            <div>
              <Label>Min pris (SEK/h)</Label>
              <Input type="number" value={form.price_min_sek} onChange={(e) => setForm({ ...form, price_min_sek: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Max pris (SEK/h)</Label>
              <Input type="number" value={form.price_max_sek} onChange={(e) => setForm({ ...form, price_max_sek: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <Label>Villkor (markdown)</Label>
            <Textarea rows={4} value={form.terms_md} onChange={(e) => setForm({ ...form, terms_md: e.target.value })} placeholder="Ex: Endast dagtid. Reseersättning utöver pris." />
          </div>
          <div className="flex gap-3 pt-2">
            <Button disabled={saving} onClick={() => save("draft")} className="text-sm font-semibold px-6 py-3" variant="secondary">Spara utkast</Button>
            <Button disabled={saving} onClick={() => save("published")} className="text-sm font-semibold px-6 py-3">
              {saving ? "Sparar…" : listing?.status === "published" ? "Uppdatera publicering" : "Publicera"}
            </Button>
          </div>
          {listing?.status === "published" && (
            <p className="text-xs text-muted-foreground">
              Status: <strong>publicerad</strong> · Din data-verifierad: <strong>{listing.verified_at_publish ? "Ja" : "Nej"}</strong>
            </p>
          )}
        </Card>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Bud från agenter</h2>
          {offers.length === 0 && (
            <p className="text-sm text-muted-foreground">Inga bud än.</p>
          )}
          <div className="space-y-3">
            {offers.map((o) => (
              <Card key={o.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm">
                    <strong>{o.offered_price_sek} kr/h</strong> · {o.agent_org ?? o.agent_id}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.start_date ?? "?"} → {o.end_date ?? "?"} · {o.hours_per_week ?? "?"}h/v · {new Date(o.created_at).toLocaleDateString("sv-SE")}
                  </p>
                  {o.message_md && <p className="text-xs text-muted-foreground">{o.message_md}</p>}
                  <p className="text-xs">Status: <strong>{o.status}</strong></p>
                </div>
                {o.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" className="text-sm font-semibold px-6 py-3" onClick={() => respond(o.id, "rejected")}>Avslå</Button>
                    <Button size="sm" className="text-sm font-semibold px-6 py-3" onClick={() => respond(o.id, "accepted")}>Acceptera</Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>

        <p className="text-xs text-muted-foreground">
          <Link to="/consultant/profil" className="underline">Tillbaka till profil</Link>
        </p>
      </div>
    </div>
  );
}
