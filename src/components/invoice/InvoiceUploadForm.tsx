import { useState } from "react";
import { Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const MAX_FILES = 5;
const MAX_SIZE_MB = 10;

export default function InvoiceUploadForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Ange din e-postadress", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const submissionId = crypto.randomUUID();
      const { error: dbError } = await supabase.from("invoice_submissions").insert({
        id: submissionId,
        email,
        file_paths: [],
        message: message || null,
      });
      if (dbError) throw dbError;

      // Send confirmation email (fire-and-forget)
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "invoice-confirmation",
          recipientEmail: email,
          idempotencyKey: `invoice-confirm-${submissionId}`,
          templateData: { fileCount: 0 },
        },
      }).catch(() => {});

      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Något gick fel", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-12 space-y-4">
        <CheckCircle className="w-12 h-12 text-primary mx-auto" />
        <h3 className="font-display text-2xl font-bold">Tack!</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Vi har tagit emot dina fakturor. CompCare återkommer till <span className="font-medium text-foreground">{email}</span> när analysen är slutförd, vilket kan dröja upp till 48 timmar.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email */}
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

      {/* Message */}
      <div className="space-y-2">
        <label htmlFor="invoice-message" className="text-sm font-medium text-foreground">
          Meddelande <span className="text-muted-foreground font-normal">(valfritt)</span>
        </label>
        <textarea
          id="invoice-message"
          rows={3}
          placeholder="Berätta kort om din situation — roll, region och ungefär hur länge du fakturerat."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
      </div>

      <Button type="submit" size="lg" className="w-full text-base font-bold py-6" disabled={uploading}>
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Laddar upp...
          </>
        ) : (
          "Skicka in fakturor för granskning"
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Vi behöver inga personuppgifter om patienter — bara fakturaraderna.
      </p>
    </form>
  );
}
