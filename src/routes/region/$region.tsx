import { createFileRoute, redirect } from "@tanstack/react-router";

// Historiska programmatiska SEO-sidor (/region/stockholm m.fl.) finns inte kvar
// efter konsolideringen. De ligger fortfarande i Googles index och rankar, så
// de pekas om permanent till prisöversikten tills dedikerade regionsidor byggs.
export const Route = createFileRoute("/region/$region")({
  beforeLoad: () => {
    throw redirect({ to: "/faktasidor", statusCode: 301 });
  },
});
