import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { RELATIONSHIPS } from "@/types/referly";

interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess: () => void;
}

export function InviteModal({ open, onOpenChange, userId, onSuccess }: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [periodStart, setPeriodStart] = useState<Date | undefined>(undefined);
  const [periodEnd, setPeriodEnd] = useState<Date | undefined>(undefined);
  const [ongoing, setOngoing] = useState(false);
  const [personalMessage, setPersonalMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const resetForm = () => {
    setEmail(""); setName(""); setRelationship(""); setWorkplace("");
    setPeriodStart(undefined); setPeriodEnd(undefined); setOngoing(false);
    setPersonalMessage(""); setInviteLink(null);
  };

  const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const token = crypto.randomUUID();
    const { error } = await supabase.from("ref_references").insert({
      individual_id: userId,
      giver_email: email,
      giver_name: name,
      workplace,
      relationship,
      period_start: periodStart ? fmtDate(periodStart) : "",
      period_end: ongoing ? null : periodEnd ? fmtDate(periodEnd) : null,
      invite_token: token,
    });

    setLoading(false);
    if (error) {
      toast.error("Kunde inte skapa inbjudan", { description: error.message });
      return;
    }

    const link = `${window.location.origin}/referens/${token}`;
    setInviteLink(link);
    onSuccess();
    toast.success("Inbjudan skapad!");
  };

  const handleCopy = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Länk kopierad!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bjud in referensgivare</DialogTitle>
          <DialogDescription>Fyll i uppgifterna nedan för att skicka en inbjudan.</DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Inbjudan skapad. Kopiera länken nedan.</p>
            <div className="rounded-md border border-border bg-muted p-3">
              <p className="text-xs text-muted-foreground break-all">{inviteLink}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCopy} className="flex-1">Kopiera länk</Button>
              <Button variant="outline" onClick={resetForm}>Ny inbjudan</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">E-postadress</Label>
              <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-name">Namn på referensgivaren</Label>
              <Input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Relation</Label>
              <Select value={relationship} onValueChange={setRelationship} required>
                <SelectTrigger><SelectValue placeholder="Välj relation" /></SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-workplace">Arbetsplats</Label>
              <Input id="invite-workplace" value={workplace} onChange={(e) => setWorkplace(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Period start</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !periodStart && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {periodStart ? format(periodStart, "yyyy-MM-dd") : "Välj datum"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={periodStart} onSelect={setPeriodStart} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Period slut</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" disabled={ongoing} className={cn("w-full justify-start text-left font-normal", !periodEnd && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {periodEnd ? format(periodEnd, "yyyy-MM-dd") : "Välj datum"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={periodEnd} onSelect={setPeriodEnd} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="ongoing" checked={ongoing} onCheckedChange={(v) => setOngoing(!!v)} />
              <Label htmlFor="ongoing" className="text-sm font-normal">Pågående</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-message">Personligt meddelande (valfritt)</Label>
              <Textarea id="invite-message" value={personalMessage} onChange={(e) => setPersonalMessage(e.target.value)} placeholder="T.ex. 'Hej Anna, det vore jättesnällt om du kunde lämna en referens...'" rows={3} maxLength={500} className="resize-none" />
              <p className="text-xs text-muted-foreground">{personalMessage.length}/500</p>
            </div>
            <Button type="submit" className="w-full" disabled={loading || !relationship || !periodStart}>
              {loading ? "Skapar inbjudan…" : "Skicka inbjudan"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
