import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SearchableSelect from "@/components/SearchableSelect";
import { basePrices, roleOptions5c, type RateRow } from "@/components/startsida5c/rate5c";
import { roleLabel5c, roleKeywords5c } from "@/components/startsida5c/roleLabels5c";
import { saveProfileContext, type ProfileContext } from "@/lib/profileContext";

interface Props {
  userId: string;
  context: ProfileContext;
  onSaved: () => void | Promise<unknown>;
}

/**
 * Visar användarens profiluppgifter (roll, ort, kontraktsform, ersättning) i
 * hero-kolumnen när de fyra frågorna är besvarade — direkt redigerbara.
 * Sparas till samma profil som assistenten och verktygen läser.
 */
export default function ProfileContextCard({ userId, context, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState(context.role ?? "");
  const [kommun, setKommun] = useState(context.kommun ?? "");
  const [employment, setEmployment] = useState(context.employmentType ?? "");
  const [rate, setRate] = useState(context.hourlyRate ? String(context.hourlyRate) : "");

  useEffect(() => {
    if (editing) return;
    setRole(context.role ?? "");
    setKommun(context.kommun ?? "");
    setEmployment(context.employmentType ?? "");
    setRate(context.hourlyRate ? String(context.hourlyRate) : "");
  }, [context, editing]);

  const { data: rates } = useQuery({
    queryKey: ["profile-assistant-rates"],
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      const { data, error } = await supabase.from("rates").select("*");
      if (error) throw error;
      return basePrices(data as unknown as RateRow[]);
    },
  });

  const { data: locations } = useQuery({
    queryKey: ["profile-assistant-locations"],
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("kommun").order("kommun");
      if (error) throw error;
      return data ?? [];
    },
  });

  const roleOptions = useMemo(
    () =>
      roleOptions5c(rates ?? [])
        .map((r) => ({ value: r, label: roleLabel5c(r), keywords: roleKeywords5c(r) }))
        .sort((a, b) => a.label.localeCompare(b.label, "sv")),
    [rates],
  );

  const kommunOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of locations ?? []) if (l.kommun) set.add(l.kommun);
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b, "sv"))
      .map((k) => ({ value: k, label: k }));
  }, [locations]);

  const rateNumber = Number(rate.replace(/\s/g, ""));
  const canSave =
    !!role && !!kommun && !!employment && Number.isFinite(rateNumber) && rateNumber > 0;

  const dirty =
    role !== (context.role ?? "") ||
    kommun !== (context.kommun ?? "") ||
    employment !== (context.employmentType ?? "") ||
    rateNumber !== (context.hourlyRate ?? 0);

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      await saveProfileContext(userId, {
        role,
        kommun,
        employmentType: employment,
        hourlyRate: rateNumber,
      });
      await onSaved();
      setEditing(false);
      toast.success("Profilen är uppdaterad — verktygen använder de nya uppgifterna.");
    } catch (err) {
      console.error("[ProfileContextCard] save failed", err);
      toast.error("Kunde inte spara ändringen. Försök igen.");
    } finally {
      setSaving(false);
    }
  }

  const rows: { label: string; value: string; icon: typeof Briefcase }[] = [
    {
      label: "Yrke",
      value: context.role ? roleLabel5c(context.role) : "—",
      icon: Briefcase,
    },
    { label: "Ort", value: context.kommun ?? "—", icon: MapPin },
    {
      label: "Kontraktsform",
      value: context.employmentType === "foretagare" ? "Företagare" : "Anställd",
      icon: FileText,
    },
    {
      label: "Ersättning",
      value: context.hourlyRate ? `${context.hourlyRate.toLocaleString("sv-SE")} kr/timme` : "—",
      icon: Coins,
    },
  ];

  return (
    <div className="mt-6 max-w-md overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[0_20px_50px_-30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-3.5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Dina uppgifter</p>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70 transition-colors hover:border-white/30 hover:bg-white/[0.08] hover:text-white"
        >
          {editing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          {editing ? "Stäng" : "Ändra"}
        </button>
      </div>

      {!editing ? (
        <dl className="grid grid-cols-1 gap-px bg-white/10 sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.label} className="bg-[#0b0c10]/40 px-5 py-4">
              <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-white/40">
                <r.icon className="h-3.5 w-3.5" />
                {r.label}
              </dt>
              <dd className="mt-1.5 text-sm font-medium leading-snug text-white">{r.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="px-5 pb-5">
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-white/45">Yrke</label>
            <SearchableSelect
              options={roleOptions}
              value={role}
              onValueChange={setRole}
              placeholder="Välj yrke"
              triggerClassName="mt-1 w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-white"
              placeholderClassName="text-white/40"
            />
          </div>
          <div>
            <label className="text-xs text-white/45">Ort</label>
            <SearchableSelect
              options={kommunOptions}
              value={kommun}
              onValueChange={setKommun}
              placeholder="Välj kommun"
              triggerClassName="mt-1 w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-white"
              placeholderClassName="text-white/40"
            />
          </div>
          <div>
            <label className="text-xs text-white/45">Kontraktsform</label>
            <div className="mt-1 flex gap-2">
              {[
                { value: "anstalld", label: "Anställd" },
                { value: "foretagare", label: "Företagare" },
              ].map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setEmployment(o.value)}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    employment === o.value
                      ? "border-white/40 bg-white/10 text-white"
                      : "border-white/15 text-white/60 hover:border-white/30"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-white/45" htmlFor="profile-rate">
              Timersättning (kr/timme)
            </label>
            <input
              id="profile-rate"
              inputMode="numeric"
              value={rate}
              onChange={(e) => setRate(e.target.value.replace(/[^\d\s]/g, ""))}
              placeholder="t.ex. 620"
              className="mt-1 w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={save}
            disabled={!canSave || !dirty || saving}
            className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0b0c10] transition-opacity disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Spara ändringar
          </button>
        </div>
      )}
    </div>
  );
}
