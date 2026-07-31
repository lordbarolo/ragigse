import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { filterPublicRoles } from "@/lib/roleVisibility";

type Msg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  source?: string;
};

type PresetKey = "pris" | "fakturera" | "zoner" | "avrop" | "ramavtal" | "anstallningsform" | "uppgifter";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "pris", label: "Vad betalar regionen för min roll?" },
  { key: "fakturera", label: "Vad kan jag fakturera efter bolagets marginal?" },
  { key: "zoner", label: "Hur skiljer sig priset mellan zonerna?" },
  { key: "avrop", label: "Vilka avrop har publicerats senaste 30 dagarna?" },
  { key: "ramavtal", label: "Vad ingår i SKR:s ramavtal — och vad ingår inte?" },
  { key: "anstallningsform", label: "Hur påverkar anställningsform min ersättning?" },
  { key: "uppgifter", label: "Vilka uppgifter behöver ni om mig?" },
];

const ZONES = ["Zon 1", "Zon 2", "Zon 3"];

let idc = 0;
const nid = () => `m${++idc}`;

/**
 * HomeAssistantChat — startsidans assistent (dev).
 * Publikt: endast fördefinierade frågor. Fritext kräver konto.
 */
export default function HomeAssistantChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: nid(),
      role: "assistant",
      text: "Hej! Jag är din CompCare-assistent. Välj en fråga så svarar jag utifrån SKR:s ramavtal och publicerade avrop.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [pending, setPending] = useState<{ key: PresetKey; role?: string } | null>(null);
  const [needs, setNeeds] = useState<"role" | "zone" | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, needs, loading]);

  useEffect(() => {
    supabase.functions
      .invoke("home-assistant", { body: { action: "roles" } })
      .then(({ data }) => {
        const list: string[] = data?.roles ?? [];
        setRoles(filterPublicRoles(list, (r) => r));
      })
      .catch(() => setRoles([]));
  }, []);

  const push = (m: Omit<Msg, "id">) => setMessages((prev) => [...prev, { ...m, id: nid() }]);

  async function ask(key: PresetKey, role?: string, zone?: string) {
    setLoading(true);
    setNeeds(null);
    try {
      const { data, error } = await supabase.functions.invoke("home-assistant", {
        body: { action: "answer", key, role, zone },
      });
      if (error) throw error;

      if (data?.need === "role") {
        setPending({ key });
        setNeeds("role");
        push({ role: "assistant", text: "Vilken roll gäller det?" });
        return;
      }
      if (data?.need === "zone") {
        setPending({ key, role });
        setNeeds("zone");
        push({ role: "assistant", text: "Vilken zon utförs uppdraget i?" });
        return;
      }
      push({ role: "assistant", text: data?.answer ?? data?.error ?? "Inget svar.", source: data?.source });
    } catch {
      push({ role: "assistant", text: "Något gick fel. Försök igen om en stund." });
    } finally {
      setLoading(false);
    }
  }

  function onPreset(p: { key: PresetKey; label: string }) {
    push({ role: "user", text: p.label });
    setPending(null);
    ask(p.key);
  }

  function onRolePick(role: string) {
    push({ role: "user", text: role });
    ask(pending!.key, role);
  }

  function onZonePick(zone: string) {
    push({ role: "user", text: zone });
    ask(pending!.key, pending!.role, zone);
  }

  return (
    <div className="w-full rounded-2xl border border-black/10 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col h-[520px]">
      {/* Transkript */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
            {m.role === "user" ? (
              <div className="max-w-[85%] rounded-2xl bg-[#3D3491] text-white px-3.5 py-2 text-sm">
                {m.text}
              </div>
            ) : (
              <div className="max-w-[95%] text-sm text-black/85 whitespace-pre-wrap leading-relaxed">
                {m.text}
                {m.source && (
                  <span className="mt-1.5 block text-[11px] text-black/45">Källa: {m.source}</span>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-black/50">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Tänker…
          </div>
        )}

        {/* Följdval */}
        {!loading && needs === "role" && (
          <div className="pt-1 space-y-2">
            <input
              autoFocus
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              placeholder="Sök roll, t.ex. anestesi…"
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#3D3491]/60 placeholder:text-black/40"
            />
            <div className="flex flex-wrap gap-1.5">
              {filteredRoles.length === 0 && (
                <span className="text-xs text-black/50">Ingen roll matchar sökningen.</span>
              )}
              {filteredRoles.map((r) => (
                <button
                  key={r}
                  onClick={() => onRolePick(r)}
                  className="text-xs rounded-full border border-black/15 px-3 py-1.5 text-black/75 hover:bg-black/5 transition-colors"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && needs === "zone" && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {ZONES.map((z) => (
              <button
                key={z}
                onClick={() => onZonePick(z)}
                className="text-xs rounded-full border border-black/15 px-3 py-1.5 text-black/75 hover:bg-black/5 transition-colors"
              >
                {z}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fördefinierade frågor */}
      {!needs && (
        <div className="px-4 sm:px-5 pb-2 flex flex-wrap gap-1.5 border-t border-black/5 pt-3">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              disabled={loading}
              onClick={() => onPreset(p)}
              className="text-xs rounded-full border border-black/15 px-3 py-1.5 text-black/75 hover:bg-black/5 transition-colors disabled:opacity-50"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Fritext — låst utan konto */}
      <div className="px-4 sm:px-5 py-3 border-t border-black/10 bg-black/[0.02]">
        {user ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!input.trim()) return;
              push({ role: "user", text: input.trim() });
              push({
                role: "assistant",
                text: "Fritextsvar kopplas in i nästa steg. Välj en av frågorna ovan så länge.",
              });
              setInput("");
            }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ställ din egen fråga…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-black/40"
            />
            <button
              type="submit"
              aria-label="Skicka"
              className="shrink-0 w-8 h-8 rounded-full bg-[#3D3491] text-white flex items-center justify-center"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-black/55 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              Skapa konto för att ställa egna frågor.
            </p>
            <Link
              to="/registrera"
              className="shrink-0 text-sm font-semibold px-4 py-2 rounded-lg bg-[#3D3491] text-white hover:opacity-90 transition-opacity"
            >
              Skapa konto
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
