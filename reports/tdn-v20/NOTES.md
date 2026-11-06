# TDN schema v20 live reads

## 6 Nov 2026 (confirmed live)

### daily-feed `?date=2026-11-06`
- status published, item_count 4
- kinds: rank_movers (apple, google), top10_entries (apple), new_versions
- top10_returns: ABSENT (TDN omits the kind when empty; charts show honest empty state)

### daily-feed/metrics `?date=2026-11-06`
- 6 items: size_percentiles (apple), min_os_distribution ×2, min_os_newest ×2, chart_release_dates (apple)
- skipped: chart_release_dates google — "1 ranked apps have no release date in this run"
- size cell key is `size` (bytes); release cell key is `released` (ISO date); rank cell is `rankNow`
- chart_release_dates table.total can exceed rows.length (API page of 10 of 64 on 6 Nov)

## 5 Nov 2026 (earlier probe)
- metrics items empty; all kinds skipped (no store facts)
- daily-feed published without top10_returns
