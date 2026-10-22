import { describe, it, expect } from "vitest";
import { applyFactGuard } from "./cvAssistant.server";

describe("CV fact guard keeps real content", () => {
  it("keeps 'Utredning av feber av okänd genes'", () => {
    const md = "## Erfarenhet\n- Utredning av feber av okänd genes\n";
    expect(applyFactGuard(md, null).markdown).toContain("Utredning av feber av okänd genes");
  });
  it("keeps 'prioritering när resurser saknas'", () => {
    const md = "## Erfarenhet\n- Prioritering när resurser saknas\n";
    expect(applyFactGuard(md, null).markdown).toContain("Prioritering när resurser saknas");
  });
  it("still removes pure placeholder 'Period saknas'", () => {
    const md = "## Erfarenhet\n- Period saknas\n";
    expect(applyFactGuard(md, null).markdown).not.toContain("Period saknas");
  });
});
