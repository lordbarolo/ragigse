// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { useState } from "react";
function C(){ const [a]=useState("hej"); return <div>{a}</div>; }
describe("m",()=>{ it("renders",()=>{ render(<C/>); expect(screen.getByText("hej")).toBeTruthy(); }); });
