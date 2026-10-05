# P1-U01 — attribution draft review

## Goal / scope
MEDIUM documentation slice: reusable text/sheet/route/asset credits aligned with
existing provenance and separate media rights. Deliver a reviewable template
without guessing Q12, copying media or changing approved K15 runtime credits.
No new schema, UI, source fetch, rights approval or publication.

## Dependencies / current state
P1-D13 is PARTIAL: reviewed field map exists, K04 columns unavailable403. Templates
can be prepared for verified source fields, but whole-source/final credit DoD is
not met. Existing Q12 and TGC/community gates remain. R1 provider approval does
not resolve source licenses or rights.

## Files / steps
1. Inspect SourceRecord, source map and current legal/credit boundaries. DONE.
2. Prepare [templates](../ATTRIBUTION_TEMPLATES.md) with public-only fields,
   actual-change statements and separate text/asset scope. DONE.
3. Compare K06/K07/K09/K15 examples against pinned metadata; keep K04 unavailable
   and Wiki exact license version unknown. DONE.
4. Check document links/scaffold and diff, then checkpoint/push. Checks PASS;
   checkpoint push is the next operation.
5. Maintainer resolves Q12 and reviews actual source/asset scope; integrate credits
   in consuming views/export only alongside approved records. BLOCKED on evidence.

## Risks / acceptance
No placeholder prompt can ship as a credit. No inferred creator, timestamp,
permission or source revision. Private evidence cannot enter public credits.
Draft acceptance: all four templates, known/unknown examples, provenance mapping
and actual-change prompts are present. Final P1-U01 remains PARTIAL until Q12,
source coverage and credit review are resolved; template presence is not rights
approval. K15 existing notice is preserved.

## Validation / handoff
`.commands/Check-Scaffold.ps1` PASS:71 Markdown files/14 source profiles/173 tasks;
`git diff --check` PASS for this docs-only slice.
Runtime unchanged;274 tests/lint/typecheck/catalog/build previously PASS atc53a111,
not rerun for documentation. Branch `codex/master-plan-execution`, base5538243.
Raw cached license metadata stays on E:, no raw corpus copied into the repo.
Exact next: resolve Q12 using applicable source/license evidence, then review
credits for actual published records. Until then audit other tasks by their
recorded dependencies; do not start source publication or media reuse.
