import { createFileRoute } from "@tanstack/react-router";
import Faktasidor from "@/pages/Faktasidor";
import { seoHead } from "@/lib/seo/routeHead";

export const Route = createFileRoute("/faktasidor")({
  head: () => seoHead({
    title: 'Din ersättning enligt ramavtalet 2026 – sök roll och kommun',
    description: 'Sök din yrkesroll och kommun och få en personlig ersättningsanalys enligt regionernas ramavtal 2026. Skapa konto för att se exakta nivåer.',
    path: '/faktasidor',
  }),
  component: Faktasidor,
});
