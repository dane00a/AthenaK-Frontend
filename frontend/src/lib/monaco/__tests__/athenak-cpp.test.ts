import { describe, expect, it } from "vitest";

import { ATHENAK_HOVER, ATHENAK_SNIPPETS } from "../athenak-cpp";

describe("AthenaK C++ snippets", () => {
  it("covers the core idioms the wizard emits", () => {
    const labels = new Set(ATHENAK_SNIPPETS.map((s) => s.label));
    for (const required of ["par_for", "pin->GetReal", "CellCenterX", "user region"]) {
      expect(labels.has(required)).toBe(true);
    }
  });

  it("every snippet has a non-empty insert string", () => {
    for (const s of ATHENAK_SNIPPETS) {
      expect(s.insert.length).toBeGreaterThan(0);
    }
  });

  it("hover docs cover primitive/conserved index macros", () => {
    for (const id of ["IDN", "IVX", "IVY", "IVZ", "IEN", "IBX", "IBY", "IBZ"]) {
      expect(ATHENAK_HOVER[id]).toBeTruthy();
    }
  });
});
