# Current handoff — 2026-10-07

## Task / branch / checkpoint
Sky Guide autonomous master run ACTIVE; roadmap OPEN, not complete.
Branch codex/master-plan-execution; checkpoint parent
1e97f60db8b646133a18283f2cc8fd3a25c732ae verified on origin.
Resolve latest checkpoint with git log -1 and verify remote SHA.
Master: [IMPLEMENTATION_PLAN](plan/IMPLEMENTATION_PLAN.md).
Active phase: [POSTGRES_PROVIDER_SELECTION](plan/POSTGRES_PROVIDER_SELECTION.md),
latest section. Applied journal review: [JOURNAL_NATIVE_REVIEW](plan/JOURNAL_NATIVE_REVIEW.md).

## Authority / boundaries
R1 contracts, Supabase Free/Dyland's Org remain approved. Dev only
sky-guide-dev tpbydviuknovimroeodm; hard $0; no production merge/deploy.
User approved abd8712 creator postgres temporary SET TRUE/INHERIT FALSE/ADMIN FALSE.
ALL temporary memberships and fixture data share each outer ROLLBACK transaction.
Check full baseline before/after; STOP on drift. No new principal/credentials or
retained temporary membership. Two bootstrap creator edges remain ADMIN TRUE /
INHERIT FALSE / SET FALSE; do not confuse them with temporary SET grants.
User subsequently approved cb95d3a one-function scan migration, guarded body restore,
and automatic continuation. That trial and its restore are now executed.
New architecture/migration scope still requires a concrete reviewed proposal under
user rule22. R1/provider/org/existing creator authority need not be requested again.
Schema and exact full-K15 benchmark gates mandatory. SDK/Auth/credentials, durable
commits/independent sessions/crash/restore/consumers/scheduler/rights separate.

## Completed / current hosted state
K02/P1-D02 sample DONE at2e6d110:10 nodes/9 edges; root price unknown, totals partial.
Earlier provider-neutral domain/API/storage/sync contracts and unmounted v2
journal/Store/kernel retain evidence boundaries. Full R1/P9-I02/D04/V01 OPEN.
Hosted PG17.11:83 private tables,37 functions,155 custom triggers,201 policies,
2 NOLOGIN/NOINHERIT/NOBYPASSRLS runtime groups. All owners empty except revision0
sync_generation and inactive singleton sync_commit_control. Full metadata/ACL/
structure/column/policy/setting/membership baseline PASS; no public/platform grants.
Journal applied20261007132330; privileges20261007132621. First13 migration files
unchanged; journal CASE syntax repair and deliberately reviewed structure pins remain.
Original owner/creator/8-denial rollback proofs PASS at2925996.

## Scan trial / authoritative outcome
128 read-only predicate cases matched both actual SQL forms and independent model.
Approved scan-fusion up applied as20261007160926_private_release_metadata_scan;
SHA2560d22bfb19c108dbcbaf596a89fa26300eac8c1b21f8ada7cda5ac554474f3423.
Full after baseline matched ONLY reviewed body/migration changes.
On trial body, owner AND creator adapter PASS:5 phases/39 callbacks/978 query checks/
6 token negatives each, independently verified complete returned rows.8 actual
creator-role forbidden operations rejected. Full baseline matched after EACH
ROLLBACK; no fixture data/temporary SET retained.

EXACT packed full-K15 (46,341 canonical/4,367 release rows,30s cap) again failed57014
at deferred validate_release_metadata materialized-scope query. No complete internal
timing receipt; no performance PASS or inferred phase cost. Baseline after timeout
identical to trial baseline. Original DO hash guard/data/order/timing boundaries/cap
unchanged; packed SHA256
9b1492072ce09e0dd9b2cb323c159495384a21a7d8aeabbc51c030c9f95eaed7.
Reducing repeated scans within an event did not satisfy the benchmark gate.

Executed approved guarded down via additive migration
20261007161625_restore_release_metadata_scan; SHA256
85b5f5d435378b1c02f00b6fcaef60ecb101aaeb65d983b3dceb34d68fb31afd.
Exact original body MD5 b2ecccd2deae57f41a2debe3cf806529 restored. Full schema/ACL
checker PASS; complete baseline matches pre-trial EXCEPT two appended migration
versions. Original function aggregate SHA256
dbf5e0bacca3bfed036f314ec70a7a857ff246b0b5058895c5e231ab3938a1e1.
All15 migrations retained; no history deletion/rewriting. Current83 and historical79
function pins again agree for original owners. Native single-function down proved;
full journal/schema down, durable/concurrent/crash/restore/SDK proof still OPEN.
Supabase security advisors lints=[].

## Files / validation / evidence
Intentionally modified: two additive scan/restore migrations, current83 body pin
restoration, source-driven review endpoint builder/tests and existing plans/handoff.
Full429 tests PASS on trial pin; after restore8 focused tests PASS. Lint/typecheck
PASS before restore; after restore lint/typecheck/8 focused/scaffold/diff PASS. App build previously PASS
at2925996; unchanged UI/app build inputs, not rerun for this SQL slice.
All raw SQL/corpora/checkers/receipts/logs outside Git at
E:/SkyGuideAssets/research/postgres-rehearsal-2026-10-07/.
Latest: release-scan-{before,after,restored}-baseline.json;
release-scan-{owner,creator,denial}-receipt.json;
release-scan-post-{owner,creator,denial}-baseline.json;
release-scan-k15-timeout-receipt.json; release-scan-native-final-tests.log.
Larger release-scan-k15-native-result.json has raw connector error/context;
use bounded timeout receipt for resume. No live test/API job at this checkpoint.

## Exact next / remaining gates
Prepare a local
reviewable alternative that avoids full-scan repetition while preserving all final
state checks and later invalidation after SET CONSTRAINTS/SAVEPOINT boundaries.
Evaluate a protected transaction/statement validation clock + per-release witness
against affected-row validation. Session flags, client-writable cache and validation
only at initial insert are unsafe. Any typed cache owner/definer helper/privilege/
trigger expansion must be explicitly reviewed before hosted application; not covered
by the now exhausted one-function scan approval. Do not raise timeout or disable
integrity. No repeat of the same failed candidate or real import/consumer before PASS.
R2–R6 depend on R1. K04 OneDrive403; K10/K11 SKU/market; K12 bulk reuse prohibited;
Q02/Q09/Q10/Q11/Q12, TGC/media rights, Vercel403 and native-device gates remain OPEN.
Node24/pnpm10.30.3 via E:/Code/corepack.cmd; CLI2.120.0/cache E:. No Docker/browser/
server owned. Checkpoint intentional files only; push and verify SHA. Native automatic
compaction only; never run shell /compact or invent context/usage percentages.
