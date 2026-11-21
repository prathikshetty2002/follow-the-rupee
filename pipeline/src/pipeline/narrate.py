"""Claude writes the plain-language text; pandas owns every number.

A narration is accepted only if it passes checks (length, no number that is not in the supplied facts, no accusatory words).
Anything that fails, or any run without credentials, falls back to a deterministic template so the output is always valid.
Results are cached on disk and reused from the committed output, so reruns and the demo never need the API.
"""

import hashlib
import json
import os
import re
from pathlib import Path
from collections.abc import Callable

import anthropic
from dotenv import load_dotenv

from pipeline import config
from pipeline.data import ROOT

CACHE_DIR = ROOT / "pipeline" / "cache" / "narration"
BANNED = ("fraud", "corrupt", "cheat", "steal", "stole", "scam", "criminal", "illegal", "crook", "guilty", "blame", "theft", "bribe")
NUMBER = re.compile(r"\d[\d,]*\.?\d*")
ALWAYS_OK = {30.0}  # the 30-day window in the re-open definition

SCORECARD_SYSTEM = (
    "You write short scorecards about road repair contractors for Mumbai citizens and ward corporators. "
    "Use only the facts you are given: every number you write must appear in them, and do not add any other claim. "
    "Be fair and neutral. Say what the data shows and compare it with what is expected for the same kind of work. "
    "Never use words such as fraud, cheating, corrupt, illegal or blame; say 'listed for review' for billing items. "
    f"Write one paragraph of plain prose, 90 to {config.SCORECARD_MAX_WORDS - 10} words, with no headings, bullets or markdown. "
    "Cover speed, how long repairs lasted, cost against the rate card, the grade, and the one thing to improve."
)


def _numbers(text: str) -> set[float]:
    out = set()
    for token in NUMBER.findall(text):
        token = token.replace(",", "").rstrip(".")
        if token:
            out.add(round(float(token), 1))
    return out


def check_text(text: str, facts: dict, max_words: int = config.SCORECARD_MAX_WORDS) -> list[str]:
    """Problems that make a narration unusable; empty list means it is fine."""
    problems = []
    if len(text.split()) > max_words:
        problems.append(f"it has {len(text.split())} words; the limit is {max_words}")
    if len(text.split()) < 30:
        problems.append("it is too short to cover speed, durability, cost, grade and improvement")
    lowered = text.lower()
    problems += [f"it uses the word '{w}'" for w in BANNED if w in lowered]
    allowed = _numbers(" ".join(str(v) for v in facts.values())) | ALWAYS_OK
    stray = sorted(_numbers(text) - allowed)
    if stray:
        problems.append(f"these numbers are not in the facts: {', '.join(str(n) for n in stray)}")
    name = str(facts.get("contractor", ""))
    if name and name.lower() not in lowered:
        problems.append("it never names the contractor")
    return problems


def fingerprint(facts: dict, system: str) -> str:
    blob = json.dumps({"model": config.NARRATION_MODEL, "system": system, "facts": facts}, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(blob.encode()).hexdigest()[:16]


class Writer:
    """Calls Claude when credentials exist; otherwise every request uses the fallback."""

    def __init__(self, client=None, use_claude: bool = True):
        load_dotenv(ROOT / "pipeline" / ".env")
        self.client, self.disabled_reason = client, None
        if not use_claude:
            self.disabled_reason = "turned off with --no-claude"
        elif client is None:
            if not self._has_credentials():
                self.disabled_reason = "no Anthropic credentials: set ANTHROPIC_API_KEY in pipeline/.env"
            else:
                self.client = anthropic.Anthropic()

    @staticmethod
    def _has_credentials() -> bool:
        """An API key or token in the environment, or an `ant auth login` profile on disk."""
        return bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN") or (Path.home() / ".config" / "anthropic").exists())

    @property
    def active(self) -> bool:
        return self.client is not None and self.disabled_reason is None

    def _ask(self, system: str, user: str) -> str | None:
        try:
            response = self.client.beta.messages.create(
                model=config.NARRATION_MODEL,
                max_tokens=2000,
                system=system,
                messages=[{"role": "user", "content": user}],
                output_config={"effort": "low"},
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
            )
        except TypeError as e:  # the SDK found no credentials when it built the request
            if "authentication method" not in str(e):
                raise
            self.disabled_reason = "no usable Anthropic credentials"
            return None
        except anthropic.AuthenticationError as e:
            self.disabled_reason = f"authentication failed: {e.message}"
            return None
        except anthropic.APIStatusError as e:
            if e.status_code in (400, 403, 404):  # a setup problem, not one bad request: stop calling
                self.disabled_reason = f"API error {e.status_code}: {e.message}"
            return None
        except anthropic.APIConnectionError:
            return None
        if response.stop_reason == "refusal":
            return None
        return "".join(b.text for b in response.content if b.type == "text").strip()

    def write(self, facts: dict, system: str, attempts: int = 2) -> str | None:
        """A checked narration from Claude, or None."""
        if not self.active:
            return None
        user = "Facts:\n" + json.dumps(facts, ensure_ascii=False, indent=1)
        for _ in range(attempts):
            text = self._ask(system, user)
            if text is None:
                return None
            problems = check_text(text, facts)
            if not problems:
                return text
            user += "\n\nYour previous draft was rejected because " + "; ".join(problems) + ". Write it again and fix this."
        return None


def narrate(key: str, facts: dict, system: str, fallback: Callable[[dict], str], writer: Writer, prior: dict | None = None) -> tuple[str, str, str]:
    """(text, source, fingerprint). Reuse order: committed Claude text, disk cache, Claude, template."""
    h = fingerprint(facts, system)
    old = (prior or {}).get(key)
    if old and old.get("hash") == h and old.get("source") == "claude":
        return old["text"], "claude", h
    cache = CACHE_DIR / f"{key}-{h}.txt"
    if cache.exists():
        return cache.read_text(), "claude", h
    text = writer.write(facts, system)
    if text:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cache.write_text(text)
        return text, "claude", h
    return fallback(facts), "template", h
