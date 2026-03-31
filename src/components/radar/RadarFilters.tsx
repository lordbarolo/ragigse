import { useState, useMemo, useRef } from "react";
import { ChevronDown, X, Search } from "lucide-react";

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
  const btnRef = useRef<HTMLButtonElement>(null);
  const [openUp, setOpenUp] = useState(false);

  const active = value !== "";

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setOpenUp(window.innerHeight - rect.bottom < 280);
    }
    setOpen(!open);
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={handleOpen}
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
            onClick={(e) => { e.stopPropagation(); onChange(""); setOpen(false); }}
          />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 opacity-50" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={`absolute left-0 z-50 w-56 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover shadow-xl ${
            openUp ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}>
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
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

function BuyerSearch({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const active = value !== "";

  const filtered = useMemo(() => {
    if (!query) return options.slice(0, 30);
    const q = query.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q)).slice(0, 30);
  }, [query, options]);

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
        <Search className="w-3 h-3" />
        {active ? value : "Verksamhet"}
        {active && (
          <X
            className="w-3.5 h-3.5 opacity-60"
            onClick={(e) => { e.stopPropagation(); onChange(""); setQuery(""); setOpen(false); }}
          />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setQuery(""); }} />
          <div className="absolute top-full left-0 mt-1.5 z-50 w-72 rounded-lg border border-border bg-popover shadow-xl">
            <div className="p-2 border-b border-border">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Sök verksamhet..."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-3.5 py-3 text-[13px] text-muted-foreground">Inga träffar</div>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { onChange(opt); setOpen(false); setQuery(""); }}
                    className={`block w-full text-left px-3.5 py-2.5 text-[13px] transition-colors hover:bg-secondary ${
                      opt === value ? "text-primary font-medium" : "text-foreground"
                    }`}
                  >
                    {opt}
                  </button>
                ))
              )}
            </div>
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
      <BuyerSearch
        value={buyer}
        options={filterOptions.buyers}
        onChange={(v) => onChange({ competence, location, buyer: v })}
      />
    </div>
  );
}
