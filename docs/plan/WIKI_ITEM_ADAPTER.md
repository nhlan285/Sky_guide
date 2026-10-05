# P2-D05 — staged Wiki item adapter

## Goal / scope / dependencies
MEDIUM source normalization after K01 P1-D01 and P1-D13 per-source mapping DONE,
P2-D02 Item validators DONE. Global P1-D13 is PARTIAL due unrelated K04 access.
Current source: literal Cosmetics/data, not Spirit Item/data generic definitions.
Existing Lua parser reused; no upstream execution, HTTP or runtime source switch.

## Contract / files
`scripts/wiki/items.mjs` pure Node staging function accepts bounded module text,
validated revision-pinned K01 SourceRecord and explicit mappings with sourceKey,
complete Item draft seed and caller-supplied acquisitionId. Registry must declare
canonical Item/provenance IDs. Names/raw types/exact price fields are normalized;
source keys and field provenance retained. Draft seed acquisition options must be
empty to avoid overwriting another observation; no auto alias or ID generation.
Only verified hair/mask/cape raw types auto-map; otherwise retain unknown/rawSlot.
C/H/AC tokens and explicit free supported; missing/unrecognized price stays unknown
with raw field/review note, not fabricated conversion or default. No asset URLs
generated. Caller maps relationships; icon/default type does not establish a
specific cosmetic or acquisition tree. Final result reuses validateItem.

## Failure / recovery / security
Staged result has nonempty candidate draft items; quarantine has candidateItems=null
(never a replacement empty catalog). Any parse/duplicate key/source/mapping/record
error rejects the batch. Reports contain stable codes/paths, not raw parser stack or
whole private source. No accepted-catalog input/output file or provider operation.
Source URLs/revision/attribution must be present, K01 verified provenance registered.
Literal parser diagnostics stripped of previous/replacement raw records.
Current real Cosmetics module has duplicate-key diagnostics: expected to quarantine
until separate review, not silently apply Lua last-wins. Never broaden scope to
fix upstream data or publish incomplete catalog. RIGHTS/TGC/DB gates unchanged.

## Expected changes / validation
Adapter, synthetic tests, catalog README pointer, this plan/master/current handoff.
Tests: exact fields and provenance; unknown/free/zero; no forced outfit split;
explicit registered mapping/IDs; unsupported/generic source; malformed/nonliteral/
duplicate Lua; mismatched map/duplicate item; no source execution or input mutation;
failed batch cannot produce an empty accepted catalog. Focused parser/catalog tests,
lint, full data suite/typecheck/build once stable. No browser or dependency change.

## Acceptance / state / exact next
Staging output passes Item validator, records provenance/unknowns and no public
mutation; failure has no candidate catalog. DONE2026-10-06, branch
codex/master-plan-execution, pushed baseline8899195. Adapter/tests/README complete.
Nine behavior tests and244 full tests PASS; lint/typecheck/catalog1808/build PASS.
Manual offline check against E: Cosmetics/data revision100805 returned quarantine,
duplicate_literal_key and null candidates as expected. No raw records copied into
tests/repo. Existing Router directive/large chunk build warnings unchanged.
Source-key conflicts reject instead of silently remapping an existing K01 binding.
Exact next: checkpoint/push, inspect P4-W04–W06 visible demo size/override behavior;
P2-D07 K04 and other generic integration gates remain open as recorded in handoff.
