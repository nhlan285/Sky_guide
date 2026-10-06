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
unknown dataset/file quarantine, every K15 field and hash parity. Slice2 DONE:
binary/binding separation, explicit role/owner/MIME/evidence,
duplicate/hash/primary/reference constraints and legacy paths.18 media/R2 tests,
focused lint and full typecheck PASS. Slice3 DONE: Option B composite item/option
identity, Realm Location subtype mapping, deferred node/product/realm refs and
executable every-field preservation inventory + matrix. Coverage test found
previously undeclared public manifest source/importReport; explicit schemas now
preserve both while stripping nested operational fields.36 migration/sync/API/
lookup tests, focused lint/full typecheck PASS.
Slice4a DONE: required configurable raw/normalized bytes, total record and relation
limits checked before parsing and after canonicalization; sanitized quarantine.
11 sync tests PASS; ordinary K15 fixture and tiny-source expansion/limits covered.
Slice4b/5 DONE locally: fetched/staged/reviewed/server promotion lifecycle,
candidate review digest binds audit metadata and base; unchanged branch requires
review, old retry is read-only, stale/future events cannot regress health/global
clock. Event occurrence rule/override agreement and materialized read-model intent
documented. Two-source deterministic health/retry/CAS/recovery tests implemented.
Final validation:46 domain/296 full tests, pnpm lint/typecheck/build PASS atc5804c6.
Status: **R1 LOCAL CONTRACT APPROVED** by user2026-10-06: `phê duyệt, tự tiếp tục`.
Historical local readiness achieved; human approval closes maintainer re-review
gate for this package, not live DB/SQL/restore acceptance.
Exact next: [provider selection/quota audit](POSTGRES_PROVIDER_SELECTION.md),
then account-specific preflight and approved development environment. Independent
W12 sequence/focus QA completed; generic alias migration remains OPEN.
R1 re-review is approved; provider/quota/legal/data/production gates remain.
Raw corpora/private evidence stay outside Git on E:. No live provider workflow.

## Finding-by-finding local acceptance evidence

| Finding | Local evidence / result |
| --- | --- |
| Structural stored projection, private fields, unknown datasets, hashes/restore | domainSync four canonicalization regressions + restored re-promotion; domainApi parity. PASS |
| Binary identity vs role/owner binding/cardinality/rights/legacy paths | domainMedia eleven tests + existing r2Runtime seven tests. PASS |
| Composite acquisition key, deferred refs, geography, full field inventory | domainMigration five tests; all actual K15 fields and nested metadata mapped. PASS |
| Raw and normalized byte/record/relation budgets | domainSync tiny-source expansion + existing raw-limit/quarantine tests. PASS |
| Trusted-clock lifecycle, exact approval, no stale/unauthorized reconfirmation | domainSync non-equal lifecycle, recovery, stale/future/global-clock tests. PASS |
| Occurrence/override selected-rule agreement | domainIdentity regression, same event/two rules. PASS |
| Materialized/versioned read model intent | architecture expectation; DomainRepository/API preserved. DONE contract; live cache unimplemented |
| Two-source isolation/global CAS/recovery | domainSync K15/K01 synthetic trigger tests. PASS; not a real K01 importer |
| Signed URL expiry/purge/revocation rollout gate | Existing delivery expiry/revocation tests; null expiry allowed only at local contract stage. Gate preserved |
| Full applicable validation / docs / no provider claim |46 domain/296 full, lint/typecheck/build PASS; scaffold/diff before checkpoint. Live DB/DDL/provider/production NOT RUN |
