# Ref-ID (tidigare Referly) — vilande spår

Spåret är **pausat, inte raderat**. Ingenting här importeras av appen, inget
bundlas av Vite och katalogen ligger utanför typecheck. Det går att återuppta
utan att börja om.

## Vad som finns kvar

### Databas-schema (fullständigt)
- `sql/01_ref_id_schema.sql` — original-migrationen: enums, tabeller
  (`ref_role_profiles`, `ref_profiles`, `ref_user_roles`, `ref_references`,
  `ref_pings`, `ref_profile_views`, `ref_verifications`, `ref_verified_domains`),
  RLS-policies, security definer-funktioner och seed-data för rollprofiler.
- `sql/99_drop_ref_id_tables.sql` — migrationen som tog bort tabellerna
  2026-07-30. Visar exakt vad som droppades.

### Kvar i live-databasen (rör ej)
`ref_profiles` och `ref_user_roles` finns kvar — de används av signup-trigger
och inloggning. Övriga `ref_*`-tabeller är droppade.

### Frontend-kod (arkiverad, orörd)
- `src/_archive/pages/Referenser.tsx`, `ReferenserInfo.tsx`,
  `ReferenceForm.tsx`, `ReferralLanding.tsx`, `demo/ReferenceDemo.tsx`
- `src/_archive/components/referly/*` (ReferenceCard, ReferenceDashboard,
  ReferenceVault, VaultReferenceCard, TrustScoreCard, InviteModal,
  ImportVerifyModal, VerificationUpload, DocumentUpload)
- `src/_archive/components/profile/DashboardReferences.tsx`,
  `ReferenceSlidePanel.tsx`
- `src/_archive/components/landing/RefSection.tsx`
- `src/_archive/hooks/useRefProfile.ts`
- `src/_archive/types/referly.ts`

### Edge functions (fortfarande i repo)
`supabase/functions/reference-vault`, `send-referral`, `confirm-referral`.

## Så återupptar du spåret

1. Kör `sql/01_ref_id_schema.sql` som ny migration (hoppa över
   `ref_profiles` / `ref_user_roles` som redan finns). Lägg till `GRANT`
   för `authenticated` / `service_role` per tabell — original-migrationen
   skrevs innan grant-kravet.
2. Flytta tillbaka önskade filer från `src/_archive/` till motsvarande
   plats i `src/` (strukturen speglar originalet).
3. Laga `@/...`-imports — de kan peka på filer som flyttats sedan dess.
4. Registrera routes i `src/App.tsx` (`/referenser`, `/referenser/info`,
   `/r/:token` m.fl. — se sidfilernas kommentarer).
5. Verifiera edge functions och deras secrets innan de används skarpt.

## Terminologi
UI-namn: **Ref-ID**. Händelser heter **plingar** ("Pling-bekräftad",
"Ref-ID pling"). Backend behåller `ref_*` / `ping`-namn.
