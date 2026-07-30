# TERMINOLOGY.md

**Enda sanningen för namn i CompCare.** Vid konflikt mellan denna fil och äldre
dokument, chattar eller kodkommentarer gäller denna fil.

Senast uppdaterad: 2026-07-28 (konsolidering Fas 4)

---

## 1. Aktiva produktnamn

| UI-namn | Route | Backend-namn (rör ej) | Status |
|---|---|---|---|
| **Löneanalys** | `/`, `/resultat/:leadId`, `/rapport/*` | `leads`, `reports`, `create-report`, `get-report` | Aktiv — huvudprodukten |
| **Löneassistenten** | `/consultant/forhandla` | `salary-negotiation-agent`, `lonekoll-answer` | Aktiv |
| **Min profil** | `/consultant/profil` | `profiles`, `consultant_profiles` | Aktiv |
| **Admin** | `/admin`, `/admin/health`, `/dev/analytics` | `admin-data` m.fl. | Aktiv (intern) |

## 2. Förbjudna namn — använd aldrig i UI eller ny kod

| Skriv aldrig | Skriv i stället |
|---|---|
| Verify, Dokhus | **Din data** |
| Verify Proof, Representationsbevis | **Samarbetsintyg** |
| Referly | **Ref-ID** |
| ping, Ping | **pling** |
| Reijdar | **Uppdragsradar** |
| BankID (utanför verifieringsflödet) | **Digital signering** |
| AI-coach, AI-assistent, agent (om Löneassistenten) | **Löneassistenten** |
| benchmark, topp 20 %, "du tjänar mer än X %" | jämför endast mot ramavtal |
| aktiva avrop, live, pågående uppdrag | publicerade, historiska, senaste 30 d |

## 3. Arkiverade spår

Följande fanns i kodbasen men är avstängda. Koden ligger i `src/_archive/`
(speglar gamla `src/`-strukturen). Använd inte namnen i ny kod.

Ref-ID/Referly · Din data/Dokhus/Verify · Uppdragsradar · Agency/B2B ·
Marketplace · Fakturakontroll · Academy · Eget bolag · AI-chatt · demo-sidor

Om ett spår återupptas: flytta tillbaka filerna, uppdatera denna tabell och
lägg till routen i `src/App.tsx`.

## 4. Backend heter fortfarande det gamla

Databas­tabeller, edge functions och storage-buckets döps **inte** om.
`verify`, `ref_*`, `ping` osv. lever kvar i backend. Omdöpningen gäller
enbart det användaren ser.

## 5. Datakällor — hårda regler

- Konsultersättning: **endast** SKR:s ramavtal 2024/2026 + branschmarginal.
- Anställda sjuksköterskors löner: SCB är OK.
- Aldrig SCB/Medlingsinstitutet för konsultpriser.
- Uppdragsdata: endast `calloff_imports`. Alltid historisk, aldrig "live".
