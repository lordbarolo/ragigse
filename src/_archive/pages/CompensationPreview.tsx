import CompensationView from "@/components/report/CompensationView";

export default function CompensationPreview() {
  return (
    <div className="min-h-[100dvh] bg-secondary/30 flex items-start justify-center p-4 pt-8">
      <CompensationView
        role="Specialistsjuksköterska – Ambulans"
        location="Borlänge"
        employmentType="consultant"
      />
    </div>
  );
}
