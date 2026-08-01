import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/radar/BottomNav";
import { ReferenceDashboard } from "@/components/referly/ReferenceDashboard";
import { ReferencesPageSkeleton } from "@/components/ui/page-skeleton";
import ComingSoonOverlay from "@/components/ComingSoonOverlay";

export default function Referenser() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/logga-in");
  }, [loading, user, navigate]);

  if (loading) {
    return <ReferencesPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <div className="pt-20 px-4 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Referenser & Verifikationer</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Ta kontroll över dina referenser och intyg. Dela dina dokument på dina villkor.
        </p>

        {/* How it works */}
        <div className="rounded-2xl bg-primary/5 border border-primary/10 p-5 mb-6">
          <div className="grid grid-cols-3 gap-4 mb-5">
            {[
              { step: "1", text: "Samla dina referenser och intyg i valvet" },
              { step: "2", text: "Bjud in referens\u00ADgivare att verifiera dem" },
              { step: "3", text: "Dela en länk med arbets\u00ADgivare" },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center gap-2">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary-foreground">{item.step}</span>
                </div>
                <p className="text-xs text-foreground leading-snug">{item.text}</p>
              </div>
            ))}
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">Så här funkar det</h2>

          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Samla alla dina referenser och intyg på ett ställe — verifierade och under din kontroll. Istället för att handlingar ligger utspridda hos olika bemanningsföretag delar du dem direkt med arbetsgivare via en säker länk.
            </p>

            <div>
              <h3 className="font-semibold text-foreground mb-0.5">📄 Importera & verifiera</h3>
              <p>
                Har du redan referenshandlingar från tidigare uppdrag? Ladda upp dem (PDF, bild) i valvet och skicka sedan en inbjudan till den ursprungliga referensgivaren. Denne bekräftar digitalt att hen fortfarande står bakom referensen och kan lägga till en kommentar. På så vis blir en gammal handling aktuell och verifierad igen — utan att någon behöver skriva en ny.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-0.5">✉️ Bjud in referensgivare</h3>
              <p>
                Saknar du en referens? Bjud in en chef, handledare eller kollega att fylla i CompCares referensenkät direkt. Referensgivaren får ett mejl med en länk till ett kort formulär där hen anger kompetenser, omdöme och en personlig rekommendation. Referensen hamnar automatiskt i ditt valv, verifierad och redo att delas.
              </p>
            </div>
          </div>
        </div>
        <ReferenceDashboard />
      </div>
      <BottomNav />
    </div>
  );
}
