import { useEffect } from "react";
import { useNavigate } from "@/lib/router-compat";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfileContext } from "@/hooks/useProfileContext";
import ProfileAssistantChat from "@/components/profile/ProfileAssistantChat";
import ProfileContextCard from "@/components/profile/ProfileContextCard";
import AssistantMemoryCard from "@/components/profile/AssistantMemoryCard";
import ProfileSideNav from "@/components/profile/ProfileSideNav";
import AgentStatusCard from "@/components/profile/AgentStatusCard";

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
      <div className="mx-auto flex w-full max-w-[1440px] gap-0 px-0 lg:gap-12 lg:px-8">
        <ProfileSideNav />

        <div className="min-w-0 flex-1">
          {/* Sidhuvud + status */}
          <section id="profil" className="scroll-mt-24 py-10 sm:py-14">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">
              {firstName ? `Inloggad som ${firstName}` : "Inloggad"}
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
              Min profil
            </h1>

            <div className="mt-8">
              <AgentStatusCard userId={user.id} contextComplete={Boolean(complete && context)} />
            </div>

            {complete && context ? (
              <>
                <p className="mt-10 max-w-lg text-sm leading-relaxed text-white/55">
                  Håll uppgifterna om dig uppdaterade för att optimera utfallet.
                </p>
                <ProfileContextCard userId={user.id} context={context} onSaved={refresh} />
              </>
            ) : (
              <p className="mt-8 max-w-lg text-sm leading-relaxed text-white/55">
                Vi vill göra det lättare att arbeta som konsult. I din profil hittar du smarta verktyg redo att
                användas direkt. Din assistent behöver lära känna dig för att kunna företräda dina intressen. De fyra
                frågorna i chattrutan är en bra början.
              </p>
            )}
          </section>

          <div id="dokument" className="scroll-mt-24">
            <ProfileDocumentsSection userId={user.id} />
          </div>

          <div id="verktyg" className="scroll-mt-24">
            <ProfileToolsGrid context={complete ? context : null} />
          </div>

          <section id="assistent" className="scroll-mt-24 border-t border-white/10 py-14 sm:py-16">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">Assistent</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Din assistent
            </h2>
            <div className="mt-6 max-w-2xl">
              <ProfileAssistantChat
                userId={user.id}
                context={context}
                unlocked={complete}
                onSaved={refresh}
              />
              {complete ? <AssistantMemoryCard userId={user.id} /> : null}
            </div>
          </section>
        </div>
      </div>


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
