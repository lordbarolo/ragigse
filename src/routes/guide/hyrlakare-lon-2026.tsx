import { createFileRoute } from "@tanstack/react-router";
import HyrlakareLon2026 from "@/pages/HyrlakareLon2026";
import { seoHead } from "@/lib/seo/routeHead";
import { GUIDE_BY_SLUG } from "@/data/guides";

const guide = GUIDE_BY_SLUG["hyrlakare-lon-2026"]!;

export const Route = createFileRoute("/guide/hyrlakare-lon-2026")({
  head: () =>
    seoHead({
      title: guide.metaTitle,
      description: guide.metaDescription,
      path: `/guide/${guide.slug}`,
      ogType: "article",
    }),
  component: HyrlakareLon2026,
});
