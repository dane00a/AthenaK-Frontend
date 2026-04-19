"""Minimal parser/serializer for AthenaK .athinput files.

Syntax (see CLAUDE.md §6.3):

    <block>
    key = value    # trailing comment
    key2 = value2

Blocks are flat (no nesting). Values are stored as strings; higher layers may
coerce via the field catalog in ``frontend/src/schemas/athinput.ts``.
"""
from __future__ import annotations

import re
from collections import OrderedDict

_BLOCK_RE = re.compile(r"^\s*<([^>]+)>\s*$")
_KV_RE = re.compile(r"^\s*([^=\s#][^=]*?)\s*=\s*(.*?)\s*(?:#.*)?$")


AthInput = OrderedDict[str, OrderedDict[str, str]]


def parse(text: str) -> AthInput:
    doc: AthInput = OrderedDict()
    current: OrderedDict[str, str] | None = None
    current_name: str | None = None

    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if m := _BLOCK_RE.match(line):
            current_name = m.group(1).strip()
            current = doc.setdefault(current_name, OrderedDict())
            continue
        if current is None:
            continue
        if m := _KV_RE.match(line):
            key, value = m.group(1).strip(), m.group(2).strip()
            current[key] = value
    return doc


def serialize(doc: AthInput) -> str:
    lines: list[str] = []
    for block, kvs in doc.items():
        lines.append(f"<{block}>")
        for k, v in kvs.items():
            lines.append(f"{k} = {v}")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"
