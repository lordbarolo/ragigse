import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, FileText, ShieldCheck, Clock, Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SharedDoc {
  id: string;
  file_name: string;
  document_type: string;
  uploaded_at: string;
  signed_url: string | null;
}

interface SharePayload {
  owner_name: string;
  recipient_label: string | null;
  expires_at: string;
  documents: SharedDoc[];
}

const DOC_TYPE_LABELS: Record<string, string> = {
  cv: "CV",
  certificate: "Certifikat / Intyg",
  license: "Legitimation",
  contract: "Avtal",
  ivo: "IVO-intyg",
  hosp: "HOSP-intyg",
  other: "Övrigt",
};

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-shared-documents`;

export default function SharedDocuments() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${ENDPOINT}?token=${encodeURIComponent(token)}`, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string },
        });
        if (res.status === 410) { setExpired(true); return; }
        if (res.status === 404) { setNotFound(true); return; }
        if (!res.ok) { setNotFound(true); return; }
        const json = await res.json();
        setData(json);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (expired) {
    return (
      <CenterCard icon={<AlertTriangle className="w-6 h-6 text-amber-500" />} title="Länken har gått ut">
        Be ägaren att skapa en ny delningslänk om du fortfarande behöver tillgång till dokumenten.
      </CenterCard>
    );
  }

  if (notFound || !data) {
    return (
      <CenterCard icon={<AlertTriangle className="w-6 h-6 text-rose-500" />} title="Länken finns inte">
        Kontrollera att du har använt rätt URL.
      </CenterCard>
    );
  }

  const expires = new Date(data.expires_at);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-slate-900 truncate">
                Delade dokument{data.owner_name ? ` från ${data.owner_name}` : ""}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 inline-flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Giltig till {expires.toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short" })}
              </p>
              {data.recipient_label && (
                <p className="text-xs text-slate-500 mt-0.5">För: {data.recipient_label}</p>
              )}
            </div>
          </div>

          <ul className="divide-y divide-slate-100">
            {data.documents.map((d) => (
              <li key={d.id} className="px-6 py-4 flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{d.file_name}</p>
                  <p className="text-xs text-slate-500">
                    {DOC_TYPE_LABELS[d.document_type] || d.document_type} · {new Date(d.uploaded_at).toLocaleDateString("sv-SE")}
                  </p>
                </div>
                {d.signed_url ? (
                  <a href={d.signed_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="gap-1.5 text-sm font-semibold">
                      <Download className="w-3.5 h-3.5" />
                      Öppna
                    </Button>
                  </a>
                ) : (
                  <span className="text-xs text-rose-500">Otillgänglig</span>
                )}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[11px] text-slate-400 mt-4 text-center">
          Tillgång registreras. Länken slutar fungera efter utgångsdatumet.
        </p>
      </div>
    </div>
  );
}

function CenterCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-sm w-full rounded-2xl bg-white border border-slate-200 p-6 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-3">
          {icon}
        </div>
        <h1 className="text-base font-semibold text-slate-900 mb-1">{title}</h1>
        <p className="text-sm text-slate-500">{children}</p>
      </div>
    </div>
  );
}
