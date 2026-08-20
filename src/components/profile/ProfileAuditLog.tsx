import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, History, ArrowRight } from "lucide-react";

interface AuditRow {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  source: string;
  changed_at: string;
}

const FIELD_LABELS: Record<string, string> = {
  full_name: "Namn",
  specialty: "Specialitet",
  email: "E-post",
  phone: "Telefon",
};

const SOURCE_LABELS: Record<string, { label: string; cls: string }> = {
  ivo: { label: "IVO-utdrag", cls: "bg-violet-100 text-violet-700" },
  hosp: { label: "HOSP-utdrag", cls: "bg-emerald-100 text-emerald-700" },
  manual: { label: "Manuell", cls: "bg-slate-100 text-slate-700" },
  system: { label: "System", cls: "bg-amber-100 text-amber-700" },
};

export default function ProfileAuditLog() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profile_audit_log")
        .select("id, field_name, old_value, new_value, source, changed_at")
        .eq("user_id", user.id)
        .order("changed_at", { ascending: false })
        .limit(50);
      setRows((data as AuditRow[]) || []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Revisionslogg
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Inga ändringar registrerade än.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => {
              const src = SOURCE_LABELS[r.source] || SOURCE_LABELS.manual;
              return (
                <li
                  key={r.id}
                  className="rounded-lg border border-slate-200 p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-slate-900">
                      {FIELD_LABELS[r.field_name] || r.field_name}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded ${src?.cls}`}
                    >
                      {src?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                    <span className="line-through text-slate-400">
                      {r.old_value || "(tomt)"}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className="font-medium text-slate-900">
                      {r.new_value || "(tomt)"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {new Date(r.changed_at).toLocaleString("sv-SE", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
