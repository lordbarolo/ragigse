

# Plan: Skapa CompCare Fakturagranskning-rapport (PDF)

## Sammanfattning

Skapa en professionell PDF-rapport — "Fakturagranskning" — som CompCare kan skicka till kunder efter genomförd granskning av fakturor och tidrapporter. Dokumentet speglar strukturen i Eneas energirevisions-mall men anpassat till CompCares domän (konsultfakturor, tidrapporter, ramavtal).

## Dokumentstruktur (6 sidor)

### Sida 1 — Försättsblad
- CompCare-logga (vit text, mörk bakgrund `#0D111C` med cyan accent `#00D2E6`)
- Titel: **FAKTURAGRANSKNING**
- Kundnamn (placeholder: `[Bolagsnamn]`)
- Ikon: dokument med förstoringsglas

### Sida 2 — Resultat av granskningen
- Rubrik: **INFORMATION GENOMFÖRD FAKTURAGRANSKNING**
- Fält: Bolag, Org nr, Yrkeskategori, Granskningsperiod, Antal fakturor
- Resultattext (två varianter som placeholder):
  - Variant A: Inga avvikelser hittades
  - Variant B: Avvikelser identifierade — sammanfattning av belopp
- Granskare, datum, CompCare kontaktuppgifter
- Fotnot: förbehåll om eventuella fel

### Sida 3 — Konsultfakturan
- Förklarande text om hur konsultfakturor fungerar
- Normaltid, OB-tillägg, beredskap, jour
- Vanliga felkällor (beredskapstimmar, storhelgstillägg, tidbandskategorisering)

### Sida 4 — Ramavtal och prissättning
- Förklaring av ramavtal inom vård/omsorg
- Hur OB-multiplikatorer och arbetsgivaravgifter påverkar slutpriset
- Tabell med exempel på typiska OB-nivåer

### Sida 5 — Vanliga avvikelser
- Typexempel på avvikelser CompCare hittar
- Illustration av hur timmar kan falla bort mellan tidrapport och faktura

### Sida 6 — CompCares tjänster
- Kort om CompCare och övriga tjänster (löneanalys, referenshantering)
- Kontaktuppgifter och webbadress

## Tekniska detaljer

- Genereras med **reportlab** (Python) som ett snyggt PDF-dokument
- CompCare-branding: mörk bakgrund (`#0D111C`), cyan accent (`#00D2E6`), vit text, Inter/Arial typsnitt
- Platshållare markerade med `[hakparenteser]` för att fyllas i per kund
- Output: `/mnt/documents/compcare_fakturagranskning_mall.pdf`
- Visuell QA genomförs efter generering

