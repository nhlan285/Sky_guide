# P6-U03 — scoped local outfit backup/import/reset

## Goal / dependencies / scope
MEDIUM independent after P2-U01 versioned storage and P4-W09 library DONE.
Export only validated outfit library; import JSON into explicit replacement preview;
reset only that library after confirmation. Preserve current editor/draft, theme,
locale/preferences. No QR/private data/full localStorage dump, cloud, new dependency,
auto-import/apply outfit, generic aliases or filesystem autosave.

## Contract / steps / UX
Pure backup.ts encoder/parser: bounded100k UTF-8 bytes/characters, fixed format +
schemaVersion1, exact package ID and compatible package revision, validated/projected
library. Envelope revision and each outfit revision must agree before revalidation;
current export uses r2 and supported r1 imports undergo exact continuity contract.
Unknown IDs/version, duplicate/invalid records, malformed data reject whole import;
current library untouched until explicit confirm. Missing/future browser storage
uses existing wrapper memory/future protection, reporting persistence honestly.
UI in existing SavedOutfits area: export prepares download link; labeled file input
size guard and async race/unmount handling; count preview, apply/cancel; clear with
confirm/cancel; focus restored after operations. Loading/empty/error/too-large/
quota/future-version copy in vi/en; no editor onLoad/reset dispatch from backup.

## Files / acceptance / validation
backup.ts, OutfitBackup.tsx, SavedOutfits integration, copy, behavior tests,
master/handoff/this plan. Tests cover projection/no secrets, roundtrip/r1 continuity,
envelope mismatch/size/future IDs, no mutation, failure leaves stored library,
future/quota protection and confirmed reset's scope. Focused tests + full tests,
lint/typecheck/catalog/build. Browser/manual visuals recorded separately, never
assumed PASS. DONE2026-10-06 baselinec9609c9. Pure codec/native UI and six behavior
tests implemented;264 full tests/lint/typecheck/catalog1808/final build PASS.
React skill review covered event-driven IO, bounded versioned storage, stale async
ticket/unmount guard, Blob URL cleanup, native labels/status/focus/cancel and
no new dependencies. File input width constrained to panel. Browser/file picker,
download and responsive visual QA NOT RUN; existing build warnings unchanged.
Exact next: checkpoint/push then independent P6-R01/R02 Web Push/native research.
Other local-data kinds remain future explicit scopes; labels say outfit library only.
