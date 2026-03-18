

## Plan: Import test data into calloff_imports

Insert test rows into `calloff_imports` covering a few roles and regions that already exist in `requests`, so we can verify the merge in Uppdragsradar predictions.

### Test data to insert

Insert ~6 rows across 2-3 roles (Sjuksköterska, Läkare) and regions that already have data in `requests`, plus one row for a new region to test that new regions appear. Each row will have a recent `calloff_date` and varying `source` values (bemlo, medlo, manual).

### SQL

```sql
INSERT INTO calloff_imports (source, calloff_date, region, customer, role, specialization, filled, price_median)
VALUES
  ('bemlo',  '2026-02-15', 'Region Stockholm',       'Karolinska', 'Sjuksköterska', 'IVA',       true,  620),
  ('medlo',  '2026-03-01', 'Region Stockholm',       'Danderyds sjukhus', 'Sjuksköterska', NULL, false, 590),
  ('bemlo',  '2026-01-20', 'Region Västra Götaland', 'Sahlgrenska', 'Läkare', 'Allmänmedicin',  true,  980),
  ('manual', '2026-03-10', 'Region Västra Götaland', 'SU Östra',   'Läkare', NULL,              false, 950),
  ('bemlo',  '2026-02-01', 'Region Skåne',           'SUS Malmö',  'Sjuksköterska', 'Akut',      true,  600),
  ('medlo',  '2026-03-05', 'Region Skåne',           'SUS Lund',   'Läkare', 'Kirurgi',         false, 1020);
```

### Verification steps
After inserting, navigate to `/uppdragsradar`, select "Sjuksköterska" or "Läkare", and confirm that:
1. The prediction cards reflect the merged data (updated dates, adjusted intervals)
2. The `antal_historiska_uppdrag` count is higher than before
3. New regions from imports appear if they meet the 3-row minimum

### Technical details
- Uses the database insert tool (not a migration, since this is data, not schema)
- No code changes needed -- the edge function already merges both tables

