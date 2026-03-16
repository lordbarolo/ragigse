

## Ändringar i `src/pages/Index.tsx`

Fyra punktändringar, alla inom rad 79–98:

1. **Badge** (rad 79): `fontSize: '11px'` → `'13px'`, `px-3.5 py-1` → inline `padding: '8px 18px'`
2. **Badge margin** (rad 79): `mb-5` → `mb-5` behålls men badge-till-H1-gap styrs av wrapper. Enklast: ändra `mb-5` till `mb-[20px]`
3. **H1** (rad 88): `fontSize: '34px'` → `'48px'`
4. **H1-till-subtext gap** (rad 96): `mt-3` → `mt-[20px]`
5. **Subtext** (rad 96): `fontSize: '15px'` → `'17px'`

Inga andra element ändras.

