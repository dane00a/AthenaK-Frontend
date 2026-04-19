import Editor from "@monaco-editor/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { api, type InputFile } from "../../lib/api";
import { parseAthInput, serializeAthInput } from "../../lib/athinput";
import type { ProjectContext } from "../projects/ProjectShell";
import { InputForm } from "./InputForm";

type Mode = "form" | "raw";

export function InputEditor() {
  const { project } = useOutletContext<ProjectContext>();
  const qc = useQueryClient();

  const listQ = useQuery({
    queryKey: ["inputs", project.id],
    queryFn: () => api.listInputs(project.id),
  });

  const [activeId, setActiveId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("form");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (listQ.data && activeId === null && listQ.data.length) {
      setActiveId(listQ.data[0].id);
    }
  }, [listQ.data, activeId]);

  const active: InputFile | undefined = useMemo(
    () => listQ.data?.find((i) => i.id === activeId),
    [listQ.data, activeId],
  );

  useEffect(() => {
    if (active) {
      setText(active.content);
      setDirty(false);
    }
  }, [active?.id, active?.updated_at]);

  const createMut = useMutation({
    mutationFn: () =>
      api.createInput(project.id, {
        filename: `new-${Date.now()}.athinput`,
        content: "<comment>\nproblem = new input\n\n<time>\ntlim = 1.0\n",
      }),
    onSuccess: (f) => {
      qc.invalidateQueries({ queryKey: ["inputs", project.id] });
      setActiveId(f.id);
    },
  });

  const saveMut = useMutation({
    mutationFn: () => {
      if (!active) throw new Error("no input selected");
      return api.updateInput(active.id, { content: text });
    },
    onSuccess: (f) => {
      qc.setQueryData<InputFile[]>(["inputs", project.id], (prev) =>
        prev?.map((i) => (i.id === f.id ? f : i)),
      );
      setDirty(false);
    },
  });

  const doc = useMemo(() => parseAthInput(text), [text]);

  return (
    <div className="grid h-full grid-cols-[260px_1fr]">
      <aside className="flex flex-col border-r border-muted">
        <div className="flex items-center justify-between px-3 py-2">
          <h2 className="text-sm font-semibold">Input files</h2>
          <button
            onClick={() => createMut.mutate()}
            className="rounded-md border border-muted px-2 py-0.5 text-xs"
          >
            + new
          </button>
        </div>
        <ul className="overflow-y-auto">
          {listQ.data?.map((i) => (
            <li key={i.id}>
              <button
                onClick={() => setActiveId(i.id)}
                className={clsx(
                  "block w-full border-l-2 px-3 py-2 text-left text-sm",
                  i.id === activeId
                    ? "border-accent bg-muted/40"
                    : "border-transparent hover:bg-muted/30",
                )}
              >
                {i.filename}
              </button>
            </li>
          ))}
          {listQ.data?.length === 0 && (
            <li className="px-3 py-2 text-xs text-foreground/60">No input files yet.</li>
          )}
        </ul>
      </aside>

      <section className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-muted px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <code className="text-foreground/70">{active?.filename ?? "—"}</code>
            {dirty && <span className="text-amber-400">● unsaved</span>}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-md border border-muted">
              <button
                onClick={() => setMode("form")}
                className={clsx(
                  "px-2 py-0.5 text-xs",
                  mode === "form" ? "bg-muted" : "text-foreground/60",
                )}
              >
                Form
              </button>
              <button
                onClick={() => setMode("raw")}
                className={clsx(
                  "px-2 py-0.5 text-xs",
                  mode === "raw" ? "bg-muted" : "text-foreground/60",
                )}
              >
                Raw
              </button>
            </div>
            <button
              disabled={!dirty || !active || saveMut.isPending}
              onClick={() => saveMut.mutate()}
              className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              {saveMut.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!active && (
            <p className="p-6 text-foreground/60">
              Select an input file on the left, or create one to begin.
            </p>
          )}
          {active && mode === "form" && (
            <InputForm
              doc={doc}
              onChange={(next) => {
                setText(serializeAthInput(next));
                setDirty(true);
              }}
            />
          )}
          {active && mode === "raw" && (
            <Editor
              height="100%"
              language="ini"
              theme="vs-dark"
              value={text}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                tabSize: 2,
                automaticLayout: true,
              }}
              onChange={(next) => {
                setText(next ?? "");
                setDirty(true);
              }}
            />
          )}
        </div>
      </section>
    </div>
  );
}
