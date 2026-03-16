import { useState } from "react";
import { ChevronDown, X } from "lucide-react";

interface RadarFiltersProps {
  competence: string;
  location: string;
  buyer: string;
  filterOptions: {
    competences: string[];
    locations: string[];
    buyers: string[];
  };
  onChange: (filters: { competence: string; location: string; buyer: string }) => void;
}

function FilterPill({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = value !== "";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors ${
          active
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border bg-card text-muted-foreground"
        }`}
      >
        {active ? value : label}
        {active ? (
          <X
            className="w-3.5 h-3.5 opacity-60"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setOpen(false);
            }}
          />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 opacity-50" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1.5 z-50 w-56 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover shadow-xl">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`block w-full text-left px-3.5 py-2.5 text-[13px] transition-colors hover:bg-secondary ${
                  opt === value ? "text-primary font-medium" : "text-foreground"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function RadarFilters({ competence, location, buyer, filterOptions, onChange }: RadarFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <FilterPill
        label="Kompetens"
        value={competence}
        options={filterOptions.competences}
        onChange={(v) => onChange({ competence: v, location, buyer })}
      />
      <FilterPill
        label="Ort"
        value={location}
        options={filterOptions.locations}
        onChange={(v) => onChange({ competence, location: v, buyer })}
      />
      <FilterPill
        label="Beställare"
        value={buyer}
        options={filterOptions.buyers}
        onChange={(v) => onChange({ competence, location, buyer: v })}
      />
    </div>
  );
}
