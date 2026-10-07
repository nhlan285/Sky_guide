# Current handoff — 2026-10-08

## Task / branch / checkpoint
Sky Guide autonomous master run ACTIVE; roadmap OPEN, not complete.
Branch codex/master-plan-execution; checkpoint parent
1d95d953c05387f60a3c95c7468e0df2dc76d3a9 verified on origin.
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
Local clock model added in tests/fixtures/releaseValidationClockModel.mjs and
tests/data/releaseValidationClockModel.test.mjs.5 planning-model tests cover128
predicate traces, canonical invalidation, savepoints/failed statements and release/
transaction keys, including a counterexample that REJECTS BEFORE-statement-only
clock caching: a helper can claim midway through a write, before a later invalid row.
13 focused tests/lint/scaffold/diff PASS; full suite including new5 models NOT RUN.
No proposed clock/cache SQL, owners, helpers or privileges applied.

## New review packet — PREPARED / NOT APPLIED
Active phase “Concrete bracket package” has exact source/hash/ACL/rollback details.
Prepared source-derived up/down outside migration discovery:
supabase/proposals/release_validation_bracket_{up,down}.sql.
Candidate brackets every83-owner write with protected entry/exit invalidation; while
depth>0 it ignores every cache hit and never records a witness. Original full global
checks copied byte-for-byte into helper; wrapper remains invoker. Narrow NEW scope:
2 private internal owners,3 allowlisted postgres-owned SECURITY DEFINER helpers,
166 statement hooks +2 truncate guards;85 tables/40 functions/323 custom triggers.
Clients get no internal-owner access; writer EXECUTE on full-check helper only.
No new principal/credentials/SDK/consumer/production. New scoped approval required.
Full before schema/ACL + original15-history/empty guard executed natively without
DDL; complete baseline matched restored83 state. E:
release-bracket-preparation-baseline.json. New85 helpers/guards/cost/down NOT RUN.
Prepared E owner fixture7 negatives/5 positives, creator denial25 checks, all outer
ROLLBACK. Existing creator authority unchanged. Actual-output verifier prepared;
synthetic verifier/model outputs do not become native proof. Models7/proposal3
focused/full439 tests/lint/typecheck/scaffold76 Markdown14 profiles173 tasks/diff PASS.
Initial lint unused CLI binding fixed, SQL review bytes unchanged. App build remains
previous PASS/not rerun; this packet changes only SQL proposals/planning/tests.
Final staged diff caught guard-only trailing spaces; regenerated up/down/fixtures
without them and updated exact review hashes;3 focused proposal tests PASS. Function
and metadata checker hashes unchanged. First checkpoint558f7a6 is superseded by
this formatting-repair checkpoint; approve the latest verified HEAD, not old hashes.
Modified: current model/tests, bracket proposal/fixture builders and verifier,
two proposal SQL files, active phase/master/handoff. Logs/artifacts remain on E:.

Preapproval guard correction: an extra allowlisted-name trigger calling a helper
outside sky_private could be invisible to both old/new trigger comparisons. New
comparison includes every matching-name private-table trigger and pins its function
namespace; actual-row verifier rejects extra/changed-schema hooks. A corruption
test reproduces the former omission.4 focused proposal tests PASS; original DDL/
helper bodies/permissions/counts unchanged. Regenerated up/down and E fixtures;
active plan hashes supersede1d95d95. Before83 checker unchanged; no connector/hosted
DDL/new native proof this turn.439 full tests remain previous evidence, not rerun.
Current guard slice:4 focused tests/lint/typecheck PASS; no app build rerun.
Master dependencies confirm R2–R6 and live sync consumers require R1 acceptance;
they cannot be opened while native foundation/benchmark approval remains pending.

## Exact next / remaining gates
Push SHA-verified review checkpoint and obtain scoped85-owner/3-definer/168-hook
up/down approval under user rule22. Before-only clock remains rejected; new entry/
exit bracket with no cache during writes is a prepared candidate, not native PASS.
After approval revalidate83 baseline, CLI migration/application, explicit new85
structure/metadata/ACL source review, owner/creator/denial/adversarial/K15 rehearsals,
full baseline after EACH ROLLBACK and empty-state down proof. Original30s cost gate
and full schema/SDK/durable/concurrent/crash/restore remain. No one-function approval
inferred for new helpers/owners. No real import/consumer before foundation acceptance.
R2–R6 depend on R1. K04 OneDrive403; K10/K11 SKU/market; K12 bulk reuse prohibited;
Q02/Q09/Q10/Q11/Q12, TGC/media rights, Vercel403 and native-device gates remain OPEN.
Node24/pnpm10.30.3 via E:/Code/corepack.cmd; CLI2.120.0/cache E:. No Docker/browser/
server owned. Checkpoint intentional files only; push and verify SHA. Native automatic
compaction only; never run shell /compact or invent context/usage percentages.
