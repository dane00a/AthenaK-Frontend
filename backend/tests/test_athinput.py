from app.services.athinput import parse, serialize


def test_parse_basic() -> None:
    text = """
<comment>
problem = Sod shock tube

<mesh>
nx1 = 256
x1min = -0.5
x1max = 0.5  # right edge
""".strip()
    doc = parse(text)
    assert list(doc.keys()) == ["comment", "mesh"]
    assert doc["comment"]["problem"] == "Sod shock tube"
    assert doc["mesh"]["nx1"] == "256"
    assert doc["mesh"]["x1max"] == "0.5"


def test_roundtrip_preserves_keys() -> None:
    text = "<time>\ntlim = 0.25\ncfl = 0.8\n"
    assert parse(serialize(parse(text))) == parse(text)
