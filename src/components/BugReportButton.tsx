import { useState } from "react";
import { Bug, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const CATEGORIES = [
  { value: "calculation", label: "Fel i beräkning" },
  { value: "data", label: "Felaktig data" },
  { value: "ui", label: "Visningsfel" },
  { value: "general", label: "Övrigt" },
];

export default function BugReportButton() {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("general");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = description.trim();
    if (!trimmed || trimmed.length < 10) {
      toast({ title: "Beskriv felet mer utförligt", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("bug_reports").insert({
        page_url: window.location.pathname,
        category,
        description: trimmed.slice(0, 2000),
        email: email.trim() || null,
      });
      if (error) throw error;

      toast({ title: "Tack!", description: "Din felrapport har skickats." });
      setDescription("");
      setEmail("");
      setCategory("general");
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Kunde inte skicka", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-[13px] text-foreground/35 no-underline hover:text-foreground transition-colors flex items-center gap-1">
          <Bug className="w-3 h-3" />
          Rapportera fel
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-primary" />
            Rapportera ett fel
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Typ av fel" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea
            placeholder="Beskriv felet du upptäckt. Ange gärna vilken sida och vad du förväntade dig..."
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
            rows={4}
            className="text-sm"
          />

          <Input
            type="email"
            placeholder="Din e-post (valfritt, om vi behöver återkoppla)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="text-sm"
          />

          <Button
            onClick={handleSubmit}
            disabled={submitting || description.trim().length < 10}
            className="w-full gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Skicka felrapport
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
