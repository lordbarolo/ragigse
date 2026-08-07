import { useEffect, useState } from "react";
import { ExternalLink, FileCheck2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  createRegistryExtractOrder,
  listMyRegistryExtractOrders,
} from "@/lib/registryOrders.functions";
import { isValidPersonnummer } from "@/lib/personnummer";

type DocType = "hosp" | "ivo";

const SELF_SERVE_LINKS: { label: string; href: string; desc: string }[] = [
  {
    label: "Socialstyrelsen — HOSP",
    href: "https://legitimation.socialstyrelsen.se/ansok-om-intyg/legitimationskontroll-for-arbete-eller-studier-inom-sverige/",
    desc: "Begär intyg om legitimation själv.",
  },
  {
    label: "IVO — ta del av handlingar",
    href: "https://www.ivo.se/kontakt/ta-del-av-handlingar/",
    desc: "Begär utdrag om dig själv från IVO.",
  },
];

/** Beställning av HOSP-/IVO-utdrag (39 kr/dokument) samt länkar för att hämta själv. */
export default function RegistryExtractCard() {
  const submitOrder = useServerFn(createRegistryExtractOrder);
  const loadOrders = useServerFn(listMyRegistryExtractOrders);

  const [docType, setDocType] = useState<DocType>("hosp");
  const [fullName, setFullName] = useState("");
  const [pnr, setPnr] = useState("");
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<{ id: string; docType: DocType; status: string }[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        setOrders(await loadOrders({}));
      } catch {
        /* tyst — kortet fungerar utan historik */
      }
    })();
  }, [loadOrders]);

  async function order() {
    if (fullName.trim().length < 2) {
      toast.error("Ange ditt fullständiga namn.");
      return;
    }
    if (!isValidPersonnummer(pnr)) {
      toast.error("Personnummret ser inte ut att stämma. Ange det som ÅÅÅÅMMDD-XXXX.");
      return;
    }
    setSaving(true);
    try {
      const res = await submitOrder({ data: { docType, fullName: fullName.trim(), personnummer: pnr } });
      toast.success(
        res.alreadyPending
          ? "Du har redan en pågående beställning för det dokumentet."
          : "Beställningen är registrerad. Vi återkommer med betalning (39 kr) och dokumentet.",
      );
      setPnr("");
      setOrders(await loadOrders({}));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte skicka beställningen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#121319] p-6">
      <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5">
        <FileCheck2 className="h-4 w-4 text-white" />
      </span>
      <h3 className="mt-4 text-lg font-medium text-white">Vi hämtar ditt HOSP- eller IVO-utdrag</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/55">
        39 kr per dokument. Ange namn och personnummer — vi begär utdraget och lägger det direkt i
        din dokumentlista. Personnummret lagras krypterat och används bara för beställningen.
      </p>

      <div className="mt-5 flex gap-2">
        {(["hosp", "ivo"] as DocType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setDocType(t)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              docType === t
                ? "border-white bg-white text-[#0b0c10]"
                : "border-white/20 text-white/75 hover:bg-white/10"
            }`}
          >
            {t === "hosp" ? "HOSP-utdrag" : "IVO-utdrag"}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2.5">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="För- och efternamn"
          autoComplete="name"
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-white/25 focus:outline-none"
        />
        <input
          value={pnr}
          onChange={(e) => setPnr(e.target.value)}
          placeholder="Personnummer (ÅÅÅÅMMDD-XXXX)"
          inputMode="numeric"
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-white/25 focus:outline-none"
        />
      </div>

      <button
        type="button"
        onClick={() => void order()}
        disabled={saving}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0b0c10] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Beställ för 39 kr
      </button>

      {orders.length > 0 && (
        <ul className="mt-4 space-y-1">
          {orders.map((o) => (
            <li key={o.id} className="text-xs text-white/45">
              {o.docType === "hosp" ? "HOSP-utdrag" : "IVO-utdrag"} — {o.status === "pending" ? "behandlas" : o.status}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 border-t border-white/10 pt-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">Hämta själv</p>
        <div className="mt-3 space-y-2">
          {SELF_SERVE_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 transition-colors hover:bg-white/[0.05]"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm text-white/85">{l.label}</span>
                <span className="block truncate text-xs text-white/40">{l.desc}</span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/45" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
