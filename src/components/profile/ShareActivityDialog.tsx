import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Eye, Clock, Link2, ChevronDown, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ShareView {
  viewed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  document_id: string | null;
  action: string;
}

interface ShareRow {
  id: string;
  recipient_label: string | null;
  created_at: string;
  expires_at: string;
  view_count: number;
  last_viewed_at: string | null;
  document_count: number;
  expired: boolean;
  views: ShareView[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function shortUA(ua: string | null): string {
  if (!ua) return "Okänd webbläsare";
  if (/iPhone|iPad/i.test(ua)) return "iPhone/iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Edg/i.test(ua)) return "Edge";
  if (/Chrome/i.test(ua)) return "Chrome";
  if (/Firefox/i.test(ua)) return "Firefox";
  if (/Safari/i.test(ua)) return "Safari";
  return "Webbläsare";
}

export default function ShareActivityDialog({ open, onOpenChange }: Props) {
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.rpc("list_my_document_shares");
      if (error) console.error(error);
      setShares((data as unknown as ShareRow[]) || []);
      setLoading(false);
    })();
  }, [open]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-white">
        <DialogHeader>
          <DialogTitle>Aktivitet på delningslänkar</DialogTitle>
          <DialogDescription>
            Se vem som öppnat dina länkar och när. Endast du kan se denna logg.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : shares.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            Du har inte skapat några delningslänkar ännu.
          </p>
        ) : (
          <ul className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200">
            {shares.map((s) => {
              const isOpen = expanded.has(s.id);
              return (
                <li key={s.id} className="bg-white">
                  <button
                    onClick={() => toggle(s.id)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3"
                  >
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {s.recipient_label || "Utan mottagare"}
                        <span className="text-xs text-slate-400 font-normal ml-2">
                          {s.document_count} dok
                        </span>
                      </p>
                      <p className="text-xs text-slate-500">
                        Skapad {new Date(s.created_at).toLocaleDateString("sv-SE")} ·{" "}
                        {s.expired ? (
                          <span className="text-rose-500">Utgången</span>
                        ) : (
                          <>Giltig till {new Date(s.expires_at).toLocaleDateString("sv-SE")}</>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-600 shrink-0">
                      <Eye className="w-3.5 h-3.5" />
                      {s.view_count}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-3 pt-0">
                      {s.views.length === 0 ? (
                        <p className="text-xs text-slate-400 px-7 py-2">
                          Ingen har öppnat länken än.
                        </p>
                      ) : (
                        <ul className="ml-7 border-l border-slate-200 pl-4 space-y-2">
                          {s.views.map((v, i) => (
                            <li key={i} className="text-xs text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span className="font-medium text-slate-900">
                                  {new Date(v.viewed_at).toLocaleString("sv-SE", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })}
                                </span>
                                {v.action === "download" && (
                                  <span className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">
                                    Öppnade dokument
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-500 mt-0.5">
                                {shortUA(v.user_agent)}
                                {v.ip_address && (
                                  <span className="text-slate-400"> · {v.ip_address}</span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
