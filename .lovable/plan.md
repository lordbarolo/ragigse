# Chattassistent på startsidan

Ersätter hero-formuläret med en chattruta i exakt samma yta. Inget annat på sidan ändras.

## 1. Chattrutan (startsidan, utloggad)

Ny komponent `src/components/chat/HomeAssistantChat.tsx` som renderas där `InlineTerminalSurvey` ligger idag i `src/pages/Home.tsx` — samma bredd/höjd/kortstil.

Innehåll:
- Kort assistenthälsning.
- Lista med förvalda frågor (klickbara). Fritextfältet syns men är låst med texten "Logga in för att ställa egna frågor".
- Klick på en fråga → svar streamas/visas i rutan, sedan en diskret rad: "Logga in för att ställa egna frågor".

Fasta frågor (v1):
1. Vad betalar Stockholm för en leg. sjuksköterska?
2. Vad kan jag tjäna som allmänläkare i Torsby?
3. Hur lång erfarenhet behöver jag för att jobba med bemanning?
4. Kan jag ta konsultvikariat under termin 10 på läkarprogrammet?
5. Behöver jag patientförsäkring som företagande läkare?
6. Hur ofta avropar Gävle sjukhus sjuksköterskor till akuten?
7. Är 390 kr/timme bra lön i Malmö?

Svaren är korta (2–4 meningar), i den neutrala tonen, och hämtas backend-side:
- Prisfrågor (1, 2, 7): SKR-pris för roll+zon ur `contract_version_rates` × branschmarginal (85–90 % läkare, 80–85 % övriga) — samma modell som resten av appen.
- Avtals-/regelfrågor (3, 4, 5): svar ur indexerade avtalschunks (samma RAG som `lonekoll-answer`), med källhänvisning till avtalsbilagan.
- Avropsfrågan (6): historik ur `calloff_imports`, alltid transparent formulerat ("Utifrån tillgänglig avropsdata 2022–2025 ser jag X avrop…"), aldrig som live-data.

## 2. Konto först, sedan enkät

Flödet blir: utloggad chatt → Logga in / Skapa konto → magic link/Google → obligatorisk enkät → fri chatt.

- `/logga-in` och `/registrera` byggs om till enbart **Google** och **magic link** (e-postlänk). Lösenordsfälten tas bort; `/aterstall-losenord` blir överflödig och tas bort ur navigationen.
- Efter bekräftad inloggning skickas användaren till `/onboarding` om enkäten inte är besvarad. Alla skyddade sidor (inkl. fri chatt) gate:as tills profilen har roll, ort, kontraktsform och ersättning.

## 3. Enkäten med statisk förklaringstext

Enkäten återanvänder befintlig `InlineTerminalSurvey`-logik (roll → specialisering → kontraktsform → ort → ersättning), men visas nu efter inloggning.

På **varje** steg visas samma statiska text, alltid synlig:

> Roll, ort, kontraktsform och ersättning behövs för att visa information om dina villkor i förhållande till den övriga marknaden. Inga uppgifter delas.

Svaren sparas på användarens profil och används som kontext för chatten.

## 4. Inloggad chatt

Samma chattkomponent, men fritextfältet är upplåst. Frågorna besvaras med användarens sparade kontext (roll/ort/kontraktsform/ersättning) — kontexten läses server-side, aldrig från klienten.

## Tekniska detaljer

- Ny edge function `home-assistant` (publik, rate-limitad per IP) för de fasta frågorna: fast fråge-ID in, färdigt svar ut. Inga prompts på klienten.
- Fri chatt går via en autentiserad function som återanvänder kontext- och RAG-logiken i `lonekoll-answer` samt `ai-usage-logs`-loggning och 30-anrop/dygn-gränsen.
- Magic link via `supabase.auth.signInWithOtp` med `emailRedirectTo` = `window.location.origin`; Google via `lovable.auth.signInWithOAuth` (samma redirect-regel).
- Google-provider aktiveras i samma steg så första inloggningen fungerar.
- Enkätsvaren skrivs till användarens profil med RLS scopad till `auth.uid()`; grants ses över i samma migration.
- Tracking: befintliga survey-events behålls, nya events för `home_chat_question_clicked` och `home_chat_login_prompt_shown` läggs till i `allowedEvents`.

## Utanför scope
Ingen ändring av startsidans layout, hero-text, RoleCarousel, footer eller övriga sidor.
