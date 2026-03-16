

## Nuvarande storlekar

- **Brödtexten** ("Ange din e-post så skickar vi hela analysen direkt") är **13px** (`text-[13px]`) i AnalysisScreen.
- **Privacytexten** ("Vi delar aldrig din e-post…") i EmailGate använder `text-hint` = **12px**.
- **Trust-badges** ("Visas direkt", "Ingen inloggning", "Inget nyhetsbrev") är **12px**.

## Problem

1. **Brödtexten på 13px är för liten** — svår att läsa mot den mörka bakgrunden, särskilt på mobil.
2. **Prompten "Ange din e-post…" smälter in** i bakgrunden — den har ingen visuell vikt och ser ut som en fotnot snarare än en instruktion.
3. **E-postfältet och knappen** saknar en tydlig visuell hierarki som leder ögat.

## Förslag

### 1. Öka brödtextens storlek och kontrast
- Ändra prompt-texten från `text-[13px] text-muted-foreground` till **`text-[15px] text-foreground/70 font-medium`** — mer läsbar och tydligare koppling till inputfältet.

### 2. Lägg till en tydlig rubrik ovanför e-postfältet
- Ersätt den lilla Mail-ikon + text-raden med en kort, fetare rubrik: **"Ange din e-post"** i `text-[16px] font-semibold text-foreground`, följt av undertexten "Så skickar vi hela analysen direkt" i `text-[14px] text-foreground/60`.
- Detta skapar en tydlig tvåradersstruktur: rubrik + förklaring → input → knapp.

### 3. Öka trust-badge-storleken
- Ändra trust-badges från `text-[12px]` till **`text-[13px]`** och checkmarks från `text-[10px]` till `text-[12px]` för bättre läsbarhet.

### 4. Samma ändringar i EmailGate.tsx (teasersidan)
- Ändra `text-hint` på privacytexten till `text-[13px]` för konsistens.

### Filer att ändra
- `src/pages/AnalysisScreen.tsx` — rad 399–440 (prompt + trust-badges)
- `src/components/teaser/EmailGate.tsx` — rad 47 (privacytext)

