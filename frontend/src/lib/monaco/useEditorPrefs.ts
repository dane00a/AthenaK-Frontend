import { useEffect, useState } from "react";

export type EditorTheme = "vs-dark" | "vs" | "hc-black";

export type EditorPrefs = {
  theme: EditorTheme;
  wordWrap: boolean;
  fontSize: number;
  minimap: boolean;
};

const KEY = "athenak:editor-prefs";
const DEFAULT: EditorPrefs = {
  theme: "vs-dark",
  wordWrap: false,
  fontSize: 13,
  minimap: false,
};

export function useEditorPrefs(): [EditorPrefs, (patch: Partial<EditorPrefs>) => void] {
  const [prefs, setPrefs] = useState<EditorPrefs>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...DEFAULT, ...(JSON.parse(raw) as Partial<EditorPrefs>) } : DEFAULT;
    } catch {
      return DEFAULT;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* storage unavailable — ignore */
    }
  }, [prefs]);

  return [prefs, (patch) => setPrefs((p) => ({ ...p, ...patch }))];
}
