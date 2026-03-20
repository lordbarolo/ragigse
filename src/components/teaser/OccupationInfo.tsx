import { useState } from "react";
import { Stethoscope, MapPin, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SearchableSelect from "@/components/SearchableSelect";
import { useLocations, useRates } from "@/hooks/useCalculator";

interface Props {
  yrke: string;
  kommun: string;
  onChangeYrke?: (yrke: string) => void;
  onChangeKommun?: (kommun: string) => void;
}

export default function OccupationInfo({ yrke, kommun, onChangeYrke, onChangeKommun }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [tempYrke, setTempYrke] = useState(yrke);
  const [tempKommun, setTempKommun] = useState(kommun);
  const [selectedRegion, setSelectedRegion] = useState("");

  const { data: locations } = useLocations();
  const { data: rates } = useRates();

  const editable = !!onChangeYrke || !!onChangeKommun;

  // Unique yrke options from rates
  const yrkeOptions = rates
    ? [...new Set(rates.map((r) => r.yrkeskategori))]
        .sort((a, b) => a.localeCompare(b, "sv"))
        .map((y) => ({ value: y, label: y }))
    : [];

  // Regions
  const regions = locations
    ? [...new Set(locations.map((l) => l.region))]
        .sort((a, b) => a.localeCompare(b, "sv"))
    : [];

  // Kommuner filtered by region
  const filteredKommuner = locations && selectedRegion
    ? locations
        .filter((l) => l.region === selectedRegion)
        .map((l) => ({ value: l.kommun, label: l.kommun }))
        .sort((a, b) => a.label.localeCompare(b.label, "sv"))
    : [];

  const handleOpen = () => {
    setTempYrke(yrke);
    setTempKommun(kommun);
    setSelectedRegion("");
    setEditOpen(true);
  };

  const handleSave = () => {
    if (tempYrke && tempKommun) {
      onChangeYrke?.(tempYrke);
      onChangeKommun?.(tempKommun);
      setEditOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={editable ? handleOpen : undefined}
        className={`flex items-center gap-3 text-sm border border-border rounded-lg px-4 py-2.5 bg-card card-shadow w-full text-left ${editable ? "cursor-pointer hover:border-primary/50 transition-colors" : ""}`}
      >
        <Stethoscope className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="font-medium text-foreground">{yrke}</span>
        <span className="text-border">·</span>
        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="font-medium text-foreground">{kommun}</span>
        {editable && (
          <Pencil className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />
        )}
      </button>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ändra roll och ort</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Yrkesroll</label>
              <SearchableSelect
                options={yrkeOptions}
                value={tempYrke}
                onValueChange={setTempYrke}
                placeholder="Välj yrkesroll..."
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Region</label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {regions.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setSelectedRegion(r);
                      setTempKommun("");
                    }}
                    className={`text-left text-sm px-3 py-2 rounded-md border transition-colors ${
                      selectedRegion === r
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {selectedRegion && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Kommun</label>
                <SearchableSelect
                  options={filteredKommuner}
                  value={tempKommun}
                  onValueChange={setTempKommun}
                  placeholder="Välj kommun..."
                />
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={!tempYrke || !tempKommun}
              className="w-full"
            >
              Uppdatera
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
