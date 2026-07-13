# Säkerhetsrevision — CompCare / Supabase
*Skill för återkommande säkerhetsgenomgång. Kör månadsvis eller inför varje release.*

---

Du är en säkerhetsrevisor för Supabase-projekt.
Kör en fullständig säkerhetsrevision och producera
en rapport som håller för extern revision.

## METADATA
Fyll i vid varje körning:

- Datum: [DAGENS DATUM]
- Projektnamn: CompCare
- Granskad av: Claude Code
- Version: [hämta från package.json]
- Tidigare rapport: [datum för senaste körning, eller "Första körning"]

---

## DEL 1 — RLS-POLICIES

Lista alla tabeller i Supabase.
För varje tabell, kontrollera och rapportera:

- [ ] RLS aktiverat? (ja/nej)
- [ ] SELECT-policy: vem kan läsa?
      (anon / authenticated / owner-only / ingen)
- [ ] INSERT-policy: vem kan skriva?
- [ ] UPDATE-policy: vem kan ändra?
- [ ] DELETE-policy: vem kan radera?
- [ ] Kan en inloggad användare läsa en annan användares data? (ja/nej)
- [ ] Kan anonym användare läsa något? (ja/nej)

Flagga specifikt:
- Tabeller utan RLS
- Tabeller med `FOR ALL TO public`
- Tabeller där `authenticated` = kan se alla rader, inte bara sina egna

---

## DEL 2 — STORAGE BUCKETS

Lista alla storage buckets.
För varje bucket:

- [ ] Publik eller privat?
- [ ] Finns SELECT-policy?
- [ ] Finns INSERT-policy?
- [ ] Finns DELETE-policy? (flagga om saknas)
- [ ] Kan anonyma användare ladda upp?
- [ ] Kan en användare se andras filer?

---

## DEL 3 — SECURITY DEFINER-FUNKTIONER

Lista alla funktioner med SECURITY DEFINER.
För varje funktion:

- [ ] Funktionsnamn och syfte
- [ ] Vem kan anropa? (public / authenticated / specific role)
- [ ] Finns `GRANT TO anon` eller `GRANT TO public`?
- [ ] Vad gör funktionen med elevated privileges?
- [ ] Är det befogat att den har SECURITY DEFINER?

---

## DEL 4 — EXPONERADE NYCKLAR OCH SECRETS

Sök igenom all kod i `/src` och `/supabase`.
Leta efter:

- [ ] `service_role` key i frontend-kod
- [ ] Hårdkodade API-nycklar
- [ ] Hårdkodade lösenord eller tokens
- [ ] `.env`-variabler som committats till git
- [ ] `anon key` exponerad i mer än en fil

---

## DEL 5 — EDGE FUNCTIONS

Lista alla edge functions.
För varje funktion:

- [ ] Kräver autentisering? (ja/nej)
- [ ] Validerar den inkommande data?
- [ ] Kan den anropas av vem som helst?
- [ ] Loggar den känslig information?

---

## DEL 6 — JÄMFÖRELSE MED TIDIGARE RAPPORT

Om tidigare rapport finns, jämför och rapportera:

- [ ] Nya fynd sedan sist (försämring)
- [ ] Åtgärdade fynd sedan sist (förbättring)
- [ ] Kvarstående oåtgärdade fynd
- [ ] Trend: bättre, sämre eller oförändrat?

*Om första körning: hoppa över detta avsnitt.*

---

## RAPPORT — FORMAT

Strukturera rapporten exakt så här:

### SAMMANFATTNING
- Antal kritiska fynd:
- Antal allvarliga fynd:
- Antal måttliga fynd:
- Åtgärdade sedan sist:
- Övergripande bedömning: `GODKÄND` / `GODKÄND MED ANMÄRKNINGAR` / `UNDERKÄND`

---

### KRITISKA FYND
*Åtgärda omedelbart*

För varje fynd:

**Fynd:** [beskrivning]
**Risk:** [vad kan hända]
**Vem kan utnyttja:** [anon / authenticated / alla]
**Åtgärd:** [exakt SQL eller kod som löser det]
**Status:** `NY` / `KVARSTÅR FRÅN [datum]` / `ÅTGÄRDAD`

---

### ALLVARLIGA FYND
*Åtgärda inom 7 dagar*

[samma format som ovan]

---

### MÅTTLIGA FYND
*Åtgärda inom 30 dagar*

[samma format som ovan]

---

### REKOMMENDATIONER
[förbättringar som inte är direkta säkerhetsrisker]

---

## SPARA RAPPORTEN

Spara alltid rapporten som:
```
/security-reports/YYYY-MM-DD-security-audit.md
```

Lägg även till en rad i `/security-reports/INDEX.md`:
```
| YYYY-MM-DD | [Godkänd/Underkänd] | [Antal kritiska] | [Antal åtgärdade] |
```
