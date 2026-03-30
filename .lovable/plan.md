

## Plan: Hint i Löneassistenten som guidar till Uppdragsassistenten

### Vad som byggs

En diskret informationsrad under den befintliga SuggestedPrompts-komponenten (eller under chattfältet) som informerar användaren om att uppdragsfrågor hanteras av Uppdragsassistenten, med en länk till uppdragssidan.

### Ändringar

**`src/components/chat/SuggestedPrompts.tsx`**
- Lägg till en rad under "Alla svar grundas i CI-motorn"-texten med en `Link` till `/consultant/uppdragsradar`:
  - Text: "Har du frågor om kommande uppdrag? Prova Uppdragsassistenten"
  - Stilsatt som en subtil hint (liten text, muted färg, länkdelen i primary-färg)
  - Visas bara på startskärmen (innan konversation påbörjats), alltså i samma vy som de föreslagna promptarna

Ingen annan fil behöver ändras. Systemprompten hanterar redan cross-referral under pågående konversation.

