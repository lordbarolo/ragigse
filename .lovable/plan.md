# Profilsidan på telefon och iPad — vad jag ser och vad jag föreslår

## Kontroll gjord i riktig webbläsare (inloggad)

- **Telefon (394 px):** sidan ser **helt tom** ut. Innehållet finns, men ligger utanför skärmen till höger — man ser bara mörk bakgrund och chip-raden.
- **iPad (834 px):** innehållet är knuffat till höger halvan, ~485 px tom yta till vänster, och korten klipps i högerkanten.

Orsak (bekräftad genom mätning): sidans ytterlager är en `flex`-rad. Sidofältskomponenten renderar **både** mobil-chipsraden och desktop-sidofältet, och på små skärmar blir mobilraden ett eget flex-element i full bredd som trycker hela innehållskolumnen ut ur vyn. Sidofältet ska bara vara en kolumn från 1024 px och uppåt.

## Mina 5 förslag för telefon

1. **Fixa layoutbrottet (måste göras först)** — gör kolumn-layouten till en riktig grid/flex som bara aktiveras från `lg:`, och lyft mobil-chipsraden ut ur kolumnraden så den blir ett eget sticky band ovanför innehållet. Ger fullbreddsinnehåll på telefon och iPad utan att desktopvyn ändras.
2. **Kortare sida — sektionerna är 7 274 px höga på telefon.** Dra ner vertikal luft på mobil (`py-10` i stället för `py-14/16`, mindre `mt-8/mt-10`) och låt dokumentkorten vara tätare. Mål: ca 30–35 % kortare scroll utan att något tas bort.
3. **Statuskortet överst blir mobilens startpunkt.** Låt "Din agent är inte igång ännu · 0 av 5" plus en primärknapp ligga direkt under H1 utan mellanliggande brödtext, och flytta den längre förklaringstexten under kortet i mindre grad.
4. **Dokumentlistan som kompakta rader i stället för stora kort.** En rad per handling: namn, status-punkt, och en `Ladda upp`-knapp på egen rad under texten (inga två knappar sida vid sida på 394 px). "Begär hos …"-länken blir tertiär text.
5. **Navigationen: en nav i stället för två.** Idag finns både chip-raden överst och appens bottenrad. Låt chip-raden bli horisontellt scrollbar med snap och tydlig kantmarkering, eller slå ihop hoppen till en enda kompakt rad — så att första skärmen ägnas åt innehåll, inte åt två navigeringslager.

## Teknisk sammanfattning

- `src/pages/Profile.tsx`: ytterlagret `flex … gap-0 px-0 lg:gap-12 lg:px-8` byts mot ett mobil-först block, med `lg:flex`/`lg:grid` för tvåkolumnsläget. Mobil-nav flyttas till ett eget syskon ovanför innehållskolumnen.
- `src/components/profile/ProfileSideNav.tsx`: delas i två exports (mobilrad + desktopsidofält) så att mobilraden aldrig sitter i flex-raden.
- Spacing- och kortjusteringar i `ProfileDocumentsSection.tsx`, `AgentStatusCard.tsx`, `ProfileToolsGrid.tsx` — endast klasser för mobilbrytpunkter, ingen logik.
- Ingen ändring av dokumentstatus, verifiering, RLS, prompts eller priser.

Punkt 1 är en bugg, resten är optimeringar. Säg vilka punkter du vill att jag kör.
