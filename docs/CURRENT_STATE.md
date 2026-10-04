# Current handoff — 2026-10-04

Branch: `codex/roadmap-data-event-media-refresh`, based on freshly fetched
`origin/main` **c0c0ee0c55bc11d15a24269b2c0b591fb7940287** — merge PR #10
`codex/item-images-source-research`. Working tree was clean before this task.
`origin/develop` is 13 commits behind main / 0 ahead; not used as base or merged.
Master roadmap: [IMPLEMENTATION_PLAN](plan/IMPLEMENTATION_PLAN.md).
Active phase: **R0 docs reconciliation**, [task plan](plan/ROADMAP_RECONCILIATION.md).
R0 docs-only work complete; handoff to R1 after this docs commit/review.

## Completed product state (scope preserved)

- Living Sky / responsive atlas and Hub shell are production, per maintainer's
  current acceptance state. This docs task did not run fresh deployment/browser QA.
- K15 real Item Lookup: ~1,808 catalogue records, `/items`, `/items/:id`, pinned
  source/provenance + scoped importer/manifest/loader. K01–K12 and full generic
  source pipeline do not become DONE from this result.
- Wardrobe interactive demo uses self-created/fixture assets; no full game assets,
  persistence/share or visible override completion claimed.
- R2 runtime routing and Item/Wardrobe CSS collision fixes are in main.
  [R2 evidence/runbook](plan/R2_RUNTIME_DEBUG.md) preserves scoped validation.
- **PR #10 merged** in main c0c0ee0: item sizing, verified image/price source
  research, [dossier](../knowledge/16-image-price-sources.md) and small evidence
  registry. [Completed source phase](plan/ITEM_IMAGES_PRICE_SOURCES.md).
  Prior validation: lint/build/catalog/typecheck PASS, 169/169 tests PASS, browser
  sizing/long-title/empty/missing/mobile checks recorded there; not rerun in R0.

## R0 changes / decisions

Documentation only: roadmap task/dependency/feature matrices, active phase plan,
Architecture/Schema/PRD evolution notes, handoff and direct source/asset/status
contradictions. No source code, dependencies, corpus, environment or cloud changes.
All historical DONE task IDs stay DONE; R0 adds P9-R01 only as docs completion.

- Q01 historical CLOSED retained, canonical ownership **SUPERSEDED / EVOLVED**
  by Q20; projection/manifest/private/export/rights contracts remain.
- Q15 evolved: free-tier relational DB and R2/S3 storage permitted in architecture;
  scheduler only with task/quota approval; no automatic paid resources.
- Q20 central PostgreSQL-compatible canonical metadata + provider-neutral API,
  object-storage binaries; JSON projection/export/cache/snapshot/rollback/fixture.
- Q21 role-based itemImage/referenceImages reconciliation, dedupe, Warrior of Love
  Hair regression and one-season pilot before broader catalogue rollout.
- Q22 shared Emote/Call-Honk poster/video/audio pipeline + Music stable item IDs,
  V1 playable → V1.1 Sheets → V1.2 local Compose → V2 separately approved scope.
- Q23 multi-source Event Engine, IANA LA/DST, effective overrides, live API/LKG;
  Q14 source verification remains OPEN, K05 optional. Q10 market choice is already
  USD/US + VND/VN separately iOS/Android; price/mixed/ownership mapping still OPEN.

Central DB/Event/Music/animated pipeline are **APPROVED/DESIGNED**, implementation
**OPEN**; no central DB provisioned, no verified event adapter or new clips claimed.

## Validation / blockers / boundaries

R0: `Check-Scaffold.ps1`, `Get-PlanTasks.ps1`, bounded Markdown table/fence,
task/decision uniqueness, dependency/reference and local link-anchor checks,
historical DONE comparison, docs-only diff review and `git diff --check` PASS.
No browser QA, feature tests/build, external source fetch or bulk asset work needed
for Markdown-only changes. Prior 169-test evidence is historical, not R0 validation.

No R0 blocker. Future gates: schema/contracts review before DB provisioning;
provider/task/quota approval; event source/logic verification + KB entries;
DATA/RIGHTS/TGC per asset. Full game/Wardrobe assets remain legal-gated. Android/VND
per-SKU, full crosswalk/quantity/ownership mappings and ambiguous media need review.
Rights unknown fail closed; no paid resources, mass crawl/download or deployment
authorized by a design-only decision. Commit docs, stop; no main merge/push.

## Exact next implementation slice

**R1: P9-D01–P9-D03 + P9-I01**, refine its detailed phase plan, then implement/review
provider-neutral relational domain/schema mapping, stable IDs/FKs/revisions/
soft-delete/tombstone/provenance, public API contracts, AssetRegistry/object-storage
metadata interface and migration/scaling/backup/restore/rollback strategy using
small synthetic fixtures. Reuse existing K15 and R2 boundaries.

Review contracts/schema first. **P9-I02 provider selection/provisioning comes only
after that review and task/quota approval**, then sync/foundation validation.
Do not start item mass crawl, Event Engine, animated assets or Music before their
foundation/checkpoint dependencies. R0 ends at the docs commit; refine later phase
details when that phase begins, not from a full repository reread.
