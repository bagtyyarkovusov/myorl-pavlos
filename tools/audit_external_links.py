"""HEAD-check every external link found by audit_nextjs_content_hygiene.py.

Extracts external links from the Strapi SQLite database (or from a prior
hygiene audit JSON report), HEAD-checks each one with concurrency=10,
classifies by HTTP status, and writes a markdown report grouped by
status x page.  A launch-gate threshold exits non-zero when broken-link
count exceeds the configured ceiling.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx

from audit_nextjs_content_hygiene import (
    DEFAULT_SQLITE_DB_PATH,
    extract_links,
    fetch_text_sources,
    normalize_internal_path,
)
from cms_audit import REPORTS_DIR, connect_readonly

USER_AGENT = "MyORL-LinkAudit/1.0 (+https://myorl.gr)"
CONCURRENCY = 10
TIMEOUT = 10.0
RETRY_BACKOFF = 5.0
DEFAULT_MAX_BROKEN = 20
REPORT_FILENAME = "external-link-audit.md"

ALLOWLIST_DOMAINS = (".gov.gr", "eody.gov.gr", "nhs.uk", "cdc.gov")


@dataclass
class CheckResult:
    source: str
    field: str
    href: str
    classification: str  # ok | broken | flaky | allowlisted
    status: int | None = None
    final_url: str | None = None
    error: str | None = None
    retried: bool = False


def _page_label(source: str) -> str:
    """Derive a human-readable page label from a TextSource.source string.

    >>> _page_label("page:el:amygdales:doc123")
    '/el/amygdales'
    >>> _page_label("component:components_items_accordion_items:42")
    'component:accordion_items:42'
    """
    parts = source.split(":", 2)
    if parts[0] == "page" and len(parts) >= 3:
        return f"/{parts[1]}/{parts[2].rsplit(':', 1)[0]}" if ":" in parts[2] else f"/{parts[1]}/{parts[2]}"
    if parts[0] == "component":
        table = parts[1].replace("components_items_", "").replace("components_sections_", "")
        return f"component:{table}:{parts[2]}" if len(parts) > 2 else source
    return source


def is_allowlisted(url: str) -> bool:
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()
    if not hostname:
        return False
    for domain in ALLOWLIST_DOMAINS:
        if hostname == domain.lstrip(".") or hostname.endswith(domain):
            return True
    return False


def extract_external_links(
    *,
    db_path: str | None = None,
    json_report_path: str | None = None,
) -> list[dict[str, str]]:
    if json_report_path:
        data = json.loads(Path(json_report_path).read_text(encoding="utf-8"))
        return data.get("externalLinks", [])
    connection = connect_readonly(Path(db_path or DEFAULT_SQLITE_DB_PATH))
    text_sources = fetch_text_sources(connection)
    links = extract_links(text_sources)
    external: list[dict[str, str]] = []
    for source, href in links:
        _, link_type = normalize_internal_path(href)
        if link_type == "external":
            external.append({"source": source.source, "field": source.field, "href": href})
    return external


async def check_one_link(
    client: httpx.AsyncClient,
    href: str,
    source: str,
    field: str,
) -> CheckResult:
    async def _do() -> CheckResult:
        try:
            response = await client.head(href)
            status = response.status_code
            final_url = str(response.url) if str(response.url) != href else None
            if 200 <= status < 300:
                return CheckResult(
                    source=source, field=field, href=href,
                    classification="ok", status=status, final_url=final_url,
                )
            if 300 <= status < 400:
                return CheckResult(
                    source=source, field=field, href=href,
                    classification="ok", status=status, final_url=final_url,
                )
            if 400 <= status < 500:
                if is_allowlisted(href):
                    return CheckResult(
                        source=source, field=field, href=href,
                        classification="allowlisted", status=status,
                    )
                return CheckResult(
                    source=source, field=field, href=href,
                    classification="broken", status=status,
                )
            if 500 <= status < 600:
                if is_allowlisted(href):
                    return CheckResult(
                        source=source, field=field, href=href,
                        classification="allowlisted", status=status,
                    )
                return CheckResult(
                    source=source, field=field, href=href,
                    classification="flaky", status=status,
                    error=f"HTTP {status}",
                )
        except httpx.TimeoutException:
            if is_allowlisted(href):
                return CheckResult(
                    source=source, field=field, href=href,
                    classification="allowlisted", error="timeout",
                )
            return CheckResult(
                source=source, field=field, href=href,
                classification="flaky", error="timeout",
            )
        except (httpx.NetworkError, OSError) as exc:
            if is_allowlisted(href):
                return CheckResult(
                    source=source, field=field, href=href,
                    classification="allowlisted", error=str(exc),
                )
            return CheckResult(
                source=source, field=field, href=href,
                classification="flaky", error=str(exc),
            )
        except (httpx.HTTPError, httpx.RequestError) as exc:
            if is_allowlisted(href):
                return CheckResult(
                    source=source, field=field, href=href,
                    classification="allowlisted", status=0,
                    error=type(exc).__name__,
                )
            return CheckResult(
                source=source, field=field, href=href,
                classification="flaky", status=0,
                error=type(exc).__name__,
            )

    result = await _do()

    if result.classification == "flaky":
        await asyncio.sleep(RETRY_BACKOFF)
        retry = await _do()
        retry.retried = True
        return retry

    return result


async def check_all_links(links: list[dict[str, str]]) -> list[CheckResult]:
    sem = asyncio.Semaphore(CONCURRENCY)

    async def _bounded(link: dict[str, str]) -> CheckResult:
        async with sem:
            async with httpx.AsyncClient(
                timeout=TIMEOUT,
                follow_redirects=True,
                headers={"User-Agent": USER_AGENT},
            ) as client:
                return await check_one_link(
                    client, link["href"], link["source"], link["field"],
                )

    return list(await asyncio.gather(*[_bounded(link) for link in links]))


def build_report(results: list[CheckResult]) -> str:
    by_page: dict[str, dict[str, list[CheckResult]]] = defaultdict(
        lambda: defaultdict(list)
    )
    for r in results:
        by_page[_page_label(r.source)][r.classification].append(r)

    ok_count = sum(1 for r in results if r.classification == "ok")
    broken_count = sum(1 for r in results if r.classification == "broken")
    flaky_count = sum(1 for r in results if r.classification == "flaky")
    allowlisted_count = sum(1 for r in results if r.classification == "allowlisted")

    lines: list[str] = [
        "# External Link Audit Report",
        "",
        f"**Total links checked:** {len(results)}",
        f"**OK:** {ok_count}",
        f"**Broken (4xx):** {broken_count}",
        f"**Flaky (5xx / timeout / DNS / SSL):** {flaky_count}",
        f"**Allowlisted (rate-limited domains):** {allowlisted_count}",
        "",
        "---",
        "",
    ]

    for page_label in sorted(by_page):
        buckets = by_page[page_label]
        page_broken = len(buckets.get("broken", []))
        page_flaky = len(buckets.get("flaky", []))
        page_allowlisted = len(buckets.get("allowlisted", []))

        if page_broken == 0 and page_flaky == 0 and page_allowlisted == 0:
            continue

        lines.append(f"## {page_label}")
        lines.append("")

        for cls, heading in [
            ("broken", "Broken (4xx)"),
            ("flaky", "Flaky (5xx / timeout / DNS / SSL)"),
            ("allowlisted", "Allowlisted (rate-limited domains)"),
        ]:
            items = buckets.get(cls, [])
            if not items:
                continue
            bad_count = len(items)
            plural = "s" if bad_count > 1 else ""
            lines.append(f"### {bad_count} {heading.lower()} link{plural}")
            lines.append("")
            for item in sorted(items, key=lambda x: x.href):
                detail = f"HTTP {item.status}" if item.status else (item.error or "unknown")
                extra = ""
                if item.retried:
                    extra += " (retried)"
                if item.final_url:
                    extra += f" → {item.final_url}"
                lines.append(f"- `{item.href}` — {detail}{extra}")
            lines.append("")

    return "\n".join(lines) + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--db",
        default=None,
        help="Path to Strapi SQLite database (overrides default)",
    )
    parser.add_argument(
        "--json-report",
        default=None,
        help="Path to a prior audit_nextjs_content_hygiene.py JSON report",
    )
    parser.add_argument(
        "--report-dir",
        default=str(REPORTS_DIR),
        help="Directory to write the markdown report",
    )
    parser.add_argument(
        "--max-broken-external-links",
        type=int,
        default=DEFAULT_MAX_BROKEN,
        help=f"Exit non-zero if broken-count exceeds this ceiling (default: {DEFAULT_MAX_BROKEN})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print report to stdout without writing to file",
    )
    return parser.parse_args()


async def main_async() -> tuple[list[CheckResult], int]:
    args = parse_args()

    links = extract_external_links(
        db_path=args.db,
        json_report_path=args.json_report,
    )

    if not links:
        report_path = Path(args.report_dir) / REPORT_FILENAME
        msg = (
            "# External Link Audit Report\n\n"
            "**No external links found.**\n\n"
            "If you expected links, verify that:\n"
            "- The Strapi database contains published pages with external hrefs\n"
            "- `audit_nextjs_content_hygiene.py` reports externalLinkCount > 0\n"
        )
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(msg, encoding="utf-8")
        print(f"Report written to {report_path}")
        return [], 0

    print(f"Checking {len(links)} external links with concurrency={CONCURRENCY} ...")
    results = await check_all_links(links)

    report = build_report(results)
    report_path = Path(args.report_dir) / REPORT_FILENAME
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report, encoding="utf-8")

    if args.dry_run:
        print(report)
    else:
        print(f"Report written to {report_path}")

    broken_count = sum(1 for r in results if r.classification == "broken")
    exit_code = 1 if broken_count > args.max_broken_external_links else 0

    if broken_count > args.max_broken_external_links:
        print(
            f"\nLAUNCH GATE FAILED: {broken_count} broken external links "
            f"exceeds threshold of {args.max_broken_external_links}"
        )
    else:
        print(
            f"\nGate OK: {broken_count} broken <= {args.max_broken_external_links} max "
            f"(flaky={sum(1 for r in results if r.classification == 'flaky')}, "
            f"allowlisted={sum(1 for r in results if r.classification == 'allowlisted')})"
        )

    return results, exit_code


def main() -> int:
    _, exit_code = asyncio.run(main_async())
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
