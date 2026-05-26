import datetime
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

_TOOLS = Path(__file__).resolve().parents[1] / "tools"
if str(_TOOLS) not in sys.path:
    sys.path.insert(0, str(_TOOLS))

from snapshot_gsc_baseline import (
    _build_output_path,
    _validate_dates,
    _parse_row,
    _format_query_response,
    build_snapshot,
)


class BuildOutputPathTests(unittest.TestCase):
    def test_default_output_dir(self) -> None:
        path = _build_output_path("2026-05-26")
        self.assertEqual(
            path,
            Path("artifacts/seo-baseline/2026-05-26.json"),
        )

    def test_custom_output_dir(self) -> None:
        path = _build_output_path("2026-05-26", output_dir="custom/baselines")
        self.assertEqual(
            path,
            Path("custom/baselines/2026-05-26.json"),
        )

    def test_output_path_is_absolute_when_given_absolute_dir(self) -> None:
        path = _build_output_path("2026-05-26", output_dir="/tmp/baselines")
        self.assertEqual(path, Path("/tmp/baselines/2026-05-26.json"))


class ValidateDatesTests(unittest.TestCase):
    def test_valid_date_range(self) -> None:
        _validate_dates("2026-01-01", "2026-05-26")  # does not raise

    def test_same_day_range(self) -> None:
        _validate_dates("2026-05-26", "2026-05-26")  # does not raise

    def test_end_before_start_raises(self) -> None:
        with self.assertRaises(ValueError) as ctx:
            _validate_dates("2026-05-26", "2026-01-01")
        self.assertIn("Start date", str(ctx.exception))

    def test_invalid_date_format_raises(self) -> None:
        with self.assertRaises(ValueError):
            _validate_dates("01-01-2026", "2026-05-26")


class ParseRowTests(unittest.TestCase):
    def test_parses_query_row(self) -> None:
        row = {"keys": ["ρινοπλαστική"], "clicks": 150, "impressions": 2000, "position": 3.2, "ctr": 0.075}
        result = _parse_row(row, "query", ["clicks", "impressions", "position", "ctr"])
        self.assertEqual(
            result,
            {"query": "ρινοπλαστική", "clicks": 150, "impressions": 2000, "position": 3.2, "ctr": 0.075},
        )

    def test_parses_page_row(self) -> None:
        row = {
            "keys": ["https://myorl.gr/el/rinoplastiki"],
            "clicks": 80,
            "impressions": 1200,
            "position": 5.1,
            "ctr": 0.0667,
        }
        result = _parse_row(row, "page", ["clicks", "impressions", "position", "ctr"])
        self.assertEqual(result["page"], "https://myorl.gr/el/rinoplastiki")
        self.assertEqual(result["clicks"], 80)
        self.assertEqual(result["impressions"], 1200)
        self.assertEqual(result["position"], 5.1)
        self.assertAlmostEqual(result["ctr"], 0.0667)

    def test_omits_keys_field_from_output(self) -> None:
        row = {"keys": ["test"], "clicks": 1}
        result = _parse_row(row, "query", ["clicks"])
        self.assertNotIn("keys", result)
        self.assertEqual(result, {"query": "test", "clicks": 1})


class FormatQueryResponseTests(unittest.TestCase):
    def test_formats_gsc_response_rows(self) -> None:
        response = {
            "rows": [
                {"keys": ["ρινοπλαστική"], "clicks": 150, "impressions": 2000, "position": 3.2, "ctr": 0.075},
                {"keys": ["βλεφαροπλαστική"], "clicks": 100, "impressions": 1800, "position": 4.1, "ctr": 0.0556},
            ]
        }
        result = _format_query_response(response, "query", ["clicks", "impressions", "position", "ctr"])
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]["query"], "ρινοπλαστική")
        self.assertEqual(result[1]["query"], "βλεφαροπλαστική")

    def test_empty_response_returns_empty_list(self) -> None:
        result = _format_query_response({}, "query", ["clicks"])
        self.assertEqual(result, [])

    def test_response_with_no_rows_returns_empty_list(self) -> None:
        result = _format_query_response({"rows": []}, "query", ["clicks"])
        self.assertEqual(result, [])


class BuildSnapshotTests(unittest.TestCase):
    def setUp(self) -> None:
        self.top_queries = [
            {"query": "ρινοπλαστική", "clicks": 150, "impressions": 2000, "position": 3.2, "ctr": 0.075},
            {"query": "βλεφαροπλαστική", "clicks": 100, "impressions": 1800, "position": 4.1, "ctr": 0.0556},
        ]
        self.top_pages = [
            {"page": "https://myorl.gr/el/rinoplastiki", "clicks": 200, "impressions": 2500, "position": 2.8, "ctr": 0.08},
        ]
        self.by_country = {
            "GRC": [
                {"query": "ρινοπλαστική", "clicks": 120, "impressions": 1500, "position": 3.0, "ctr": 0.08},
            ]
        }
        self.by_device = {
            "DESKTOP": [
                {"query": "ρινοπλαστική", "clicks": 80, "impressions": 1000, "position": 2.9, "ctr": 0.08},
            ],
            "MOBILE": [
                {"query": "ρινοπλαστική", "clicks": 70, "impressions": 1000, "position": 3.5, "ctr": 0.07},
            ],
        }

    def test_builds_complete_snapshot(self) -> None:
        snapshot = build_snapshot(
            property_uri="sc-domain:myorl.gr",
            start_date="2026-01-01",
            end_date="2026-05-26",
            top_queries=self.top_queries,
            top_pages=self.top_pages,
            by_country=self.by_country,
            by_device=self.by_device,
        )

        self.assertEqual(snapshot["meta"]["property"], "sc-domain:myorl.gr")
        self.assertEqual(snapshot["meta"]["date_range"], ["2026-01-01", "2026-05-26"])
        self.assertEqual(snapshot["meta"]["tool_version"], "1.0.0")
        self.assertIn("generated_at", snapshot["meta"])

        self.assertEqual(len(snapshot["top_queries"]), 2)
        self.assertEqual(len(snapshot["top_pages"]), 1)
        self.assertEqual(list(snapshot["by_country"].keys()), ["GRC"])
        self.assertEqual(list(snapshot["by_device"].keys()), ["DESKTOP", "MOBILE"])

    def test_generated_at_is_iso8601(self) -> None:
        snapshot = build_snapshot(
            property_uri="sc-domain:myorl.gr",
            start_date="2026-01-01",
            end_date="2026-05-26",
            top_queries=[],
            top_pages=[],
            by_country={},
            by_device={},
        )
        # Should parse as ISO 8601 without error
        datetime.datetime.fromisoformat(snapshot["meta"]["generated_at"])

    def test_empty_sections_are_present(self) -> None:
        snapshot = build_snapshot(
            property_uri="sc-domain:myorl.gr",
            start_date="2026-01-01",
            end_date="2026-05-26",
            top_queries=[],
            top_pages=[],
            by_country={},
            by_device={},
        )
        self.assertEqual(snapshot["top_queries"], [])
        self.assertEqual(snapshot["top_pages"], [])
        self.assertEqual(snapshot["by_country"], {})
        self.assertEqual(snapshot["by_device"], {})


class WriteSnapshotTests(unittest.TestCase):
    def test_writes_snapshot_to_disk(self) -> None:
        snapshot = build_snapshot(
            property_uri="sc-domain:myorl.gr",
            start_date="2026-01-01",
            end_date="2026-05-26",
            top_queries=[],
            top_pages=[],
            by_country={},
            by_device={},
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "2026-05-26.json"
            from snapshot_gsc_baseline import write_snapshot

            write_snapshot(snapshot, path)
            self.assertTrue(path.exists())

            with open(path) as f:
                loaded = json.load(f)
            self.assertEqual(loaded["meta"]["property"], "sc-domain:myorl.gr")
            self.assertEqual(loaded["meta"]["tool_version"], "1.0.0")

    def test_creates_parent_directories(self) -> None:
        snapshot = build_snapshot(
            property_uri="sc-domain:myorl.gr",
            start_date="2026-01-01",
            end_date="2026-05-26",
            top_queries=[],
            top_pages=[],
            by_country={},
            by_device={},
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "nested" / "deeply" / "2026-05-26.json"
            from snapshot_gsc_baseline import write_snapshot

            write_snapshot(snapshot, path)
            self.assertTrue(path.exists())


class MainErrorHandlingTests(unittest.TestCase):
    def test_missing_credentials_file_exits_with_error(self) -> None:
        from snapshot_gsc_baseline import main

        with patch("sys.argv", ["snapshot_gsc_baseline.py",
                                "--credentials", "/nonexistent/creds.json",
                                "--property", "sc-domain:myorl.gr"]):
            with patch("sys.stderr") as mock_stderr:
                rc = main()
                self.assertEqual(rc, 1)

    def test_start_date_after_end_date_exits_with_error(self) -> None:
        from snapshot_gsc_baseline import main

        with patch("sys.argv", ["snapshot_gsc_baseline.py",
                                "--credentials", "/tmp/fake-creds.json",
                                "--property", "sc-domain:myorl.gr",
                                "--start-date", "2026-06-01",
                                "--end-date", "2026-01-01"]):
            with patch("pathlib.Path.exists", return_value=True):
                rc = main()
                self.assertEqual(rc, 1)


class MainIntegrationTests(unittest.TestCase):
    """Integration tests with mocked GSC API."""

    def setUp(self) -> None:
        self.tmpdir = tempfile.TemporaryDirectory()
        # Create a dummy credentials file
        self.creds_path = Path(self.tmpdir.name) / "creds.json"
        self.creds_path.write_text('{"type": "service_account"}')

    def tearDown(self) -> None:
        self.tmpdir.cleanup()

    def _mock_gsc_service(self) -> MagicMock:
        """Build a mock GSC service that returns dimension-appropriate data."""
        mock_service = MagicMock()

        def make_execute(siteUrl, body):
            """Return realistic data matching the requested dimensions."""
            dims = body.get("dimensions", [])
            if dims == ["query", "country"]:
                rows = [
                    {"keys": ["ρινοπλαστική", "GRC"], "clicks": 100, "impressions": 1500, "position": 3.0, "ctr": 0.067},
                    {"keys": ["ρινοπλαστική", "CYP"], "clicks": 20, "impressions": 300, "position": 4.0, "ctr": 0.067},
                ]
            elif dims == ["query", "device"]:
                rows = [
                    {"keys": ["ρινοπλαστική", "MOBILE"], "clicks": 70, "impressions": 1000, "position": 3.5, "ctr": 0.07},
                    {"keys": ["ρινοπλαστική", "DESKTOP"], "clicks": 80, "impressions": 1000, "position": 2.9, "ctr": 0.08},
                ]
            else:
                rows = [
                    {"keys": ["ρινοπλαστική"], "clicks": 150, "impressions": 2000, "position": 3.2, "ctr": 0.075},
                    {"keys": ["ωτοπλαστική"], "clicks": 80, "impressions": 1200, "position": 4.5, "ctr": 0.0667},
                ]

            mock_result = MagicMock()
            mock_result.execute.return_value = {"rows": rows}
            return mock_result

        mock_service.searchanalytics.return_value.query.side_effect = make_execute
        return mock_service

    def test_full_snapshot_flow_with_mocked_gsc(self) -> None:
        from snapshot_gsc_baseline import (
            fetch_top_queries,
            fetch_top_pages,
            fetch_by_country,
            fetch_by_device,
            build_snapshot,
            write_snapshot,
        )

        mock_service = self._mock_gsc_service()

        queries = fetch_top_queries(mock_service, "sc-domain:myorl.gr", "2026-01-01", "2026-05-26")
        pages = fetch_top_pages(mock_service, "sc-domain:myorl.gr", "2026-01-01", "2026-05-26")
        countries = fetch_by_country(mock_service, "sc-domain:myorl.gr", "2026-01-01", "2026-05-26")
        devices = fetch_by_device(mock_service, "sc-domain:myorl.gr", "2026-01-01", "2026-05-26")

        self.assertEqual(len(queries), 2)
        self.assertEqual(queries[0]["query"], "ρινοπλαστική")

        snapshot = build_snapshot(
            property_uri="sc-domain:myorl.gr",
            start_date="2026-01-01",
            end_date="2026-05-26",
            top_queries=queries,
            top_pages=pages,
            by_country=countries,
            by_device=devices,
        )

        output_path = Path(self.tmpdir.name) / "2026-05-26.json"
        write_snapshot(snapshot, output_path)

        with open(output_path) as f:
            loaded = json.load(f)
        self.assertEqual(loaded["meta"]["property"], "sc-domain:myorl.gr")
        self.assertEqual(len(loaded["top_queries"]), 2)

    def test_top_queries_request_has_correct_params(self) -> None:
        from snapshot_gsc_baseline import fetch_top_queries

        mock_service = self._mock_gsc_service()
        fetch_top_queries(mock_service, "sc-domain:myorl.gr", "2026-01-01", "2026-05-26", limit=50)

        call_kwargs = mock_service.searchanalytics.return_value.query.call_args[1]
        self.assertEqual(call_kwargs["siteUrl"], "sc-domain:myorl.gr")
        self.assertEqual(call_kwargs["body"]["startDate"], "2026-01-01")
        self.assertEqual(call_kwargs["body"]["endDate"], "2026-05-26")
        self.assertEqual(call_kwargs["body"]["dimensions"], ["query"])
        self.assertEqual(call_kwargs["body"]["rowLimit"], 50)

    def test_country_breakdown_uses_country_dimension(self) -> None:
        from snapshot_gsc_baseline import fetch_by_country

        mock_service = self._mock_gsc_service()
        fetch_by_country(mock_service, "sc-domain:myorl.gr", "2026-01-01", "2026-05-26")

        call_kwargs = mock_service.searchanalytics.return_value.query.call_args[1]
        self.assertEqual(call_kwargs["body"]["dimensions"], ["query", "country"])

    def test_device_breakdown_uses_device_dimension(self) -> None:
        from snapshot_gsc_baseline import fetch_by_device

        mock_service = self._mock_gsc_service()
        fetch_by_device(mock_service, "sc-domain:myorl.gr", "2026-01-01", "2026-05-26")

        call_kwargs = mock_service.searchanalytics.return_value.query.call_args[1]
        self.assertEqual(call_kwargs["body"]["dimensions"], ["query", "device"])


class GscAuthErrorTests(unittest.TestCase):
    def test_build_service_with_invalid_credentials_raises_clear_error(self) -> None:
        from snapshot_gsc_baseline import _build_gsc_service

        with tempfile.TemporaryDirectory() as tmpdir:
            creds_path = Path(tmpdir) / "bad-creds.json"
            creds_path.write_text('{"type": "service_account", "private_key": "bad"}')

            # google.auth should raise when loading malformed creds
            # We mock the import to avoid needing the real library
            with patch("snapshot_gsc_baseline._GSERVICE_AVAILABLE", True):
                with patch("snapshot_gsc_baseline.service_account") as mock_sa:
                    mock_sa.Credentials.from_service_account_file.side_effect = ValueError(
                        "Invalid private key"
                    )
                    with self.assertRaises(ValueError) as ctx:
                        _build_gsc_service(str(creds_path))
                    self.assertIn("Invalid private key", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
