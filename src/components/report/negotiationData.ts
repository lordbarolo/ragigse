export const APPROVED_SUPPLIERS = [
  "Dedicare",
  "Bemanning Sverige",
  "Medpeople",
  "Randstad Care",
  "Adecco Medical",
  "Manpower Care",
  "Uniflex",
  "Qualipharma",
];

export function getNegotiationTips(
  isEmployee: boolean,
  isUnderpaid: boolean,
  diffPercent: number,
  yrke: string
): string[] {
  const tips: string[] = [];

  if (isUnderpaid) {
    tips.push(
      `Enligt ramavtalet bör din ersättning ligga ${diffPercent}% högre. Använd detta som utgångspunkt i förhandlingen.`
    );
    tips.push(
      "Begär ett möte med din bemanningskonsult och presentera ramavtalspriserna som referens."
    );
  } else {
    tips.push(
      "Din lön ligger redan nära marknadspris — bra förhandlat! Fokusera på andra förmåner."
    );
  }

  if (isEmployee) {
    tips.push("Fråga om tjänstepensionen uppgår till minst 4.5% — det ingår i ramavtalets kalkyl.");
    tips.push("Kontrollera att OB-tilläggen följer gällande kollektivavtal.");
    tips.push("Förhandla om utbildningsbudget och kompetensutveckling.");
  } else {
    tips.push("Som egenföretagare bör du fakturera minst 85% av kundpriset.");
    tips.push("Förhandla betalningsvillkor — 15 dagars betaltid istället för 30 gör stor skillnad.");
  }

  tips.push(
    `Nämn att du är medveten om ramavtalspriserna för ${yrke} i din zon — det signalerar att du är insatt.`
  );

  return tips;
}
