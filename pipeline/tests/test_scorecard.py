from types import SimpleNamespace

import pandas as pd
import pytest

from pipeline import narrate as nr
from pipeline.narrate import SCORECARD_SYSTEM, Writer, check_text, narrate
from pipeline.scorecard import expected_rate, grade, improve_line, template_text, verdict

FACTS = {"contractor": "Acme Roads", "jobs": 287, "on_time_pct": "60%", "expected_on_time_pct": "48%", "redone_within_30_days_pct": "9%", "grade": "A"}
GOOD = (
    "Acme Roads did 287 monsoon road jobs. About 60% met their target time, a little above the 48% expected for this kind of work. "
    "Only 9% of repairs had to be redone within 30 days, which is a strong result. Bills stayed close to the standard rate card, "
    "with a few jobs listed for review. Overall grade: A. To improve, keep every bill within the rate card."
)


def fake_client(*texts, stop="end_turn"):
    calls = []
    queue = list(texts)

    def create(**kwargs):
        calls.append(kwargs)
        return SimpleNamespace(stop_reason=stop, content=[SimpleNamespace(type="thinking", thinking=""), SimpleNamespace(type="text", text=queue.pop(0))])

    return SimpleNamespace(beta=SimpleNamespace(messages=SimpleNamespace(create=create))), calls


@pytest.fixture(autouse=True)
def tmp_cache(tmp_path, monkeypatch):
    monkeypatch.setattr(nr, "CACHE_DIR", tmp_path / "cache")


def test_check_text_accepts_a_good_scorecard():
    assert check_text(GOOD, FACTS) == []


def test_check_text_rejects_invented_numbers_banned_words_and_length():
    assert any("not in the facts" in p for p in check_text(GOOD.replace("287", "290"), FACTS))
    assert any("fraud" in p for p in check_text(GOOD + " This looks like fraud.", FACTS))
    assert any("words" in p for p in check_text(GOOD + " filler" * 100, FACTS))
    assert any("never names" in p for p in check_text(GOOD.replace("Acme Roads", "This firm"), FACTS, must_name="Acme Roads"))


def test_claude_text_is_checked_cached_and_sent_with_safe_settings():
    client, calls = fake_client(GOOD)
    writer = Writer(client=client)
    text, source, h = narrate("CT05", FACTS, SCORECARD_SYSTEM, template_text, writer)
    assert (text, source) == (GOOD, "claude")
    kwargs = calls[0]
    assert kwargs["model"] == "claude-sonnet-5-5" and kwargs["fallbacks"] == "default" and "temperature" not in kwargs and "thinking" not in kwargs
    again = narrate("CT05", FACTS, SCORECARD_SYSTEM, template_text, Writer(client=fake_client()[0]))  # would crash if it called the API
    assert again[:2] == (GOOD, "claude")


def test_bad_draft_is_retried_with_the_reason_then_template_is_used():
    client, calls = fake_client(GOOD + " Total fraud.", GOOD.replace("287", "999"))
    text, source, _ = narrate("CT05", FACTS, SCORECARD_SYSTEM, lambda f: "TEMPLATE", Writer(client=client))
    assert (text, source) == ("TEMPLATE", "template") and len(calls) == 2
    assert "rejected because" in calls[1]["messages"][0]["content"]


def test_refusal_and_missing_credentials_fall_back_to_template(monkeypatch, tmp_path):
    client, _ = fake_client(GOOD, stop="refusal")
    assert narrate("A", FACTS, SCORECARD_SYSTEM, lambda f: "T", Writer(client=client))[:2] == ("T", "template")
    for var in ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"):
        monkeypatch.delenv(var, raising=False)
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setattr(nr, "load_dotenv", lambda *a, **k: None)
    w = Writer()
    assert not w.active and "credentials" in w.disabled_reason
    assert narrate("B", FACTS, SCORECARD_SYSTEM, lambda f: "T", w)[:2] == ("T", "template")


def test_committed_claude_text_is_kept_but_committed_template_is_not():
    h = nr.fingerprint(FACTS, SCORECARD_SYSTEM)
    w = Writer(client=None, use_claude=False)
    kept = narrate("CT05", FACTS, SCORECARD_SYSTEM, lambda f: "T", w, prior={"CT05": {"hash": h, "text": GOOD, "source": "claude"}})
    assert kept == (GOOD, "claude", h)
    redone = narrate("CT05", FACTS, SCORECARD_SYSTEM, lambda f: "T", w, prior={"CT05": {"hash": h, "text": "old", "source": "template"}})
    assert redone[:2] == ("T", "template")
    changed = narrate("CT05", {**FACTS, "jobs": 300}, SCORECARD_SYSTEM, lambda f: "T", w, prior={"CT05": {"hash": h, "text": GOOD, "source": "claude"}})
    assert changed[1] == "template"  # facts changed, so the old Claude text no longer applies


def test_expected_rate_is_calibrated_and_follows_context():
    df = pd.DataFrame({"ctx": ["a"] * 50 + ["b"] * 50, "bad": [1] * 40 + [0] * 10 + [1] * 10 + [0] * 40})
    e = expected_rate(df, "bad", ["ctx"])
    assert e.sum() == pytest.approx(df.bad.sum())
    assert e[df.ctx == "a"].mean() > e[df.ctx == "b"].mean()  # harder context, higher expectation


def test_grades_and_verdicts():
    assert [grade(s) for s in (90, 80, 79, 50, 34)] == ["A", "A", "B", "C", "E"]
    assert verdict(1.0, True) == "in line with expectations"
    assert verdict(-3.0, True) == "better than expected" and verdict(3.0, True) == "worse than expected"


def card(**over):
    base = {
        "scores": {"durability": 80, "billing": 100, "speed": 70},
        "adjusted": {"reopen_vs_expected": 0.6, "reopen_expected_rate": 0.24, "sla_vs_expected_pp": 5.0, "sla_expected_rate": 0.5},
        "billing": {"over_billed_jobs": 0, "double_billed_jobs": 0},
        "reopen_rate": 0.1, "sla_met_rate": 0.55,
    }
    base.update(over)
    return base


def test_improve_line_picks_a_real_weakness_not_a_strength():
    assert "Keep it up" in improve_line(card())
    assert "Keep bills" in improve_line(card(billing={"over_billed_jobs": 2, "double_billed_jobs": 1}))
    slow = card(adjusted={"reopen_vs_expected": 0.6, "reopen_expected_rate": 0.24, "sla_vs_expected_pp": -8.0, "sla_expected_rate": 0.5}, scores={"durability": 80, "billing": 100, "speed": 30})
    assert "faster" in improve_line(slow)
    fragile = card(adjusted={"reopen_vs_expected": 1.5, "reopen_expected_rate": 0.24, "sla_vs_expected_pp": 5.0, "sla_expected_rate": 0.5}, scores={"durability": 10, "billing": 100, "speed": 70})
    assert "fail within 30 days" in improve_line(fragile)


def test_spelled_out_numbers_are_checked_like_digits():
    ok = GOOD.replace("a few jobs", "two jobs")
    assert check_text(ok, {**FACTS, "listed": 2}, must_name="Acme Roads") == []
    assert any("not in the facts" in p for p in check_text(ok.replace("two jobs", "twelve jobs"), {**FACTS, "listed": 2}))
    assert check_text(GOOD.replace("a few jobs", "one job"), FACTS) == []  # "one" is ordinary prose


def test_short_rupee_format_handles_zero():
    from pipeline.scorecard import inr_short

    assert inr_short(0) == "₹0" and inr_short(1_410_000) == "₹14.1 lakh" and inr_short(14_074_782) == "₹1.41 crore"
