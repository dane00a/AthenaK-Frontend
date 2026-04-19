import Editor from "@monaco-editor/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { api } from "../../lib/api";
import { DEFAULT_WIZARD, type WizardState } from "../../schemas/pgen-wizard";
import type { ProjectContext } from "../projects/ProjectShell";
import { WizardForm } from "./WizardForm";

export function ProblemEditor() {
  const { project } = useOutletContext<ProjectContext>();
  const qc = useQueryClient();

  const problemQ = useQuery({
    queryKey: ["problem", project.id],
    queryFn: () => api.getProblem(project.id),
  });

  const [wizard, setWizard] = useState<WizardState>({
    ...DEFAULT_WIZARD,
    physics_module: (project.physics_module as WizardState["physics_module"]) ?? "hydro",
  });
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (problemQ.data) {
      setContent(problemQ.data.content);
      setDirty(false);
    }
  }, [problemQ.data?.content]);

  const generate = useMutation({
    mutationFn: () => api.generateFromWizard(project.id, wizard),
    onSuccess: (p) => {
      setContent(p.content);
      setDirty(false);
      qc.setQueryData(["problem", project.id], p);
    },
  });

  const save = useMutation({
    mutationFn: () => api.saveProblem(project.id, content),
    onSuccess: (p) => {
      qc.setQueryData(["problem", project.id], p);
      setDirty(false);
    },
  });

  return (
    <div className="grid h-full grid-cols-[320px_1fr]">
      <aside className="border-r border-muted">
        <WizardForm
          value={wizard}
          onChange={setWizard}
          onGenerate={() => generate.mutate()}
          generating={generate.isPending}
        />
      </aside>

      <section className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-muted px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <code className="text-foreground/70">{problemQ.data?.filename ?? "user_problem.cpp"}</code>
            {dirty && <span className="text-amber-400">● unsaved</span>}
            {generate.error && (
              <span className="text-red-400">
                generate failed: {(generate.error as Error).message}
              </span>
            )}
            {save.error && (
              <span className="text-red-400">save failed: {(save.error as Error).message}</span>
            )}
          </div>
          <button
            disabled={!dirty || save.isPending}
            onClick={() => save.mutate()}
            className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            {save.isPending ? "Saving…" : "Save"}
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <Editor
            height="100%"
            language="cpp"
            theme="vs-dark"
            value={content}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              tabSize: 2,
              renderWhitespace: "selection",
              automaticLayout: true,
            }}
            onChange={(next) => {
              setContent(next ?? "");
              setDirty(true);
            }}
          />
        </div>
      </section>
    </div>
  );
}
