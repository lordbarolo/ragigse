import { createFileRoute } from "@tanstack/react-router";
import SjukskoterskaReport from "@/pages/SjukskoterskaReport";

export const Route = createFileRoute("/rapport/leg-ssk")({
  component: SjukskoterskaReport,
});
