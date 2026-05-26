import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

_TOOLS = Path(__file__).resolve().parents[1] / "tools"
if str(_TOOLS) not in sys.path:
    sys.path.insert(0, str(_TOOLS))

from orchestrate_migration import (
    _check_strapi_health,
    _resolve_backup,
    _resolve_target,
    _smoke_query,
    _step_restore,
    _step_revalidate,
    Target,
)


class ForceRequiredForProduction(unittest.TestCase):
    def test_exits_nonzero_without_force(self):
        """--target production without --force should exit non-zero."""
        rc = _resolve_backup("/nonexistent/backup.sql")
        self.assertIsNone(rc)

    @patch("orchestrate_migration._resolve_backup")
    @patch("orchestrate_migration._step_restore")
    @patch("orchestrate_migration._step_verify_strapi")
    @patch("orchestrate_migration._step_reindex")
    @patch("orchestrate_migration._step_smoke")
    def test_main_refuses_production_without_force(
        self, mock_smoke, mock_reindex, mock_verify, mock_restore, mock_resolve,
    ):
        mock_resolve.return_value = Path("/tmp/mock.sql")
        from orchestrate_migration import main
        rc = main(["--target", "production", "--backup", "/tmp/mock.sql"])
        self.assertEqual(rc, 1)
        mock_restore.assert_not_called()
        mock_verify.assert_not_called()
        mock_reindex.assert_not_called()
        mock_smoke.assert_not_called()


class BackupFileNotFoundTests(unittest.TestCase):
    def test_resolve_backup_returns_none_for_missing_file(self):
        self.assertIsNone(_resolve_backup("/nonexistent/backup.sql"))

    def test_resolve_backup_finds_existing_file(self):
        with patch("pathlib.Path.exists", return_value=True):
            result = _resolve_backup("/tmp/backup.sql")
            self.assertIsNotNone(result)

    @patch("orchestrate_migration._resolve_backup", return_value=None)
    @patch("orchestrate_migration._step_restore")
    def test_main_exits_if_backup_not_found(self, mock_restore, mock_resolve):
        from orchestrate_migration import main
        rc = main(["--target", "dev", "--backup", "/missing.sql"])
        self.assertEqual(rc, 1)
        mock_restore.assert_not_called()


class UnknownTargetTests(unittest.TestCase):
    def test_raises_key_error_for_invalid_target(self):
        with self.assertRaises(KeyError):
            _resolve_target("nonexistent")


class SubprocessCommandConstruction(unittest.TestCase):
    @patch("orchestrate_migration.subprocess.run")
    def test_restore_step_args_without_force(self, mock_run):
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        rc = _step_restore("rehearsal", "/tmp/test.sql", force=False)
        self.assertEqual(rc, 0)
        cmd = mock_run.call_args[0][0]
        self.assertIn("tools/backup_runner.py", cmd)
        self.assertIn("restore", cmd)
        self.assertIn("--target", cmd)
        self.assertIn("rehearsal", cmd)
        self.assertIn("--file", cmd)
        self.assertIn("/tmp/test.sql", cmd)
        self.assertNotIn("--force", cmd)

    @patch("orchestrate_migration.subprocess.run")
    def test_restore_step_args_with_force(self, mock_run):
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        rc = _step_restore("production", "/tmp/prod.sql", force=True)
        self.assertEqual(rc, 0)
        cmd = mock_run.call_args[0][0]
        self.assertIn("--force", cmd)

    @patch("orchestrate_migration.subprocess.run")
    def test_restore_step_failure_propagates(self, mock_run):
        mock_run.return_value = MagicMock(
            returncode=1, stdout="", stderr="Restore failed due to connection error"
        )
        rc = _step_restore("dev", "/tmp/bad.sql", force=False)
        self.assertEqual(rc, 1)


class SmokeQueryResultParsing(unittest.TestCase):
    def setUp(self):
        self.target = Target(name="dev", access="local", meili_host_port=57700)

    @patch("orchestrate_migration.urllib.request.urlopen")
    def test_returns_true_with_hits(self, mock_urlopen):
        mock_resp = MagicMock()
        mock_resp.__enter__.return_value = mock_resp
        mock_resp.read.return_value = b'{"hits": [{"title": "test"}]}'
        mock_resp.status = 200
        mock_urlopen.return_value = mock_resp
        self.assertTrue(_smoke_query(self.target))

    @patch("orchestrate_migration.urllib.request.urlopen")
    def test_returns_false_with_empty_hits(self, mock_urlopen):
        mock_resp = MagicMock()
        mock_resp.__enter__.return_value = mock_resp
        mock_resp.read.return_value = b'{"hits": []}'
        mock_resp.status = 200
        mock_urlopen.return_value = mock_resp
        self.assertFalse(_smoke_query(self.target))

    @patch("orchestrate_migration.urllib.request.urlopen")
    def test_returns_false_with_missing_hits_key(self, mock_urlopen):
        mock_resp = MagicMock()
        mock_resp.__enter__.return_value = mock_resp
        mock_resp.read.return_value = b'{"nada": []}'
        mock_resp.status = 200
        mock_urlopen.return_value = mock_resp
        self.assertFalse(_smoke_query(self.target))


class StrapiHealthTimeout(unittest.TestCase):
    @patch("orchestrate_migration.urllib.request.urlopen")
    def test_returns_false_after_timeout(self, mock_urlopen):
        mock_urlopen.side_effect = Exception("Connection refused")
        self.assertFalse(_check_strapi_health("http://localhost:1337", timeout=0.1))


class RevalidateStep(unittest.TestCase):
    def setUp(self):
        self.target = Target(name="dev", access="local", meili_host_port=57700)

    @patch.dict("os.environ", {"REVALIDATE_SECRET": "test-secret"}, clear=True)
    @patch("orchestrate_migration.urllib.request.urlopen")
    def test_skips_when_no_revalidate_url_and_not_production(self, mock_urlopen):
        """Skips gracefully for local targets when NEXT_REVALIDATE_URL is not set."""
        # With no NEXT_REVALIDATE_URL, defaults to localhost:3000/api/revalidate
        mock_resp = MagicMock()
        mock_resp.__enter__.return_value = mock_resp
        mock_resp.read.return_value = b'{"ok": true, "tags": []}'
        mock_resp.status = 200
        mock_urlopen.return_value = mock_resp

        rc = _step_revalidate(self.target)
        self.assertEqual(rc, 0)
        self.assertTrue(mock_urlopen.called)

    @patch.dict("os.environ", {"REVALIDATE_SECRET": "test-secret"}, clear=True)
    @patch("orchestrate_migration.urllib.request.urlopen")
    def test_successful_revalidation(self, mock_urlopen):
        with patch.dict(
            "os.environ",
            {"NEXT_REVALIDATE_URL": "http://localhost:3000/api/revalidate"},
        ):
            mock_resp = MagicMock()
            mock_resp.__enter__.return_value = mock_resp
            mock_resp.read.return_value = b'{"ok": true, "tags": ["locale-el", "locale-ru"]}'
            mock_resp.status = 200
            mock_urlopen.return_value = mock_resp

            rc = _step_revalidate(self.target)
            self.assertEqual(rc, 0)

    @patch.dict("os.environ", {"REVALIDATE_SECRET": "test-secret"}, clear=True)
    @patch("orchestrate_migration.urllib.request.urlopen")
    def test_fails_on_error_response(self, mock_urlopen):
        with patch.dict(
            "os.environ",
            {"NEXT_REVALIDATE_URL": "http://localhost:3000/api/revalidate"},
        ):
            mock_resp = MagicMock()
            mock_resp.__enter__.return_value = mock_resp
            mock_resp.read.return_value = b'{"ok": false, "error": "Invalid secret"}'
            mock_resp.status = 401
            mock_urlopen.return_value = mock_resp

            rc = _step_revalidate(self.target)
            self.assertEqual(rc, 1)

    @patch.dict("os.environ", clear=True)
    def test_skips_when_no_secret_configured(self):
        """Skips gracefully when REVALIDATE_SECRET is not set."""
        rc = _step_revalidate(self.target)
        self.assertEqual(rc, 0)


if __name__ == "__main__":
    unittest.main()
