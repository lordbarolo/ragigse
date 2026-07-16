import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Option {
  value: string;
  label: string;
  group?: string;
  /** Extra sökord som matchar filtret men inte visas i UI. */
  keywords?: string[];
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
  const [query, setQuery] = useState("");
  const [flipUp, setFlipUp] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  // While the dropdown is open, the input shows the user's query (free text).
  // When closed, it shows the currently selected label.
  const inputValue = open ? query : selectedLabel;

  const flatOptions = useMemo(() => {
    if (!open || !query) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, open]);

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

  const flatList = useMemo(() => {
    const list: Option[] = [];
    for (const [, items] of grouped) list.push(...items);
    return list;
  }, [grouped]);

  useEffect(() => {
    if (open) {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setFlipUp(spaceBelow < 240);
      }
      const selectedIdx = flatList.findIndex((o) => o.value === value);
      setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : flatList.length > 0 ? 0 : -1);
    } else {
      setQuery("");
      setHighlightedIndex(-1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep highlight in range when filtering
  useEffect(() => {
    if (!open) return;
    if (flatList.length === 0) {
      setHighlightedIndex(-1);
    } else if (highlightedIndex >= flatList.length) {
      setHighlightedIndex(0);
    }
  }, [flatList, open, highlightedIndex]);

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
        if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
          e.preventDefault();
          setOpen(true);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) => Math.min(prev + 1, flatList.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < flatList.length) {
            const opt = flatList[highlightedIndex];
            onValueChange(opt.value);
            setOpen(false);
            inputRef.current?.blur();
          }
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          inputRef.current?.blur();
          break;
        case "Home":
          e.preventDefault();
          if (flatList.length > 0) setHighlightedIndex(0);
          break;
        case "End":
          e.preventDefault();
          if (flatList.length > 0) setHighlightedIndex(flatList.length - 1);
          break;
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
      onMouseDown={(e) => {
        // Prevent input blur before click registers
        e.preventDefault();
      }}
      onClick={() => {
        onValueChange(opt.value);
        setOpen(false);
        inputRef.current?.blur();
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
      <div
        className={cn(
          "relative flex h-14 w-full items-center rounded-md border border-primary/30 bg-background pr-3 text-base shadow-[var(--input-glow)] ring-offset-background transition-shadow focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          triggerClassName
        )}
      >
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls="searchable-select-listbox"
          value={inputValue}
          placeholder={placeholder}
          onFocus={() => {
            if (!open) setOpen(true);
          }}
          onClick={() => {
            if (!open) setOpen(true);
          }}
          onChange={(e) => {
            if (!open) setOpen(true);
            setQuery(e.target.value);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex-1 h-full bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground",
            placeholderClassName && `placeholder:${placeholderClassName}`
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={open ? "Stäng" : "Öppna"}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
          className="flex items-center justify-center"
        >
          <ChevronDown
            className={cn("h-4 w-4 opacity-50 shrink-0 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {open && (
        <div
          ref={listboxRef}
          id="searchable-select-listbox"
          role="listbox"
          aria-label={placeholder}
          className={cn(
            "absolute z-50 w-full rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
            flipUp ? "bottom-full mb-1" : "top-full mt-1"
          )}
        >
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
