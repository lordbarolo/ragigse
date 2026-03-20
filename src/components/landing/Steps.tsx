const STEPS = [
  {
    icon: "🏥",
    title: "Välj roll och zon",
    desc: "Ange din yrkeskategori och vilken zon du arbetar i. Zon bestäms av var regionen är belägen — inte var du bor.",
    detail: { label: "Zon 1", text: "Stockholm · Västra Götaland · Skåne · m.fl." },
  },
  {
    icon: "💰",
    title: "Ange din ersättning",
    desc: "Ange din timersättning eller månadslön. Vi räknar automatiskt om och jämför mot vad regionen betalar till bemanningsföretaget.",
    detail: { label: "", text: "Din ersättning jämförs mot regionens kundpris, inte mot andra konsulters uppgifter." },
  },
  {
    icon: "📊",
    title: "Få din rapport",
    desc: "Se din position i marknadsspannet, vad ramavtalspriset är för din roll, och konkreta förhandlingstips anpassade till din situation.",
    detail: { label: "", text: "Rapporten skickas till din mail. Ingen annan ser den." },
  },
];

export default function Steps() {
  return (
    <section id="steps" className="bg-[hsl(var(--dark-2))] border-t border-b border-foreground/[0.07]">
      <div className="max-w-[1080px] mx-auto py-20 md:py-[100px] px-6 md:px-10">
        <p className="font-display text-[11px] font-semibold tracking-[0.14em] uppercase text-primary mb-3.5">
          Så fungerar det
        </p>
        <h2 className="font-display font-extrabold tracking-[-0.03em] leading-[1.1] mb-3.5" style={{ fontSize: "clamp(26px, 4vw, 40px)" }}>
          Din rapport på tre steg
        </h2>
        <p className="text-base text-foreground/65 font-light leading-relaxed max-w-[480px]">
          Ingen registrering. Inga personuppgifter. Bara fakta från offentliga ramavtal.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0.5 mt-14">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className="bg-background p-9 px-8 relative overflow-hidden"
              style={{
                borderRadius:
                  i === 0 ? "20px 20px 0 0" : i === 2 ? "0 0 20px 20px" : "0",
              }}
            >
              {/* Large bg number */}
              <span className="absolute top-3 right-5 font-display text-[96px] font-extrabold text-foreground/[0.025] leading-none tracking-[-0.05em] pointer-events-none select-none">
                {i + 1}
              </span>
              <div className="w-11 h-11 rounded-[11px] bg-primary/[0.12] border border-primary/[0.18] flex items-center justify-center text-[22px] mb-6">
                {s.icon}
              </div>
              <h3 className="font-display text-[17px] font-bold tracking-[-0.02em] mb-2.5">{s.title}</h3>
              <p className="text-sm text-foreground/65 leading-relaxed">{s.desc}</p>
              {s.detail && (
                <div className="mt-4 p-3 bg-foreground/[0.03] border border-foreground/[0.07] rounded-lg text-xs text-foreground/35 font-display font-medium">
                  {s.detail.label && <strong className="text-primary font-semibold">{s.detail.label} </strong>}
                  {s.detail.text}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
