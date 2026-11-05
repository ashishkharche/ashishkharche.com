# TDN schema v20 live reads (5 Nov 2026)

Probe preview: dpl_GT5KNfjjMnAXDmzhWjz855PkcYfn

## daily-feed
- GET /api/v1/daily-feed → published 2026-11-05
- item kinds present: rank_movers, top10_entries, new_versions, build_changes, rating_changes
- top10_returns: ABSENT from items and from summary fact list

## daily-feed/metrics
- All kinds skipped: "N of N apps have no store facts stored for the run"
- items: []
- genres empty

Templates for metrics / top10_returns / chart_release_dates cannot be designed from live item fields until TDN stores app_store_facts and emits top10_returns rows.
