import { createFileRoute } from "@tanstack/react-router";
import Report from "@/pages/Report";
import LakareSpecialtyReport from "@/pages/LakareSpecialtyReport";
import { DOCTOR_SPECIALTY_REPORTS } from "@/data/doctorSpecialtyReports";

const DOCTOR_SLUGS = new Set(DOCTOR_SPECIALTY_REPORTS.map((r) => r.slug));

// In the old App.tsx, DOCTOR_SPECIALTY_REPORTS.map() generated one static
// route per doctor specialty ahead of the dynamic /rapport/:reportId route.
// Here a single dynamic route dispatches on the same data source.
function RapportDispatch() {
  const { reportId } = Route.useParams();
  if (DOCTOR_SLUGS.has(reportId)) return <LakareSpecialtyReport />;
  return <Report />;
}

export const Route = createFileRoute("/rapport/$reportId")({
  component: RapportDispatch,
});
