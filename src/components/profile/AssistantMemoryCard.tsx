import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain, Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type MemoryPoint = {
  id: string;
  content: string;
  origin: string;
  is_active: boolean;
};

export const assistantMemoryKey = (userId: string) => ["assistant-memory", userId];

/**
 * "Vad assistenten minns om dig" — nyckelpunkter som assistenten destillerat
 * ur tidigare frågor och svar. Användaren kan lägga till, redigera, pausa och
 * radera punkter; assistenten utgår från den redigerade listan i nästa svar.
 */
export default function AssistantMemoryCard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [newPoint, setNewPoint] = useState("");

  const { data: points, isLoading } = useQuery({
    queryKey: assistantMemoryKey(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assistant_memory")
        .select("id, content, origin, is_active")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MemoryPoint[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: assistantMemoryKey(userId) });

  const save = useMutation({
    mutationFn: async (vars: { id: string; content: string }) => {
      const { error } = await supabase
        .from("assistant_memory")
        .update({ content: vars.content })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      void invalidate();
      toast.success("Minnet är uppdaterat. Assistenten utgår från den nya texten.");
    },
    onError: () => toast.error("Kunde inte spara ändringen. Försök igen."),
  });

  const toggle = useMutation({
    mutationFn: async (vars: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("assistant_memory")
        .update({ is_active: vars.is_active })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => void invalidate(),
    onError: () => toast.error("Kunde inte ändra punkten. Försök igen."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assistant_memory").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void invalidate();
      toast.success("Punkten är borttagen.");
    },
    onError: () => toast.error("Kunde inte ta bort punkten. Försök igen."),
  });

  const add = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from("assistant_memory")
        .insert({ user_id: userId, content, origin: "user" });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewPoint("");
      setAdding(false);
      void invalidate();
      toast.success("Sparat i minnet.");
    },
    onError: () => toast.error("Kunde inte spara punkten. Kanske finns den redan."),
  });

  const list = points ?? [];

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-[#121319] p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10">
          <Brain className="h-3.5 w-3.5 text-white" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">Vad assistenten minns om dig</p>
          <p className="text-[11px] text-white/45">
            Nyckelpunkter ur tidigare samtal. Redigera eller radera — assistenten utgår från listan.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 flex items-center gap-2 text-xs text-white/45">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Hämtar minnet…
        </div>
      ) : list.length === 0 ? (
        <p className="mt-4 text-sm text-white/45">
          Minnet är tomt. När du ställer frågor i chatten sparar assistenten det som är värt att
          komma ihåg — du kan också lägga till något själv.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {list.map((p) => (
            <li
              key={p.id}
              className={`rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 ${
                p.is_active ? "" : "opacity-45"
              }`}
            >
              {editingId === p.id ? (
                <div className="flex items-start gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={2}
                    className="min-w-0 flex-1 resize-y rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none"
                  />
                  <button
                    type="button"
                    aria-label="Spara"
                    disabled={save.isPending || draft.trim().length < 4}
                    onClick={() => save.mutate({ id: p.id, content: draft.trim().slice(0, 200) })}
                    className="mt-1 rounded-lg p-1.5 text-white/70 hover:bg-white/10 disabled:opacity-40"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Avbryt"
                    onClick={() => setEditingId(null)}
                    className="mt-1 rounded-lg p-1.5 text-white/50 hover:bg-white/10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 text-sm leading-relaxed text-white/80">{p.content}</p>
                  <button
                    type="button"
                    aria-label={p.is_active ? "Pausa punkten" : "Aktivera punkten"}
                    onClick={() => toggle.mutate({ id: p.id, is_active: !p.is_active })}
                    className="rounded-lg px-2 py-1 text-[11px] text-white/50 hover:bg-white/10"
                  >
                    {p.is_active ? "Pausa" : "Aktivera"}
                  </button>
                  <button
                    type="button"
                    aria-label="Redigera"
                    onClick={() => {
                      setEditingId(p.id);
                      setDraft(p.content);
                    }}
                    className="rounded-lg p-1.5 text-white/60 hover:bg-white/10"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Ta bort"
                    onClick={() => remove.mutate(p.id)}
                    className="rounded-lg p-1.5 text-white/60 hover:bg-white/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="mt-3 flex items-start gap-2">
          <textarea
            value={newPoint}
            onChange={(e) => setNewPoint(e.target.value)}
            rows={2}
            placeholder="T.ex. Vill helst ha uppdrag inom pendlingsavstånd från Uppsala."
            className="min-w-0 flex-1 resize-y rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/25 focus:outline-none"
          />
          <button
            type="button"
            disabled={add.isPending || newPoint.trim().length < 4}
            onClick={() => add.mutate(newPoint.trim().slice(0, 200))}
            className="mt-1 rounded-lg p-1.5 text-white/70 hover:bg-white/10 disabled:opacity-40"
            aria-label="Spara punkten"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Avbryt"
            onClick={() => {
              setAdding(false);
              setNewPoint("");
            }}
            className="mt-1 rounded-lg p-1.5 text-white/50 hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-medium text-white/85 hover:bg-white/10"
        >
          <Plus className="h-3.5 w-3.5" /> Lägg till något att minnas
        </button>
      )}
    </div>
  );
}
