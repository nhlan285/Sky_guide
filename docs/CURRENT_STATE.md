# Current handoff — 2026-10-04

Branch: `codex/item-images-source-research`, based on `origin/main` **26dbd9c**.
Main now contains the R2 runtime fix and the scoped Wardrobe selector fix; this
task does not continue the abandoned Opus changes.
Active task: [image sizing / source research](plan/ITEM_IMAGES_PRICE_SOURCES.md).
Stable roadmap: [implementation plan](plan/IMPLEMENTATION_PLAN.md).

## Completed scoped work

- CSS: catalogue min column 18rem, image ratio 5:4; detail hero up to 38rem/608px,
  gallery min column 18rem. Artwork remains contain, real variants/fallbacks and
  existing light/dark design preserved; no changes to Wardrobe, API or R2 corpus.
- Browser CLI verified real item 1216, item 1204 with long title, catalogue,
  empty search and missing-item recovery. Desktop 1440px: hero 608px square, gallery ~373px square,
  catalogue ~369x295px. Mobile 390px: detail/gallery ~356px square, catalogue
  ~356x285px; at 320px detail 286px square, catalogue ~286x229px. No horizontal
  overflow or browser errors. Screenshots are ignored local files under
  `tmp/source-research/`; they are not product assets.
- [Source dossier](../knowledge/16-image-price-sources.md) and
  [small evidence registry](../knowledge/evidence/image-price-sources-2026-10-04.json):
  SkyGame-Data package 1.3.19 (10 datasets, distinct GitHub/package snapshots),
  Wiki revisions/imageinfo, seasonal vs TS/special-visit mapping, independent
  Nesting shop/quantity semantics, official patch notes and public store coverage.
- User chose USD and VND, separated iOS/Android. iOS-US public list has sample
  USD prices; iOS-VN same ID returns 404. Google Play US/VN return 200 but no
  per-SKU prices verified. AppPricingLab remains candidate. Web store is a
  separate channel. No inferred FX rates, Android prices or free missing prices.

## Validation and limitations

Final pnpm lint PASS; pnpm test **169/169 PASS**; pnpm build PASS including catalog
validation and typecheck. Existing React Router directive / large-chunk warnings
remain. Evidence JSON parses and sample references/unknown-cost distinctions pass
bounded assertions. Temporary research helpers removed; lint config unchanged.
No new unit test for CSS-only sizing; actual layout checked in browser and existing
asset/fallback/query tests pass. No new deployment requested; Git push is authorized.

Low-resolution icons still look soft enlarged. Rights approval, full crosswalk,
Nesting first/additional quantity reconciliation and Android/VND per-SKU coverage
remain future crawler blockers. Do not present this research as complete catalog
verification or source publication. Gate/pipeline/schema completion status remains
unchanged. No mass crawl/download, source data/R2 write, env change or merge.

## Exact next action

Review the new branch and UI/source dossier; the maintainer merges personally.
Future phase: approve contracts then implement source crosswalk and versioned
offers, independent shop adapters and separate iOS/Android market observations.
Do not silently promote community reference prices into official store observations.

## Earlier repair reference

[R2 runtime debug](plan/R2_RUNTIME_DEBUG.md) records the proven artifact routing
and Web Request export fix, regression and Preview verification. Earlier standalone
API tsc passed; Vercel build exited 0 with pre-existing S3Client.send diagnostics.
No API/routing changes are part of the current task.
