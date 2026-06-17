import { describe, it, expect, vi } from "vitest";
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
    const popover = trigger.parentElement!.querySelector("div[role='listbox']") as HTMLElement;
    expect(popover).toBeTruthy();

    for (const opt of YRKEN) {
      expect(within(popover).getByRole("option", { name: opt.label })).toBeInTheDocument();
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

    expect(screen.getByRole("option", { name: "Barnmorska" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Läkare" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Sjuksköterska" })).not.toBeInTheDocument();
  });

  it("öppnar dropdown med piltangent nedåt och navigerar med piltangenter", () => {
    const onValueChange = vi.fn();
    render(
      <SearchableSelect
        value=""
        onValueChange={onValueChange}
        placeholder="Välj yrke..."
        options={YRKEN}
      />
    );

    const trigger = screen.getByRole("button", { name: /välj yrke/i });
    // Stängd: ArrowDown ska öppna dropdown
    fireEvent.keyDown(trigger, { key: "ArrowDown" });

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(3);

    // Navigera med ArrowDown
    fireEvent.keyDown(screen.getByPlaceholderText("Sök..."), { key: "ArrowDown" });
    fireEvent.keyDown(screen.getByPlaceholderText("Sök..."), { key: "ArrowDown" });

    // Välj med Enter
    fireEvent.keyDown(screen.getByPlaceholderText("Sök..."), { key: "Enter" });

    expect(onValueChange).toHaveBeenCalledWith("ssk");
  });

  it("stänger dropdown med Escape", () => {
    render(
      <SearchableSelect
        value=""
        onValueChange={() => {}}
        placeholder="Välj yrke..."
        options={YRKEN}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /välj yrke/i }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByPlaceholderText("Sök..."), { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("öppnar dropdown med Enter när den är stängd", () => {
    render(
      <SearchableSelect
        value=""
        onValueChange={() => {}}
        placeholder="Välj yrke..."
        options={YRKEN}
      />
    );

    const trigger = screen.getByRole("button", { name: /välj yrke/i });
    fireEvent.keyDown(trigger, { key: "Enter" });

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });
});
