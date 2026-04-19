"""Parse AthenaK output files into JSON-friendly series for the frontend.

Only .hst (history) and .tab (1D tab dumps) are supported in v1; .athdf/.bin
are exposed as raw download links and will be parsed later.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass
class Series:
    columns: list[str]
    rows: list[list[float]]


def parse_hst(path: Path) -> Series:
    """Parse an AthenaK .hst history file.

    Format: the header line starting with ``#`` names columns (the first token
    after ``#`` is a row index); subsequent non-blank lines are whitespace-
    separated floats.
    """
    columns: list[str] = []
    rows: list[list[float]] = []
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith("#"):
            if not columns:
                # Typical header: "# [1]=time [2]=dt [3]=mass ..."
                tokens = [t for t in line.lstrip("#").split() if t]
                columns = [t.split("=", 1)[-1] if "=" in t else t for t in tokens]
            continue
        parts = line.split()
        try:
            rows.append([float(p) for p in parts])
        except ValueError:
            continue
    return Series(columns=columns, rows=rows)


def parse_tab(path: Path) -> Series:
    """Parse an AthenaK .tab (1D profile) file using the same rules as .hst."""
    return parse_hst(path)
