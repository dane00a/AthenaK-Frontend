import { describe, expect, it } from "vitest";

import { DEFAULT_WIZARD, PHYSICS_MODULES } from "../pgen-wizard";

describe("pgen-wizard schema", () => {
  it("defaults to hydro/uniform", () => {
    expect(DEFAULT_WIZARD.physics_module).toBe("hydro");
    expect(DEFAULT_WIZARD.initial_condition).toBe("uniform");
  });

  it("enumerates expected physics modules", () => {
    expect(PHYSICS_MODULES).toContain("mhd");
    expect(PHYSICS_MODULES).toContain("grmhd");
  });
});
