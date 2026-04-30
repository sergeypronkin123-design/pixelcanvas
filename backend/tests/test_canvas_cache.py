"""Tests for canvas_cache. Run via pytest."""
import pytest

from app.services.canvas_cache import CanvasCache, CANVAS_W, CANVAS_H


@pytest.fixture
def cache():
    return CanvasCache()


def test_set_and_get_pixel(cache):
    cache.set_pixel(10, 20, "#ff0000", user_id=42)
    p = cache.get_pixel(10, 20)
    assert p is not None
    assert p["color"] == "#ff0000"
    assert p["user_id"] == 42


def test_set_pixel_overwrites(cache):
    cache.set_pixel(10, 20, "#ff0000", user_id=1)
    cache.set_pixel(10, 20, "#00ff00", user_id=2)
    p = cache.get_pixel(10, 20)
    assert p["color"] == "#00ff00"
    assert p["user_id"] == 2


def test_user_count_tracking(cache):
    cache.set_pixel(0, 0, "#ff0000", user_id=1)
    cache.set_pixel(1, 0, "#ff0000", user_id=1)
    cache.set_pixel(2, 0, "#00ff00", user_id=2)
    assert cache.user_counts[1] == 2
    assert cache.user_counts[2] == 1


def test_user_count_decrements_on_overwrite(cache):
    cache.set_pixel(0, 0, "#ff0000", user_id=1)
    assert cache.user_counts[1] == 1
    cache.set_pixel(0, 0, "#00ff00", user_id=2)
    assert cache.user_counts.get(1, 0) == 0
    assert cache.user_counts[2] == 1


def test_get_pixel_out_of_bounds(cache):
    assert cache.get_pixel(-1, 0) is None
    assert cache.get_pixel(0, -1) is None
    assert cache.get_pixel(CANVAS_W, 0) is None
    assert cache.get_pixel(0, CANVAS_H) is None


def test_get_pixel_unset_returns_none(cache):
    assert cache.get_pixel(500, 500) is None


def test_iter_range(cache):
    cache.set_pixel(10, 10, "#ff0000")
    cache.set_pixel(11, 10, "#00ff00")
    cache.set_pixel(50, 50, "#0000ff")
    pixels = cache.get_pixels_in_range(0, 0, 20, 20)
    assert len(pixels) == 2
    coords = {(p["x"], p["y"]) for p in pixels}
    assert (10, 10) in coords
    assert (11, 10) in coords
    assert (50, 50) not in coords


def test_count(cache):
    assert cache.count == 0
    cache.set_pixel(1, 1, "#ffffff")
    cache.set_pixel(2, 2, "#ffffff")
    assert cache.count == 2
    # Overwriting same position doesn't increment count
    cache.set_pixel(1, 1, "#000000")
    assert cache.count == 2


def test_invalid_color_silent_ignore(cache):
    cache.set_pixel(0, 0, "not-a-color")
    assert cache.get_pixel(0, 0) is None
    cache.set_pixel(0, 0, "#zzzzzz")
    assert cache.get_pixel(0, 0) is None


def test_pixels_property_compat(cache):
    """canvas_snapshot.py uses _pixels — must still work."""
    cache.set_pixel(0, 0, "#ff0000", user_id=1)
    cache.set_pixel(5, 5, "#00ff00", user_id=2, clan_id=3)
    p = cache._pixels
    assert (0, 0) in p
    assert p[(0, 0)] == ("#ff0000", 1, 0)
    assert p[(5, 5)] == ("#00ff00", 2, 3)
