import { createFileRoute } from "@tanstack/react-router";
import Signup from "@/pages/Signup";

export const Route = createFileRoute("/registrera")({
  component: Signup,
});
