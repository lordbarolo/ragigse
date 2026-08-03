import { createFileRoute } from "@tanstack/react-router";
import LonSpecialtyCity from "@/pages/LonSpecialtyCity";
import { getPublicLonRate } from "@/lib/rates.functions";
import { RateDataError, RateNotFound } from "@/components/startsida5c/Fallbacks5c";

export const Route = createFileRoute("/lon/$specialty/$city")({
  loader: ({ params }) =>
    getPublicLonRate({ data: { specialty: params.specialty, city: params.city } }),
  errorComponent: RateDataError,
  notFoundComponent: RateNotFound,
  component: LonSpecialtyCity,
});
