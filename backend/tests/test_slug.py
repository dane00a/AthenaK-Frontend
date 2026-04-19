from app.services.slug import slugify, unique_slug


def test_slugify_basic() -> None:
    assert slugify("Sod Shock Tube") == "sod-shock-tube"


def test_slugify_strips_punctuation_and_accents() -> None:
    assert slugify("Gödel/Escher! #4") == "godelescher-4"


def test_slugify_empty_fallback() -> None:
    assert slugify("") == "project"
    assert slugify("!!!") == "project"


def test_slugify_collapses_whitespace_and_hyphens() -> None:
    assert slugify("  hello   --  world  ") == "hello-world"


def test_unique_slug_first_is_base() -> None:
    assert unique_slug("Foo", set()) == "foo"


def test_unique_slug_incremental_suffix() -> None:
    assert unique_slug("Foo", {"foo"}) == "foo-2"
    assert unique_slug("Foo", {"foo", "foo-2"}) == "foo-3"
