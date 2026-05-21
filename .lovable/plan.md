## Ta bort upprepad sektion i ConsultantTrackContent

### Mål
Ta bort visual comparison bars i summary-kortet eftersom de upprepar samma information som redan visas i textform i raderna ovanför.

### Ändring
- **Fil:** `src/components/report/ConsultantTrackContent.tsx`
- **Åtgärd:** Ta bort hela blocket `<div className="px-4 pt-3 pb-4 flex flex-col gap-3">` med dess tre stapeldiagram-rader (linje ~134–171).

### Påverkan
Ingen annan kod ändras. Summary-kortet behåller text-raderna för Din ersättning och Marknadsspann, men blir kompaktare utan den grafiska upprepningen.