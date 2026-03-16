export const APPROVED_SUPPLIERS = [
  "ABC Doctor AB",
  "AdatoCare AB",
  "Agito Sverige AB",
  "AIWO AB",
  "Almia",
  "Amelia Vårdbemanning AB",
  "AnnSam AB",
  "Avera Bemanning AB",
  "Bonliva AB",
  "Careisma AB",
  "Colligo Vårdkompetens AB",
  "Commitmed Group AB",
  "Cura Connect AB",
  "Curaliv AB",
  "CureLink AB",
  "Dedicare Sverige AB",
  "Docia",
  "FlexCare Sweden AB",
  "Health Connect 365 AB",
  "Hedera Medical AB",
  "Hedera Nurse AB",
  "Helsebemanning AS",
  "Idaliv AB",
  "Instacura",
  "Invida Vårdservice AB",
  "Klara D AB",
  "Kletor AB",
  "Linda van Hees Vårdmäklarna AB",
  "LäkarAkademien Sverige AB",
  "Läkarjouren i Norrland AB",
  "LäkarLeasing Sverige AB",
  "LäkarResurs FA Rekryt AB",
  "MACC People AB",
  "Medcura AB",
  "Mediate Nordic AB",
  "Medkomp Vårdbemanning Aktiebolag",
  "Medlink Nordic AB",
  "Medpeople AB",
  "Medsource AB",
  "Necessio AB",
  "Nordic Medicare A/S",
  "Norrländsk Sjukvårdskonsult AB",
  "Nurse & Doc Partner Scandinavia AB",
  "Ofelia Vård AB",
  "Omsorg & Behandling",
  "Operationskonsulterna",
  "Operationsspecialisten Stockholm AB",
  "OWA AB",
  "Palmelind Konsult AB/Magnifiq Kompetens",
  "Pelmatic ab",
  "Promediqa Group Sweden AB",
  "QA Nursescare AB",
  "Qura Care AB",
  "Randstad",
  "RentalCare Sverige AB",
  "Sanandum AB",
  "Seie AS",
  "Sjuksyrra SWE AB",
  "SjukvårdsMäklarna Sverige AB",
  "Skandinavisk Hälsovård AB",
  "StellaCura AB",
  "Stensjö Vårdresurs AB",
  "Svea Work AB",
  "Sveda & Värk AB",
  "Svensk Vårdsupport AB",
  "Svensk Vårdsupport Sjuksköterskor AB",
  "Sverek AB",
  "Systrarnas Bemanning",
  "Te Crea Care AB",
  "Transmedica A/S",
  "Tribonum Vårdbemanning AB",
  "Viraliv AB",
  "Viva Bemanning AB",
  "ViVAB Aktiebolag",
  "Vårdbemanning Sverige AB",
  "Vårdgruppen Stockholm AB",
  "We Connect Care Sweden AB",
  "Youpal AB",
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
      `Ramavtalspriset ligger ${diffPercent}% över din nuvarande ersättning. Ramavtalspriserna kan användas som referens i ett ersättningssamtal.`
    );
  } else {
    tips.push(
      "Din ersättning ligger nära marknadsspannet."
    );
  }

  if (isEmployee) {
    tips.push("Tjänstepensionen uppgår normalt till minst 4,5% — det ingår i ramavtalets kalkyl.");
    tips.push("OB-tilläggen regleras av gällande kollektivavtal.");
  } else {
    tips.push("Som företagare ligger faktureringsandelen normalt på 85–90% av bemanningsföretagets pris mot kund.");
  }

  tips.push(
    `Ramavtalspriserna för ${yrke} varierar per zon — se den regionala jämförelsen för fullständig data.`
  );

  return tips;
}
