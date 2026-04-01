import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OBItem {
  time: string;
  amount: string;
  desc: string;
}

const FALLBACK: OBItem[] = [
  { time: "Vardagkväll", amount: "+37 kr/h", desc: "Mån–tors 19:00–22:00" },
  { time: "Vardagnatt", amount: "+82 kr/h", desc: "Mån–fre 22:00–06:00" },
  { time: "Helgkväll", amount: "+96 kr/h", desc: "Fre–sön 19:00–22:00" },
  { time: "Helgdag", amount: "+96 kr/h", desc: "Lördag–söndag 06:00–19:00" },
  { time: "Helgnatt", amount: "+109 kr/h", desc: "Fre–mån 22:00–06:00" },
  { time: "Storhelg dag", amount: "+184 kr/h", desc: "Storhelg dag och kväll" },
  { time: "Storhelg natt", amount: "+222 kr/h", desc: "Storhelg 22:00–07:00" },
  { time: "Reseschablon", amount: "2 750–\n6 050 kr", desc: "Per pass, zon 2–3 · 4 nivåer" },
];

export default function OBSection() {
  const [items, setItems] = useState<OBItem[]>(FALLBACK);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("rates")
          .select("yrkeskategori, typ, timpris_kund, detaljer")
          .eq("industry", "healthcare")
          .ilike("typ", "%OB%")
          .order("timpris_kund", { ascending: true });

        if (data && data.length > 0) {
          const mapped: OBItem[] = data.map((r) => ({
            time: r.detaljer || r.typ,
            amount: `+${r.timpris_kund} kr/h`,
            desc: r.yrkeskategori,
          }));
          setItems(mapped);
        }
      } catch {
        // keep fallback
      }
    })();
  }, []);

  return (
    <section className="bg-[hsl(var(--dark-2))] border-t border-b border-foreground/[0.07] py-20 md:py-[100px] px-6 md:px-10">
      <div className="max-w-[1080px] mx-auto">
        <p className="font-display text-sm md:text-[11px] font-semibold tracking-[0.14em] uppercase text-primary mb-3.5">
          OB och tillägg
        </p>
        <h2 className="font-display font-extrabold tracking-[-0.03em] leading-[1.1] mb-3.5" style={{ fontSize: "clamp(26px, 4vw, 40px)" }}>
          Vad gäller för obekväm arbetstid?
        </h2>
        <p className="text-base text-foreground/65 font-light leading-relaxed max-w-[480px]">
          OB-tillägg faktureras separat av bemanningsföretaget till regionen och ska inte påverka din grundersättning.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px mt-12 rounded-[20px] overflow-hidden bg-foreground/[0.07]">
          {items.map((item, i) => (
            <div key={i} className="bg-background p-5 text-center">
              <div className="text-xs md:text-[11px] text-foreground/35 font-display font-medium uppercase tracking-wider mb-2">
                {item.time}
              </div>
              <div className="font-display text-[28px] font-extrabold tracking-[-0.03em] text-foreground mb-1 whitespace-pre-line">
                {item.amount}
              </div>
              <div className="text-xs md:text-[11px] text-foreground/35 leading-snug">{item.desc}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-3.5 px-[18px] bg-primary/5 border border-primary/[0.12] rounded-xl text-sm md:text-[13px] text-foreground/65 leading-snug">
          <strong className="text-primary">Viktigt:</strong> OB-tariffer är offentliga och regleras i ramavtalet. De ska inte vara en del av din grundersättningsförhandling — de är en separat post som bemanningsföretaget fakturerar regionen utöver grundpriset och som du ska få i sin helhet.
        </div>
      </div>
    </section>
  );
}
