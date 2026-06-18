const STATS = [
  { num: "66", unit: " roller", label: "Yrkeskategorier med exakta priser per zon" },
  { num: "311", unit: " geografiska områden", label: "290 kommuner och 21 regioner täcks" },
  { num: "0", unit: " kr", label: "Din rapport är alltid gratis och anonym" },
];

export default function StatBar() {
  return (
    <div className="grid grid-cols-3 border-t border-b border-foreground/[0.07]">
      {STATS.map((s, i) => (
        <div
          key={i}
          className="py-7 px-6 text-center bg-[hsl(var(--dark-2))]"
          style={{ borderRight: i < 2 ? "1px solid hsl(0 0% 100% / 0.07)" : "none" }}
        >
          <div className="font-display font-extrabold tracking-[-0.04em] leading-none text-primary mb-1.5" style={{ fontSize: "clamp(28px, 5vw, 44px)" }}>
            {s.num}<span className="text-foreground/65 text-[0.55em] font-normal">{s.unit}</span>
          </div>
          <div className="text-sm md:text-xs text-muted-foreground font-medium leading-snug">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
