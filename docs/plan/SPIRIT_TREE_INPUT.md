# P2-D06 — reviewed spirit-tree JSON input and path totals

## Goal / classification / dependencies
MEDIUM pure data feature. P1-D02 sample source review and P2-D02 schemas are DONE.
K02 ten-node sample proves missing root cost and shared-trunk accounting must stay
explicit. Reuse existing FriendshipGraph validation; no provider or UI required.
Source mapping/cost provenance is recorded in K02 and SOURCE_FIELD_MAPPING.

## Scope / affected contracts
Version1 manual JSON envelope containing a complete normalized graph, validated
against caller-supplied canonical/provenance registries. No invented name-based ID,
Lua execution, implicit edges/default prices or direct Wiki parsing. Input is draft
data only; validation is not review/publication approval. Provenance stays per node
and optional field provenance. Existing validators/public types remain unchanged.
Path calculation validates graph, selected tree/nodes and unique prerequisite
closure. Group by exact currency and raw label, never merge regular/ascended/event
currencies. Preserve unknown costs/nullable amounts as incomplete known subtotal.
Safe-integer overflow rejects output rather than rounding. Inputs are not mutated.

## Out of scope / gates
No React/tree view, DB sink, sync/export pipeline, public catalog switch, canonical
crosswalk authoring, exact game optionality, live prices, pricing/FX conversion,
TGC/community artwork or external requests. K04/K12 missing data do not become
facts. R1 provider/review gates unchanged; future adapter can supply this input.

## Files / implementation steps
- `src/data/catalog/friendshipInput.ts`: envelope validator and pure path calculator.
- catalog index/README: public entrypoint, file contract and incomplete semantics.
- `tests/data/friendshipInput.test.mjs`: synthetic behavior cases, no real IDs/assets.
- source plan/master/handoff: exact scope and milestone validation.
Steps: inspect callers/types; create versioned manual-input validation; compute
iterative closure with deterministic returned IDs/totals; test diamonds/shared
parents, unknown/free/zero, invalid graph/selection, currency separation and overflow.

## UX/API/security and failure modes
No UI in this slice. A future view must show partial/unavailable on missing costs
or errors; never label subtotal as full unlock cost. Errors use existing path/code
contract, no raw private data. Unknown fields projected away by current validators.
Published/retired manual input is rejected; caller must use a draft to stage.
Calculator can validate supplied published snapshots without causing persistence.
Wrong tree, orphan/cycle, missing provenance, malformed version/selection and unsafe
sum produce explicit errors. No callback/IO/provider code in domain functions.

## Validation / acceptance
Focused new tests + existing catalog tests first, then full data suite/lint/typecheck/
catalog/build once code stable. Need no browser since no UI. Acceptance: manual
envelope valid only at known schema/version/draft; preserves node costs/provenance;
unique ancestors counted once; optional siblings not included unless selected;
unknown cost produces complete=false; currency groups separated; no mutation;
invalid input/overflow cannot produce a numeric estimate or public data.

## State / next / handoff
DONE2026-10-06. Mapping/fetch checkpoint e4f27dc was pushed/verified before code.
Implemented pure file-envelope validator/calculator; no live parser, UI or DB.
Nine new tests/30 catalog-focused and235 full data tests PASS; lint/typecheck/
catalog1808/build PASS. Empty manual input rejected; no recursive closure/spread
of arbitrary parent arrays. Initial test lint missed structuredClone global;
fixed by explicit globalThis access, lint passed without rule/config changes.
Existing router directives/large catalog warnings persist, not introduced here.
Manual records retain explicit provenance; fake real-source completion not claimed.
Exact next: inspect P2-D05 K01 staged adapter dependencies/source mapping, then
write its scoped plan before implementation. K04/Q12/R1/provider/rights gates hold.
