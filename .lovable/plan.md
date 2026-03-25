

# Consultant Dashboard MVP – Korrigerad plan

## Korrigeringar från feedback

1. **FK på action_items** → `REFERENCES profiles(id)` inte `profiles(user_id)`
2. **UNIQUE constraint** → `UNIQUE(profile_id, type)` — upsert mellan pending/done, ingen historik
3. **Sidoeffekt före RETURN** — all UPDATE/INSERT-logik placeras före RETURN i funktionen
4. **Ingen extra RLS för user insert/update nu** — service_role hanterar, kan läggas till senare

---

## Del 1: Migration 1 — Cache-kolumner på profiles

```sql
ALTER TABLE profiles ADD COLUMN has_required_references BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN has_valid_ivo BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN has_valid_hosp BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN has_bankid BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN profile_status TEXT DEFAULT 'incomplete';
ALTER TABLE profiles ADD COLUMN status_updated_at TIMESTAMPTZ;
```

## Del 2: Migration 2 — action_items

```sql
CREATE TABLE action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, type)
);
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own actions" ON action_items
  FOR SELECT TO authenticated USING (profile_id = auth.uid());

CREATE POLICY "Service role manages actions" ON action_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

## Del 3: Uppdatera `ref_calculate_profile_status`

Ändra funktionen från `STABLE` till `VOLATILE` (den skriver nu). Innan `RETURN`-satsen, lägg till:

```sql
-- Sync cache columns
UPDATE profiles SET
  has_required_references = (_ref_count >= _required),
  has_valid_ivo = _has_ivo,
  has_valid_hosp = _has_hosp,
  has_bankid = _has_bankid,
  profile_status = _status,
  status_updated_at = NOW()
WHERE id = p_profile_id;

-- Upsert action items (pending if not met, done if met)
INSERT INTO action_items (profile_id, type, status, priority)
VALUES
  (p_profile_id, 'missing_reference', CASE WHEN _ref_count >= _required THEN 'done' ELSE 'pending' END, 1),
  (p_profile_id, 'add_ivo', CASE WHEN _has_ivo THEN 'done' ELSE 'pending' END, 2),
  (p_profile_id, 'add_hosp', CASE WHEN _has_hosp THEN 'done' ELSE 'pending' END, 3)
ON CONFLICT (profile_id, type) DO UPDATE SET
  status = EXCLUDED.status;
```

Sedan `RETURN ...` som idag.

## Del 4: Nya komponenter

### `src/components/dashboard/StatusBadge.tsx`
Kompakt badge (grön/gul/röd) baserad på `profile_status`.

### `src/components/dashboard/ActionItems.tsx`
- Hämtar `action_items` WHERE `profile_id = user.id AND status = 'pending'`
- Visar "X saker kräver din åtgärd"
- Varje rad: typ-ikon + CTA som triggar rätt modal (bjud in referens / ladda upp IVO / ladda upp HOSP)

### `src/hooks/useActionItems.ts`
Hook: hämtar pending actions, exponerar `actions`, `loading`, `refresh`.

## Del 5: Omarbeta `src/pages/Profile.tsx`

Bort med tab-layout. Vertikal dashboard:

```text
┌─────────────────────────┐
│ Header + StatusBadge    │
├─────────────────────────┤
│ 🔥 ActionItems          │
├─────────────────────────┤
│ Checklista (kompakt)    │
├─────────────────────────┤
│ Referenser (max 3)      │
├─────────────────────────┤
│ Mina rapporter          │
└─────────────────────────┘
```

## Ordning
1. Migration 1 (profiles-kolumner)
2. Migration 2 (action_items)
3. Uppdatera ref_calculate_profile_status (ny migration med CREATE OR REPLACE)
4. Nya UI-komponenter + hook
5. Omarbeta Profile.tsx

