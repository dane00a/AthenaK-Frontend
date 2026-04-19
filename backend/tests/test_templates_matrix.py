"""Smoke tests for every wizard combination.

Confirms every (physics_module x initial_condition) pair renders without
Jinja errors and produces a file containing the UserProblem signature and
the user-region markers that make hand edits sticky.
"""
from __future__ import annotations

import pytest

from app.services.templates import (
    INITIAL_CONDITIONS_ALL,
    PHYSICS_MODULES_ALL,
    WizardParams,
    extract_user_regions,
    render_problem_cpp,
)


@pytest.mark.parametrize("physics", PHYSICS_MODULES_ALL)
@pytest.mark.parametrize("ic", INITIAL_CONDITIONS_ALL)
def test_all_combinations_render(physics: str, ic: str) -> None:
    src = render_problem_cpp(
        WizardParams(physics_module=physics, initial_condition=ic)  # type: ignore[arg-type]
    )
    assert "ProblemGenerator::UserProblem" in src
    # Every render must include the four baseline regions we rely on for
    # sticky hand edits.
    regions = extract_user_regions(src)
    for name in ("includes", "pre_init", "post_init"):
        assert name in regions, f"missing user region {name!r} for {physics}/{ic}"


def test_hook_flags_toggle_body() -> None:
    off = render_problem_cpp(WizardParams(register_user_bcs=False))
    on = render_problem_cpp(WizardParams(register_user_bcs=True))
    assert "user_bcs = true" not in off
    assert "user_bcs = true" in on


def test_prim_to_cons_skipped_for_radiation() -> None:
    # PrimToCons only makes sense for hydro/mhd variants.
    src = render_problem_cpp(WizardParams(physics_module="radiation", call_prim_to_cons=True))
    assert "PrimToCons" not in src


def test_mhd_prim_to_cons_uses_magnetic_field_buffer() -> None:
    src = render_problem_cpp(WizardParams(physics_module="mhd", call_prim_to_cons=True))
    assert "pmbp->pmhd->b0" in src


def test_par_for_loop_opt_out() -> None:
    src = render_problem_cpp(WizardParams(emit_par_for_loop=False))
    assert "par_for(" not in src
    assert "user:manual_init" in src
