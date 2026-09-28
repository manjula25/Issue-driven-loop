from loopsample2 import truncate


def test_short():
    assert truncate("abc", 5) == "abc"


def test_long():
    assert truncate("abcdef", 4) == "abc…"
