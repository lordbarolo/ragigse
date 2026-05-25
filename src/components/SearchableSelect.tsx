import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Option {
  value: string;
  label: string;
  group?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  placeholderClassName?: string;
}

export default function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Välj...",
  className,
  triggerClassName,
  placeholderClassName,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [flipUp, setFlipUp] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const flatOptions = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  // Group filtered options
  const grouped = useMemo(() => {
    const groups = new Map<string, Option[]>();
    for (const opt of flatOptions) {
      const g = opt.group || "";
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(opt);
    }
    for (const [, items] of groups) {
      items.sort((a, b) => a.label.localeCompare(b.label, "sv"));
    }
    return groups;
  }, [flatOptions]);

  // Build flat list for keyboard navigation
  const flatList = useMemo(() => {
    const list: Option[] = [];
    for (const [, items] of grouped) {
      list.push(...items);
    }
    return list;
  }, [grouped]);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  useEffect(() => {
    if (open) {
      // Determine if we should flip upward
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setFlipUp(spaceBelow < 200);
      }
      // Highlight selected option or first option
      const selectedIdx = flatList.findIndex((o) => o.value === value);
      setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : flatList.length > 0 ? 0 : -1);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch("");
      setHighlightedIndex(-1);
    }
  }, [open, flatList, value]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (open && highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      const el = itemRefs.current[highlightedIndex];
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [highlightedIndex, open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen(true);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          setHighlightedIndex((prev) => {
            const next = prev < flatList.length - 1 ? prev + 1 : -1; // -1 cycles to top if wrapping desired
            // Actually let's not wrap, just clamp
            return Math.min(prev + 1, flatList.length - 1);
          });
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          setHighlightedIndex((prev) => {
            return Math.max(prev - 1, 1) > 0 ? prev - 1 : 1;
          });
          break;
        }
        case "Enter": {
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < flatList.length) {
            const opt = flatList[highlightedIndex];
            onValueChange(opt.value);
            setOpen(false);
          }
          break;
        }
        case "Escape": {
          e.preventDefault();
          setOpen(false);
          break;
        }
        case "Home": {
          e.preventDefault();
          if (flatList.length > 1) setHighlightedIndex(1);
          break;
        }
        case "End": {
          e.preventDefault();
          if (flatList.length > 0) setHighlightedIndex(flatList.length - 1);
          break;
        }
        default:
          break;
      }
    },
    [open, flatList, highlightedIndex, onValueChange]
  );

  const renderOption = (opt: Option, flatIdx: number) => (
    <button
      key={opt.value}
      ref={(el) => { itemRefs.current[flatIdx] = el; }}
      type="button"
      role="option"
      aria-selected={value === opt.value}
      tabIndex={-1}
      onClick={() => {
        onValueChange(opt.value);
        setOpen(false);
      }}
      onMouseEnter={() => setHighlightedIndex(flatIdx)}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
        value === opt.value && "bg-accent/50",
        highlightedIndex === flatIdx && "bg-accent text-accent-foreground ring-1 ring-inset ring-ring/30"
      )}
    >
      {value === opt.value && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <Check className="h-4 w-4" />
        </span>
      )}
      {opt.label}
    </button>
  );

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex h-14 w-full items-center justify-between rounded-md border border-primary/30 bg-background px-3 py-2 text-base shadow-[var(--input-glow)] ring-offset-background transition-shadow focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          triggerClassName
        )}
      >
        <span className={cn("truncate", !selectedLabel && (placeholderClassName || "text-muted-foreground"))}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 opacity-50 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          ref={listboxRef}
          role="listbox"
          aria-label={placeholder}
          className={cn(
            "absolute z-50 w-full rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
            flipUp ? "bottom-full mb-1" : "top-full mt-1"
          )}
        >
          <div className="flex items-center border-b px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setHighlightedIndex(flatList.length > 0 ? 0 : -1);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Sök..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-[40vh] overflow-y-auto p-1">
            {flatList.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Inga resultat</p>
            ) : (
              (() => {
                let flatIdx = 0;
                return Array.from(grouped.entries()).map(([groupName, items], gi) => (
                  <div key={groupName || "_ungrouped"}>
                    {groupName && (
                      <>
                        {gi > 0 && <div className="mx-1 my-1 h-px bg-muted" />}
                        <div className="py-1.5 pl-3 pr-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {groupName}
                        </div>
                      </>
                    )}
                    {items.map((opt) => {
                      const idx = flatIdx;
                      flatIdx++;
                      return renderOption(opt, idx);
                    })}
                  </div>
                ));
              })()
            )}
          </div>
        </div>
      )}
    </div>
  );
}
