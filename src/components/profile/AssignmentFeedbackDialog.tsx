import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Calendar, Building2 } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";
import type { PendingFeedback } from "@/hooks/useAssignmentFeedback";

interface Props {
  pending: PendingFeedback;
  onClose: () => void;
}

export default function AssignmentFeedbackDialog({ pending, onClose }: Props) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [wasBooked, setWasBooked] = useState<boolean | null>(null);
  const [matched, setMatched] = useState<boolean | null>(null);
  const [deviationNotes, setDeviationNotes] = useState("");
  const [invoiceInterest, setInvoiceInterest] = useState<boolean | null>(null);

  const isStart = pending.stage === "start";

  const upsert = async (patch: Record<string, any>) => {
    if (!user) return;
    const base = {
      user_id: user.id,
      representation_request_id: pending.representation_request_id,
      feedback_stage: pending.stage,
      ...patch,
    };
    return supabase
      .from("assignment_feedback")
      .upsert(base, { onConflict: "representation_request_id,feedback_stage" });
  };

  const handleSnooze = async () => {
    const snoozed = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await upsert({
      snoozed_until: snoozed,
      dismissed_count: 1, // server-side default 0; we set to mark dismissal
    });
    trackEvent("assignment_feedback_snoozed", { stage: pending.stage });
    toast("Vi påminner dig om en vecka.");
    onClose();
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    const patch: Record<string, any> = {
      responded_at: new Date().toISOString(),
      snoozed_until: null,
    };
    if (isStart) {
      patch.was_booked = wasBooked;
    } else {
      patch.matched_contract = matched;
      patch.deviation_notes = deviationNotes || null;
      patch.invoice_service_interest = invoiceInterest;
    }
    const result = await upsert(patch);
    setSubmitting(false);
    if (result?.error) {
      toast.error("Kunde inte spara svaret. Försök igen.");
      return;
    }
    trackEvent("assignment_feedback_submitted", {
      stage: pending.stage,
      was_booked: wasBooked,
      matched_contract: matched,
      invoice_service_interest: invoiceInterest,
    });
    toast.success("Tack för din feedback!");
    onClose();
  };

  const canSubmit = isStart ? wasBooked !== null : matched !== null && invoiceInterest !== null;

  return (
    <Dialog open onOpenChange={(open) => !open && handleSnooze()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isStart ? "Hur gick det med uppdraget?" : "Hur blev uppdraget?"}
          </DialogTitle>
          <DialogDescription>
            Snabb återkoppling — det hjälper oss göra plattformen bättre.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="w-3.5 h-3.5" />
            <span>{pending.agency_name}{pending.unit ? ` · ${pending.unit}` : ""}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {pending.period_start} {pending.period_end ? `– ${pending.period_end}` : ""} · {pending.region}
            </span>
          </div>
        </div>

        {isStart ? (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Blev du bokad för uppdraget?</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={wasBooked === true ? "default" : "outline"}
                size="sm"
                onClick={() => setWasBooked(true)}
              >
                Ja, jag är bokad
              </Button>
              <Button
                variant={wasBooked === false ? "default" : "outline"}
                size="sm"
                onClick={() => setWasBooked(false)}
              >
                Nej
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              💬 Avtalsassistenten finns tillgänglig dygnet runt om du har frågor om villkor eller ersättning.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Motsvarade uppdraget vad ni avtalade?</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={matched === true ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMatched(true)}
                >
                  Ja
                </Button>
                <Button
                  variant={matched === false ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMatched(false)}
                >
                  Nej, det fanns avvikelser
                </Button>
              </div>
              {matched === false && (
                <Textarea
                  placeholder="Beskriv kort vad som avvek (frivilligt)"
                  value={deviationNotes}
                  onChange={(e) => setDeviationNotes(e.target.value)}
                  rows={3}
                />
              )}
            </div>

            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <Label className="text-sm font-medium">
                Vill du att vi granskar din faktura/lönespecifikation mot tidrapporten?
              </Label>
              <p className="text-xs text-muted-foreground">
                Vi säkerställer att du fått betalt för alla timmar. Ingen kostnad om vi inte hittar avvikelser.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant={invoiceInterest === true ? "default" : "outline"}
                  size="sm"
                  onClick={() => setInvoiceInterest(true)}
                >
                  Ja, granska
                </Button>
                <Button
                  variant={invoiceInterest === false ? "default" : "outline"}
                  size="sm"
                  onClick={() => setInvoiceInterest(false)}
                >
                  Nej tack
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={handleSnooze} disabled={submitting}>
            Påminn senare
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
            Skicka
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
