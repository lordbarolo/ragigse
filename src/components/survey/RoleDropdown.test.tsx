import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import SearchableSelect from "@/components/SearchableSelect";

const YRKEN = [
  { value: "lakare", label: "Läkare" },
  { value: "ssk", label: "Sjuksköterska" },
  { value: "barnmorska", label: "Barnmorska" },
];

describe("Survey step 1 – roll-dropdown", () => {
  it("visar alla yrkesalternativ när dropdown öppnas", () => {
    render(
      <SearchableSelect
        value=""
        onValueChange={() => {}}
        placeholder="Välj yrke..."
        options={YRKEN}
      />
    );

    const trigger = screen.getByRole("button", { name: /välj yrke/i });
    fireEvent.click(trigger);

    // Listbox-panelen är syskon till trigger
    const popover = trigger.parentElement!.querySelector("div.absolute") as HTMLElement;
    expect(popover).toBeTruthy();

    for (const opt of YRKEN) {
      expect(within(popover).getByRole("button", { name: opt.label })).toBeInTheDocument();
    }
  });

  it("filtrerar listan vid sökning", () => {
    render(
      <SearchableSelect
        value=""
        onValueChange={() => {}}
        placeholder="Välj yrke..."
        options={YRKEN}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /välj yrke/i }));
    fireEvent.change(screen.getByPlaceholderText("Sök..."), { target: { value: "barn" } });

    expect(screen.getByRole("button", { name: "Barnmorska" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Läkare" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sjuksköterska" })).not.toBeInTheDocument();
  });
});
