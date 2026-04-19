import clsx from "clsx";
import { NavLink, Outlet, useParams } from "react-router-dom";

const TABS = [
  { to: "problem", label: "Problem" },
  { to: "input", label: "Input" },
  { to: "build", label: "Build" },
  { to: "runs", label: "Runs" },
  { to: "visualize", label: "Visualize" },
] as const;

export function ProjectShell() {
  const { projectId } = useParams();
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-muted px-6 py-2 text-sm text-foreground/70">
        Project #{projectId}
      </div>
      <nav className="flex gap-1 border-b border-muted px-4">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              clsx(
                "px-3 py-2 text-sm font-medium border-b-2",
                isActive
                  ? "border-accent text-foreground"
                  : "border-transparent text-foreground/60 hover:text-foreground",
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
