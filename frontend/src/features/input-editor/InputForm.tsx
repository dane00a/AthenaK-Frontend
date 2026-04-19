import { ATHINPUT_BLOCKS, type AthInputField } from "../../schemas/athinput";
import type { AthInputDoc } from "../../lib/athinput";

type Props = {
  doc: AthInputDoc;
  onChange: (next: AthInputDoc) => void;
};

export function InputForm({ doc, onChange }: Props) {
  const set = (block: string, key: string, value: string) => {
    const next: AthInputDoc = { ...doc, [block]: { ...(doc[block] ?? {}) } };
    if (value === "") {
      delete next[block][key];
    } else {
      next[block][key] = value;
    }
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-5 p-4">
      {ATHINPUT_BLOCKS.map((block) => {
        const values = doc[block.name] ?? {};
        return (
          <section key={block.name} className="rounded-lg border border-muted">
            <header className="flex items-center justify-between border-b border-muted px-3 py-2">
              <h3 className="text-sm font-semibold">
                <code className="text-foreground/80">{`<${block.name}>`}</code>{" "}
                <span className="ml-2 font-normal text-foreground/60">{block.title}</span>
              </h3>
            </header>
            <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2">
              {block.fields.map((f) => (
                <FieldInput
                  key={f.key}
                  field={f}
                  value={values[f.key] ?? ""}
                  onChange={(v) => set(block.name, f.key, v)}
                />
              ))}
              {block.fields.length === 0 && (
                <p className="col-span-2 text-xs text-foreground/60">
                  No canonical fields — use the raw view to add keys.
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: AthInputField;
  value: string;
  onChange: (v: string) => void;
}) {
  const placeholder = field.default !== undefined ? String(field.default) : "";

  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-foreground/60">
        <span>
          {field.label} <code className="text-foreground/50">{field.key}</code>
        </span>
        {field.required && <span className="normal-case text-amber-400">required</span>}
      </span>
      {field.type === "enum" && field.options ? (
        <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="" />
          {field.options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : field.type === "boolean" ? (
        <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="" />
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : (
        <input
          className="text-input"
          inputMode={field.type === "number" || field.type === "integer" ? "decimal" : "text"}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
