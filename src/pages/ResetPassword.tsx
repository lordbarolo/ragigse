import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import CompcareLogo from "@/components/CompcareLogo";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Lösenordet måste vara minst 6 tecken", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ title: "Något gick fel", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Lösenord uppdaterat!" });
      navigate("/profil");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Link to="/"><CompcareLogo variant="full" /></Link>
        </div>
        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-semibold text-foreground">Nytt lösenord</CardTitle>
          </CardHeader>
          <CardContent>
            {ready ? (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nytt lösenord</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minst 6 tecken"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Uppdatera lösenord
                </Button>
              </form>
            ) : (
              <p className="text-center text-muted-foreground text-sm">
                Ogiltigt eller utgånget återställningslänk.{" "}
                <Link to="/logga-in" className="text-primary hover:underline">Logga in</Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
