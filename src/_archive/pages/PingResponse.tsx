import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle, Clock, ShieldX, Info } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

type PingData = {
  id: string;
  reference_id: string;
  requester_name: string;
  status: string;
  expires_at: string;
  responded_at: string | null;
  sent_at: string;
  reference_text: string;
  competencies: string[] | null;
  recommendation_score: number;
  individual_name: string;
  individual_specialty: string | null;
  workplace: string;
  relationship: string;
  period_start: string;
  period_end: string | null;
  confirmed_at: string | null;
};

export default function PingResponse() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [ping, setPing] = useState<PingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const [responseStatus, setResponseStatus] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPing() {
      if (!token) return;
      const { data, error } = await supabase.rpc("ref_get_ping_by_token", { _token: token });
      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        setError("Denna länk är ogiltig.");
        setLoading(false);
        return;
      }
      const p = (Array.isArray(data) ? data[0] : data) as unknown as PingData;
      setPing(p);

      if (p.status !== "sent") {
        setResponseStatus(p.status);
      } else if (new Date(p.expires_at) < new Date()) {
        setResponseStatus("expired");
      }
      setLoading(false);
    }
    fetchPing();
  }, [token]);

  const handleRespond = async (status: "confirmed" | "denied" | "dismissed") => {
    if (!token) return;
    setResponding(true);
    const { error } = await supabase.rpc("ref_respond_to_ping", { _token: token, _status: status });
    setResponding(false);
    if (error) {
      toast.error("Kunde inte registrera ditt svar", { description: error.message });
      return;
    }
    setResponseStatus(status);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-1 w-full bg-primary" />
        <div className="mx-auto max-w-lg px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    );
  }

  if (error || !ping) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="h-1 w-full bg-primary" />
        <div className="flex flex-1 items-center justify-center px-4">
          <Card className="max-w-md text-center">
            <CardContent className="py-12">
              <ShieldX className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Ogiltig länk</h2>
              <p className="mt-2 text-sm text-muted-foreground">{error ?? "Denna länk är ogiltig."}</p>
              <Button variant="outline" className="mt-6" asChild>
                <Link to="/">Till startsidan</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const competencies = Array.isArray(ping.competencies)
    ? ping.competencies
    : typeof ping.competencies === "string"
    ? JSON.parse(ping.competencies)
    : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="h-1 w-full bg-primary" />
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">Begäran om återbekräftelse</h1>
          <p className="text-sm text-muted-foreground mt-1">CompCare — Verifierade referenser</p>
        </div>

        {/* Request context */}
        <Card className="mb-6 border-border/50">
          <CardContent className="p-5 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Begärd av:</span>
              <span className="font-medium text-foreground">{ping.requester_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Gäller din referens för:</span>
              <span className="font-medium text-primary">{ping.individual_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Uppdrag:</span>
              <span className="text-foreground">{ping.workplace}</span>
            </div>
            {ping.confirmed_at && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Referens lämnad:</span>
                <span className="text-foreground">{format(new Date(ping.confirmed_at), "d MMMM yyyy", { locale: sv })}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Original reference */}
        <div className="mb-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Din ursprungliga referens:</p>
          <div className="rounded-lg border-l-4 border-l-primary/30 bg-primary/5 py-3 pl-4 pr-3">
            <p className="text-sm italic text-foreground">{ping.reference_text}</p>
            {competencies.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {competencies.map((c: string) => (
                  <Badge key={c} variant="secondary" className="rounded-md text-xs">{c}</Badge>
                ))}
              </div>
            )}
            <div className="mt-2 flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">Rekommendation:</span>
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={i <= ping.recommendation_score ? "text-primary" : "text-muted-foreground/30"}>●</span>
              ))}
            </div>
          </div>
        </div>

        {/* Actions or receipt */}
        {responseStatus ? (
          <ReceiptCard status={responseStatus} />
        ) : (
          <div className="space-y-3">
            <Button className="w-full py-6 text-base" disabled={responding} onClick={() => handleRespond("confirmed")}>
              <CheckCircle className="h-5 w-5" />
              Jag bekräftar denna referens
            </Button>
            <Button
              variant="outline"
              className="w-full border-2 border-destructive/30 py-6 text-base text-destructive hover:bg-destructive/5"
              disabled={responding}
              onClick={() => setDenyDialogOpen(true)}
            >
              <XCircle className="h-5 w-5" />
              Jag kan inte längre stå bakom denna referens
            </Button>
            <Button variant="outline" className="w-full py-4 text-sm text-muted-foreground" disabled={responding} onClick={() => handleRespond("dismissed")}>
              <Clock className="h-4 w-4" />
              Jag vill inte svara just nu
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={denyDialogOpen} onOpenChange={setDenyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Är du säker?</AlertDialogTitle>
            <AlertDialogDescription>
              Om du nekar kommer uppdragsgivaren att se att referensen inte längre bekräftas. Detta kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { setDenyDialogOpen(false); handleRespond("denied"); }}
            >
              Ja, neka
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ReceiptCard({ status }: { status: string }) {
  const config = {
    confirmed: { icon: <CheckCircle className="h-6 w-6 text-primary" />, bg: "bg-primary/5 border-primary/20", text: "Referensen är bekräftad. Tack för ditt svar." },
    denied: { icon: <XCircle className="h-6 w-6 text-destructive" />, bg: "bg-destructive/5 border-destructive/20", text: "Du har nekat bekräftelsen. Uppdragsgivaren har informerats." },
    dismissed: { icon: <Clock className="h-6 w-6 text-muted-foreground" />, bg: "bg-muted border-border", text: "Du har valt att inte svara. Begäran förblir öppen tills den löper ut." },
    expired: { icon: <Info className="h-6 w-6 text-muted-foreground" />, bg: "bg-muted border-border", text: "Denna begäran har löpt ut och kan inte längre besvaras." },
  }[status] ?? { icon: <Info className="h-6 w-6 text-muted-foreground" />, bg: "bg-muted border-border", text: "Svar har redan registrerats." };

  return (
    <div className={`rounded-lg border p-5 ${config.bg} flex items-start gap-3`}>
      {config.icon}
      <p className="text-sm font-medium text-foreground">{config.text}</p>
    </div>
  );
}
