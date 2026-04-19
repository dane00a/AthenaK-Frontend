import type { EditorPrefs } from "../lib/monaco/useEditorPrefs";

type Props = {
  prefs: EditorPrefs;
  onChange: (patch: Partial<EditorPrefs>) => void;
  extra?: React.ReactNode;
};

export function EditorToolbar({ prefs, onChange, extra }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-muted px-4 py-1.5 text-xs">
      <label className="flex items-center gap-1">
        Theme
        <select
          className="rounded border border-muted bg-muted/40 px-1.5 py-0.5"
          value={prefs.theme}
          onChange={(e) => onChange({ theme: e.target.value as EditorPrefs["theme"] })}
        >
          <option value="vs-dark">dark</option>
          <option value="vs">light</option>
          <option value="hc-black">hc</option>
        </select>
      </label>
      <label className="flex items-center gap-1">
        Font
        <input
          type="number"
          min={10}
          max={24}
          className="w-14 rounded border border-muted bg-muted/40 px-1.5 py-0.5"
          value={prefs.fontSize}
          onChange={(e) =>
            onChange({ fontSize: Math.max(10, Math.min(24, Number(e.target.value) || 13)) })
          }
        />
      </label>
      <label className="flex items-center gap-1">
        <input
          type="checkbox"
          checked={prefs.wordWrap}
          onChange={(e) => onChange({ wordWrap: e.target.checked })}
        />
        wrap
      </label>
      <label className="flex items-center gap-1">
        <input
          type="checkbox"
          checked={prefs.minimap}
          onChange={(e) => onChange({ minimap: e.target.checked })}
        />
        minimap
      </label>
      {extra}
    </div>
  );
}
