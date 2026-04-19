"""Parse gcc/clang compiler diagnostics out of a build log.

Matches lines like::

    /path/to/file.cpp:42:5: error: 'foo' was not declared in this scope
    user_problem.cpp:7:14: warning: unused variable 'x' [-Wunused-variable]

Returns a list of structured dicts the frontend can feed directly into
monaco.editor.setModelMarkers.
"""
from __future__ import annotations

import re
from typing import TypedDict

_LINE_RE = re.compile(
    r"^(?P<file>[^:\n]+):(?P<line>\d+):(?P<col>\d+):\s+"
    r"(?P<severity>error|warning|note|fatal error):\s+(?P<message>.+?)\s*$"
)


class Diagnostic(TypedDict):
    file: str
    line: int
    column: int
    severity: str  # "error" | "warning" | "info"
    message: str


def _map_severity(raw: str) -> str:
    if raw in ("error", "fatal error"):
        return "error"
    if raw == "warning":
        return "warning"
    return "info"


def parse_log(text: str) -> list[Diagnostic]:
    out: list[Diagnostic] = []
    for raw in text.splitlines():
        m = _LINE_RE.match(raw)
        if not m:
            continue
        out.append(
            Diagnostic(
                file=m.group("file"),
                line=int(m.group("line")),
                column=int(m.group("col")),
                severity=_map_severity(m.group("severity")),
                message=m.group("message"),
            )
        )
    return out
