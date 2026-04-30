"""Tests for battle service. Run via pytest."""
from datetime import datetime, timezone
from unittest.mock import patch

import pytest

from app.services.battle import (
    NO_COOLDOWN_USERS,
    get_battle_phase,
    get_cooldown_seconds,
)


# ---------------------------------------------------------------------------
# Cooldown bypass
# ---------------------------------------------------------------------------


def test_cooldown_bypass_for_admin_user():
    """Users in NO_COOLDOWN_USERS get 0 seconds."""
    import app.services.battle as battle_mod
    original = battle_mod.NO_COOLDOWN_USERS
    try:
        battle_mod.NO_COOLDOWN_USERS = {1, 43}
        assert get_cooldown_seconds(False, user_id=1) == 0
        assert get_cooldown_seconds(False, user_id=43) == 0
        # Non-listed user still has cooldown
        assert get_cooldown_seconds(False, user_id=99) > 0
    finally:
        battle_mod.NO_COOLDOWN_USERS = original


def test_cooldown_normal_user_free():
    """Free user gets normal cooldown."""
    cd = get_cooldown_seconds(is_subscriber=False, user_id=2)
    assert cd > 0
    assert cd >= 5  # not zero


def test_cooldown_normal_user_pro():
    """Pro user gets shorter cooldown than free."""
    free = get_cooldown_seconds(is_subscriber=False, user_id=2)
    pro = get_cooldown_seconds(is_subscriber=True, user_id=2)
    assert pro < free


def test_cooldown_no_user_id():
    """Backward compat — works without user_id."""
    cd = get_cooldown_seconds(is_subscriber=False)
    assert cd > 0


# ---------------------------------------------------------------------------
# Phase detection — fallback path (no DB)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "day,expected",
    [
        (1, "solo"),
        (5, "solo"),
        (10, "solo"),
        (11, "clan"),
        (15, "clan"),
        (20, "clan"),
        (21, "peace"),
        (25, "peace"),
        (30, "peace"),  # April has 30 days, not 31
    ],
)
def test_phase_by_day(day, expected):
    """Without active battle in DB, falls back to env-based day boundaries."""
    fake_now = datetime(2026, 4, day, 12, 0, tzinfo=timezone.utc)

    class FakeDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            return fake_now

    with patch("app.services.battle.datetime", FakeDateTime):
        assert get_battle_phase() == expected
