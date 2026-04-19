from app.services.diagnostics import parse_log

SAMPLE = """\
-- Configuring done
[ 10%] Building CXX user_problem.cpp
/home/u/upstream/athenak/src/pgen/user_problem.cpp:42:5: error: 'foo' was not declared in this scope
user_problem.cpp:7:14: warning: unused variable 'x' [-Wunused-variable]
ld: fatal error: linking failed
main.cpp:1:1: note: see earlier message
"""


def test_parses_error_warning_note() -> None:
    diags = parse_log(SAMPLE)
    assert [d["severity"] for d in diags] == ["error", "warning", "info"]
    assert diags[0]["line"] == 42 and diags[0]["column"] == 5
    assert diags[1]["file"] == "user_problem.cpp"


def test_ignores_non_diagnostic_lines() -> None:
    diags = parse_log("-- Configuring done\n[100%] built\n")
    assert diags == []


def test_fatal_error_maps_to_error() -> None:
    diags = parse_log("foo.cpp:1:1: fatal error: header missing\n")
    assert len(diags) == 1 and diags[0]["severity"] == "error"
