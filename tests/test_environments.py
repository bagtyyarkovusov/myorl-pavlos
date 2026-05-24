#!/usr/bin/env python3
"""Drift detector — assert each docker-compose.<target>.yml matches the
Environment Manifest.

Run with: ``python3 tests/test_environments.py``
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))

from environments import ENVIRONMENTS, get  # noqa: E402


def _load_compose(path: Path) -> dict:
    with path.open() as fh:
        return yaml.safe_load(fh)


def _postgres_db_default(value: str) -> str:
    """Resolve a compose env value of the form ``${VAR:-default}`` to its
    default, or return the literal string if there is no parametric form."""
    if isinstance(value, str) and value.startswith("${") and ":-" in value:
        return value.split(":-", 1)[1].rstrip("}")
    return value


class TestEnvironmentManifest(unittest.TestCase):
    """Manifest invariants — assertable without touching the compose files."""

    def test_no_duplicate_containers(self):
        names = [env["container"] for env in ENVIRONMENTS.values()]
        self.assertEqual(len(names), len(set(names)), "duplicate container names")

    def test_no_duplicate_volumes(self):
        volumes = [env["volume"] for env in ENVIRONMENTS.values()]
        self.assertEqual(len(volumes), len(set(volumes)), "duplicate volume names")

    def test_no_duplicate_host_ports(self):
        ports = [env["host_port"] for env in ENVIRONMENTS.values() if env["host_port"] is not None]
        self.assertEqual(len(ports), len(set(ports)), "duplicate host ports")

    def test_compose_files_exist(self):
        for name, env in ENVIRONMENTS.items():
            path = ROOT / env["compose_file"]
            self.assertTrue(path.exists(), f"{name}: {path} missing")

    def test_get_unknown_raises(self):
        with self.assertRaises(KeyError):
            get("staging")


class TestComposeMatchesManifest(unittest.TestCase):
    """Drift detection — fail if compose YAML disagrees with the manifest."""

    def _check_env(self, name: str) -> None:
        env = ENVIRONMENTS[name]
        compose = _load_compose(ROOT / env["compose_file"])
        pg = compose["services"]["postgres"]

        self.assertEqual(
            pg["container_name"], env["container"], f"{name}: container_name drift"
        )

        # Volume — match against the postgres data mount, not the whole list.
        # postgres:18 stores versioned data directories under /var/lib/postgresql.
        data_mount = next(v for v in pg["volumes"] if "/var/lib/postgresql" in v)
        self.assertIn(env["volume"], data_mount, f"{name}: data volume drift")

        # Host port: present for dev/rehearsal, absent for prod
        if env["host_port"] is None:
            self.assertNotIn("ports", pg, f"{name}: host port should not be exposed")
        else:
            mapping = f"{env['host_port']}:5432"
            self.assertIn(mapping, pg["ports"], f"{name}: host port drift")

        # DB name and user — resolve ${VAR:-default} where compose parameterises them
        self.assertEqual(
            _postgres_db_default(pg["environment"]["POSTGRES_DB"]),
            env["db_name"],
            f"{name}: POSTGRES_DB drift",
        )
        self.assertEqual(
            _postgres_db_default(pg["environment"]["POSTGRES_USER"]),
            env["db_user"],
            f"{name}: POSTGRES_USER drift",
        )

    def test_dev(self):
        self._check_env("dev")

    def test_rehearsal(self):
        self._check_env("rehearsal")

    def test_production(self):
        self._check_env("production")


class TestMeilisearchFields(unittest.TestCase):
    """Assert meili identity fields are present and unique across env records."""

    def test_dev_meili_fields(self):
        env = ENVIRONMENTS["dev"]
        self.assertEqual(env["meili_host_port"], 57700)
        self.assertEqual(env["meili_container"], "myorl-meili-dev")
        self.assertEqual(env["meili_volume"], "meilidata_dev")
        self.assertEqual(env["meili_master_key_env"], "MEILI_MASTER_KEY_DEV")

    def test_rehearsal_meili_fields(self):
        env = ENVIRONMENTS["rehearsal"]
        self.assertEqual(env["meili_host_port"], 57701)
        self.assertEqual(env["meili_container"], "myorl-meili-rehearsal")
        self.assertEqual(env["meili_volume"], "meilidata_rehearsal")
        self.assertEqual(env["meili_master_key_env"], "MEILI_MASTER_KEY_REHEARSAL")

    def test_no_duplicate_meili_host_ports(self):
        ports = [
            env["meili_host_port"]
            for env in ENVIRONMENTS.values()
            if env.get("meili_host_port") is not None
        ]
        self.assertEqual(len(ports), len(set(ports)), "duplicate meili host ports")

    def test_no_duplicate_meili_containers(self):
        containers = [
            env["meili_container"]
            for env in ENVIRONMENTS.values()
            if env.get("meili_container")
        ]
        self.assertEqual(len(containers), len(set(containers)), "duplicate meili container names")


if __name__ == "__main__":
    unittest.main(verbosity=2)
