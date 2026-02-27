#!/usr/bin/env python3
from __future__ import annotations

import os
from pathlib import Path
from typing import Callable

import requests


def load_env(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        raw = line.strip()
        if not raw or raw.startswith("#") or "=" not in raw:
            continue
        key, value = raw.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def has_value(key: str) -> bool:
    value = os.environ.get(key, "").strip()
    return bool(value) and "PASTE_YOUR" not in value


def run_check(name: str, fn: Callable[[], tuple[bool, str]]) -> tuple[str, bool, str]:
    try:
        ok, detail = fn()
    except Exception as exc:  # pragma: no cover - runtime network errors
        ok, detail = False, f"error:{exc.__class__.__name__}"
    return (name, ok, detail)


def main() -> None:
    load_env(Path.home() / ".forgeclaw/.env")
    load_env(Path.cwd() / ".env")

    checks: list[tuple[str, bool, str]] = []

    checks.append(
        run_check(
            "ANTHROPIC_API_KEY",
            lambda: (False, "missing")
            if not has_value("ANTHROPIC_API_KEY")
            else (
                lambda r: (r.status_code == 200, str(r.status_code))
            )(
                requests.get(
                    "https://api.anthropic.com/v1/models",
                    headers={
                        "x-api-key": os.environ["ANTHROPIC_API_KEY"],
                        "anthropic-version": "2023-06-01",
                    },
                    timeout=15,
                )
            ),
        )
    )
    checks.append(
        run_check(
            "OPENAI_API_KEY",
            lambda: (False, "missing")
            if not has_value("OPENAI_API_KEY")
            else (
                lambda r: (r.status_code == 200, str(r.status_code))
            )(
                requests.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}"},
                    timeout=15,
                )
            ),
        )
    )
    checks.append(
        run_check(
            "OPENROUTER_API_KEY",
            lambda: (False, "missing")
            if not has_value("OPENROUTER_API_KEY")
            else (
                lambda r: (r.status_code == 200, str(r.status_code))
            )(
                requests.get(
                    "https://openrouter.ai/api/v1/models",
                    headers={"Authorization": f"Bearer {os.environ['OPENROUTER_API_KEY']}"},
                    timeout=15,
                )
            ),
        )
    )
    checks.append(
        run_check(
            "GROQ_API_KEY",
            lambda: (False, "missing")
            if not has_value("GROQ_API_KEY")
            else (
                lambda r: (r.status_code == 200, str(r.status_code))
            )(
                requests.get(
                    "https://api.groq.com/openai/v1/models",
                    headers={"Authorization": f"Bearer {os.environ['GROQ_API_KEY']}"},
                    timeout=15,
                )
            ),
        )
    )
    checks.append(
        run_check(
            "GEMINI_API_KEY",
            lambda: (False, "missing")
            if not has_value("GEMINI_API_KEY")
            else (
                lambda r: (r.status_code == 200, str(r.status_code))
            )(
                requests.get(
                    f"https://generativelanguage.googleapis.com/v1beta/models?key={os.environ['GEMINI_API_KEY']}",
                    timeout=15,
                )
            ),
        )
    )
    checks.append(
        run_check(
            "ELEVENLABS_API_KEY",
            lambda: (False, "missing")
            if not has_value("ELEVENLABS_API_KEY")
            else (
                lambda r: (r.status_code == 200, str(r.status_code))
            )(
                requests.get(
                    "https://api.elevenlabs.io/v1/voices",
                    headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"]},
                    timeout=15,
                )
            ),
        )
    )
    checks.append(
        run_check(
            "HEYGEN_API_KEY",
            lambda: (False, "missing")
            if not has_value("HEYGEN_API_KEY")
            else (
                lambda r: (r.status_code == 200, str(r.status_code))
            )(
                requests.get(
                    "https://api.heygen.com/v2/avatars",
                    headers={"X-Api-Key": os.environ["HEYGEN_API_KEY"]},
                    timeout=15,
                )
            ),
        )
    )
    checks.append(
        run_check(
            "REPLICATE_API_KEY",
            lambda: (False, "missing")
            if not has_value("REPLICATE_API_KEY")
            else (
                lambda r: (r.status_code == 200, str(r.status_code))
            )(
                requests.get(
                    "https://api.replicate.com/v1/models",
                    headers={"Authorization": f"Token {os.environ['REPLICATE_API_KEY']}"},
                    timeout=15,
                )
            ),
        )
    )
    checks.append(
        run_check(
            "TWITTER_BEARER_TOKEN",
            lambda: (False, "missing")
            if not has_value("TWITTER_BEARER_TOKEN")
            else (
                lambda r: (r.status_code == 200, str(r.status_code))
            )(
                requests.get(
                    "https://api.twitter.com/2/users/me",
                    headers={"Authorization": f"Bearer {os.environ['TWITTER_BEARER_TOKEN']}"},
                    timeout=15,
                )
            ),
        )
    )
    checks.append(
        run_check(
            "YOUTUBE_API_KEY",
            lambda: (False, "missing")
            if not has_value("YOUTUBE_API_KEY")
            else (
                lambda r: (r.status_code == 200, str(r.status_code))
            )(
                requests.get(
                    "https://youtube.googleapis.com/youtube/v3/search",
                    params={
                        "part": "snippet",
                        "q": "ai automation",
                        "maxResults": 1,
                        "key": os.environ["YOUTUBE_API_KEY"],
                    },
                    timeout=15,
                )
            ),
        )
    )
    checks.append(
        run_check(
            "N8N_API_KEY",
            lambda: (False, "missing")
            if not has_value("N8N_API_KEY")
            else (
                lambda r: (r.status_code == 200, str(r.status_code))
            )(
                requests.get(
                    f"{os.environ.get('N8N_BASE_URL', '').rstrip('/')}/api/v1/workflows",
                    headers={"X-N8N-API-KEY": os.environ["N8N_API_KEY"]},
                    timeout=15,
                )
            ),
        )
    )
    checks.append(
        run_check(
            "STRIPE_SECRET_KEY",
            lambda: (False, "missing")
            if not has_value("STRIPE_SECRET_KEY")
            else (
                lambda r: (r.status_code == 200, str(r.status_code))
            )(
                requests.get(
                    "https://api.stripe.com/v1/balance",
                    auth=(os.environ["STRIPE_SECRET_KEY"], ""),
                    timeout=15,
                )
            ),
        )
    )
    checks.append(
        run_check(
            "BEEHIIV_API_KEY",
            lambda: (False, "missing")
            if not has_value("BEEHIIV_API_KEY")
            else (
                lambda r: (r.status_code == 200, str(r.status_code))
            )(
                requests.get(
                    "https://api.beehiiv.com/v2/publications",
                    headers={"Authorization": f"Bearer {os.environ['BEEHIIV_API_KEY']}"},
                    timeout=15,
                )
            ),
        )
    )
    checks.append(
        run_check(
            "VERCEL_TOKEN",
            lambda: (False, "missing")
            if not has_value("VERCEL_TOKEN")
            else (
                lambda r: (r.status_code == 200, str(r.status_code))
            )(
                requests.get(
                    "https://api.vercel.com/v9/projects",
                    headers={"Authorization": f"Bearer {os.environ['VERCEL_TOKEN']}"},
                    timeout=15,
                )
            ),
        )
    )

    ok_count = sum(1 for _, ok, _ in checks if ok)
    print(f"VALID {ok_count}/{len(checks)}")
    for name, ok, detail in checks:
        print(f"{name}: {'OK' if ok else 'FAIL'} ({detail})")


if __name__ == "__main__":
    main()
