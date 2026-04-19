from pathlib import Path

from app.services.outputs import parse_hst, parse_tab


def test_parse_hst_reads_header_and_rows(tmp_path: Path) -> None:
    p = tmp_path / "demo.hst"
    p.write_text(
        """\
# [1]=time [2]=dt [3]=mass [4]=1-E_tot
0.0 0.01 1.0 2.5
0.1 0.01 1.0 2.48
0.2 0.01 1.0 2.46
"""
    )
    s = parse_hst(p)
    assert s.columns == ["time", "dt", "mass", "1-E_tot"]
    assert s.rows[0][0] == 0.0
    assert len(s.rows) == 3


def test_parse_hst_handles_scientific_and_negative(tmp_path: Path) -> None:
    p = tmp_path / "a.hst"
    p.write_text("# [1]=t [2]=x\n0.0 -1.5e-3\n1.0 +4.2E2\n")
    s = parse_hst(p)
    assert s.rows == [[0.0, -0.0015], [1.0, 420.0]]


def test_parse_hst_skips_malformed_rows(tmp_path: Path) -> None:
    p = tmp_path / "a.hst"
    p.write_text("# [1]=t [2]=x\n0.0 1.0\nNaN oops bad\n1.0 2.0\n")
    s = parse_hst(p)
    # The middle line is non-numeric and must be dropped silently.
    assert s.rows == [[0.0, 1.0], [1.0, 2.0]]


def test_parse_empty_file_yields_empty_series(tmp_path: Path) -> None:
    p = tmp_path / "a.hst"
    p.write_text("")
    s = parse_hst(p)
    assert s.columns == []
    assert s.rows == []


def test_parse_header_only(tmp_path: Path) -> None:
    p = tmp_path / "a.hst"
    p.write_text("# [1]=t [2]=x\n")
    s = parse_hst(p)
    assert s.columns == ["t", "x"]
    assert s.rows == []


def test_parse_tab_reuses_hst_logic(tmp_path: Path) -> None:
    p = tmp_path / "a.tab"
    p.write_text("# [1]=x [2]=rho\n-0.5 1.0\n0.5 0.125\n")
    s = parse_tab(p)
    assert s.columns == ["x", "rho"]
    assert s.rows == [[-0.5, 1.0], [0.5, 0.125]]
