# Source fetch/cache/recovery — P1-I01 (2026-10-06)

Owner for manual source verification and approvals: repository maintainer.
These are project safety boundaries and observed contracts, not invented provider
quotas. No scheduler, resource, bulk crawl or provider integration is created here.

| Source | Observed contract / request | Cache/recovery / missing policy |
| --- | --- | --- |
| K01/K02/K03/K07 Wiki | allowlisted MediaWiki query revisions/main or imageinfo metadata; reject warnings/errors/missing expected page; literal Lua never executed | pin URL/title/revision/retrievedAt/SHA; reuse same cached research; corrupt/parser failure quarantined, retain last accepted data; quota/TTL unknown |
| K04 workbook | observed public OneDrive embed403 | inactive/manual until owner supplies accessible source; no guessed export, authentication bypass or retries in a loop |
| K05 ThatSkyAPI | GET /skytime JSON, epoch ms + IANA zone; sample HTTP ACAO* | response requests avoiding spam, one successful call per instance then local elapsed clock; numeric quota/TTL unknown; no per-second polling or assumed schedule feed |
| K06 official news | public section/article navigation, manual metadata/summary | retain source link/date/observed time; exact revision/update instant absent; explicit later comparison before refreshed claims; no invented RSS/API |
| K08/K09 guides/media | original article/playlist/video links; bounded oEmbed metadata succeeds for sampled video | preserve author/date/version uncertainty; no binary/frame scraping; metadata errors keep link and unavailable state, never create footage-derived route |
| K10/K11 stores | dated US/VN listing evidence; no per-SKU endpoint verified | manual observation with platform/market/currency/time; missing SKU/contents stays incomplete; app/range never numeric item fallback |
| K12 pricing research | public manual search/record/IAP-page sample, one old snapshot | terms prohibit systematic scrape/bulk/competing redistribution; reference/link only until appropriate explicit contract; stats badge is not price API |

For a manual research request: use an explicit verified URL, a small set of titles
and bounded response size/time; retain working data only under E: research. The
current sample helper caps each response at1MiB/40s and makes no automatic retry.
Those are local safeguards, not provider limits or permission for sustained crawl.
Existing media importer retry/delay settings are implementation behavior, not
verified Wiki rate policy; new mass runs require their existing preflight/gates.

Operational adapters must expose lastAcceptedRevision, lastSuccessfulSync,
lastAttempt/error and stale/unavailable explicitly. Failure or an empty unexpected
source must never delete/replace the accepted catalog. New snapshot → normalize →
diff/quarantine → review → accepted/LKG; publishing/storage follow separate gates.
Retry only a later bounded/manual attempt or approved source-specific policy;
respect actual Retry-After when present. Unknown TTL does not mean always fresh.
No persistent cache/time state is assumed valid across reload without validation.

K05 integration still needs browser CORS acceptance and error/reentry behavior.
Use receivedAtDevice and monotonic elapsed within a session; do not persist that
clock as a schedule or infer zero skew. Synthetic DST fixtures test interpretation,
not historical provider responses. New service/secret/paid/cloud actions require
their own authorization; this document grants none.
