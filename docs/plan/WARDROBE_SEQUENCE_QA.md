# P4-W12 — bounded demo workflow regression

## Goal / scope
MEDIUM test-only slice. Exercise the existing approved demo through reducer,
render geometry, size override, dye, gzip share, explicit library save and a fresh
storage wrapper reload. Existing unit tests cover the individual operations;
this slice checks their composition and continued editing after restoration.

## Dependencies / contracts
P4-W05/W06/W07/W09/W10 demo behavior exists and has regression coverage.
The exact demo r1-to-r2 compatibility path is already implemented. Generic
P4-W11 depends on canonical alias/tombstone data and remains OPEN; this slice
does not satisfy that dependency or close full P4-W12.
Use actual demo manifest r2 and unchanged public functions. Chosen base remains
persisted; effective size and render layers are derived. Save is explicit;
unsaved edits must not overwrite the saved library. No real game rules/assets,
new dependencies, runtime/UI edits, provider, browser or production work.

## Files / steps
1. Add tests/data/wardrobeSequence.test.mjs using actual validated fixture.
2. Across all four sizes, equip/change base/override/reject/remove/dye/share/save/
reload, then repeat override cycles and compare restored render geometry.
3. Save with an active override; make unsaved edits; reload the saved selection,
remove its override, explicitly save another outfit and preserve the first.
4. Run focused Wardrobe tests, lint and full tests; inspect diff and scaffold.
5. Update master/handoff with PARTIAL W12 scope; normal commit/push/SHA verify.

## Acceptance / risks
Assert user-visible selection, base/effective size, active layer ownership and
dye at transitions, plus unchanged render geometry after share/storage round-trip.
Rejected actions retain accepted render/share state. Fresh storage wrappers use
the same simulated KeyStorage, with write counts checked for explicit saving.
Tests use real gzip codec, not mocked transport. Avoid copying transform math or
duplicating existing isolated unit tests. This is local composition evidence,
not actual browser reload, device/offline QA or generic alias migration evidence.

## Current state / exact next / handoff
Started at a565652 on codex/master-plan-execution, clean tree, remote verified.
R1 is LOCAL CONTRACT REVIEW READY; maintainer re-review pending before P9-I02.
Completed: five workflow tests (four actual sizes plus saved-override/unsaved-edit
scenario),61 focused Wardrobe tests and301 full tests PASS; pnpm lint PASS.
No runtime bug found or runtime/UI changes made. R1 typecheck/build PASS at
c5804c6; not rerun for this test/docs-only slice. Scaffold/diff checked before
checkpoint. Full W12 remains PARTIAL. Changes limited to this plan, sequence
test, master row and current handoff. Resolve this checkpoint SHA with git log -1
and verify remote on resume.

## Remaining dependency audit / exact next
No additional dependency-ready implementation slice identified within the current
approved scopes. Do not manufacture work by extending R2/R3 before R1 review or
generic export/alias/offline without their upstream contracts/data. Real tree,
TS, news, maps and price UI require reviewed source/canonical relationships and
the corresponding source coverage. Release/device QA remains incomplete; existing
local browser smoke is not evidence for protected Preview or Android/iOS devices.
Exact next safe action: maintainer inspect R1 finding-by-finding evidence and this
workflow subset; local corrections remain safe if review identifies any.
Next implementation depends on maintainer re-review or actual source/rights/access
evidence as listed in CURRENT_STATE. No resource or production action authorized.
