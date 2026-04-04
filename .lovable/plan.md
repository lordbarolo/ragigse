

## Plan: SPA-stöd för Google Analytics

### Problem
Appen är en SPA (Single Page Application). GA-taggen i `index.html` skickar bara en `page_view` vid initial laddning. Efterföljande navigeringar (React Router) registreras inte.

### Lösning
Utöka den befintliga `ScrollToTop`-komponenten i `App.tsx` (som redan lyssnar på `pathname`) med ett `gtag('config', ...)` -anrop vid varje ruttändring. Detta skickar en ny `page_view`-händelse till GA.

### Ändringar

**`src/App.tsx`** — Lägg till GA pageview-tracking i `ScrollToTop`:

```tsx
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    // Send pageview to Google Analytics on SPA navigation
    if (typeof window.gtag === 'function') {
      window.gtag('config', 'G-8TKTZH3KZZ', {
        page_path: pathname,
      });
    }
  }, [pathname]);

  return null;
}
```

**`src/vite-env.d.ts`** — Lägg till typdeklaration för `gtag` på `window`:

```ts
interface Window {
  gtag?: (...args: any[]) => void;
}
```

### Resultat
Varje sidnavigering i appen (t.ex. `/rapport/abc`, `/consultant/profil`, `/vanliga-fragor`) skickar en separat sidvisning till Google Analytics.

