

## Kodstädning — ta bort oanvända importer i Index.tsx

### Vad och varför
Tre importer i `Index.tsx` används aldrig, vilket gör koden onödigt svårläst. Ingen funktionell bugg, men bör städas.

### Ändringar

**`src/pages/Index.tsx`**
- Ta bort `useNavigate` från react-router-dom-importen (rad 2)
- Ta bort `useSearchParams` från samma import (rad 2) 
- Ta bort `LandingFooter`-importen (rad 6)

Resultat: 3 rader renare, inga sidoeffekter.

