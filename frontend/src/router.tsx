import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppShell } from "./components/layout/AppShell";
import { ProjectList } from "./features/projects/ProjectList";
import { ProjectShell } from "./features/projects/ProjectShell";
import { StoragePanel } from "./features/projects/StoragePanel";
import { ProblemEditor } from "./features/problem-editor/ProblemEditor";
import { InputEditor } from "./features/input-editor/InputEditor";
import { BuildsPanel } from "./features/builds/BuildsPanel";
import { RunsPanel } from "./features/runs/RunsPanel";
import { VisualizePanel } from "./features/visualize/VisualizePanel";

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <ProjectList /> },
      {
        path: "/projects/:projectId",
        element: <ProjectShell />,
        children: [
          { index: true, element: <Navigate to="problem" replace /> },
          { path: "problem", element: <ProblemEditor /> },
          { path: "input", element: <InputEditor /> },
          { path: "build", element: <BuildsPanel /> },
          { path: "runs", element: <RunsPanel /> },
          { path: "visualize", element: <VisualizePanel /> },
          { path: "storage", element: <StoragePanel /> },
        ],
      },
    ],
  },
]);
