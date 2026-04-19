from app.services.templates import WizardParams, extract_user_regions, render_problem_cpp


def test_render_contains_signature() -> None:
    src = render_problem_cpp(WizardParams(physics_module="hydro", initial_condition="shock_tube"))
    assert "void ProblemGenerator::UserProblem(ParameterInput *pin, const bool restart)" in src
    assert "// >>> user:init_body" in src
    assert "// <<< user:init_body" in src


def test_user_region_preservation() -> None:
    first = render_problem_cpp(WizardParams(initial_condition="uniform"))
    edited = first.replace(
        "// >>> user:pre_init\n",
        "// >>> user:pre_init\n  Real my_param = pin->GetReal(\"problem\", \"rho0\");\n",
        1,
    )
    regenerated = render_problem_cpp(
        WizardParams(initial_condition="blast"), prior_source=edited
    )
    regions = extract_user_regions(regenerated)
    assert "my_param" in regions["pre_init"]
