# Åtgärdsförslag: aktuella säkerhetsfynd

Säkerhetslistan har just nu två allvarliga fynd och två varningar. Båda de allvarliga är redan åtgärdade i koden, men listan har inte uppdaterats.

## 1. Adminlösenord i webbläsarkoden (allvarligt) – redan åtgärdat, listan ej uppdaterad
- Kontroll: `Admin.tsx` och `AnalyticsDashboard.tsx` innehåller inga lösenord längre. Admin-sidorna kräver inloggning och adminroll (`useAdminAuth`).
- Åtgärd: kör en ny skanning och markera fyndet som åtgärdat.
- Rekommendation: de gamla lösenorden `compcare2026`/`Compcare2026` har legat publikt. Använd dem inte någon annanstans, till exempel inte för konton eller andra tjänster.

## 2. Adminfunktioner utan inloggningskontroll (allvarligt) – redan åtgärdat, listan ej uppdaterad
- Kontroll: alla fem funktionerna (`analytics-dashboard`, `import-contract`, `run-price-diff`, `feedback-stats`, `salary-insights`) anropar `requireAdmin` först.
- Åtgärd: testa varje funktion utan inloggning. Den ska svara 401/403. Bekräfta också att den publicerade versionen är den nya, och markera sedan fyndet som åtgärdat.

## 3. Åtkomstregel som släpper igenom allt (varning)
- Hitta exakt vilken tabell och regel det gäller med databaskontrollen.
- Är tabellen avsiktligt publik (som `regions`, `rates` och `roles` för priskalkylatorn)? Då markeras fyndet som avsiktligt med en motivering.
- Annars ersätts regeln med en riktig ägar- eller adminkontroll. Det görs i en migration med test, utan ändrat beteende för besökare.

## 4. Skydd mot läckta lösenord avstängt (varning)
- Slå på kontrollen mot kända läckta lösenord för konton med e-post och lösenord.
- Det påverkar bara nya lösenord och lösenordsbyten, och kräver ingen kodändring.

## Vad som inte ändras
Inget utseende, inga sidor och inga produktflöden ändras. De publika pris- och rolltabellerna lämnas orörda.

## Tekniskt
- Verifiering: `security--run_security_scan`, `supabase--linter`, curl mot edge functions utan token och `manage_security_finding` (mark_as_fixed/ignore).
- Lösenordsskyddet slås på med `supabase--configure_auth` (password_hibp_enabled).
