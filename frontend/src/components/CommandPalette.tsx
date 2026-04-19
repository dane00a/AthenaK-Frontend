import { Command } from "cmdk";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

/**
 * Global command palette. Opens with ⌘K / Ctrl+K.
 * Actions are context-aware: project-specific tabs appear only while
 * a project is active in the URL.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const projectId = params.projectId ?? extractProjectIdFromPath(location.pathname);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  const go = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 pt-24"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-lg border border-muted bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command palette">
          <Command.Input
            autoFocus
            placeholder="Type a command… (⌘K)"
            className="w-full border-b border-muted bg-transparent px-4 py-3 text-sm outline-none"
          />
          <Command.List className="max-h-80 overflow-y-auto p-2 text-sm">
            <Command.Empty className="px-3 py-4 text-foreground/60">
              No matching commands.
            </Command.Empty>

            <Command.Group heading="Navigation">
              <Item label="Projects (home)" shortcut="⌘P" onSelect={() => go("/")} />
              {projectId && (
                <>
                  <Item label="Problem" onSelect={() => go(`/projects/${projectId}/problem`)} />
                  <Item label="Input" onSelect={() => go(`/projects/${projectId}/input`)} />
                  <Item label="Build" onSelect={() => go(`/projects/${projectId}/build`)} />
                  <Item label="Runs" onSelect={() => go(`/projects/${projectId}/runs`)} />
                  <Item
                    label="Visualize"
                    onSelect={() => go(`/projects/${projectId}/visualize`)}
                  />
                  <Item
                    label="Storage"
                    onSelect={() => go(`/projects/${projectId}/storage`)}
                  />
                </>
              )}
            </Command.Group>

            <Command.Group heading="Actions">
              <Item
                label="New project…"
                shortcut="⌘N"
                onSelect={() => {
                  // Simplest: navigate to the project list; the list page
                  // owns the dialog. A global event bus is the next
                  // refinement if we want shortcut N to open it directly.
                  go("/");
                }}
              />
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function Item({
  label,
  shortcut,
  onSelect,
}: {
  label: string;
  shortcut?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 data-[selected=true]:bg-muted"
    >
      <span>{label}</span>
      {shortcut && <kbd className="text-[10px] text-foreground/50">{shortcut}</kbd>}
    </Command.Item>
  );
}

function extractProjectIdFromPath(path: string): string | undefined {
  const match = path.match(/^\/projects\/(\d+)/);
  return match?.[1];
}
