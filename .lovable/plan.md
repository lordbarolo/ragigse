# Byt ut filmsektionen på startsidan mot Lönekollen-animationen

## Status: väntar på material

Den bifogade filen `Lonekollen_utan_logotyp.dc.html` är bara ett skal. Den innehåller ingen animation — den pekar på fyra filer som inte kom med:

- `lonekollen-scene-nologo.jsx` (själva scenen — den viktiga)
- `animations-v3.jsx` (designverktygets runtime)
- `tweaks-panel.jsx` (redigeringspanel, behövs inte)
- `support.js` (förhandsvisningsskal, behövs inte)

Du återkommer med bättre material. Planen nedan gäller så snart det finns.

## Vad som byts ut

Sektionen `FilmFakturakontroll` (rubrik "Saknas det timmar på dina fakturor?" + `fakturakontroll-animation.mp4`) längst ner på startsidan ersätts av Lönekollen-animationen. Rubrik och CTA i sektionen behålls som de är om inget annat sägs — bara mediet byts.

## Genomförande beroende på materialform

**Om du skickar `lonekollen-scene-nologo.jsx`:** scenen portas till en fristående React-komponent i `src/components/animationer/` enligt samma mönster som de tre befintliga scenerna (egen tidslinje via `motion.ts`, `AnimationStage` som ram, ingen extern runtime, SSR-säker, pausar utanför viewporten, stillbild vid `prefers-reduced-motion`). Designverktygets runtime `animations-v3.jsx` behövs inte — den ersätts av projektets egen `motion.ts`.

**Om du skickar en mp4:** filen läggs in som asset och `<video>`-taggen i sektionen pekas om till den. Minsta möjliga ändring.

## Teknisk detalj

- Rör endast `src/components/startsida5c/` och `src/components/animationer/`. Ingen routing, inget backend, ingen prislogik.
- Startsidans mörka tema (#0b0c10) och sektionens nuvarande mått/radie (1160px container, radius 16, 1px kant #22232b) behålls.
- Ingen logotyp eller varumärkesavslut i animationen — enligt filnamnet "utan logotyp".
- Befintlig `LonekollenAnimation` lämnas orörd; den används på `/dev/animationer` och `/dev/startsida-animationer`.
- CTA-spårningen (`trackEvent("cta_clicked", ...)`) behålls oförändrad.
