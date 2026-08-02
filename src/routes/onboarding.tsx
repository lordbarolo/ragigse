import { createFileRoute } from "@tanstack/react-router";
import Onboarding from "@/pages/Onboarding";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Kom igång – CompCare" },
      {
        name: "description",
        content:
          "Fyll i roll, ort, kontraktsform och ersättning för att se dina villkor i förhållande till marknaden.",
      },
      { property: "og:title", content: "Kom igång – CompCare" },
      {
        property: "og:description",
        content: "Roll, ort, kontraktsform och ersättning behövs för att visa dina villkor mot marknaden.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Onboarding,
});
