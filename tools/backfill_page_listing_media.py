#!/usr/bin/env python3
"""Generate (and optionally apply) a plan to backfill missing page listing media.

Links ``featuredImage`` on published pages that lack both ``featuredImage`` and
``imageCenter`` but appear in directory listings or other high-visibility grids.

Usage:
  python tools/backfill_page_listing_media.py
  python tools/backfill_page_listing_media.py --apply
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PLAN_PATH = ROOT / "tools/data/manual-repairs/page-listing-media-backfill-plan.json"
DEFAULT_RESULT_PATH = ROOT / "tools/data/manual-repairs/page-listing-media-backfill-result.json"
STRAPI_PLAN_PATH = ROOT / "backend/.tmp/page-listing-media-backfill-plan.json"
STRAPI_RESULT_PATH = ROOT / "backend/.tmp/page-listing-media-backfill-result.json"
POSTGRES_CONTAINER = "myorl-pg"

# Curated mappings from audit + legacy asset_map. fileId must exist in Strapi files.
BACKFILL_TARGETS: tuple[dict[str, Any], ...] = (
    {
        "documentId": "nkgl6v5e8j0u9d9hnodffo12",
        "locales": ("el", "ru"),
        "slug": "skoliosi-rinikou-diafragmatos-stravo-dafragma",
        "fileId": 1739,
        "reason": "Septum deviation hub — directory thumbnail on /pathiseis",
    },
    {
        "documentId": "t5p48kwy6ynfbuzbxtb3lcyi",
        "locales": ("el",),
        "slug": "parotida-ypognathios-adenas",
        "fileId": 1640,
        "reason": "Parotid gland hub — directory thumbnail on /pathiseis",
    },
    {
        "documentId": "m6h1i32tqtq3s25uc0k9y4yz",
        "locales": ("el",),
        "slug": "preauricular-cyst",
        "fileId": 1799,
        "reason": "Preauricular cyst article — directory thumbnail on /pathiseis",
    },
    {
        "documentId": "xol5hvue3ppy26k6y966scr9",
        "locales": ("ru",),
        "slug": "roxalito-kai-apnoia",
        "fileId": 2227,
        "reason": "Snoring/apnea hub — RU directory thumbnail on /pathiseis",
    },
    {
        "documentId": "n3ryx3cfn7jvdofsw0ktycle",
        "locales": ("el",),
        "slug": "blepharoplasty",
        "fileId": 1988,
        "reason": "Blepharoplasty hub — directory thumbnail on face surgery index",
    },
    {
        "documentId": "mals56qxfw1ckzcm9jm3kq1j",
        "locales": ("ru",),
        "slug": "blefaroplastika-plastika-glaz",
        "fileId": 1988,
        "reason": "Blepharoplasty hub — RU directory thumbnail on face surgery index",
    },
    {
        "documentId": "oonn5dhu645e9usec4bu1lbh",
        "locales": ("el",),
        "slug": "endoskopiki-kryoxeirourgiki",
        "fileId": 1450,
        "reason": "Endoscopic cryosurgery article — directory thumbnail on surgery index",
    },
    {
        "documentId": "xa2ye9997t98whtp0gjc555t",
        "locales": ("el",),
        "slug": "skoliosi-rinikou-diafragmatos-stravo-diafragma-1",
        "fileId": 1464,
        "reason": "Septum deviation article under hub",
    },
    {
        "documentId": "unknown-eutheiasmos-el",
        "locales": ("el",),
        "slug": "eutheiasmos-rinikou-diafragmatos",
        "fileId": 1464,
        "reason": "Nasal septum article under septum hub",
    },
    {
        "documentId": "unknown-eutheiasmos-ru",
        "locales": ("ru",),
        "slug": "eutheiasmos-rinikou-diafragmatos",
        "fileId": 1464,
        "reason": "Nasal septum article under septum hub",
    },
    {
        "documentId": "unknown-diafragma-laser-el",
        "locales": ("el",),
        "slug": "diafragma-me-laser",
        "fileId": 1448,
        "reason": "Laser septum article under septum hub",
    },
    {
        "documentId": "unknown-diafragma-laser-ru",
        "locales": ("ru",),
        "slug": "diafragma-me-laser",
        "fileId": 1448,
        "reason": "Laser septum article under septum hub",
    },
    {
        "documentId": "lmnz0a5bqobf5nhrp17pckz6",
        "locales": ("el", "ru"),
        "slug": "diafragma-syxnes-erwtiseis-apantiseis",
        "fileId": 1464,
        "reason": "Septum FAQ article under hub",
    },
    {
        "documentId": "xa2ye9997t98whtp0gjc555t",
        "locales": ("ru",),
        "slug": "skoliosi-rinikou-diafragmatos-stravo-diafragma-1",
        "fileId": 1464,
        "reason": "Septum deviation article under hub (RU locale)",
    },
)


def psql_scalar(query: str) -> str:
    raw = subprocess.check_output(
        [
            "docker",
            "exec",
            POSTGRES_CONTAINER,
            "psql",
            "-U",
            "strapi",
            "-d",
            "strapi",
            "-At",
            "-c",
            query,
        ],
        text=True,
    ).strip()
    return raw


def psql_json(query: str) -> Any:
    raw = psql_scalar(query)
    if not raw:
        return []
    return json.loads(raw)


def page_row(slug: str, locale: str) -> dict[str, Any] | None:
    rows = psql_json(
        f"""
        SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
        FROM (
          SELECT
            p.id,
            p.document_id,
            p.locale,
            p.slug,
            (p.published_at IS NOT NULL) AS has_published,
            EXISTS (
              SELECT 1 FROM files_related_mph fr
              WHERE fr.related_id = p.id
                AND fr.related_type = 'api::page.page'
                AND fr.field IN ('featuredImage', 'imageCenter')
            ) AS has_listing_media
          FROM pages p
          WHERE p.slug = '{slug.replace("'", "''")}'
            AND p.locale = '{locale.replace("'", "''")}'
          ORDER BY (p.published_at IS NOT NULL) DESC, p.id DESC
          LIMIT 1
        ) t;
        """
    )
    return rows[0] if rows else None


def file_exists(file_id: int) -> bool:
    return psql_scalar(f"SELECT EXISTS (SELECT 1 FROM files WHERE id = {int(file_id)});") == "t"


def build_plan() -> dict[str, Any]:
    planned_updates: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []

    for target in BACKFILL_TARGETS:
        file_id = int(target["fileId"])
        if not file_exists(file_id):
            errors.append(
                {
                    "slug": target["slug"],
                    "locales": list(target["locales"]),
                    "error": f"fileId {file_id} not found in files table",
                }
            )
            continue

        for locale in target["locales"]:
            row = page_row(target["slug"], locale)
            if not row:
                errors.append(
                    {"slug": target["slug"], "locale": locale, "error": "page not found"}
                )
                continue
            if row["has_listing_media"]:
                skipped.append(
                    {
                        "documentId": row["document_id"],
                        "locale": locale,
                        "slug": target["slug"],
                        "reason": "already has listing media",
                    }
                )
                continue

            planned_updates.append(
                {
                    "documentId": row["document_id"],
                    "locale": locale,
                    "slug": target["slug"],
                    "hasPublished": bool(row["has_published"]),
                    "repairKind": "page-listing-media-backfill",
                    "itemCount": 1,
                    "reason": target["reason"],
                    "payload": {"featuredImage": file_id},
                }
            )

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "plannedCount": len(planned_updates),
            "skippedCount": len(skipped),
            "errorCount": len(errors),
        },
        "plannedUpdates": planned_updates,
        "skipped": skipped,
        "errors": errors,
    }


def apply_plan(plan_path: Path, result_path: Path) -> None:
    STRAPI_PLAN_PATH.parent.mkdir(parents=True, exist_ok=True)
    STRAPI_PLAN_PATH.write_text(plan_path.read_text(encoding="utf-8"), encoding="utf-8")

    subprocess.run(
        [
            "docker",
            "exec",
            "myorl-strapi-dev",
            "node",
            "scripts/apply-accordion-repair-plan.js",
            "--plan",
            ".tmp/page-listing-media-backfill-plan.json",
            "--result",
            ".tmp/page-listing-media-backfill-result.json",
        ],
        cwd=ROOT / "backend",
        check=True,
    )

    if STRAPI_RESULT_PATH.exists():
        result_path.parent.mkdir(parents=True, exist_ok=True)
        result_path.write_text(STRAPI_RESULT_PATH.read_text(encoding="utf-8"), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", type=Path, default=DEFAULT_PLAN_PATH)
    parser.add_argument("--result", type=Path, default=DEFAULT_RESULT_PATH)
    parser.add_argument("--apply", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    plan = build_plan()
    args.plan.parent.mkdir(parents=True, exist_ok=True)
    args.plan.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    summary = plan["summary"]
    print(
        f"Plan written to {args.plan}: "
        f"{summary['plannedCount']} page(s) to update, "
        f"{summary['skippedCount']} skipped, "
        f"{summary['errorCount']} error(s)."
    )
    for entry in plan["plannedUpdates"]:
        print(f"  - {entry['locale']}/{entry['slug']} -> featuredImage={entry['payload']['featuredImage']}")
    for entry in plan["errors"]:
        print(f"  ! {entry}")

    if args.apply:
        if summary["plannedCount"] == 0:
            print("Nothing to apply.")
            return 0
        apply_plan(args.plan, args.result)
        print(f"Apply result written to {args.result}")

    return 0 if summary["errorCount"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
