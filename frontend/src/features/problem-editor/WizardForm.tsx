import {
  DEFAULT_WIZARD,
  INITIAL_CONDITIONS,
  PHYSICS_MODULES,
  type WizardState,
} from "../../schemas/pgen-wizard";

type Props = {
  value: WizardState;
  onChange: (next: WizardState) => void;
  onGenerate: () => void;
  generating: boolean;
};

export function WizardForm({ value, onChange, onGenerate, generating }: Props) {
  const set = <K extends keyof WizardState>(key: K, v: WizardState[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <form
      className="flex h-full flex-col gap-3 overflow-y-auto p-4 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        onGenerate();
      }}
    >
      <h2 className="text-base font-semibold">Wizard</h2>
      <p className="text-xs text-foreground/60">
        Generate a starter <code>user_problem.cpp</code>. Hand edits inside
        <code className="mx-1">{`// >>> user:<name>`}</code> regions are preserved on
        regeneration.
      </p>

      <Field label="Physics module">
        <select
          className="select"
          value={value.physics_module}
          onChange={(e) => set("physics_module", e.target.value as WizardState["physics_module"])}
        >
          {PHYSICS_MODULES.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </Field>

      <Field label="Initial condition">
        <select
          className="select"
          value={value.initial_condition}
          onChange={(e) =>
            set("initial_condition", e.target.value as WizardState["initial_condition"])
          }
        >
          {INITIAL_CONDITIONS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </Field>

      <fieldset className="space-y-1">
        <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-foreground/60">
          Codegen
        </legend>
        <Check
          checked={value.emit_par_for_loop}
          onChange={(v) => set("emit_par_for_loop", v)}
          label="Emit par_for initialization loop"
        />
        <Check
          checked={value.call_prim_to_cons}
          onChange={(v) => set("call_prim_to_cons", v)}
          label="Call PrimToCons after init"
        />
      </fieldset>

      <fieldset className="space-y-1">
        <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-foreground/60">
          Hooks (advanced)
        </legend>
        <Check
          checked={value.register_user_bcs}
          onChange={(v) => set("register_user_bcs", v)}
          label="User boundary conditions"
        />
        <Check
          checked={value.register_user_srcs}
          onChange={(v) => set("register_user_srcs", v)}
          label="User source terms"
        />
        <Check
          checked={value.register_user_refinement}
          onChange={(v) => set("register_user_refinement", v)}
          label="User refinement"
        />
        <Check
          checked={value.register_user_history}
          onChange={(v) => set("register_user_history", v)}
          label="User history"
        />
      </fieldset>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={generating}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {generating ? "Generating…" : "Generate"}
        </button>
        <button
          type="button"
          className="rounded-md border border-muted px-3 py-1.5 text-sm text-foreground/70"
          onClick={() => onChange(DEFAULT_WIZARD)}
        >
          Reset
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-foreground/60">
        {label}
      </span>
      {children}
    </label>
  );
}

function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-muted"
      />
      {label}
    </label>
  );
}
