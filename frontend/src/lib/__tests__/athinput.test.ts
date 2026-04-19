import { describe, expect, it } from "vitest";

import { parseAthInput, serializeAthInput } from "../athinput";

describe("athinput parse/serialize", () => {
  it("parses blocks and kvs, ignores comments", () => {
    const text = `
<comment>
problem = Sod shock tube

<mesh>
nx1 = 256
x1min = -0.5   # left edge
x1max = 0.5
`;
    const doc = parseAthInput(text);
    expect(doc.comment.problem).toBe("Sod shock tube");
    expect(doc.mesh.nx1).toBe("256");
    expect(doc.mesh.x1min).toBe("-0.5");
  });

  it("round-trips", () => {
    const src = "<time>\ntlim = 0.25\ncfl = 0.8\n";
    expect(parseAthInput(serializeAthInput(parseAthInput(src)))).toEqual(parseAthInput(src));
  });
});
