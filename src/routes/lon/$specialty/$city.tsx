import { createFileRoute } from "@tanstack/react-router";
import LonSpecialtyCity from "@/pages/LonSpecialtyCity";
import { seoHead } from "@/lib/seo/routeHead";

export const Route = createFileRoute("/lon/$specialty/$city")({
  head: ({ params }) =>
    seoHead({
      title: "Timpeng per roll och ort 2026 | vårdbemanning.ai",
      description:
        "Timpeng och ersättningsspann per yrkesroll och ort enligt regionernas ramavtal 2026.",
      path: `/lon/${params.specialty}/${params.city}`,
      noindex: true,
    }),
  component: LonSpecialtyCity,
});
