// M5 will wire this up: a form driven by schemas/athinput.ts with a
// raw-text toggle. The parser/serializer lives in backend/services/athinput.py.

export function InputEditor() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10 text-foreground/70">
      Input file editor (M5). Form + raw-text toggle driven by
      <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">schemas/athinput.ts</code>.
    </div>
  );
}
