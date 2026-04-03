

## Plan: Fixa horisontell overflow + `/index`-redirect

### 1. Horisontell overflow (`src/pages/consultant/SalaryCheck.tsx`)

Rot-`<div>` på rad 71 (`<div className="bg-background">`) saknar `overflow-x-hidden`. Gradient-orbs i Sektion 2 (rad 125–128, särskilt `inset-[-5%]}` på rad 186) kan bryta ut på smala skärmar.

**Åtgärd:** Lägg till `overflow-x-hidden` på rot-div:en (rad 71).

### 2. `/index`-redirect (`src/App.tsx`)

Appen har ingen `/index`-rutt. Preview-miljön landar på `/index` → 404/NotFound.

**Åtgärd:** Lägg till en redirect bland backwards-compat-rutterna (rad 154–160):
```
<Route path="/index" element={<Navigate to="/" replace />} />
```

### Berörda filer
- `src/pages/consultant/SalaryCheck.tsx` — en rad ändras
- `src/App.tsx` — en rad läggs till

