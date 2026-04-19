import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Modal } from "../../components/ui/Modal";
import { api, type Project } from "../../lib/api";
import { PHYSICS_MODULES } from "../../schemas/pgen-wizard";

export function EditProjectDialog({
  project,
  open,
  onClose,
}: {
  project: Project;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(project.name);
  const [physicsModule, setPhysicsModule] = useState(project.physics_module);
  const [athenakRef, setAthenakRef] = useState(project.athenak_ref);

  const mutation = useMutation({
    mutationFn: () =>
      api.updateProject(project.id, {
        name: name !== project.name ? name : undefined,
        physics_module: physicsModule !== project.physics_module ? physicsModule : undefined,
        athenak_ref: athenakRef !== project.athenak_ref ? athenakRef : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project", project.id] });
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Edit project">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) mutation.mutate();
        }}
      >
        <Field label="Name">
          <input
            className="text-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>
        <Field label="Physics module">
          <select
            className="select"
            value={physicsModule}
            onChange={(e) => setPhysicsModule(e.target.value)}
          >
            {PHYSICS_MODULES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label="AthenaK git ref">
          <input
            className="text-input"
            value={athenakRef}
            onChange={(e) => setAthenakRef(e.target.value)}
          />
        </Field>
        {mutation.error && (
          <p className="text-sm text-red-400">{(mutation.error as Error).message}</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-foreground/70 hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || mutation.isPending}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
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
