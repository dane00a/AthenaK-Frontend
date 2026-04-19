"""Render the user-authored C++ problem generator from wizard inputs.

See CLAUDE.md §5.6. The generator produces a file conforming to the real
AthenaK signature::

    void ProblemGenerator::UserProblem(ParameterInput *pin, const bool restart)

Hand-edited regions are preserved across regenerations using
``// >>> user:<name>`` / ``// <<< user:<name>`` markers.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

from jinja2 import Environment, FileSystemLoader, StrictUndefined

PHYSICS_MODULES_ALL = (
    "hydro",
    "mhd",
    "srhydro",
    "srmhd",
    "grhydro",
    "grmhd",
    "radiation",
)
INITIAL_CONDITIONS_ALL = ("uniform", "shock_tube", "blast", "gaussian", "custom")

PhysicsModule = Literal["hydro", "mhd", "srhydro", "srmhd", "grhydro", "grmhd", "radiation"]
InitialCondition = Literal["uniform", "shock_tube", "blast", "gaussian", "custom"]

TEMPLATES_DIR = Path(__file__).resolve().parents[2] / "templates"

_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    undefined=StrictUndefined,
    keep_trailing_newline=True,
    trim_blocks=True,
    lstrip_blocks=True,
)


@dataclass
class WizardParams:
    physics_module: PhysicsModule = "hydro"
    initial_condition: InitialCondition = "uniform"
    emit_par_for_loop: bool = True
    call_prim_to_cons: bool = True
    register_user_bcs: bool = False
    register_user_srcs: bool = False
    register_user_refinement: bool = False
    register_user_history: bool = False
    parameters: dict[str, float | int | str] = field(default_factory=dict)


USER_REGION_RE = re.compile(
    r"// >>> user:(?P<name>[\w.-]+)\n(?P<body>.*?)// <<< user:(?P=name)\n",
    re.DOTALL,
)


def extract_user_regions(source: str) -> dict[str, str]:
    """Pull the body of each ``// >>> user:<name> ... // <<< user:<name>`` region."""
    return {m.group("name"): m.group("body") for m in USER_REGION_RE.finditer(source)}


def apply_user_regions(source: str, regions: dict[str, str]) -> str:
    """Substitute stored region bodies back into a freshly rendered template."""

    def sub(match: re.Match[str]) -> str:
        name = match.group("name")
        body = regions.get(name, match.group("body"))
        return f"// >>> user:{name}\n{body}// <<< user:{name}\n"

    return USER_REGION_RE.sub(sub, source)


def render_problem_cpp(params: WizardParams, prior_source: str | None = None) -> str:
    tpl = _env.get_template("user_problem.cpp.j2")
    rendered = tpl.render(**params.__dict__)
    if prior_source:
        rendered = apply_user_regions(rendered, extract_user_regions(prior_source))
    return rendered
