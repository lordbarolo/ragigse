

## Plan: Optimera mobilvy-marginaler på LandingV2

Sidan använder redan `px-6` (24px) på de flesta sektioner, men hero-sektionens text-container och kort-container har inkonsistenta paddings. På 390px bred viewport behöver vi säkerställa att alla sektioner har enhetliga och optimala marginaler.

### Ändringar i `src/pages/demo/LandingV2.tsx`

1. **Hero text-container (rad 216)**: Behåll `px-6` men ta bort `md:px-10` och flytta det till `sm:px-10` om det behövs, samt justera så att texten inte klämmer mot kanten.

2. **Hero cards-container (rad 250)**: Ta bort `px-6` på mobil — korten har redan `max-w-[260px]` och `mx-auto`, så extra padding kan göra att de ser konstiga ut. Alternativt, behåll `px-6` men justera `max-w` så korten fyller utrymmet bättre på mobil.

3. **CTA-banner (rad 503)**: Har `mx-6` men inre padding `px-6` — totalt 48px per sida på mobil. Kan minskas till `mx-4` på mobil för mer utrymme.

### Konkret plan

Uppdatera dessa rader:
- **Rad 186** (hero section): Lägg till `px-4 sm:px-6` istället för ingen padding på section-nivå
- **Rad 216** (hero text): Ändra `px-6 md:px-10` → `px-5 sm:px-6 md:px-10` för bättre mobilutrymme
- **Rad 250** (cards): Ändra `px-6 md:px-0` → `px-0 md:px-0` (kort är redan centrerade med max-w)
- **Rad 503** (CTA banner): Ändra `mx-6` → `mx-4 sm:mx-6` för mer andrum på liten mobil

Dessa justeringar ger en enhetlig och andningsrik mobilvy utan att påverka desktop.

