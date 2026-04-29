#!/usr/bin/env python3
"""Validate consistency across env files for production deployment.

Checks:
  - STRAPI_URL consistency across root .env, frontend/.env.local, backend/.env
  - NEXT_PUBLIC_SITE_URL is present in STRAPI_CORS_ORIGINS
  - No empty values for required variables
  - STRAPI_REVALIDATE_SECRET is shared between frontend and backend

Exits 0 when all checks pass, 1 when violations are found.
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]

ENV_FILES = {
    "root .env": REPO_ROOT / ".env",
    "frontend/.env.local": REPO_ROOT / "frontend" / ".env.local",
    "backend/.env": REPO_ROOT / "backend" / ".env",
}

REQUIRED = {
    "root .env": ["STRAPI_URL", "STRAPI_TOKEN"],
    "frontend/.env.local": [
        "STRAPI_URL",
        "STRAPI_TOKEN",
        "NEXT_PUBLIC_SITE_URL",
        "STRAPI_REVALIDATE_SECRET",
    ],
    "backend/.env": [
        "APP_KEYS",
        "API_TOKEN_SALT",
        "ADMIN_JWT_SECRET",
        "JWT_SECRET",
        "ENCRYPTION_KEY",
        "STRAPI_CORS_ORIGINS",
        "STRAPI_REVALIDATE_SECRET",
    ],
}


def parse_dotenv(path: Path) -> dict[str, str]:
    """Parse a .env file into a dict; skips comments and empty lines."""
    if not path.is_file():
        return {}
    result: dict[str, str] = {}
    for raw_text in path.read_text(encoding="utf-8").splitlines():
        line = raw_text.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            result[key] = value
    return result


def load_all() -> dict[str, dict[str, str]]:
    return {label: parse_dotenv(path) for label, path in ENV_FILES.items()}


def normalize_url(value: str) -> str:
    return value.rstrip("/").strip()


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []

    envs = load_all()

    for label, path in ENV_FILES.items():
        if not path.is_file():
            errors.append(f"Missing file: {path}")

    if errors:
        print("ENV VALIDATION FAILED")
        print("======================")
        for err in errors:
            print(f"  [ERROR] {err}")
        return 1

    for label, vars_ in REQUIRED.items():
        for var in vars_:
            value = envs.get(label, {}).get(var, "")
            if not value:
                errors.append(f"{label}: {var} is empty or missing")

    root_url = normalize_url(envs["root .env"].get("STRAPI_URL", ""))
    frontend_url = normalize_url(envs["frontend/.env.local"].get("STRAPI_URL", ""))
    backend_url = normalize_url(envs.get("backend/.env", {}).get("STRAPI_URL", ""))

    if root_url and frontend_url and root_url != frontend_url:
        errors.append(
            f"STRAPI_URL mismatch: root .env has '{root_url}', "
            f"frontend/.env.local has '{frontend_url}'"
        )
    if frontend_url and backend_url and frontend_url != backend_url:
        warnings.append(
            f"STRAPI_URL differs: frontend has '{frontend_url}', "
            f"backend has '{backend_url}' (expected if backend connects via localhost while "
            f"frontend uses a container hostname)"
        )

    site_url = normalize_url(envs["frontend/.env.local"].get("NEXT_PUBLIC_SITE_URL", ""))
    cors_origins = envs.get("backend/.env", {}).get("STRAPI_CORS_ORIGINS", "")

    if site_url and cors_origins:
        origins = [normalize_url(o) for o in cors_origins.split(",") if o.strip()]
        if site_url not in origins:
            errors.append(
                f"NEXT_PUBLIC_SITE_URL '{site_url}' is not in "
                f"STRAPI_CORS_ORIGINS '{cors_origins}'"
            )

    frontend_secret = envs["frontend/.env.local"].get("STRAPI_REVALIDATE_SECRET", "")
    backend_secret = envs.get("backend/.env", {}).get("STRAPI_REVALIDATE_SECRET", "")

    if frontend_secret and backend_secret and frontend_secret != backend_secret:
        errors.append(
            "STRAPI_REVALIDATE_SECRET mismatch between frontend/.env.local and backend/.env"
        )

    for var in ["APP_KEYS", "API_TOKEN_SALT", "ADMIN_JWT_SECRET", "JWT_SECRET", "ENCRYPTION_KEY"]:
        value = envs.get("backend/.env", {}).get(var, "")
        if value and "replace-with" in value.lower():
            errors.append(f"backend/.env: {var} appears to be a placeholder value")

    for label, var_name in [
        ("frontend/.env.local", "STRAPI_REVALIDATE_SECRET"),
        ("backend/.env", "STRAPI_REVALIDATE_SECRET"),
    ]:
        value = envs.get(label, {}).get(var_name, "")
        if value and "replace-with" in value.lower():
            errors.append(f"{label}: {var_name} appears to be a placeholder value")

    print()
    if errors or warnings:
        print("ENV VALIDATION REPORT")
        print("======================")
        for err in errors:
            print(f"  [ERROR] {err}")
        for warn in warnings:
            print(f"  [WARN]  {warn}")
        print()

    if errors:
        print(f"Failed with {len(errors)} error(s).")
        return 1

    print("All environment checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
