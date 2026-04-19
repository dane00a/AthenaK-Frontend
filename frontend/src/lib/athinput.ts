// Client-side parser/serializer for .athinput files. Mirrors
// backend/app/services/athinput.py so the form ↔ raw-text toggle is
// purely in-browser.

export type AthInputDoc = Record<string, Record<string, string>>;

const BLOCK_RE = /^\s*<([^>]+)>\s*$/;
const KV_RE = /^\s*([^=\s#][^=]*?)\s*=\s*(.*?)\s*(?:#.*)?$/;

export function parseAthInput(text: string): AthInputDoc {
  const doc: AthInputDoc = {};
  let current: Record<string, string> | null = null;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const bMatch = line.match(BLOCK_RE);
    if (bMatch) {
      const name = bMatch[1].trim();
      doc[name] ??= {};
      current = doc[name];
      continue;
    }
    if (!current) continue;
    const kvMatch = line.match(KV_RE);
    if (kvMatch) current[kvMatch[1].trim()] = kvMatch[2].trim();
  }
  return doc;
}

export function serializeAthInput(doc: AthInputDoc): string {
  const lines: string[] = [];
  for (const [block, kvs] of Object.entries(doc)) {
    lines.push(`<${block}>`);
    for (const [k, v] of Object.entries(kvs)) {
      lines.push(`${k} = ${v}`);
    }
    lines.push("");
  }
  return lines.join("\n").replace(/\n+$/, "\n");
}
