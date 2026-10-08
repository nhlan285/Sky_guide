# P2-D08 — manual official-news draft file slice

## Goal / dependencies / scope
MEDIUM independent draft contract while R1 review waits. P2 core/provenance/time
validators and P1-D06/K06 article verification DONE. P1-H01 event/schedule work
remains OPEN; this slice imports no season/event schedule and does not bypass R3.
Implement a bounded JSON file validator for the existing DATA_SCHEMA Article shape,
official draft only. No HTTP/crawl/provider/scheduler, Hub feed, leak moderation,
public export/approval or copied full article. D08 overall remains PARTIAL.

## Contract / decisions / files
File `{schemaVersion:1,articles:OfficialArticleDraft[]}`,1–50 records,100k UTF-8
bytes. Known stable IDs from supplied registry, unique IDs. Draft contains only
declared Article fields; category official, factualStatus official/corrected,
recordStatus draft, fixture flag, bounded title/summary, nullable publishedAt,
updatedAt (local draft edit timestamp). No field invents source update time.
Trusted caller supplies already-verified SourceRecords and distinct registered
officialEvidence ID→source-provenance/publication-time mapping; file cannot create verification or
evidence. Referenced sources must validate as K06 verified HTTPS Sky Helpshift FAQ,
nonblank attribution/license/transform metadata. Evidence must reference the same
source set; don't treat provenance IDs as evidence IDs automatically.
Non-null publishedAt must match an explicit instant in registered evidence, never
merely a date or retrieval time. Date-only K06 release label cannot become publishedAt midnight; keep instant null
and preserve raw date in source transform/evidence, pending future precision model
review. SourceRevision nullable when upstream revision unknown, never fabricate it.
Whole file quarantines on any error, with sanitized code/path only, no raw text or
partial candidate. Valid result is private draft preview, never approval/public.
Expected: catalog/officialNewsInput.ts + export/README and focused tests. Reuse
existing pure validators/registry injection, no dependency or UI.

## Steps / acceptance / validation / next
Validate file bound/envelope, article fields/IDs/source/evidence/time references,
project only declared fields, atomic result. Tests: mixed invalid batch preserves
no candidates, duplicate/unknown IDs, official evidence cannot come from K15/leak,
date-only stays null, unknown revision preserved, private extras discarded, bounds
and malformed parse reports do not disclose values. Focused/full checks then a
private synthetic dry-run with pinned K06 evidence; no real-public ID invented.
Exact next: implement validator and behavior tests, then update status/handoff.

## Completed / validation / limitations2026-10-06
DONE scoped official draft file validator + catalog export/docs and five behavior
tests. Separate evidence mapping, same-source relationship, conflicting/future
publication instants, date-only no-midnight, whole-batch quarantine, private-field
projection and bounds covered. Full274 tests/lint/typecheck/catalog1808/build PASS.
Initial unused import/test global lint errors fixed without disabling checks.
Pinned K06 metadata dry-run on E:/SkyGuideAssets/research/local-qa-2026-10-06/
manual-news-dry-run.mjs stages one fixture-only draft; publishedAt/sourceRevision
remain null, source release date is preserved in supplied evidence. JSON input/
result stays private/untracked on E:, no actual canonical article ID/publication.
No full article copied, assets fetched, API/feed invented or new source registered.
Overall P2-D08 remains PARTIAL: map/route/season records need verified selected
data/source mapping; live editorial/news ingestion needs canonical registries and
approval. Exact next: checkpoint/push; audit remaining dependency gates before
starting any new live foundation/media/event/source import.
