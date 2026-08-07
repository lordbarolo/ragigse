import { createFileRoute } from "@tanstack/react-router";
import Campaign from "@/pages/Campaign";
import { seoHead } from "@/lib/seo/routeHead";

export const Route = createFileRoute("/kampanj/$role")({
  head: ({ params }) =>
    seoHead({
      title: "Ramavtalspriser per zon – vårdbemanning.ai",
      description:
        "Se aktuella ramavtalspriser per zon för din yrkesroll. Anonymt och kostnadsfritt via vårdbemanning.ai.",
      path: `/kampanj/${params.role}`,
      noindex: true,
    }),
  component: Campaign,
});
