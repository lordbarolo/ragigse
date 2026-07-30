---
name: No Group Role Labels
description: Roller får aldrig benämnas utåt som grupp (t.ex. "Specialistläkare Grupp A") — endast specifik roll
type: constraint
---
Roller benämns aldrig utåt som en grupp. Gruppetiketter som "Specialistläkare Grupp A/B"
finns i prisdata (contract_version_rates) men får ALDRIG exponeras i UI, sitemap,
kampanjsidor, faktasidor, rapporter eller API-svar mot användare.

**How to apply:** använd `isGroupLabelRole` / `filterPublicRoles` i `src/lib/roleVisibility.ts`
för alla publika rollistor. Varje pris ska bindas 1:1 mot en specifik roll.

**Why:** användaren ska alltid se sin exakta roll, inte en administrativ prisgrupp.
