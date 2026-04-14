
# Plan: Fakturakontrollsidan — No cure no pay, processguide och avtal

## Status: Implementerad

## Levererat

1. **Introduktionssektion** på FakturakontrollNy: 4-stegs processguide ("Så fungerar tjänsten") + info-box om No cure – no pay (25 % av identifierat belopp).
2. **Avtalstext i dialog** — 7 punkter baserade på Eneas avtalsmall, med CompCare-bolagsuppgifter (platshållare), dynamisk e-post från inloggad användare, och GDPR-punkt.
3. **PDF-avtal** — `compcare_granskningsavtal.pdf` med CompCare-branding, nedladdningsbar från dialogen.
4. **Steg 5 bekräftelsetext** — uppdaterad till "vi återkommer inom 2 arbetsdagar".
5. **Avtalsacceptans** — checkbox + terms_accepted_at-tidsstämpel i invoice_reviews.
