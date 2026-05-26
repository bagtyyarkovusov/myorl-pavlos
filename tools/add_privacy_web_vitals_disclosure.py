#!/usr/bin/env python3
"""Add anonymous web vitals collection disclosure to privacy policy pages.

Appends a section to the existing privacy policy pages in both Greek and Russian
locales via the Strapi API. Strapi v5 auto-publishes on PUT, so no separate
publish step is needed.

Interface:
  python3 tools/add_privacy_web_vitals_disclosure.py --target=dev
  python3 tools/add_privacy_web_vitals_disclosure.py --target=production --force
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from typing import Any

from environments import ENVIRONMENTS, get

# ---------------------------------------------------------------------------
# Disclosure copy
# ---------------------------------------------------------------------------

DISCLOSURE_EL = """
<h2>Ανώνυμη συλλογή δεδομένων απόδοσης</h2>
<p>Για τη βελτίωση της ταχύτητας και της εμπειρίας περιήγησης, συλλέγουμε ανώνυμα δεδομένα απόδοσης σελίδας (Core Web Vitals: LCP, CLS, INP, FCP, TTFB). Η συλλογή γίνεται με ένα τυχαίο αναγνωριστικό περιόδου (session UUID) που διαγράφεται αυτόματα όταν κλείνετε το πρόγραμμα περιήγησης.</p>
<p>Δεν καταγράφουμε:</p>
<ul>
<li>τη διεύθυνση IP σας,</li>
<li>προσωπικά στοιχεία ταυτοποίησης,</li>
<li>μόνιμα cookies ή μοναδικά αναγνωριστικά συσκευής.</li>
</ul>
<p>Σκοπός της συλλογής είναι η παρακολούθηση και βελτίωση της απόδοσης του ιστοτόπου. Τα δεδομένα διαγράφονται αυτόματα μετά από 90 ημέρες. Δεν κοινοποιούνται σε τρίτους, δεν χρησιμοποιούνται για διαφήμιση και δεν συσχετίζονται με εσάς προσωπικά.</p>
""".strip()

DISCLOSURE_RU = """
<h2>Анонимный сбор данных о производительности</h2>
<p>Для улучшения скорости и удобства использования сайта мы анонимно собираем данные о производительности страниц (Core Web Vitals: LCP, CLS, INP, FCP, TTFB). Сбор ведется с использованием случайного идентификатора сессии (session UUID), который автоматически удаляется при закрытии браузера.</p>
<p>Мы не регистрируем:</p>
<ul>
<li>ваш IP-адрес,</li>
<li>личные идентификационные данные,</li>
<li>постоянные файлы cookie или уникальные идентификаторы устройств.</li>
</ul>
<p>Цель сбора — мониторинг и улучшение производительности сайта. Данные автоматически удаляются через 90 дней. Они не передаются третьим лицам, не используются для рекламы и не связаны с вашей личностью.</p>
""".strip()

PRIVACY_DOCUMENT_ID = "or75ksubaq5h2exns2uga6k0"


# ---------------------------------------------------------------------------
# Strapi API helpers
# ---------------------------------------------------------------------------


def _strapi_headers() -> dict[str, str]:
    token = os.environ.get("STRAPI_TOKEN")
    if not token:
        print("ERROR: STRAPI_TOKEN environment variable is not set.", file=sys.stderr)
        sys.exit(1)
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


def _strapi_base_url() -> str:
    return os.environ.get("STRAPI_BASE_URL", "http://localhost:1337").rstrip("/")


def _get_page(locale: str) -> dict[str, Any]:
    base = _strapi_base_url()
    url = f"{base}/api/pages/{PRIVACY_DOCUMENT_ID}?locale={locale}"
    req = urllib.request.Request(url, headers=_strapi_headers())
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            return body.get("data", {})
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        print(f"ERROR: Strapi GET failed ({e.code}): {err_body}", file=sys.stderr)
        sys.exit(1)


def _update_page(locale: str, content: str) -> dict[str, Any]:
    base = _strapi_base_url()
    url = f"{base}/api/pages/{PRIVACY_DOCUMENT_ID}?locale={locale}"
    payload = json.dumps({"data": {"content": content}}).encode("utf-8")
    headers = _strapi_headers()
    req = urllib.request.Request(url, data=payload, headers=headers, method="PUT")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        print(f"ERROR: Strapi PUT failed ({e.code}): {err_body}", file=sys.stderr)
        sys.exit(1)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def run(target_name: str) -> int:
    print(f"Target: {target_name}")
    print("Adding web vitals privacy disclosure to privacy pages...")
    print()

    locales = {
        "el": ("Πολιτική Απορρήτου", DISCLOSURE_EL),
        "ru": ("Политика конфиденциальности", DISCLOSURE_RU),
    }

    for locale, (title, disclosure) in locales.items():
        print(f"  Fetching [{locale}] '{title}'...", end=" ", flush=True)
        page = _get_page(locale)
        current_content = page.get("content", "") or ""
        print(f"{len(current_content)} chars")

        if disclosure[:80] in current_content:
            print(f"  [{locale}] Disclosure already present — skipping.")
            continue

        new_content = current_content.rstrip() + "\n" + disclosure
        print(f"  Updating [{locale}] ({len(new_content)} chars)...", end=" ", flush=True)

        _update_page(locale, new_content)
        print("updated.")

    print()
    print("Done.")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--target",
        choices=list(ENVIRONMENTS.keys()),
        required=True,
        help="Target environment",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Required to run against production",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if args.target == "production" and not args.force:
        print(
            "ERROR: Running against production requires --force.\n"
            "This modifies the live privacy policy pages.",
            file=sys.stderr,
        )
        return 1

    return run(args.target)


if __name__ == "__main__":
    sys.exit(main())
