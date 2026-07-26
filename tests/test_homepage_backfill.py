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


def test_homepage_backfill_creates_home_resource_groups_from_legacy_sources():
    source = {
        "locale": "ru",
        "resourceGroups": [
            {
                "group": "operations",
                "heading": "ЛОР Операции",
                "items": [
                    {
                        "title": "Операция 1",
                        "description": None,
                        "legacySourceResourceId": 10,
                        "targetPage": {"connect": [{"documentId": "operation-page", "locale": "ru"}]},
                    }
                ],
                "viewAllTarget": {"connect": [{"documentId": "operations-index", "locale": "ru"}]},
                "viewAllLabel": "Все операции",
            },
            {
                "group": "services",
                "heading": "Услуги",
                "items": [
                    {
                        "title": "Услуга 1",
                        "description": "<p>Описание</p>",
                        "legacySourceResourceId": 20,
                        "targetPage": {"connect": [{"documentId": "service-page", "locale": "ru"}]},
                    }
                ],
                "viewAllTarget": {"connect": [{"documentId": "services-index", "locale": "ru"}]},
                "viewAllLabel": "Все услуги",
            },
        ],
    }
    current_page = {"documentId": "home-ru", "locale": "ru", "pageSections": []}

    plan = build_homepage_backfill_plan([source], [current_page])
    sections = plan["updates"][0]["payload"]["pageSections"]

    assert plan["summary"]["createdCount"] == 2
    assert sections[0]["__component"] == "sections.home-resource-group"
    assert sections[0]["group"] == "operations"
    assert sections[0]["heading"] == "ЛОР Операции"
    assert sections[0]["items"][0]["targetPage"]["connect"][0]["documentId"] == "operation-page"
    assert sections[1]["group"] == "services"
    assert sections[1]["heading"] == "Услуги"


def test_homepage_backfill_does_not_overwrite_non_empty_resource_group_items():
    source = {
        "locale": "el",
        "resourceGroups": [
            {
                "group": "operations",
                "heading": "Επεμβάσεις",
                "items": [{"title": "MODX operation"}],
            }
        ],
    }
    current_page = {
        "documentId": "home-el",
        "locale": "el",
        "pageSections": [
            {
                "__component": "sections.home-resource-group",
                "group": "operations",
                "heading": "Client operations",
                "items": [{"title": "Client operation"}],
            }
        ],
    }

    plan = build_homepage_backfill_plan([source], [current_page])
    group = plan["updates"][0]["payload"]["pageSections"][0]

    assert plan["summary"]["conflictCount"] == 2
    assert group["heading"] == "Client operations"
    assert group["items"] == [{"title": "Client operation"}]


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
