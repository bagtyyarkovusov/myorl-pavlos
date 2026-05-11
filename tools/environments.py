"""Environment Manifest — single source of truth for deployment-target identity.

Each entry is a structural fact about a deployment target: host port, container
name, volume name, database name, database user, compose file, access kind.
Secrets, runtime tunables (pool sizes, SSL flags), and constants that don't
vary across environments (Strapi 1337, Next.js 3000) live elsewhere — in
.env.<target> files or compose YAML.

Consumers:
  - tools/check_environment.py   (Port Guard)
  - tools/migrate_to_postgres.py (Canonical Export Adapter)
  - tools/orchestrate_rehearsal.py (rehearsal pipeline)
  - tests/test_environments.py   (drift detector vs compose YAML)

When adding or changing a target here, the drift test will fail until the
matching docker-compose.<target>.yml is updated to match.
"""

from __future__ import annotations

from typing import TypedDict, Literal


class Environment(TypedDict, total=False):
    host_port: int | None
    container: str
    volume: str
    db_name: str
    db_user: str
    compose_file: str
    access: Literal["local", "remote"]


ENVIRONMENTS: dict[str, Environment] = {
    "dev": {
        "host_port": 55432,
        "container": "myorl-pg",
        "volume": "pgdata_dev",
        "db_name": "strapi",
        "db_user": "strapi",
        "compose_file": "docker-compose.dev.yml",
        "access": "local",
    },
    "rehearsal": {
        "host_port": 55532,
        "container": "myorl-pg-rehearsal",
        "volume": "pgdata-rehearsal",
        "db_name": "strapi_rehearsal",
        "db_user": "strapi",
        "compose_file": "docker-compose.rehearsal.yml",
        "access": "local",
    },
    "production": {
        "host_port": None,  # internal-network only, no host exposure
        "container": "myorl-pg-prod",
        "volume": "pgdata-prod",
        "db_name": "strapi",
        "db_user": "strapi",
        "compose_file": "docker-compose.prod.yml",
        "access": "remote",
    },
}


# SQLite fallback path — Strapi's default store when running natively without
# Docker (`npm run dev:local`). Per ADR-008 this is NOT the canonical source
# for the rehearsal pipeline (that's dev Postgres). It exists for two narrow
# use cases: no-Docker dev work, and the direct-copy debugging mode in
# tools/run_postgres_rehearsal.py.
SQLITE_FALLBACK_PATH = "backend/.tmp/data.db"


def get(target: str) -> Environment:
    """Return the manifest entry for ``target`` or raise ``KeyError``."""
    if target not in ENVIRONMENTS:
        valid = ", ".join(ENVIRONMENTS)
        raise KeyError(f"Unknown target {target!r}. Valid: {valid}")
    return ENVIRONMENTS[target]
