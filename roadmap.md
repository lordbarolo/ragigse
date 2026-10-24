# Roadmap

## Aktuellt
- [x] Bekräftelsekortets kontrast rättad; utloggad onboarding → login → registrering bevarar exakt roll, ort och analysdestination. 7 tester passerade, webbläsarflödet och kortet verifierade med simulerad registrering (inget konto eller mejl skapat), bygg OK. Ingen publicering.
- [x] Project monitoring: två gamla behörighetsfynd verifierade som redan åtgärdade; e-poståterhämtning kontrollerar nu insert-fel och har regressionstester. Inga öppna qa-fynd returnerades. Ingen publicering.
- [x] Rapporter länkar till befintlig registrering med exakt yrkesroll/ort; kontext bevaras via login, e-postretur och Google till onboarding/analys. Startsidan har synlig kontolänk. 46 relevanta tester passerade, 19 behörighetstester utan testlösenord skippades; inloggad analys och mobil kontolänk verifierade. Äldre RoleDropdown-testsvit har fem befintliga test-/markupfel, utanför scope; inte ändrad.
- [x] Byt favicon till senaste ljusa db.-ikonen; verifierad på rapportsidan i förhandsvisningen. Publicerad version har fortfarande gamla ikonreferenser, publicering ej utförd.
- [x] Inventera de sju ChatGPT-källorna i bilden mot tidigare beslut; alla finns publicerade och ska behållas, inga sidor ändrade.
- [x] Ta bort faktura-sektionen (FilmFakturakontroll) från startsidan tillsvidare; komponentfilen finns kvar.
- [x] Ta bort all marknadsföring av fakturakontroll från alla sidor (startsida, tre rapportsidor, inloggningssidan, två förhandsvisningssidor). Verktyget /consultant/fakturahjalp och "Fakturahjälpen" i profilen finns kvar. Typkontroll 0 fel, bygg OK.
- [x] Fixa logotypens nederkant i startsidans header (h-7/h-8 + pb-1, delade PNG-filer orörda).

## Klart
- [x] cvExport.ts ersatt byte för byte från bilaga — sha256 f518b034… verifierad, typkontroll 0 fel, bygg OK.
- [x] CV-assistent faktaspärr + exportfixar (cvAssistant.server.ts, cvAssistant.functions.ts, cvExport.ts, CvPreview.tsx) — alla 4 sha256 verifierade byte för byte, typkontroll 0 fel, bygg OK.

- [x] Trust Core v1 – Foundation: guard mot self-verify i consultant_documents, sex trust_*-tabeller med RLS/grants, 7 seedade credential types, create-RPC + admin-transition med append-only audit. Typkontroll 0 fel, build OK, säkerhetstester grönt.

## Öppet (ej påbörjat, avvaktar beslut)
- Uppdragsassistenten "Hälsingland v40–44": plan ligger i .lovable/plan.md, väntar godkännande + beslut om marginal-synlighet.

## Säkerhetskontroll för denna slice
- Kontroll 2026-10-24: endast kortets färger och utloggad omdirigering ändrade; befintlig redirect-validering och allowlist för roll/kommun återanvänds. Ingen RLS-, behörighets-, server-, databas- eller PII-exponeringsändring.
- Inga RLS-, behörighets-, databas- eller serverändringar; yrkesroll/kommun är inte känsliga fält och externa redirect-adresser filtreras bort. Återskapande av lead sker med befintlig INSERT-policy och gör ingen anonym SELECT.
- Ny kontroll 2026-10-23: 0 öppna Project monitoring-fynd; säkerhetsskanning 7 varningar/20 info, linter 40 befintliga flaggor (publika INSERT-policies och callable SECURITY DEFINER-funktioner). Inte ändrade utanför uppdragets error_logs/qa-scope; detta är inte ett intyg om en helt felfri app.
- Nya kontons faktiska Google-/e-postregistrering har inte genomförts; kontolänkar, förifylld enkät och befintligt inloggat konto → personlig rapport verifierade.
