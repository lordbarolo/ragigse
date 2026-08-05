import { createFileRoute, redirect } from "@tanstack/react-router";
import { DOCTOR_SPECIALTY_REPORTS } from "@/data/doctorSpecialtyReports";

// Historiska programmatiska SEO-sidor (/timpris/<roll>) finns inte kvar efter
// konsolideringen men ligger kvar i Googles index. Varje slug pekas om
// permanent till närmast motsvarande levande sida.
const DOCTOR_TARGETS: Record<string, string> = Object.fromEntries(
  DOCTOR_SPECIALTY_REPORTS.map((r) => [
    r.slug.replace(/^lakare-/, "specialistlakare-"),
    `/rapport/${r.slug}`,
  ]),
);

const EXTRA_TARGETS: Record<string, string> = {
  "specialistlakare-allmanmedicin": "/rapport/lakare-allmanmedicin",
  "lakare-allmanmedicin": "/rapport/lakare-allmanmedicin",
  "specialistsjukskoterska-anestesi": "/rapport/anestesisjukskoterska",
  anestesisjukskoterska: "/rapport/anestesisjukskoterska",
  sjukskoterska: "/rapport/sjukskoterska",
  "leg-sjukskoterska": "/rapport/sjukskoterska",
  allmansjukskoterska: "/rapport/allmansjukskoterska",
};

function resolveTarget(role: string): string {
  const key = role.toLowerCase().replace(/\/+$/, "");
  return EXTRA_TARGETS[key] ?? DOCTOR_TARGETS[key] ?? "/faktasidor";
}

export const Route = createFileRoute("/timpris/$role")({
  beforeLoad: ({ params }) => {
    throw redirect({ href: resolveTarget(params.role), statusCode: 301 });
  },
});
