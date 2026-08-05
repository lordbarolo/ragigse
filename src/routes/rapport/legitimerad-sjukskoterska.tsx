import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/rapport/legitimerad-sjukskoterska")({
  beforeLoad: () => {
    throw redirect({ to: "/rapport/sjukskoterska", statusCode: 301 });
  },
});
