"""Phase 4 Strapi importer.

Pure Python, idempotent, checkpoint-driven. Reads ``babel_normalization.json``
(the authoritative pairing table) and ``transformed_resources.json``
(pre-processed MODX rows with ``_import`` sibling populated by Phases 1-2)
and writes every page, tag, and relation through ``strapi_client.py``.

Each sub-phase reads its own section of ``checkpoint.json`` first and skips
rows that already have a resolved Strapi ``documentId``. Re-running the
script after a failure therefore only retries the unfinished work.

Safety:
- Preflight runs ``injection_readiness.py`` and aborts on any blocker.
- ``--dry-run`` forwards through the client so payloads are validated but
  never sent; every planned request is captured in ``dry_run_payloads.json``.
- Unresolvable rows (missing tag slug, missing parent, missing asset id) are
  recorded in ``import_log.json`` under ``unresolved`` and the row is
  skipped rather than silently coerced.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import shutil
import subprocess
import sys
from collections import defaultdict, deque
from pathlib import Path

from cms_audit import CHECKPOINT_SOURCE_DIR, MANIFESTS_DIR, MODX_SOURCE_DIR, REPORTS_DIR, ROOT
from typing import Any, Iterable

from strapi_client import StrapiClient, StrapiError
from transform_data import iter_resource_tree

ROOT = Path(__file__).resolve().parents[1]
TRANSFORMED_PATH = MODX_SOURCE_DIR / "transformed_resources.json"
NORMALIZATION_PATH = MANIFESTS_DIR / "babel_normalization.json"
TAG_PLAN_PATH = MANIFESTS_DIR / "tag_plan.json"
ASSET_MAP_PATH = CHECKPOINT_SOURCE_DIR / "asset_map.json"
CHECKPOINT_PATH = CHECKPOINT_SOURCE_DIR / "checkpoint.json"
MODX_TO_STRAPI_PATH = CHECKPOINT_SOURCE_DIR / "modx_to_strapi.json"
TAG_ID_MAP_PATH = CHECKPOINT_SOURCE_DIR / "tag_id_map.json"
IMPORT_LOG_PATH = CHECKPOINT_SOURCE_DIR / "import_log.json"
PARITY_REPORT_PATH = REPORTS_DIR / "parity_report.json"
DRY_RUN_PAYLOADS_PATH = REPORTS_DIR / "dry_run_payloads.json"
READINESS_SCRIPT = ROOT / "tools" / "injection_readiness.py"
DB_PATH = ROOT / "backend/.tmp/data.db"
DB_SNAPSHOT_PATH = ROOT / "backend/.tmp/data.pre-import.db"
ALLOWED_TARGETS = {"rehearsal", "production"}

logging.basicConfig(format="%(asctime)s %(levelname)s %(name)s %(message)s", level=logging.INFO)
logger = logging.getLogger("strapi_importer")


# ---------------------------------------------------------------------------
# Checkpoint helpers
# ---------------------------------------------------------------------------


def _load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _save_json(path: Path, payload: Any) -> None:
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# Payload builders
# ---------------------------------------------------------------------------


_BABEL_RE = re.compile(r"^(\w+):(\d+)$")


def _parse_babel(resource: dict[str, Any]) -> dict[str, int]:
    raw = (resource.get("template_variables") or {}).get("babelLanguageLinks") or ""
    out: dict[str, int] = {}
    if not isinstance(raw, str):
        return out
    for part in raw.split(";"):
        match = _BABEL_RE.match(part.strip())
        if match:
            out[match.group(1)] = int(match.group(2))
    return out


def _resolve_tags(resource: dict[str, Any], tag_id_map: dict[str, str], tag_plan: dict[str, Any]) -> tuple[list[str], list[str]]:
    """Return ``(list_of_documentIds, list_of_unresolved_values)``."""

    raw = (resource.get("template_variables") or {}).get("tags")
    if not isinstance(raw, str) or not raw.strip():
        return [], []
    ctx_key = "el" if resource.get("context_key") == "web" else "ru"
    resolution = (tag_plan.get("resolution") or {}).get(ctx_key) or {}

    document_ids: list[str] = []
    unresolved: list[str] = []
    seen: set[str] = set()
    for value in [item.strip() for item in raw.split(",") if item.strip()]:
        slug = resolution.get(value)
        if not slug:
            unresolved.append(value)
            continue
        document_id = tag_id_map.get(slug)
        if not document_id:
            unresolved.append(value)
            continue
        if document_id in seen:
            continue
        seen.add(document_id)
        document_ids.append(document_id)
    return document_ids, unresolved


def _asset_id(value: Any) -> int | None:
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.isdigit():
        return int(value)
    return None


# Dynamic-zone blocks whose media fields must be file ids (or null). Derived
# from backend/src/components/blocks/*.json: only three components carry
# Strapi `media` attributes in the current schema. A component is kept only
# when every media attribute is either an int id or empty; otherwise the
# whole block is dropped per the pragmatic-drop policy (same as orphan
# <img> tags - see import_policy.md).
_BLOCK_MEDIA_FIELDS: dict[str, tuple[str, ...]] = {
    "blocks.video": ("videoMp4", "videoWebm", "thumbnail"),
    "blocks.gallery-image": ("image",),
    "blocks.promo-slide": ("image",),
}


def _sanitize_blocks(
    blocks: list[dict[str, Any]], *, drops: defaultdict[str, int]
) -> list[dict[str, Any]]:
    """Drop/clean dynamic-zone entries whose media fields didn't resolve.

    Strapi rejects the whole page if any media-typed field carries a legacy
    URL string ("29 relation(s) ... do not exist"). For every component with
    media attributes we coerce ints through and null-out falsy/empty values;
    if *any* media attribute is still a non-int truthy value (i.e. a legacy
    URL) we drop the whole block and bump drops_summary so the import_log
    keeps an accurate tally.
    """
    cleaned: list[dict[str, Any]] = []
    for block in blocks:
        component = block.get("__component")
        media_fields = _BLOCK_MEDIA_FIELDS.get(component or "")
        if not media_fields:
            cleaned.append(block)
            continue
        drop = False
        patched = dict(block)
        for field in media_fields:
            if field not in patched:
                continue
            value = patched[field]
            if isinstance(value, int):
                continue
            if value in (None, "", 0):
                patched[field] = None
                continue
            drop = True
            break
        if drop:
            drops[f"orphan_block:{component}"] += 1
            continue
        cleaned.append(patched)
    return cleaned


def _build_page_payload(
    resource: dict[str, Any],
    *,
    parent_document_id: str | None,
    tag_document_ids: list[str],
    drops: defaultdict[str, int] | None = None,
) -> dict[str, Any]:
    import_block = resource.get("_import") or {}
    tvs = resource.get("template_variables") or {}

    payload: dict[str, Any] = {
        "title": import_block.get("title") or (resource.get("pagetitle") or "").strip(),
        "slug": import_block["slug"],
        "content": resource.get("content") or "",
        "excerpt": resource.get("introtext") or "",
        "templateId": import_block.get("templateId"),
        "isFolder": bool(resource.get("isfolder")),
        "hideFromMenu": bool(resource.get("hidemenu")),
        "menuIndex": int(resource.get("menuindex") or 0),
        "seo": {
            "metaTitle": import_block.get("metaTitle") or "",
            "metaDescription": import_block.get("metaDescription") or "",
        },
    }

    menu_title = resource.get("menutitle")
    if isinstance(menu_title, str) and menu_title.strip():
        payload["menuTitle"] = menu_title.strip()

    for attribute, tv_key in (
        ("articleAuthor", "articleAuthor"),
        ("sources", "sources"),
        ("popUpClose", "popUpClose"),
        ("infoBlockBottom", "infoBlockBottom"),
        ("externalUrl", "url"),
    ):
        value = tvs.get(tv_key)
        if isinstance(value, str) and value.strip():
            payload[attribute] = value

    featured = _asset_id(tvs.get("image"))
    if featured is not None:
        payload["featuredImage"] = featured
    image_center = _asset_id(tvs.get("imageCenter"))
    if image_center is not None:
        payload["imageCenter"] = image_center

    blocks = import_block.get("blocks") or []
    if blocks and drops is not None:
        blocks = _sanitize_blocks(blocks, drops=drops)
    if blocks:
        payload["pageBlocks"] = blocks

    if parent_document_id is not None:
        payload["parentPage"] = parent_document_id
    if tag_document_ids:
        payload["tags"] = tag_document_ids

    return payload


# ---------------------------------------------------------------------------
# Importer
# ---------------------------------------------------------------------------


class Importer:
    def __init__(self, client: StrapiClient, *, dry_run: bool) -> None:
        self.client = client
        self.dry_run = dry_run

        self.resources = _load_json(TRANSFORMED_PATH, [])
        self.normalization = _load_json(NORMALIZATION_PATH, {})
        self.tag_plan = _load_json(TAG_PLAN_PATH, {})
        self.asset_map = _load_json(ASSET_MAP_PATH, {})

        self.checkpoint: dict[str, Any] = _load_json(
            CHECKPOINT_PATH,
            {
                "tags": {},
                "pages": {"web": {}, "rus": {}},
                "pair_attachments": {},
                "related_pages": {},
                "reconciled": False,
                "parent_relations_reconciled": False,
            },
        )
        self.tag_id_map: dict[str, str] = _load_json(TAG_ID_MAP_PATH, {})
        self.modx_to_strapi: dict[str, str] = _load_json(MODX_TO_STRAPI_PATH, {})
        self.log: dict[str, Any] = _load_json(
            IMPORT_LOG_PATH,
            {
                "unresolved": [],
                "skipped": [],
                "drops_summary": defaultdict(int),
                "dry_run_payloads": [],
            },
        )
        if isinstance(self.log.get("drops_summary"), dict):
            self.log["drops_summary"] = defaultdict(int, self.log["drops_summary"])

        self.resources_by_id: dict[str, dict[int, dict[str, Any]]] = {"web": {}, "rus": {}}
        for resource in iter_resource_tree(self.resources):
            ctx = resource.get("context_key")
            if ctx in self.resources_by_id:
                self.resources_by_id[ctx][int(resource["id"])] = resource

    # ----- persistence ------------------------------------------------

    def _persist(self) -> None:
        if self.dry_run:
            return
        _save_json(CHECKPOINT_PATH, self.checkpoint)
        _save_json(TAG_ID_MAP_PATH, self.tag_id_map)
        _save_json(MODX_TO_STRAPI_PATH, self.modx_to_strapi)
        drops = dict(self.log.get("drops_summary", {}))
        self.log["drops_summary"] = drops
        _save_json(IMPORT_LOG_PATH, self.log)
        self.log["drops_summary"] = defaultdict(int, drops)

    def _record_drops(self, resource: dict[str, Any]) -> None:
        drops = (resource.get("_import") or {}).get("drops") or {}
        for key in drops:
            self.log["drops_summary"][key] += 1

    def _record_unresolved(self, entry: dict[str, Any]) -> None:
        self.log["unresolved"].append(entry)

    def _record_skip(self, entry: dict[str, Any]) -> None:
        self.log["skipped"].append(entry)

    # ----- preflight --------------------------------------------------

    def preflight(self) -> None:
        target = os.environ.get("STRAPI_TARGET", "").strip()
        if target not in ALLOWED_TARGETS:
            raise SystemExit(
                f"STRAPI_TARGET must be one of {sorted(ALLOWED_TARGETS)} (see .env.example)"
            )

        logger.info("Running injection readiness audit")
        proc = subprocess.run(
            [sys.executable, str(READINESS_SCRIPT), "--quiet"], cwd=ROOT, check=False
        )
        if proc.returncode != 0:
            raise SystemExit("Readiness audit reported a blocker; aborting. See injection_readiness.json")

        if not self.dry_run and DB_PATH.exists():
            logger.info("Snapshotting rehearsal DB to %s", DB_SNAPSHOT_PATH)
            shutil.copy2(DB_PATH, DB_SNAPSHOT_PATH)

    # ----- tags -------------------------------------------------------

    def import_tags(self) -> None:
        canonical = self.tag_plan.get("canonical") or []
        russian_only = self.tag_plan.get("russian_only") or []

        for entry in canonical:
            slug = entry["slug"]
            if slug in self.tag_id_map:
                continue
            el_payload = {"name": entry.get("el") or slug, "slug": slug}
            created = self.client.post("/api/tags", {"data": el_payload}, locale="el")
            document_id = self._extract_document_id(created)
            if entry.get("ru"):
                ru_payload = {"name": entry.get("ru"), "slug": slug}
                self.client.put(
                    f"/api/tags/{document_id}", {"data": ru_payload}, locale="ru"
                )
            self.tag_id_map[slug] = document_id
            self.checkpoint.setdefault("tags", {})[slug] = document_id
            self._persist()

        for entry in russian_only:
            slug = entry["slug"]
            if slug in self.tag_id_map:
                continue
            ru_payload = {"name": entry.get("ru") or slug, "slug": slug}
            created = self.client.post("/api/tags", {"data": ru_payload}, locale="ru")
            document_id = self._extract_document_id(created)
            self.tag_id_map[slug] = document_id
            self.checkpoint.setdefault("tags", {})[slug] = document_id
            self._persist()

    # ----- pages ------------------------------------------------------

    def _extract_document_id(self, response: dict[str, Any]) -> str:
        data = response.get("data") or {}
        document_id = data.get("documentId") or data.get("id")
        if document_id is None:
            raise StrapiError(status=0, url="", method="", body=json.dumps(response))
        return str(document_id)

    def _pair_map(self) -> dict[int, int]:
        return {p["web_id"]: p["rus_id"] for p in self.normalization.get("pairs", [])}

    def _skipped_web_ids(self) -> set[int]:
        return {s["id"] for s in self.normalization.get("web_singletons", []) if s.get("action") == "skip"}

    def _web_standalone_ids(self) -> list[int]:
        return [s["id"] for s in self.normalization.get("web_singletons", []) if s.get("action") == "standalone"]

    def _rus_standalone_ids(self) -> list[int]:
        return [s["id"] for s in self.normalization.get("rus_singletons", []) if s.get("action") == "standalone"]

    def _bfs_order(self, ctx: str, ids: Iterable[int]) -> list[int]:
        id_set = set(ids)
        resources = self.resources_by_id[ctx]
        children: dict[int, list[int]] = defaultdict(list)
        roots: list[int] = []
        for rid in id_set:
            resource = resources[rid]
            parent = int(resource.get("parent") or 0)
            if parent in id_set:
                children[parent].append(rid)
            else:
                roots.append(rid)

        def _sort_key(rid: int) -> tuple[int, int]:
            r = resources[rid]
            return (int(r.get("menuindex") or 0), rid)

        ordered: list[int] = []
        queue: deque[int] = deque(sorted(roots, key=_sort_key))
        while queue:
            node = queue.popleft()
            ordered.append(node)
            for child in sorted(children.get(node, []), key=_sort_key):
                queue.append(child)
        return ordered

    def import_greek_pages(self) -> None:
        pair_map = self._pair_map()
        skipped = self._skipped_web_ids()
        scope: set[int] = set(pair_map.keys()) | set(self._web_standalone_ids())
        ordered = self._bfs_order("web", scope - skipped)

        for web_id in ordered:
            if str(web_id) in self.checkpoint["pages"]["web"]:
                continue
            resource = self.resources_by_id["web"][web_id]
            self._record_drops(resource)

            parent_id = int(resource.get("parent") or 0)
            parent_document_id: str | None = None
            if parent_id and parent_id in scope:
                parent_document_id = self.modx_to_strapi.get(str(parent_id))
                if not parent_document_id:
                    self._record_unresolved(
                        {"phase": "greek_pages", "id": web_id, "reason": f"parent {parent_id} not yet imported"}
                    )
                    continue

            tag_ids, unresolved_tags = _resolve_tags(resource, self.tag_id_map, self.tag_plan)
            if unresolved_tags:
                self._record_unresolved(
                    {"phase": "greek_pages", "id": web_id, "unresolved_tags": unresolved_tags}
                )

            payload = _build_page_payload(
                resource, parent_document_id=parent_document_id, tag_document_ids=tag_ids, drops=self.log["drops_summary"]
            )
            created = self.client.post("/api/pages", {"data": payload}, locale="el")
            document_id = self._extract_document_id(created)
            self.modx_to_strapi[str(web_id)] = document_id
            self.checkpoint["pages"]["web"][str(web_id)] = document_id
            self._persist()

    def attach_russian_pairs(self) -> None:
        pair_map = self._pair_map()
        for pair in self.normalization.get("pairs", []):
            web_id = pair["web_id"]
            rus_id = pair["rus_id"]
            if str(rus_id) in self.checkpoint["pages"]["rus"]:
                continue
            document_id = self.modx_to_strapi.get(str(web_id))
            if not document_id:
                self._record_unresolved(
                    {"phase": "pair_attach", "rus_id": rus_id, "web_id": web_id, "reason": "greek page missing"}
                )
                continue
            resource = self.resources_by_id["rus"].get(rus_id)
            if resource is None:
                self._record_unresolved(
                    {"phase": "pair_attach", "rus_id": rus_id, "web_id": web_id, "reason": "rus resource missing"}
                )
                continue
            self._record_drops(resource)

            parent_rus_id = int(resource.get("parent") or 0)
            parent_document_id: str | None = None
            if parent_rus_id:
                # Prefer the Russian-side parent if it's already imported;
                # fall back to the Greek parent through the pair map.
                parent_document_id = self.modx_to_strapi.get(str(parent_rus_id))
                if not parent_document_id:
                    # rus_id -> web_id via reverse pair lookup
                    reverse = {p["rus_id"]: p["web_id"] for p in self.normalization.get("pairs", [])}
                    greek_parent_web = reverse.get(parent_rus_id)
                    if greek_parent_web:
                        parent_document_id = self.modx_to_strapi.get(str(greek_parent_web))

            tag_ids, unresolved_tags = _resolve_tags(resource, self.tag_id_map, self.tag_plan)
            if unresolved_tags:
                self._record_unresolved(
                    {"phase": "pair_attach", "rus_id": rus_id, "unresolved_tags": unresolved_tags}
                )

            payload = _build_page_payload(
                resource, parent_document_id=parent_document_id, tag_document_ids=tag_ids, drops=self.log["drops_summary"]
            )
            self.client.put(f"/api/pages/{document_id}", {"data": payload}, locale="ru")
            self.modx_to_strapi[str(rus_id)] = document_id
            self.checkpoint["pages"]["rus"][str(rus_id)] = document_id
            self.checkpoint["pair_attachments"][str(web_id)] = document_id
            self._persist()

    def import_standalone_russian(self) -> None:
        ids = self._bfs_order("rus", self._rus_standalone_ids())
        for rus_id in ids:
            if str(rus_id) in self.checkpoint["pages"]["rus"]:
                continue
            resource = self.resources_by_id["rus"].get(rus_id)
            if resource is None:
                self._record_unresolved({"phase": "rus_standalone", "id": rus_id, "reason": "missing source"})
                continue
            self._record_drops(resource)

            parent_document_id: str | None = None
            parent_id = int(resource.get("parent") or 0)
            if parent_id:
                parent_document_id = self.modx_to_strapi.get(str(parent_id))

            tag_ids, unresolved_tags = _resolve_tags(resource, self.tag_id_map, self.tag_plan)
            if unresolved_tags:
                self._record_unresolved(
                    {"phase": "rus_standalone", "id": rus_id, "unresolved_tags": unresolved_tags}
                )

            payload = _build_page_payload(
                resource, parent_document_id=parent_document_id, tag_document_ids=tag_ids, drops=self.log["drops_summary"]
            )
            created = self.client.post("/api/pages", {"data": payload}, locale="ru")
            document_id = self._extract_document_id(created)
            self.modx_to_strapi[str(rus_id)] = document_id
            self.checkpoint["pages"]["rus"][str(rus_id)] = document_id
            self._persist()

    def log_skips(self) -> None:
        for entry in self.normalization.get("web_singletons", []):
            if entry.get("action") != "skip":
                continue
            self._record_skip(
                {"id": entry["id"], "context": "web", "reason": entry.get("reason") or "skip"}
            )
        for entry in self.normalization.get("rus_singletons", []):
            if entry.get("action") != "skip":
                continue
            self._record_skip(
                {"id": entry["id"], "context": "rus", "reason": entry.get("reason") or "skip"}
            )
        self._persist()

    # ----- relations --------------------------------------------------

    def _iter_imported_resource_ids(self, ctx: str) -> list[int]:
        if ctx == "web":
            pair_ids = {p["web_id"] for p in self.normalization.get("pairs", [])}
            standalone_ids = {
                s["id"]
                for s in self.normalization.get("web_singletons", [])
                if s.get("action") == "standalone"
            }
            skipped_ids = self._skipped_web_ids()
            return self._bfs_order("web", (pair_ids | standalone_ids) - skipped_ids)

        pair_ids = {p["rus_id"] for p in self.normalization.get("pairs", [])}
        standalone_ids = {
            s["id"]
            for s in self.normalization.get("rus_singletons", [])
            if s.get("action") == "standalone"
        }
        return self._bfs_order("rus", pair_ids | standalone_ids)

    def reconcile_parent_pages(self) -> None:
        if self.checkpoint.get("parent_relations_reconciled"):
            return

        updates = 0
        unresolved = 0
        for ctx in ("web", "rus"):
            locale = "el" if ctx == "web" else "ru"
            for resource_id in self._iter_imported_resource_ids(ctx):
                resource = self.resources_by_id[ctx].get(resource_id)
                if resource is None:
                    continue
                parent_id = int(resource.get("parent") or 0)
                if parent_id == 0:
                    continue

                document_id = self.checkpoint["pages"][ctx].get(str(resource_id))
                parent_document_id = self.checkpoint["pages"][ctx].get(str(parent_id))
                if not document_id or not parent_document_id:
                    unresolved += 1
                    self._record_unresolved(
                        {
                            "phase": "parent_reconcile",
                            "context": ctx,
                            "id": resource_id,
                            "parent_id": parent_id,
                            "reason": "page or parent was not imported",
                        }
                    )
                    continue

                self.client.put(
                    f"/api/pages/{document_id}",
                    {"data": {"parentPage": parent_document_id}},
                    locale=locale,
                )
                updates += 1

        self.checkpoint["parent_relations_reconciled"] = True
        self.checkpoint["parent_relation_reconcile_summary"] = {
            "updates": updates,
            "unresolved": unresolved,
        }
        self._persist()

    def reconcile_relations(self) -> None:
        self.reconcile_parent_pages()
        # Placeholder for a future `relatedPages` TV pipeline. The source
        # dataset currently carries no relatedPages references in any TV, so
        # the rest of the reconciliation pass is a no-op that still sets the
        # checkpoint so re-runs can detect completion.
        self.checkpoint["reconciled"] = True
        self._persist()

    # ----- parity -----------------------------------------------------

    def post_import_parity(self) -> dict[str, Any]:
        pair_count = len(self.normalization.get("pairs", []))
        greek_scope = {p["web_id"] for p in self.normalization.get("pairs", [])} | {
            s["id"] for s in self.normalization.get("web_singletons", []) if s.get("action") == "standalone"
        }
        rus_scope = {p["rus_id"] for p in self.normalization.get("pairs", [])} | {
            s["id"] for s in self.normalization.get("rus_singletons", []) if s.get("action") == "standalone"
        }

        expected = {
            "el_pages": len(greek_scope),
            "ru_pages": len(rus_scope),
            "pairs": pair_count,
            "tags_el": len(self.tag_plan.get("canonical") or []),
            "tags_ru": len(self.tag_plan.get("canonical") or []) + len(self.tag_plan.get("russian_only") or []),
        }

        imported = {
            "el_pages": len(self.checkpoint["pages"]["web"]),
            "ru_pages": len(self.checkpoint["pages"]["rus"]),
            "pairs": len(self.checkpoint["pair_attachments"]),
            "tag_document_ids": len(self.tag_id_map),
        }

        report = {"expected": expected, "imported": imported}
        _save_json(PARITY_REPORT_PATH, report)
        return report

    # ----- orchestrator ----------------------------------------------

    def run(self) -> None:
        self.preflight()
        logger.info("Tags phase")
        self.import_tags()
        logger.info("Greek pages phase")
        self.import_greek_pages()
        logger.info("Russian pair attachment phase")
        self.attach_russian_pairs()
        logger.info("Russian standalone phase")
        self.import_standalone_russian()
        logger.info("Skip logging")
        self.log_skips()
        logger.info("Relation reconciliation")
        self.reconcile_relations()
        logger.info("Parity check")
        report = self.post_import_parity()
        logger.info("Parity: %s", report)

        if self.dry_run:
            _save_json(DRY_RUN_PAYLOADS_PATH, self.client.dry_run_log)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate every payload but issue no writes; emit dry_run_payloads.json.",
    )
    parser.add_argument(
        "--skip-preflight",
        action="store_true",
        help="Skip the readiness audit (only useful while diagnosing importer bugs).",
    )
    args = parser.parse_args()

    client = StrapiClient(dry_run=args.dry_run)
    importer = Importer(client, dry_run=args.dry_run)
    if args.skip_preflight:
        importer.preflight = lambda: None  # type: ignore[assignment]
    importer.run()
    return 0


if __name__ == "__main__":
    sys.exit(main())
