import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Modal } from "../../components/ui/Modal";
import { api } from "../../lib/api";
import { PHYSICS_MODULES } from "../../schemas/pgen-wizard";

export function NewProjectDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [physicsModule, setPhysicsModule] = useState("hydro");
  const [athenakRef, setAthenakRef] = useState("main");
  const [templateId, setTemplateId] = useState<string>("");
  const navigate = useNavigate();
  const qc = useQueryClient();

  const templatesQ = useQuery({ queryKey: ["templates"], queryFn: api.listTemplates });

  const mutation = useMutation({
    mutationFn: () =>
      templateId
        ? api.createProjectFromTemplate(templateId, name || undefined)
        : api.createProject({
            name,
            physics_module: physicsModule,
            athenak_ref: athenakRef,
          }),
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      onClose();
      setName("");
      setTemplateId("");
      navigate(`/projects/${project.id}`);
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="New project">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (templateId || name.trim()) mutation.mutate();
        }}
      >
        <Field label="Start from template (optional)">
          <select
            className="w-full rounded-md border border-muted bg-muted/40 px-3 py-1.5 text-sm outline-none focus:border-accent"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            <option value="">— blank project —</option>
            {templatesQ.data?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.physics_module})
              </option>
            ))}
          </select>
          {templateId && templatesQ.data && (
            <p className="mt-1 text-xs text-foreground/60">
              {templatesQ.data.find((t) => t.id === templateId)?.description}
            </p>
          )}
        </Field>
        <Field label="Name">
          <input
            autoFocus
            className="w-full rounded-md border border-muted bg-muted/40 px-3 py-1.5 text-sm outline-none focus:border-accent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={templateId ? "(defaults to template name)" : "Sod shock tube"}
            required={!templateId}
          />
        </Field>
        {!templateId && (
          <>
            <Field label="Physics module">
              <select
                className="w-full rounded-md border border-muted bg-muted/40 px-3 py-1.5 text-sm outline-none focus:border-accent"
                value={physicsModule}
                onChange={(e) => setPhysicsModule(e.target.value)}
              >
                {PHYSICS_MODULES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="AthenaK git ref">
              <input
                className="w-full rounded-md border border-muted bg-muted/40 px-3 py-1.5 text-sm outline-none focus:border-accent"
                value={athenakRef}
                onChange={(e) => setAthenakRef(e.target.value)}
              />
            </Field>
          </>
        )}

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
            disabled={(!templateId && !name.trim()) || mutation.isPending}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {mutation.isPending ? "Creating…" : "Create"}
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
