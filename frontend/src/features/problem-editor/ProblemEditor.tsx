import Editor, { type OnMount } from "@monaco-editor/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { EditorStatusBar } from "../../components/EditorStatusBar";
import { EditorToolbar } from "../../components/EditorToolbar";
import { api } from "../../lib/api";
import { registerAthenakCpp } from "../../lib/monaco/athenak-cpp";
import { useEditorPrefs } from "../../lib/monaco/useEditorPrefs";
import { DEFAULT_WIZARD, type WizardState } from "../../schemas/pgen-wizard";
import type { ProjectContext } from "../projects/ProjectShell";
import { WizardForm } from "./WizardForm";

const USER_REGION_RE = /^\s*\/\/\s*>>>\s*user:([\w.-]+)/;

export function ProblemEditor() {
  const { project } = useOutletContext<ProjectContext>();
  const qc = useQueryClient();
  const [prefs, setPrefs] = useEditorPrefs();

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
  const [cursor, setCursor] = useState<{ line: number; column: number } | null>(null);

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

  // Keep the save handler stable-ish but always reading the latest state via a ref.
  const saveRef = useRef(save.mutate);
  useEffect(() => {
    saveRef.current = save.mutate;
  });

  const handleMount: OnMount = useCallback((editor, monaco) => {
    const sub = registerAthenakCpp(monaco);
    editor.addAction({
      id: "athenak.save",
      label: "Save problem file",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => saveRef.current(),
    });
    editor.addAction({
      id: "athenak.goto-next-region",
      label: "AthenaK: Go to next user region",
      keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.KeyN],
      run: (ed) =>
        gotoRegion(ed as import("monaco-editor").editor.IStandaloneCodeEditor, +1),
    });
    editor.addAction({
      id: "athenak.goto-prev-region",
      label: "AthenaK: Go to previous user region",
      keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.KeyP],
      run: (ed) =>
        gotoRegion(ed as import("monaco-editor").editor.IStandaloneCodeEditor, -1),
    });
    editor.onDidChangeCursorPosition((e) =>
      setCursor({ line: e.position.lineNumber, column: e.position.column }),
    );
    editor.onDidDispose(() => sub.dispose());
  }, []);

  const regions = useMemo(
    () =>
      content
        .split(/\r?\n/)
        .map((line, i) => ({ line, i }))
        .filter(({ line }) => USER_REGION_RE.test(line))
        .map(({ line, i }) => ({
          name: (line.match(USER_REGION_RE) as RegExpMatchArray)[1],
          line: i + 1,
        })),
    [content],
  );

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
        <EditorToolbar
          prefs={prefs}
          onChange={setPrefs}
          extra={
            <>
              <span className="ml-2 text-foreground/60">
                <code>{problemQ.data?.filename ?? "user_problem.cpp"}</code>
              </span>
              {regions.length > 0 && (
                <span className="rounded border border-muted px-1.5 py-0.5 text-[10px] text-foreground/60">
                  {regions.length} user regions · Alt+N / Alt+P to jump
                </span>
              )}
              {generate.error && (
                <span className="text-red-400">generate: {(generate.error as Error).message}</span>
              )}
              {save.error && (
                <span className="text-red-400">save: {(save.error as Error).message}</span>
              )}
              <button
                disabled={!dirty || save.isPending}
                onClick={() => save.mutate()}
                className="ml-auto rounded-md bg-accent px-3 py-0.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {save.isPending ? "Saving…" : "Save  ⌘S"}
              </button>
            </>
          }
        />
        <div className="min-h-0 flex-1">
          <Editor
            height="100%"
            language="cpp"
            theme={prefs.theme}
            value={content}
            options={{
              minimap: { enabled: prefs.minimap },
              fontSize: prefs.fontSize,
              wordWrap: prefs.wordWrap ? "on" : "off",
              tabSize: 2,
              renderWhitespace: "selection",
              automaticLayout: true,
              bracketPairColorization: { enabled: true },
              stickyScroll: { enabled: true },
              folding: true,
              foldingImportsByDefault: false,
            }}
            onMount={handleMount}
            onChange={(next) => {
              setContent(next ?? "");
              setDirty(true);
            }}
          />
        </div>
        <EditorStatusBar
          language="cpp"
          position={cursor}
          dirty={dirty}
          lineCount={content ? content.split("\n").length : 0}
        />
      </section>
    </div>
  );
}

function gotoRegion(editor: import("monaco-editor").editor.IStandaloneCodeEditor, dir: 1 | -1) {
  const model = editor.getModel();
  if (!model) return;
  const pos = editor.getPosition();
  if (!pos) return;
  const lines = model.getLinesContent();
  const openLines: number[] = [];
  lines.forEach((l, i) => {
    if (USER_REGION_RE.test(l)) openLines.push(i + 1);
  });
  if (openLines.length === 0) return;
  const target =
    dir === 1
      ? openLines.find((ln) => ln > pos.lineNumber) ?? openLines[0]
      : [...openLines].reverse().find((ln) => ln < pos.lineNumber) ?? openLines[openLines.length - 1];
  editor.revealLineInCenter(target);
  editor.setPosition({ lineNumber: target, column: 1 });
  editor.focus();
}
