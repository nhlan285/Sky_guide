# Item image sizing and price/image source verification — 2026-10-04

## Goal / why

Make detail artwork visibly larger than catalogue thumbnails on desktop/mobile.
Prepare verified source contracts for a future comprehensive crawler: artwork,
seasonal prices, returning spirit candle prices, real-money IAP and non-spirit
shops (especially Nesting). Classification: MEDIUM UI work plus source research;
no new crawler subsystem or catalog migration in this task.

## Dependencies / current state

Branch codex/item-images-source-research starts at origin/main 26dbd9c, which
contains the R2 runtime and wardrobe CSS fixes. Existing architecture, schema,
catalog, image corpus and legal status remain in force. User selected USD and
VND with separate iOS/Android observations. Existing IAP schema already models
market/platform/currency/time; raw imported money alone does not identify them.

## Scope and boundaries

In scope: responsive CSS sizing, verified public-source research, small evidence
samples, candidate source registry, coverage/field mapping, future crawl tasks.
Out of scope: production deployment/merge, mass crawling/downloading, image
processing/R2 changes, guessed prices, FX conversion, catalog updates, new auth,
database, schema migration or checkout automation. Website screenshots are
visual references, not source-price evidence.

## Steps and acceptance criteria

- [x] Inspect current styles/callers, source KB and relevant existing contracts.
- [x] Enlarge catalogue image frames moderately and detail/gallery more strongly;
      preserve contain, placeholders, long titles, mobile and Wardrobe sizing.
- [x] Verify desktop/mobile with real assets, no overflow or browser errors.
- [x] Verify public retrieval, revision/commit and actual sample fields for sources.
- [x] Cover seasonal vs returning-spirit offers, independent shops, bundle/unit
      prices and source image metadata; record unsupported coverage explicitly.
- [x] Record USD/VND by platform; do not infer Android prices from iOS or use
      generic store ranges as item prices.
- [x] Produce source dossier and machine-readable evidence registry, with field
      mappings, conflict policy, blockers and ordered future crawler steps.
- [x] Lint/build/typecheck and all existing tests; final diff and handoff.

## Expected files / contracts / UX

src/app/styles/items.css; knowledge source dossier/registry; targeted KB pointers;
this active task plan, existing roadmap pointer and CURRENT_STATE.md.
No public runtime contract changes. Main detail uses existing detail image
variant; gallery/card variants remain controlled. Unavailable artwork keeps its
placeholder. Data proposals extend existing acquisition/IAP/asset boundaries in
documentation only. Source conflicts remain reviewable, never silently resolved.

## Risks and validation

Low-resolution originals can remain soft when enlarged; no artificial upscaling.
Community sources can be stale, incomplete or describe beta/NetEase rather than
global live. Revision/date/server/offer scope matter. Public store listing is not
a complete per-SKU feed. Text/code license does not grant artwork reuse.
Validate with browser at 1440px, 390px and narrow mobile; pnpm lint, pnpm build
(includes typecheck), focused relevant tests. Network retrieval is bounded and
cached within this research; no full repository/data-corpus rescan.

## Completed / blockers / decisions / handoff

Approved: USD and VND, separate iOS/Android, no automatic currency conversion.
Completed: desktop hero 608px, gallery ~373px, catalogue ~369x295px; 390px mobile
detail/gallery ~356px square, catalogue ~356x285px. 320px no overflow. Real images
load, long title fits, browser error log empty. Existing 169 tests, lint and build
(catalog validation + typecheck) pass; existing Vite warnings remain. Temporary
research helpers were removed after retrieval (first lint included them; final
lint passes without changing lint configuration).

Verified 10 SkyGame-Data datasets pinned to package 1.3.19; exact package currency
types, Wiki revisions/file metadata, Angler TS + special visit, Nesting ownership
ambiguity, Apple US prices, Apple VN 404 and Google Play US/VN 200. Source dossier
and small evidence JSON record actual mappings and unresolved coverage. No price
or asset publication. USD community references lack platform/market observations;
VND and Android per-SKU remain blockers for a future crawler, not this research.

Completion checkpoint: **PR #10 merged 2026-10-04**, main `c0c0ee0`, by maintainer.
Branch/base above are historical evidence, not a pending merge. Next execution
order is [roadmap R1–R6](IMPLEMENTATION_PLAN.md): data/storage contracts first,
then role-based media reconciliation pilot (P9-D05/P9-D06/P9-V02), not an automatic
bulk crawler. Crosswalk/offers/store captures still require separate reviewed
scope, rights/quantity/source contracts; research did not implement them.
