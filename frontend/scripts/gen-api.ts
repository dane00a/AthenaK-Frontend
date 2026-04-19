// Regenerates `src/lib/api-types.ts` from the backend's OpenAPI document.
// Usage:
//   - With a running backend:   pnpm gen:api
//   - Against a static file:    pnpm gen:api ./openapi.json

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
// `openapi-typescript` v7 is an ESM package that returns the full .d.ts text.
import openapiTS, { astToString } from "openapi-typescript";

const TARGET = resolve(import.meta.dirname, "..", "src", "lib", "api-types.ts");

async function main() {
  const arg = process.argv[2] ?? "http://localhost:8000/openapi.json";
  let input: URL | object;
  if (arg.startsWith("http://") || arg.startsWith("https://") || arg.startsWith("file://")) {
    input = new URL(arg);
  } else {
    // Treat as a local path — read + parse so we don't depend on openapi-typescript's
    // URL heuristics.
    const text = await readFile(resolve(arg), "utf-8");
    input = JSON.parse(text);
    // fall through with the parsed object
  }
  const ast = await openapiTS(input as unknown as URL);
  const contents = astToString(ast);
  const header =
    "// THIS FILE IS AUTO-GENERATED. Run `pnpm gen:api` against a running backend\n" +
    "// (or pass a path to an openapi.json). Do not edit by hand.\n\n";
  await writeFile(TARGET, header + contents, "utf-8");
  console.log(`wrote ${TARGET}`);
  // Silence "unused import" if the path branch is hit without http.
  void pathToFileURL;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
