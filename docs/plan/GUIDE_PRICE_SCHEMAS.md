# P2-D03 — guide and price schemas

## Goal / dependencies / scope

MEDIUM, independent of R1 provisioning. P2-D01 core validators are DONE; reuse
existing metadata/provenance/FK validators and the DATA_SCHEMA contract.
Implement Realm/Map/Marker/Route/Step and IAP Product/Observation/Mapping/Estimate
types and validators. No source fetch/import, UI, conversion algorithm, FX rates,
copyrighted maps, package inference or provider migration. Q10 mapping choices
remain open; validation does not establish price/source verification.

## Files / implementation / acceptance

`src/data/catalog/geography.ts`, `prices.ts`, tests and catalog exports.
- [x] Geo validators: finite normalized coordinates, paired nulls, map revision,
  FK/unique route step order, membership and public field projection.
- [x] Price validators: exact nonnegative decimal strings, unknown ≠ zero,
  platform/market/currency consistency, product contents and item mapping evidence.
- [x] Negative fixtures cover stale calibration, missing references, mixed market,
  invalid pricing and private fields. No synthetic records enter public datasets.
- [x] Focused tests then lint/typecheck/full tests/build at checkpoint.
- [x] Update task status and handoff; commit/push, continue next unblocked task.

## Risks / validation / handoff

Map revision change must invalidate old markers. Never infer free from missing
price or sum money from different markets/currencies/platforms. Nullable fields
remain explicit. Source/rights gates live outside these pure validators.
No API routes/UI changes. Exact next action: implement geography validators and
fixtures, then prices. Current baseline `4639c0c`, 200 tests/lint/typecheck/build PASS.

Completed: all validators and 9 focused negative/round-trip tests.
Validation: 209/209 full tests, focused lint, typecheck/catalog/build PASS.
No current source/price verification is inferred. Next: checkpoint then P4-W09.
