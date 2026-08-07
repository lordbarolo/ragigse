import { createFileRoute } from "@tanstack/react-router";
import ResetPassword from "@/pages/ResetPassword";
import { seoHead } from "@/lib/seo/routeHead";

export const Route = createFileRoute("/aterstall-losenord")({
  head: () => seoHead({
    title: 'Återställ lösenord – vårdbemanning.ai',
    description: 'Återställ ditt vårdbemanning.ai-lösenord via länken vi skickade till din e-post.',
    path: '/aterstall-losenord',
    noindex: true,
  }),
  component: ResetPassword,
});
