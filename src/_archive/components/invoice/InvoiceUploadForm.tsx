import { useState } from "react";
import { Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/trackEvent";

export default function InvoiceUploadForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [region, setRegion] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Ange din e-postadress", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const submissionId = crypto.randomUUID();
      const messageText = [
        name && `Namn: ${name}`,
        role && `Roll: ${role}`,
        region && `Region: ${region}`,
        message && `Meddelande: ${message}`,
      ].filter(Boolean).join("\n");

      const { error: dbError } = await supabase.from("invoice_submissions").insert({
        id: submissionId,
        email,
        file_paths: [],
        message: messageText || null,
      });
      if (dbError) throw dbError;

      trackEvent("fakturakontroll_interest_submitted", { email, role, region });

      // Send confirmation to the user
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "invoice-confirmation",
          recipientEmail: email,
          idempotencyKey: `invoice-confirm-${submissionId}`,
          templateData: { name: name || undefined },
        },
      }).catch(() => {});

      // Notify admin
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "invoice-admin-notify",
          recipientEmail: "lordbarolo@gmail.com",
          idempotencyKey: `invoice-admin-${submissionId}`,
          templateData: { email, name: name || "Ej angivet", role: role || "Ej angivet", region: region || "Ej angivet", message: message || "Inget meddelande" },
        },
      }).catch(() => {});

      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Något gick fel", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-12 space-y-4">
        <CheckCircle className="w-12 h-12 text-primary mx-auto" />
        <h3 className="font-display text-2xl font-bold">Tack för ditt intresse!</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Vi har tagit emot din förfrågan och återkommer till <span className="font-medium text-foreground">{email}</span> inom kort.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="invoice-name" className="text-sm font-medium text-foreground">
            Namn <span className="text-muted-foreground font-normal">(valfritt)</span>
          </label>
          <input
            id="invoice-name"
            type="text"
            placeholder="Ditt namn"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="invoice-email" className="text-sm font-medium text-foreground">
            E-postadress
          </label>
          <input
            id="invoice-email"
            type="email"
            required
            placeholder="din@email.se"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="invoice-role" className="text-sm font-medium text-foreground">
            Roll <span className="text-muted-foreground font-normal">(valfritt)</span>
          </label>
          <input
            id="invoice-role"
            type="text"
            placeholder="T.ex. sjuksköterska, läkare"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="invoice-region" className="text-sm font-medium text-foreground">
            Region <span className="text-muted-foreground font-normal">(valfritt)</span>
          </label>
          <input
            id="invoice-region"
            type="text"
            placeholder="T.ex. Region Stockholm"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="invoice-message" className="text-sm font-medium text-foreground">
          Meddelande <span className="text-muted-foreground font-normal">(valfritt)</span>
        </label>
        <textarea
          id="invoice-message"
          rows={3}
          placeholder="Berätta kort om din situation, t.ex. hur länge du fakturerat eller vad du undrar över."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
      </div>

      <Button type="submit" size="default" className="text-sm font-semibold px-6 py-3" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Skickar...
          </>
        ) : (
          "Jag vill veta mer"
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Vi kontaktar dig inom 48 timmar. Inga förpliktelser.
      </p>
    </form>
  );
}
