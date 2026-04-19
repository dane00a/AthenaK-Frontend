type Props = {
  language: string;
  position: { line: number; column: number } | null;
  dirty: boolean;
  lineCount?: number;
};

export function EditorStatusBar({ language, position, dirty, lineCount }: Props) {
  return (
    <div className="flex items-center gap-3 border-t border-muted px-3 py-1 text-[11px] text-foreground/60">
      <span>
        Ln {position?.line ?? 1}, Col {position?.column ?? 1}
      </span>
      {lineCount !== undefined && <span>{lineCount} lines</span>}
      <span className="ml-auto flex items-center gap-2">
        <code>{language}</code>
        {dirty ? <span className="text-amber-400">● unsaved</span> : <span>saved</span>}
      </span>
    </div>
  );
}
