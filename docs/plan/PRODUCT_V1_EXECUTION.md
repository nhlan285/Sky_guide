# Visible V1 execution — active phase

## Goal / why / dependencies
Deliver independently executable visible V1 while R1 native acceptance stays OPEN.
Current MEDIUM slice: two source-reviewed official news metadata samples on /news.
Reuse P1-D06 K06 evidence, monthly official source review, existing provenance/time
validators and SPA primitives. Original manual Article staging stays strict and
private; this UI projection is separate from canonical import/publication.
Master architecture/dependencies: IMPLEMENTATION_PLAN.md. Durable exact handoff:
../CURRENT_STATE.md. Earlier slice evidence is summarized there, not replayed here.

## Authority / scope / contracts
Direct takeover2026-10-08 authorizes non-destructive Free/$0 work, milestone
commit/push and history-preserving develop integration after verification.
No main/production, paid/trial resources, new credentials/permissions, inferred
media rights or weakened R1 gates. Sources keep identity, uncertainty and precision.
In scope: source-linked title/date/publisher/summary/freshness, query/type filters,
empty recovery, Hub→News→Events navigation, vi/en and accessible native controls.
Out of scope: live fetch/feed, latest-release/current-availability claims, leak
moderation, article body/media redistribution, canonical IDs/publication, DB/service,
recurrence/countdown, Music Sheets/Compose or other gated expansion.

## Prior decisions / implementation
- Bounded source projections ship from src; knowledge/raw corpora stay excluded
  from Preview. Exact metadata equality tests prevent source drift.
- Monthly announcement is a separately documented K06 official editorial child
  capability. Helpshift-only officialNewsInput remains unchanged.
- Hotfix34.4 title/date/version/PlayStation/iOS/own summary match cached K06.
  Heading release date differs from publication date. Exact publication/update
  instant, upstream revision and canonical Article identity remain null.
- Manual snapshot can miss newer edits; retrieval time is only review freshness.
- /news is the sole new analytics public pathname; arbitrary nested/private paths,
  queries/hashes/custom events/local collection remain excluded. No article IDs
  enter URLs or provider events.
- Existing route boundary handles genuine missing old chunks with heading focus
  and explicit reload/back; no automatic loop or outfit storage deletion.

## Files / architecture / security
src/data/news/{hotfix-sample.json,reviewedNews.ts}: validated source facts/filter.
src/features/news/News.tsx: native search/type/empty/provenance controls only.
App lazy route/title, Hub entry, analytics public allowlist/privacy tests.
No provider calls/secrets in UI; source links use HTTPS/noopener/noreferrer.
Reviewed-schedule projection shares monthly metadata; raw body/assets stay on E:.

## Acceptance / UX / validation
[x] Exact13d8c00 Preview READY and rendered Hub→News.
[x] Two records/source URLs/date meanings/unknown precision visible; hotfix clearly
    historical and source platforms/version exact.
[x] Query IOS + patch type, conflicting kind→empty, clear→two entries; keyboard.
[x] News→Events→Hub; source credit/freshness, no new current-host console errors.
[x] Actual541px viewport no overflow. Exact360px remains OPEN because capability
    ignores override; never infer target-device PASS from CSS or another width.
[x] Full489 regression with4workers, focused source/privacy, lint/catalog/build.
[ ] Handoff/checkpoint/push verified; normal develop integration; main unchanged.

Commands: node --test tests/data/reviewedNews.test.mjs
 tests/data/manualSchedule.test.mjs tests/data/analyticsPrivacy.test.mjs;
E:/Code/corepack.cmd pnpm lint / pnpm build / pnpm test.
Nine focused tests and lint/typecheck/catalog/build PASS13d8c00. Full489/0fail/
0skip with4workers PASS81787.9912ms. Default489 run had one existing30ms kernel
abort assertion failure; same isolated kernel14/14PASS, raw failure retained and
default harness stability OPEN. No assertions/timeouts/kernel changes. Browser
feed/filter/keyboard/vi-en/source PASS; locale restoredvi. Dashboard53pageviews/
1visitor/13pathname-only pages, including /news2 and /events4. Raw POST OPEN.

## Completed slices / important limits
Analytics real Hobby Preview dashboard ingestion; raw POST capture OPEN.
Wardrobe six real identities/original SVG; lookup/equip/save/reload/share accepted.
Spirit ten-node graph/nine edges/partial unique costs, two historical TS visits.
Music15-note original gesture-started engine, two source-exact instrument mappings.
Media original poster/WebM/WAV pilots; explicit playback/bounded lifecycle accepted.
Events five manual official source entries, filter and LA/HCM/UTC precision accepted
on actual541/1265px; full live/canonical schedule and exact360px remain OPEN.
Hub official monthly headlinecb26b7a Preview/keyboard/vi-en/source acceptance PASS.
These bounded pilots do not close whole P3/R4/R5/full coverage or rights gates.

## Blockers / risks / exact next / handoff
Browser viewport.set360×780 was ignored: existing DOM541px, new tab1265px. Reset
and temporary tab closed. Existing PWA/download/network-capture limitations are
not reopened without new evidence or capability. R1 Docker LinuxEngine pipe absent
on2026-10-09 read-only check; no new repair/restart loop/SQL. Corrected native probe,
leased wire/ACK-loss/SDK/Auth/hosted backup/down remain OPEN in provider plan.
Usage5h96%used/4%remaining; weekly73%used/27%remaining, credits0. Immediate durable
checkpoint/develop verification. After quota permits resume exact handoff steps;
do not compact to restore usage or spend reset credit. Continue dependency-ready
work and retain concrete source/rights/architecture blockers; master remains OPEN.
