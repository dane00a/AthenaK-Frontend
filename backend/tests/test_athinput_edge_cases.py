from app.services.athinput import parse, serialize


def test_inline_comments_are_stripped() -> None:
    doc = parse("<mesh>\nnx1 = 256    # resolution in x1\n")
    assert doc["mesh"]["nx1"] == "256"


def test_hash_only_and_blank_lines_ignored() -> None:
    doc = parse(
        """
# top-level comment
<time>

# blank line above
tlim = 0.25

"""
    )
    assert doc == {"time": {"tlim": "0.25"}}


def test_crlf_line_endings() -> None:
    text = "<time>\r\ntlim = 0.25\r\ncfl = 0.8\r\n"
    doc = parse(text)
    assert doc["time"] == {"tlim": "0.25", "cfl": "0.8"}


def test_repeated_block_header_merges() -> None:
    doc = parse("<mesh>\nnx1 = 1\n<mesh>\nnx2 = 2\n")
    assert doc["mesh"] == {"nx1": "1", "nx2": "2"}


def test_value_with_equals_sign_keeps_rhs() -> None:
    # Some AthenaK params (e.g. custom problem strings) embed '='.
    doc = parse("<problem>\nexpr = a=b+c\n")
    assert doc["problem"]["expr"] == "a=b+c"


def test_orphan_kv_before_any_block_is_dropped() -> None:
    doc = parse("foo = 1\n<mesh>\nnx1 = 2\n")
    assert "foo" not in doc
    assert doc["mesh"]["nx1"] == "2"


def test_empty_block_preserved() -> None:
    doc = parse("<problem>\n<time>\ntlim = 1.0\n")
    assert "problem" in doc
    assert doc["problem"] == {}


def test_serialize_has_blank_line_between_blocks() -> None:
    text = serialize({"a": {"x": "1"}, "b": {"y": "2"}})
    # "<a>\nx = 1\n\n<b>\ny = 2\n" — blocks separated by a blank line.
    assert "\n\n<b>" in text


def test_roundtrip_preserves_key_order() -> None:
    src = "<time>\ntlim = 0.25\ncfl = 0.8\nintegrator = rk2\n"
    rendered = serialize(parse(src))
    assert rendered.index("tlim") < rendered.index("cfl") < rendered.index("integrator")
