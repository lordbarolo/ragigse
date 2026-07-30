const ITEMS = [
  "SKR Ramavtal 2026 · Regionernas pris till bemanningsföretag",
  "Sjuksköterska zon 1: 616 kr/h",
  "Anestesisjuksköterska zon 3: 880 kr/h",
  "Barnmorska zon 2: 824 kr/h",
  "290 kommuner · 21 regioner täcks",
  "OB vardagnatt: +82 kr/h · Storhelgnatt: +222 kr/h",
  "Reseschablon 300–625 km: 2 750 kr/14 dagar",
  "Uppdaterat 2026-01-01",
];

export default function Ticker() {
  return (
    <div className="bg-primary/[0.06] border-b border-primary/[0.12] py-2.5 overflow-hidden whitespace-nowrap select-none">
      <div className="inline-flex gap-12 animate-[tick_40s_linear_infinite]">
        {[...ITEMS, ...ITEMS].map((item, i) => (
          <span
            key={i}
            className="font-display text-xs md:text-[11px] font-medium text-primary tracking-wider flex items-center gap-2"
          >
            <span className="w-[5px] h-[5px] rounded-full bg-primary opacity-60 flex-shrink-0" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
