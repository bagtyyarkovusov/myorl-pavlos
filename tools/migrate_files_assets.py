#!/usr/bin/env python3
"""Ingest the legacy MODX `files/` tree into Strapi v5's Media Library.

Walks the local source directory (default:
``/Users/bagtyyar/Downloads/public_html 2/files``) recursively, mirrors the
directory structure as Strapi upload folders, uploads every file, and extends
``asset_map.json`` with both the plain and URL-encoded legacy paths so the
HTML/TV rewriter in ``transform_data.py`` can resolve references such as
``/files/images/diseases/snoring/img1.jpg`` to the new Strapi URL.

Credentials are read from the process environment (populated via ``.env``):

    STRAPI_URL              required, Strapi origin (no trailing slash)
    STRAPI_TOKEN            required, API token used for `/api/upload`
    STRAPI_ADMIN_EMAIL      optional, admin email for folder creation
    STRAPI_ADMIN_PASSWORD   optional, admin password for folder creation

When admin credentials are present the script creates a mirrored folder tree
under Media Library root (matching the requested ``mirror_folders`` strategy).
When they are missing it logs a warning and degrades to a flat upload at the
root; asset_map keys still carry the original nested path, so filename
collisions (``img1.jpg`` in many sub-folders) remain deterministic downstream.

Re-runs are idempotent: existing ``asset_map.json`` keys short-circuit uploads
and cached folder ids in ``folder_id_map.json`` short-circuit folder creation.
Per-file failures are appended to ``files_ingest_errors.json`` and the script
continues; a summary is printed at exit.
"""

from __future__ import annotations

import argparse
import json
import logging
import mimetypes
import os
import sys
import urllib.parse
from dataclasses import dataclass
from pathlib import Path

from cms_audit import CHECKPOINT_SOURCE_DIR, MANIFESTS_DIR, MODX_SOURCE_DIR, REPORTS_DIR, ROOT
from typing import Any

import requests

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = Path("/Users/bagtyyar/Downloads/public_html 2/files")
ASSET_MAP_PATH = CHECKPOINT_SOURCE_DIR / "asset_map.json"
FOLDER_MAP_PATH = CHECKPOINT_SOURCE_DIR / "folder_id_map.json"
ERRORS_PATH = REPORTS_DIR / "files_ingest_errors.json"

LOGGER = logging.getLogger("migrate_files_assets")


@dataclass
class Config:
    source: Path
    strapi_url: str
    api_token: str
    admin_email: str | None
    admin_password: str | None
    dry_run: bool


def _load_env_file(path: Path) -> None:
    """Populate ``os.environ`` from a ``.env`` file if present.

    We intentionally avoid adding a third-party dep (``python-dotenv``) since
    the rest of the pipeline already works without one.
    """
    if not path.exists():
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


def _parse_args() -> Config:
    parser = argparse.ArgumentParser(
        description="Upload legacy files/ tree into Strapi Media Library.",
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=DEFAULT_SOURCE,
        help=f"Local files/ directory to ingest (default: {DEFAULT_SOURCE})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the planned uploads without mutating Strapi or asset_map.json.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable DEBUG logging.",
    )
    args = parser.parse_args()

    _load_env_file(ROOT / ".env")

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    strapi_url = (os.environ.get("STRAPI_URL") or "").rstrip("/")
    api_token = os.environ.get("STRAPI_TOKEN") or ""
    if not strapi_url:
        parser.error("STRAPI_URL is required (set in .env or env)")
    if not api_token and not args.dry_run:
        parser.error("STRAPI_TOKEN is required for non-dry-run mode")

    if not args.source.exists():
        parser.error(f"source directory does not exist: {args.source}")

    return Config(
        source=args.source,
        strapi_url=strapi_url,
        api_token=api_token,
        admin_email=os.environ.get("STRAPI_ADMIN_EMAIL") or None,
        admin_password=os.environ.get("STRAPI_ADMIN_PASSWORD") or None,
        dry_run=args.dry_run,
    )


def _load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        LOGGER.error("cannot parse %s: %s", path, exc)
        return default


def _save_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


class AdminSession:
    """Optional admin JWT session used only to create folders."""

    def __init__(self, cfg: Config) -> None:
        self.cfg = cfg
        self.jwt: str | None = None
        self.enabled = False

    def login(self) -> bool:
        if not (self.cfg.admin_email and self.cfg.admin_password):
            LOGGER.warning(
                "STRAPI_ADMIN_EMAIL / STRAPI_ADMIN_PASSWORD not set - folders will "
                "not be created in the Media Library (flat upload fallback).",
            )
            return False
        if self.cfg.dry_run:
            LOGGER.info("[dry-run] skipping admin login (%s)", self.cfg.admin_email)
            self.enabled = True
            return True
        try:
            response = requests.post(
                f"{self.cfg.strapi_url}/admin/login",
                json={"email": self.cfg.admin_email, "password": self.cfg.admin_password},
                timeout=30,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            LOGGER.error("admin login failed (%s); falling back to flat upload", exc)
            return False
        data = response.json().get("data") or {}
        token = data.get("token")
        if not token:
            LOGGER.error("admin login response missing token; falling back to flat upload")
            return False
        self.jwt = token
        self.enabled = True
        LOGGER.info("admin login ok")
        return True

    def headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.jwt}"} if self.jwt else {}


class FolderCache:
    """Ensures Strapi folders exist for a given relative path, caches ids."""

    def __init__(self, cfg: Config, admin: AdminSession, cache: dict[str, int]) -> None:
        self.cfg = cfg
        self.admin = admin
        self.cache = cache  # key: POSIX path relative to source, value: folder id

    def ensure(self, rel_path: str) -> int | None:
        """Return a Strapi folder id for the given relative path.

        ``rel_path`` uses forward slashes and never starts with ``/``. Root is
        represented by the empty string and maps to ``None``.
        """
        if not self.admin.enabled:
            return None
        if not rel_path:
            return None
        if rel_path in self.cache:
            return self.cache[rel_path]

        parent_rel, _, name = rel_path.rpartition("/")
        parent_id = self.ensure(parent_rel) if parent_rel else None

        if self.cfg.dry_run:
            stub_id = 900000 + len(self.cache)
            self.cache[rel_path] = stub_id
            LOGGER.info("[dry-run] would create folder %s (parent=%s)", rel_path, parent_id)
            return stub_id

        existing = self._find_folder(name=name, parent_id=parent_id)
        if existing is not None:
            self.cache[rel_path] = existing
            return existing

        created = self._create_folder(name=name, parent_id=parent_id)
        self.cache[rel_path] = created
        _save_json(FOLDER_MAP_PATH, self.cache)
        return created

    def _find_folder(self, *, name: str, parent_id: int | None) -> int | None:
        params: list[tuple[str, str]] = [
            ("filters[name][$eq]", name),
            ("pageSize", "100"),
        ]
        if parent_id is None:
            params.append(("filters[parent][id][$null]", "true"))
        else:
            params.append(("filters[parent][id][$eq]", str(parent_id)))
        try:
            response = requests.get(
                f"{self.cfg.strapi_url}/upload/folders",
                headers=self.admin.headers(),
                params=params,
                timeout=30,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            LOGGER.warning("folder lookup failed for %s: %s", name, exc)
            return None
        payload = response.json() or {}
        results = payload.get("data") or payload.get("results") or []
        for entry in results:
            # Strapi v5 admin returns folder dicts directly, not wrapped in
            # `attributes`, but we handle both shapes defensively.
            folder = entry.get("attributes") if "attributes" in entry else entry
            if folder.get("name") == name:
                return int(entry.get("id") or folder.get("id"))
        return None

    def _create_folder(self, *, name: str, parent_id: int | None) -> int:
        payload: dict[str, Any] = {"name": name, "parent": parent_id}
        response = requests.post(
            f"{self.cfg.strapi_url}/upload/folders",
            headers={**self.admin.headers(), "Content-Type": "application/json"},
            data=json.dumps(payload),
            timeout=30,
        )
        response.raise_for_status()
        body = response.json() or {}
        data = body.get("data") or body
        folder_id = data.get("id") or (data.get("attributes") or {}).get("id")
        if not folder_id:
            raise RuntimeError(f"folder creation returned no id: {body}")
        LOGGER.info("created folder %s (id=%s, parent=%s)", name, folder_id, parent_id)
        return int(folder_id)


def _asset_map_keys(rel_posix: str) -> list[str]:
    """Return the map keys we want to register for a given legacy rel path.

    Matches the precedent set by existing ``uploads/<name>`` entries in
    [asset_map.json] which register both the raw and URL-encoded variants so
    the HTML rewriter resolves either form.
    """
    plain = f"files/{rel_posix}"
    encoded = f"files/{urllib.parse.quote(rel_posix, safe='/')}"
    keys = [plain]
    if encoded != plain:
        keys.append(encoded)
    return keys


def _find_existing_upload(
    cfg: Config, *, name: str, folder_id: int | None
) -> dict[str, Any] | None:
    """Check whether a file already exists under the given Strapi folder."""
    if cfg.dry_run:
        return None
    params: list[tuple[str, str]] = [
        ("filters[name][$eq]", name),
        ("pagination[pageSize]", "50"),
    ]
    if folder_id is None:
        params.append(("filters[folder][id][$null]", "true"))
    else:
        params.append(("filters[folder][id][$eq]", str(folder_id)))
    try:
        response = requests.get(
            f"{cfg.strapi_url}/api/upload/files",
            headers={"Authorization": f"Bearer {cfg.api_token}"},
            params=params,
            timeout=30,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        LOGGER.debug("duplicate lookup failed for %s: %s", name, exc)
        return None
    payload = response.json()
    results = payload if isinstance(payload, list) else payload.get("results") or []
    for entry in results:
        if entry.get("name") == name:
            return entry
    return None


def _upload_file(
    cfg: Config,
    *,
    local_path: Path,
    filename: str,
    folder_id: int | None,
) -> dict[str, Any]:
    """Upload a file to Strapi or return a dry-run stub."""
    if cfg.dry_run:
        stub_id = 800000 + hash(str(local_path)) % 100000
        return {
            "id": stub_id,
            "url": f"/uploads/{filename}",
            "name": filename,
        }

    content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    file_info: dict[str, Any] = {"name": filename}
    if folder_id is not None:
        file_info["folder"] = folder_id

    with local_path.open("rb") as handle:
        files = {"files": (filename, handle, content_type)}
        data = {"fileInfo": json.dumps(file_info)}
        response = requests.post(
            f"{cfg.strapi_url}/api/upload",
            headers={"Authorization": f"Bearer {cfg.api_token}"},
            files=files,
            data=data,
            timeout=300,
        )
    if response.status_code not in (200, 201):
        raise RuntimeError(
            f"upload failed {response.status_code}: {response.text[:500]}"
        )
    payload = response.json()
    if isinstance(payload, list) and payload:
        record = payload[0]
        return {
            "id": record["id"],
            "url": record["url"],
            "name": record.get("name") or filename,
        }
    raise RuntimeError(f"unexpected upload response: {payload!r}")


def _iter_source_files(root: Path) -> list[tuple[Path, str]]:
    """Enumerate (absolute_path, rel_posix) for every file under ``root``."""
    entries: list[tuple[Path, str]] = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]
        for name in filenames:
            if name.startswith("."):
                continue
            abs_path = Path(dirpath) / name
            try:
                if abs_path.stat().st_size == 0:
                    LOGGER.warning("skipping zero-byte file %s", abs_path)
                    continue
            except OSError as exc:
                LOGGER.warning("cannot stat %s: %s", abs_path, exc)
                continue
            rel = abs_path.relative_to(root).as_posix()
            entries.append((abs_path, rel))
    entries.sort(key=lambda pair: pair[1])
    return entries


def main() -> int:
    cfg = _parse_args()

    asset_map: dict[str, dict[str, Any]] = _load_json(ASSET_MAP_PATH, {})
    folder_cache: dict[str, int] = _load_json(FOLDER_MAP_PATH, {})
    errors: list[dict[str, Any]] = _load_json(ERRORS_PATH, [])

    admin = AdminSession(cfg)
    admin.login()
    folders = FolderCache(cfg, admin, folder_cache)

    entries = _iter_source_files(cfg.source)
    LOGGER.info(
        "scanning %s: %d files to consider (admin_folders=%s, dry_run=%s)",
        cfg.source,
        len(entries),
        admin.enabled,
        cfg.dry_run,
    )

    uploaded = 0
    skipped = 0
    failed = 0

    for abs_path, rel_posix in entries:
        keys = _asset_map_keys(rel_posix)
        if all(key in asset_map for key in keys):
            skipped += 1
            LOGGER.debug("skip (already mapped): %s", rel_posix)
            continue

        filename = abs_path.name
        parent_rel = rel_posix.rsplit("/", 1)[0] if "/" in rel_posix else ""
        try:
            folder_id = folders.ensure(parent_rel) if parent_rel else None
        except Exception as exc:  # noqa: BLE001 - we want to keep going
            LOGGER.error("folder ensure failed for %s: %s", parent_rel, exc)
            errors.append(
                {"path": rel_posix, "stage": "folder", "error": str(exc)}
            )
            folder_id = None

        existing = _find_existing_upload(cfg, name=filename, folder_id=folder_id)
        if existing is not None:
            info = {
                "id": existing["id"],
                "url": existing["url"],
                "name": existing.get("name") or filename,
            }
            LOGGER.info("reuse %s -> id=%s", rel_posix, info["id"])
            for key in keys:
                asset_map[key] = info
            skipped += 1
            _save_json(ASSET_MAP_PATH, asset_map)
            continue

        try:
            info = _upload_file(
                cfg,
                local_path=abs_path,
                filename=filename,
                folder_id=folder_id,
            )
        except Exception as exc:  # noqa: BLE001 - log and continue per plan
            LOGGER.error("upload failed for %s: %s", rel_posix, exc)
            errors.append(
                {"path": rel_posix, "stage": "upload", "error": str(exc)}
            )
            failed += 1
            continue

        for key in keys:
            asset_map[key] = info
        uploaded += 1

        if not cfg.dry_run and uploaded % 25 == 0:
            _save_json(ASSET_MAP_PATH, asset_map)
            LOGGER.info("checkpoint: %d uploaded so far", uploaded)

    if cfg.dry_run:
        LOGGER.info(
            "[dry-run] summary: would upload=%d skip=%d fail=%d",
            uploaded,
            skipped,
            failed,
        )
    else:
        _save_json(ASSET_MAP_PATH, asset_map)
    _save_json(FOLDER_MAP_PATH, folder_cache)
    if errors:
        _save_json(ERRORS_PATH, errors)
        LOGGER.warning("%d errors logged to %s", len(errors), ERRORS_PATH)

    LOGGER.info(
        "done: uploaded=%d skipped=%d failed=%d total_map_entries=%d",
        uploaded,
        skipped,
        failed,
        len(asset_map),
    )
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
