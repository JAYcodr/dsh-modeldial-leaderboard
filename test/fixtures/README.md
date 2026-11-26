# Fixtures

Truncated copies of the upstream payloads, committed so the test suite never
touches the network.

| file | source | trimmed to |
|---|---|---|
| `leaderboard.html` | coding leaderboard | 8 `<tr data-model>` rows |
| `quota.html` | subscription catalog | 7 provider sections (table + card layouts, weekly and monthly units) |
| `writing.json` | writing snapshot feed | first 5 + last 5 rows (last 5 are the out-of-order tail) |
| `harness.html` | harness board | 5 `<tr data-harness>` rows |
| `trends.html` | real-world trends | summary anchors, vendor bars, and 26 `<tr id="adoption-row-...">` rows |

Regenerate after an upstream change:

```bash
node scripts/refresh-fixtures.mjs
git diff test/fixtures   # see exactly which markup moved
```

The script only keeps the fragments the parsers read, so the diff stays small.
