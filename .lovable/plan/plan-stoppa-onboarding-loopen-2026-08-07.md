# Plan: stoppa onboarding-loopen

## Bekräftad rotorsak

- Sista svaret kör `saveProfileContext`, som försöker översätta vald roll och kommun till ID:n i `specialties` respektive `regions`.
- Båda tabellerna är tomma i den aktuella databasen, medan de faktiska källorna `roles`/`role_aliases` och `locations` innehåller data.
- Sparningen lyckas därför med `specialty_id = null` och `region_id = null`. `onboarding_step` blir 5, men kompletthetskontrollen kräver fortfarande både roll och kommun.
- Onboarding navigerar ändå till `/consultant/profil`. Konsultlayoutens gate ser profilen som ofullständig och skickar tillbaka till `/onboarding`; komponenten monteras om på fråga 1.

## Åtgärder

1. **Gör profilens onboardingdata självbärande**
   - Lägg till separata textfält för den exakt valda rollen och kommunen i `consultant_profiles`.
   - Behåll befintliga referens-ID:n för bakåtkompatibilitet, men gör inte onboarding beroende av tomma äldre uppslagstabeller.
   - Migrera befintliga värden där de går att härleda utan att gissa.

2. **Spara och läsa samma kanoniska värden**
   - Uppdatera profilkontexten så enkätens exakta roll och kommun sparas direkt tillsammans med kontraktsform och ersättning.
   - Läs i första hand dessa värden och använd befintliga ID-relationer endast som fallback.
   - Kontrollera varje databasfel explicit; ingen navigation ska ske efter en ofullständig sparning.

3. **Gör slutförandet atomiskt ur användarens perspektiv**
   - Efter sparning: hämta om profilkontexten och navigera endast om den nu är komplett.
   - Vid fel: stanna på sista frågan, behåll svaren och visa ett svenskt felmeddelande i stället för att skicka användaren runt i en loop.
   - Förhindra dubbel submit medan sparningen pågår.

4. **Verifiera hela flödet**
   - Lägg regressionstest för kompletthetskontroll och sparning av exakt roll/kommun.
   - Kör ett autentiserat end-to-end-flöde från fråga 1 till `/consultant/profil` och kontrollera att onboarding inte öppnas igen efter omladdning.
   - Kontrollera att specialistsjuksköterskor behåller sin exakta 1:1-roll och aldrig reduceras till en generell grupp.

5. **Säkerhetskontroll**
   - Behåll användarägarskap via befintlig RLS för `consultant_profiles`; de nya fälten ska endast kunna läsas och ändras av profilens ägare.
   - Kör säkerhetsskanning och databaslinter efter migrationen och dokumentera resultatet innan arbetet markeras klart.

## Avgränsning

- Ingen ändring av enkätens visuella utformning, frågor eller ordning.
- Ingen ändring av pris- eller ersättningslogik.
- Ingen generell specialistsjuksköterskeroll införs.