---
name: Möjlig ersättning – terminologi
description: Använd alltid "möjlig ersättning" istället för "marknadsspann"/"marknadsmässig"/"jämför mot marknaden". Definieras + disclaimer visas på teaser- och rapportsidan via PossibleCompensationInfo.
type: content
---
**Regel:** CompCare jämför aldrig mot "marknaden" generellt — alltid mot **möjlig ersättning**.

**Definition (visas på /teaser och /rapport via `src/components/PossibleCompensationInfo.tsx`):**
> Möjlig ersättning = den ersättning som kan betalas till konsulten utifrån vad kunden betalar enligt ramavtal och bemanningsbranschens standardmarginaler.

**Disclaimer (samma komponent):**
> Individuella förutsättningar så som resekostnader, utbildning, introduktion, boende m.m. kan påverka ersättningen. Be din uppdragsgivare att vara transparent kring vilka kostnader som uppdraget medför.

**Förbjudet i UI-copy:** "marknadsspann", "marknadsmässig", "jämför mot marknaden", "marknadsdata".
**Tillåtet:** "möjlig ersättning", "möjligt ersättningsspann".

Förhandlingsassistenten (`supabase/functions/salary-negotiation-agent/index.ts` ADVICE_SYSTEM) har samma definition + disclaimer som svar på relaterade frågor.
