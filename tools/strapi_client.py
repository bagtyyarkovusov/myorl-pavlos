"""Thin HTTP client wrapping the Strapi v5 REST API.

Centralises auth, retries on transient 5xx failures, and JSON payload
handling. The importer is the only caller and must not issue raw HTTP
requests against Strapi directly so the safety controls stay in one place.
"""

from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib import error, parse, request

logger = logging.getLogger("strapi_client")

_CLI_ROOT = Path(__file__).resolve().parents[1]
_STRAPI_DOTENV_LOADED = False


def _read_dotenv_into_environ(path: Path) -> None:
    """Set ``os.environ`` keys from a ``.env`` file; never overrides existing vars."""

    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def _read_dotenv_fill_empty_keys(path: Path) -> None:
    """Set keys from ``path`` when ``os.environ`` has missing or empty values (root ``.env`` placeholders)."""

    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if not key:
            continue
        if not os.environ.get(key):
            os.environ[key] = value


def load_strapi_env_from_dotenv() -> None:
    """Load project-root ``.env`` then ``backend/.env`` for missing/empty keys (Strapi app env)."""

    global _STRAPI_DOTENV_LOADED
    if _STRAPI_DOTENV_LOADED:
        return
    _STRAPI_DOTENV_LOADED = True
    _read_dotenv_into_environ(_CLI_ROOT / ".env")
    _read_dotenv_fill_empty_keys(_CLI_ROOT / "backend" / ".env")

MAX_RETRIES = 3
DEBOUNCE_DELAY_MS = 500
BACKOFF_CAP_S = 30


@dataclass
class StrapiError(Exception):
    """Raised for any non-success Strapi response after retries are exhausted."""

    status: int
    url: str
    method: str
    body: str

    def __str__(self) -> str:  # noqa: D401
        return f"{self.method} {self.url} -> {self.status}: {self.body[:500]}"


class StrapiClient:
    """Minimal Strapi v5 client scoped to the importer's needs."""

    def __init__(
        self,
        base_url: str | None = None,
        token: str | None = None,
        *,
        dry_run: bool = False,
    ) -> None:
        load_strapi_env_from_dotenv()
        self.base_url = (base_url or os.environ.get("STRAPI_URL") or "").rstrip("/")
        self.token = token or os.environ.get("STRAPI_TOKEN")
        self.dry_run = dry_run
        # Every planned write call populates this list in dry-run mode; the
        # importer writes it to `dry_run_payloads.json` at the end of the run.
        self.dry_run_log: list[dict[str, Any]] = []
        if not self.base_url:
            raise RuntimeError("STRAPI_URL is required (pass base_url or set env)")
        if not dry_run and not self.token:
            raise RuntimeError("STRAPI_TOKEN is required for non-dry-run mode")

    # ------------------------------------------------------------------
    # Public surface
    # ------------------------------------------------------------------

    def get(self, path: str, **query: Any) -> dict[str, Any]:
        return self._request("GET", path, query=query)

    def post(self, path: str, payload: dict[str, Any], **query: Any) -> dict[str, Any]:
        return self._request("POST", path, payload=payload, query=query)

    def put(self, path: str, payload: dict[str, Any], **query: Any) -> dict[str, Any]:
        return self._request("PUT", path, payload=payload, query=query)

    def delete(self, path: str, **query: Any) -> dict[str, Any]:
        return self._request("DELETE", path, query=query)

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _build_url(self, path: str, query: dict[str, Any] | None) -> str:
        url = f"{self.base_url}{path}" if path.startswith("/") else f"{self.base_url}/{path}"
        if query:
            encoded = parse.urlencode({k: v for k, v in query.items() if v is not None})
            if encoded:
                url = f"{url}?{encoded}"
        return url

    def _request(
        self,
        method: str,
        path: str,
        *,
        payload: dict[str, Any] | None = None,
        query: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        url = self._build_url(path, query)
        body_bytes = (
            json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
        )

        if self.dry_run and method != "GET":
            self.dry_run_log.append(
                {"method": method, "url": url, "payload": payload}
            )
            logger.info("[dry-run] %s %s", method, url)
            stub_id = f"dry-run-{len(self.dry_run_log):04d}"
            return {"data": {"documentId": stub_id, "id": len(self.dry_run_log)}, "meta": {}}

        headers = {"Accept": "application/json"}
        if body_bytes is not None:
            headers["Content-Type"] = "application/json"
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        for attempt in range(1, MAX_RETRIES + 1):
            req = request.Request(url, data=body_bytes, method=method, headers=headers)
            try:
                with request.urlopen(req, timeout=60) as response:
                    raw = response.read()
                    return json.loads(raw) if raw else {}
            except error.HTTPError as exc:
                raw = exc.read().decode("utf-8", errors="replace")
                if 500 <= exc.code < 600 and attempt < MAX_RETRIES:
                    delay = min(
                        BACKOFF_CAP_S,
                        (DEBOUNCE_DELAY_MS / 1000.0) * (2 ** (attempt - 1)),
                    )
                    logger.warning(
                        "%s %s -> %s (attempt %s); retrying in %.2fs",
                        method,
                        url,
                        exc.code,
                        attempt,
                        delay,
                    )
                    time.sleep(delay)
                    continue
                raise StrapiError(status=exc.code, url=url, method=method, body=raw) from exc
            except error.URLError as exc:
                if attempt < MAX_RETRIES:
                    delay = min(
                        BACKOFF_CAP_S,
                        (DEBOUNCE_DELAY_MS / 1000.0) * (2 ** (attempt - 1)),
                    )
                    logger.warning("network error %s (attempt %s); retrying in %.2fs", exc, attempt, delay)
                    time.sleep(delay)
                    continue
                raise StrapiError(status=0, url=url, method=method, body=str(exc)) from exc

        raise StrapiError(status=0, url=url, method=method, body="retries exhausted")


__all__ = ["StrapiClient", "StrapiError", "load_strapi_env_from_dotenv"]
