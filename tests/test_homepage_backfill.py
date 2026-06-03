from tools.homepage_backfill import build_homepage_backfill_plan


def test_homepage_backfill_fills_missing_sections_and_reports_conflicts():
    source = {
        "locale": "el",
        "hero": {
            "heading": "MODX hero",
            "intro": "MODX intro",
            "media": 123,
            "ctaLabel": "Book",
            "ctaUrl": "/el/rantevou",
        },
        "testimonials": {"heading": "MODX reviews", "intro": "MODX reviews intro"},
        "notice": {"heading": "MODX notice", "intro": "<p>MODX notice</p>"},
    }
    current_page = {"documentId": "home-el", "locale": "el", "pageSections": []}

    plan = build_homepage_backfill_plan([source], [current_page])

    assert plan["summary"]["createdCount"] == 3
    assert plan["summary"]["conflictCount"] == 0
    assert plan["updates"][0]["payload"]["pageSections"][0]["__component"] == "sections.home-hero"


def test_homepage_backfill_preserves_conflicts_unless_overwrite_is_approved():
    source = {
        "locale": "el",
        "hero": {"heading": "MODX hero", "intro": "MODX intro"},
        "testimonials": {"heading": "MODX reviews", "intro": "MODX reviews intro"},
        "notice": {"heading": "MODX notice", "intro": "<p>MODX notice</p>"},
    }
    current_page = {
        "documentId": "home-el",
        "locale": "el",
        "pageSections": [
            {"__component": "sections.home-hero", "heading": "Client corrected hero", "intro": ""},
            {"__component": "sections.home-testimonials-teaser", "heading": "MODX reviews"},
        ],
    }

    dry_plan = build_homepage_backfill_plan([source], [current_page])

    assert dry_plan["summary"]["createdCount"] == 1
    assert dry_plan["summary"]["updatedCount"] == 2
    assert dry_plan["summary"]["conflictCount"] == 1
    assert dry_plan["updates"][0]["payload"]["pageSections"][0]["heading"] == "Client corrected hero"

    overwrite_plan = build_homepage_backfill_plan(
        [source], [current_page], approved_overwrites={("el", "sections.home-hero", "heading")}
    )

    assert overwrite_plan["summary"]["conflictCount"] == 0
    assert overwrite_plan["updates"][0]["payload"]["pageSections"][0]["heading"] == "MODX hero"
