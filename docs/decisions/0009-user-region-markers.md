# ADR 0009 — User-region markers preserve hand-edits in generated C++

**Status:** Accepted.

## Context

The wizard regenerates `user_problem.cpp` from a form. Hand edits outside the wizard's control would normally be clobbered. A pure "generate on demand" model loses any tweaks the user made in Monaco.

## Decision

The Jinja2 template `backend/templates/user_problem.cpp.j2` delimits a handful of edit-zones with markers:

```cpp
// >>> user:<name>
  /* your code */
// <<< user:<name>
```

`services/templates.render_problem_cpp(params, prior_source=old)` extracts the bodies of matching `user:*` regions from `old` and re-inserts them into the freshly-rendered template. New zones (added to the template later) start empty. Removed zones silently drop their body — we warn about this in CLAUDE.md gotchas.

## Consequences

- Wizard regeneration is safe: users can iterate on form inputs without losing their code.
- The preview-diff endpoint (`POST /projects/:id/problem/from-wizard/preview`) lets the UI show what would change *before* saving.
- Adding a new user region to the template is backward compatible.
- Renaming an existing region orphans its body. Don't do that — treat template changes like schema changes.

## Alternatives considered

- **Never regenerate — always preserve existing source.** Wizard becomes write-once. Rejected; users want to re-scaffold after major shape changes.
- **Three-way merge.** More forgiving but needs a base version stored somewhere; overkill for a single-author document.
