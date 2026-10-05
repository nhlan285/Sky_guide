# P3-U04 — lookup filter preferences slice

## Goal / scope / dependencies
MEDIUM. P2-U01 wrapper and P3-H01 URL filters exist. Persist only lookup query and
category/slot/season/spirit/acquisition selections in an owned versioned key.
Restore when a fresh Items list mounts with an empty query string. Any explicit
URL query wins in full; no hidden merging. Detail URLs, contextual links, pagination,
outfits, language and theme keep existing contracts. No market/spoiler UI until
their modules/data are ready; P3-U04 remains PARTIAL overall.

## Contract / decisions / UX
Pure preferences module validates bounded strings and current known filter values;
unknown/stale stored references fail closed to default with truthful memory status.
No page number, unknown URL keys, private data or full storage dump. User filter
changes persist synchronously through existing wrapper, not an effect on initial
mount. Visiting an explicit shared URL never silently rewrites saved preferences.
Clear filters explicitly resets only preference key and current URL filters;
unrelated URL keys/storage survive. Future versions protected until explicit clear.
Storage failure retains current URL filtering with status and retry action.
Existing inputs/primitives/styles; vi/en copy. Query > bounded storage length can
still filter via URL, but reports not saved. No dependency/schema migrations.

## Files / steps / acceptance
preferences.ts, Items.tsx, copy, focused behavior tests, master/handoff. Test:
reload restoration, explicit URL precedence (including unknown-only query), no
page/private projection, stale IDs/size limits, reset isolation, denied write/future
envelopes. Focused tests then full tests/lint/typecheck/build and local browser
smoke. No source/rights claim.

## Completed / validation / handoff
DONE scoped filters2026-10-06. Codec/storage + event-driven Items consumer and vi/en
failure/retry/future/invalid copy implemented. Errors remain visible when filter
details are collapsed. Current URL is read directly on subsequent explicit SPA
navigation too, avoiding React Router default-param merge into shared links.
Five behavioral tests PASS; full269 tests PASS. Initial full lint found missing
Node URLSearchParams import in new test; fixed, full lint/typecheck then PASS.
Final focused tests/Items lint and build (catalog1808/typecheck) PASS after moving
failure status outside collapsed details. Existing Router/chunk warnings unchanged.
Local production preview: query saved, fresh bare `/items` restores it; pagination
keeps query; explicit category+unrelated URL has empty query and correct category;
clear retains unrelated URL key and fresh bare list is default. Category select
and reload PASS. At390 viewport document width375; no console errors captured.
Screenshot untracked on E:/SkyGuideAssets/research/local-qa-2026-10-06/
lookup-preferences-mobile.jpg. Quota/future protection covered by injected storage
tests, not browser mutation. No market/spoiler state added, no outfit/theme/locale
key touched. Exact next: checkpoint/push; audit P0-I04 existing preview evidence
and rollback instructions without creating a deployment.
