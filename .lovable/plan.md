# Rolltabellen direkt under hero + genomgående mörk startsida

## Vad som ändras

1. **Flytta rolltabellen ("Mest sökta rollerna, alla zoner") direkt under heron.**
   Ny sektionsordning på `/`: hero → rolltabell → fotoband → chattövergång → footer.

2. **Gör hela startsidan mörk igen (Resend-tonen: `#0b0c10` bas, `#16171f` kort, `#2a2b36` linjer).**
   Idag är heron mörk och allt under ljust (`#f5f5f7`). Efter ändringen är hela sidan mörk hela vägen ner till footern.

## Så här görs det

- `src/pages/Startsida.tsx`: byt plats på `<RolltabellDark />` och `<FotoBand />`.
- `src/components/startsida5c/Hero.tsx`: ta bort den ljusa övergångsgradienten i botten (den som tonar ner mot `#f5f5f7`) så heron möter den mörka tabellen utan skarv.
- `src/components/startsida5c/RolltabellDark.tsx`: sektionsbakgrund `#0b0c10`, radtema tillbaka till mörkt (rubrik/etiketter `#c4c6ce`, värden `#a1a3ab`, högsta värdet vitt och halvfet, radlinjer `#22232b`), länken "Jämför alla roller" i ljus ton.
- `src/components/startsida5c/FotoBand.tsx`: bakgrund `#0b0c10`, korten `#16171f` med `1px solid #2a2b36`, rubriker vita, brödtext `#b8bac2`, etiketter `#c4c6ce`.
- `src/components/startsida5c/OvergangChatt.tsx`: bakgrund `#0b0c10`, rubrikgradient till ljus (`#ffffff → #b8bac2`), hjälptext `#a1a3ab`.
- `src/components/startsida5c/Footer5c.tsx`: bakgrund `#0b0c10`, toppkant `#22232b`, nav-länkar `#b8bac2` med vit hover, finstilt `#8a8c94`.

Inget innehåll, ingen copy, inga priser och ingen logik ändras — endast sektionsordning och färgtoken i dessa presentationskomponenter. Kontrasten hålls minst AA för all text.

## Kontroll efteråt

Bygg + snabb visuell kontroll av `/` i desktop- och mobilbredd så att ingen ljus remsa eller ljus-på-ljus-text blir kvar.
