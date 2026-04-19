import { DiffEditor } from "@monaco-editor/react";

import { Modal } from "../../components/ui/Modal";
import { useEditorPrefs } from "../../lib/monaco/useEditorPrefs";

type Props = {
  open: boolean;
  base: string;
  next: string;
  onApply: () => void;
  onCancel: () => void;
  applying?: boolean;
};

export function RegenPreview({ open, base, next, onApply, onCancel, applying }: Props) {
  const [prefs] = useEditorPrefs();
  return (
    <Modal open={open} onClose={onCancel} title="Regenerate — preview">
      <p className="mb-3 text-xs text-foreground/60">
        Left: current. Right: what Generate would save. Text outside{" "}
        <code>// &gt;&gt;&gt; user:</code> regions will be replaced. Review, then Apply or Cancel.
      </p>
      <div className="h-[420px] w-full overflow-hidden rounded-md border border-muted">
        <DiffEditor
          original={base}
          modified={next}
          language="cpp"
          theme={prefs.theme}
          options={{
            readOnly: true,
            renderSideBySide: true,
            minimap: { enabled: false },
            fontSize: prefs.fontSize,
            automaticLayout: true,
          }}
        />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-sm text-foreground/70 hover:text-foreground"
        >
          Cancel
        </button>
        <button
          onClick={onApply}
          disabled={applying}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {applying ? "Applying…" : "Apply"}
        </button>
      </div>
    </Modal>
  );
}
