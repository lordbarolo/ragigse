import { useEffect } from "react";
import { useNavigate } from "@/lib/router-compat";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfileContext } from "@/hooks/useProfileContext";
import ProfileAssistantChat from "@/components/profile/ProfileAssistantChat";
import ProfileContextCard from "@/components/profile/ProfileContextCard";
import AssistantMemoryCard from "@/components/profile/AssistantMemoryCard";

import ProfileToolsGrid from "@/components/profile/ProfileToolsGrid";
import ProfileDocumentsSection from "@/components/profile/ProfileDocumentsSection";

/**
 * Profilsidan (inloggat läge).
 * Hero = AI-assistenten (uppe till höger) som låses upp när användaren
 * besvarat de fyra profilfrågorna. Sedan verktyg och dokumentuppladdning.
 */
export default function Profile() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { context, loading: profileLoading, complete, refresh } = useProfileContext(user?.id);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate("/logga-in");
  }, [authLoading, user, navigate]);

  if (authLoading || profileLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0c10]">
        <Loader2 className="h-5 w-5 animate-spin text-white/60" />
      </div>
    );
  }

  const firstName = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0];

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(1000px 420px at 80% -10%, rgba(255,255,255,0.10), transparent 60%)",
          }}
        />
        <div className="relative mx-auto grid w-full max-w-[1200px] items-center gap-10 px-5 py-14 sm:py-20 lg:grid-cols-[1fr_0.95fr] lg:gap-16">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">Din profil</p>
            <h1 className="mt-3 text-3xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              {firstName ? `Hej ${firstName}.` : "Välkommen."}
              <br />
              Här bor dina nya verktyg.{" "}
              <span className="text-white/45">Använd dom som du använder ett bemanningsföretag.</span>
              <br />
              <br />
              <span className="text-white/45">
                Luta dig tillbaka och låt dina assistenter göra jobbet.
                <br />
                <br />
              </span>
            </h1>
            {complete && context ? (
              <>
                <p className="mt-5 max-w-md text-sm leading-relaxed text-white/55 sm:text-base">
                  Tips och råd baseras på vad Ai:n vet om dig. Håll nedanstående uppgifter uppdaterade för bäst svar.
                </p>
                <ProfileContextCard userId={user.id} context={context} onSaved={refresh} />
              </>
            ) : (
              <p className="mt-5 max-w-md text-sm leading-relaxed text-white/55 sm:text-base">
                Vi vill göra det lättare att arbeta som konsult. I din profil hittar du smarta verktyg redo att
                användas direkt. Din assistent behöver lära känna dig för att ha möjligheterna att representera
                din intresen. De 4 frågorna i chattrutan är en bra början.
              </p>
            )}
          </div>

          <div className="lg:justify-self-end lg:self-start">
            <ProfileAssistantChat
              userId={user.id}
              context={context}
              unlocked={complete}
              onSaved={refresh}
            />
            {complete ? <AssistantMemoryCard userId={user.id} /> : null}
          </div>

        </div>
      </section>

      <ProfileToolsGrid context={complete ? context : null} />
      <ProfileDocumentsSection userId={user.id} />

      <div className="border-t border-white/10 py-8">
        <div className="mx-auto w-full max-w-[1200px] px-5">
          <button
            type="button"
            onClick={() => signOut()}
            className="text-sm text-white/45 transition-colors hover:text-white"
          >
            Logga ut
          </button>
        </div>
      </div>
    </div>
  );
}
