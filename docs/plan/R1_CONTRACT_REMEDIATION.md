# R1 contract remediation — maintainer REQUEST CHANGES, 2026-10-06

## Goal / dependencies / scope
LARGE contract remediation within the accepted R1 architecture. Preserve existing
K15 IDs/API, provider abstraction, identity/history/CAS/LKG and legacy R2 paths.
User reviewed architecture direction, requested contract changes, and explicitly
forbids provisioning, SQL migrations, production deployment and merging.
Base93c110d verified after fetch; branch `codex/master-plan-execution`, clean.

## Findings / implementation slices
1. Structural public snapshot canonicalization: explicit dataset allowlist,
   validated structures → canonical bytes → hashes/manifest → reviewed promotion.
   Test nested/top-level private fields, K15 parity, unknown modules and restore.
2. Separate MediaRecord binary identity from MediaBinding owner/role/evidence;
   enforce cardinality, owner sets and MIME, preserve paths and revocation.
3. AcquisitionOption item-scoped composite key; explicit deferred references and
   geography ownership; complete migrated field-to-table preservation matrix.
4. Configurable normalized bytes/record/relation budgets and sanitized quarantine.
5. Explicit staged/reviewed/promoted lifecycle, trusted-clock ordering and private
   reviewer identity. No stale attempt or review-after-promotion acceptance.
6. Event occurrence rule/override agreement invariant, no Event Service.
7. Two-source health/retry/global-generation CAS isolation tests and cached,
   materialized read-model expectation without premature SQL query redesign.
8. Reconcile R1 docs/master/handoff, run full applicable checks, checkpoint/push.
9. Audit next independent roadmap task; continue safe work, retain formal gates.

## Files / contracts / decisions
`src/server/{domainSnapshot,sourceSync}.ts`, `src/data/domain/{media,identity}.ts`,
small explicit contract helpers if needed, `tests/data/domain*.test.mjs`,
`docs/architecture/data-foundation.md`, DATA_FOUNDATION/master/CURRENT_STATE.
No frontend change or dependency upgrade. Record schema decisions before editing
their contracts; no unrelated refactor. Role evidence is binding-level; binary
rights approval remains revision-specific and independently fail closed.

## Validation / acceptance
Focused domain tests after each coherent slice; diff inspection/check, normal
commit/push and remote SHA verification. Final `pnpm lint`, `pnpm typecheck`,
`pnpm test`, `pnpm build`, domain tests and scaffold. No fabricated PASS.
LOCAL CONTRACT REVIEW READY requires all findings addressed and K15 payload/API
and R2 path parity; it is not maintainer approval or P9-I02/live DB acceptance.
Signed URL bounded expiry/purge/deny remains a provider/deployment acceptance gate.

## Completed / blockers / exact next / handoff
Preflight PASS: remote unchanged93c110d; no unrelated work. No source fetch needed.
Slice1 DONE: explicit four-dataset + provenance/file allowlist, canonical validated
envelopes/records, regenerated exact-byte hashes, canonical review/promotion.
16 sync/API tests PASS, including private fields in stored/restored snapshots,
unknown dataset/file quarantine, every K15 field and hash parity. Other findings
OPEN. Slice2 DONE: binary/binding separation, explicit role/owner/MIME/evidence,
duplicate/hash/primary/reference constraints and legacy paths.18 media/R2 tests,
focused lint and full typecheck PASS. Exact next: item-scoped acquisition keys,
deferred references, geography mapping and migrated field preservation matrix.
R1 re-review/provider/quota/legal/data gates remain intact.
Raw corpora/private evidence stay outside Git on E:. Full checks last274 PASS at
c53a111; NOT RUN yet for this remediation. No live provider workflow exists.
