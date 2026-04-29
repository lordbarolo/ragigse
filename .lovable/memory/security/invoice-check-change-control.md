---
name: Invoice Check Change Control
description: Changes to fakturakontroll (model, prompts, match logic, thresholds) require explicit admin approval before deploy
type: constraint
---

Fakturakontrollen är produktionskritisk. Följande ändringar får ALDRIG göras utan explicit admingodkännande (Anders) innan deploy:

- Byte av AI-modell i `invoice-extract` / `invoice-analyzer` (nuvarande stabil: `google/gemini-2.5-flash`)
- Ändringar i system-prompts (PASS1/PASS2)
- Ändringar i `compareTidrapportPasses` / matchlogik / toleranser
- Ändringar i confidence-trösklar i UI (`FakturakontrollNy.tsx`)
- Ändringar i regelmotor (A1–A8) i `invoice-analyzer`

**Why:** Tidigare byte till `gemini-3-flash-preview` gav katastrofala resultat i produktion. Användaren ska heller aldrig se kontrollens resultat — endast admin via dashboard + mailnotis till `anders@compcare.se`.

**How to apply:** Vid AI-förslag som rör dessa filer — stoppa, fråga användaren om godkännande, lista exakt vad som ändras.
