# Current handoff — 2026-10-08

## Task / branch / checkpoint
Sky Guide autonomous master run ACTIVE; full roadmap OPEN, not complete.
Branch codex/master-plan-execution; checkpoint parent
e58d54329ed32dfd94d00759e3985c119bdb0ced verified on origin.
Resolve latest checkpoint with git log -1 and verify remote SHA.
Master: [IMPLEMENTATION_PLAN](plan/IMPLEMENTATION_PLAN.md).
Active phase: [POSTGRES_PROVIDER_SELECTION](plan/POSTGRES_PROVIDER_SELECTION.md),
latest sections. R1 acceptance/dependent R2–R6 remain gated.

## Authority / boundaries
User directly approved exact5d9058eb5026a74fa25caeedcb308566d8774fd5 package:
2 private internal tables,3 existing-postgres SECURITY DEFINER helpers,168 triggers.
Supabase Free/$0 development only: sky-guide-dev tpbydviuknovimroeodm / Dyland's Org.
No production merge/deploy, paid resource, new DB principal/password/credentials,
SDK/Auth/consumer/scheduler/rights or permission/infrastructure expansion.
Runtime cannot access internal tables/columns; writer EXECUTE on full-check helper
only. Existing creator postgres temporary SET TRUE/INHERIT FALSE/ADMIN FALSE approved.
ALL fixture data and temporary SET share each outer ROLLBACK. Full baseline before/
after; STOP on drift. Two bootstrap creator edges retain ADMIN TRUE / INHERIT FALSE /
SET FALSE, grantor supabase_admin/OID10; temporary SET is not that baseline.
Prepared down allowed on actual failed trial ONLY if empty85/source/history guard
matches; retain migration history. No new approval needed for that scoped down.

## Completed / current hosted state
K02/P1-D02 bounded sample DONE at2e6d110:10 nodes/9 edges; root price unknown,
totals partial. Other source/access/rights gates remain unchanged.
PG17.11:85 private tables,40 functions,323 custom triggers,201 policies,
2 NOLOGIN/NOINHERIT/NOBYPASSRLS runtime groups. Exact3 new private definers owned by
existing postgres; empty search_path; wrapper remains invoker. Internal owners have
RLS/no policies and closed client ACL. All tables empty except generation revision0,
inactive sync_commit_control and release_validation_clock(1,epoch0,depth0,writerNULL);
witness0. No fixture/tempSET retained. Security advisor only intentional2 INFO
rls_enabled_no_policy for internal owners; do not add policies to silence them.

Original15 migrations preserved. Approved up applied via migration tool as
20261008044236_private_release_validation_brackets, CLI-created file aligned to
actual recorded version. Up341425 bytes SHA256
d518e0e751b6c8ab0321f3b66b17a6dfa22f176e02294fc0b70e87124325d8bf.
Prepared down333305 bytes SHA256
64add0eee994e8d5d079fe36e2362e9585b4837c7452a870520d6aae17711b41.
16 history versions retained. Down NOT RUN: no demonstrated schema/validator/
benchmark failure; missing concurrency is a transport gate. Keep approved85 dev
installation for continued proof. Original79/83 app profiles unchanged; separate85
executable source guard/whole snapshot builder in tests/sql.

## Native evidence — scoped PASS
Before application complete83 baseline exactly matched restored scan-trial receipt.
After application full85 source-pinned schema/ACL/columns/settings/constraints/
indexes/policies/function bodies/hook namespace and empty/history guards PASS.
No fetched metadata auto-adoption. After EACH successful/error fixture ROLLBACK,
full source guard + complete metadata/data/membership/clock/witness baseline exact.
- Owner adversarial7 helper-targeted negatives/5 positives PASS; independent whole
  returned rows and transaction/epoch witness verified.
- Creator25 new ACL denials and8 existing forbidden operations PASS.
- Owner AND authorized creator adapter each5 phases/39 callbacks/978 query checks/
  6 token negatives PASS; complete journal rows independently verified.
- EXACT full-K15 PASS:46341 canonical/4367 release rows;1808 items,213 spirits,
  30 seasons,244 provenance,2051 identities,4103 memberships. Packed SHA256
  9b1492072ce09e0dd9b2cb323c159495384a21a7d8aeabbc51c030c9f95eaed7 unchanged;
  native original-DO hash guard passed. Independent complete timing/count receipt:
  canonical3918.485ms + release1309.237ms + deferred11251.532ms =
  total16479.254ms, original30s cap. Whole baseline after ROLLBACK exact.
No transport/unpack/wall-clock/production-capacity timing inferred.

Fixture repairs only: schema-qualified release_metadata_state after42704; expected
whole native rows include generated dataset fields (no field discarded).
Owner fixture254827 bytes SHA256
398e2bb7e1f6a12e5fc2dc911bdce2c5a86f31f66fa7345efcdbccfaa3f3ad82.
Applied DDL/functions/permissions/data/order/timing cap unchanged.

## Concurrency — NOT ACHIEVED / current gate
Prepared3-session zero-row owner-write/observer SQL requires distinct backend PIDs,
observed B blocked by A, rollback-isolated clocks. Connector dispatch did not produce
overlap: A completed; B/observer absence assertions failed. Baseline after EACH exact.
Actor/current session both postgres and local application labels verified correct.
Bounded15s timeline probe: A163749/xid2151 ended05:07:25.877181 UTC; B163764 ran
05:07:27.137556, seen_a=[]. This does not prove concurrency or database serialization.
Do not repeat this connector probe or substitute model/serial evidence.
CLI2.120.0 supports Management API --linked --project-ref; read-only preflight found
no access token. No login/token or credential operation performed. Authentication
outside exact5d9058e scope needs user rule22 authorization or user-supplied ready CLI.
Even limited zero-row lock proof would not close all durable adapter/CAS/SDK races.

## Files / validation
Intentional areas: one approved migration, proposal/baseline/adversarial/concurrency
builders/verifiers and focused tests, historical83 test reconstruction, active plan/
master/handoff. Historical tests explicitly stop at restored83 migration20261007161625;
all unknown-object/definer/body rejection assertions retained. New85 applied migration
compared byte-for-byte with approved source. Full442 tests, lint/typecheck,
focused tests and scaffold76 Markdown/14 profiles/173 tasks PASS; diff checked.
App build previously PASS at2925996; app build inputs unchanged, NOT RERUN.
No live SQL/test/tool job remains. Node24/pnpm10.30.3 via E:/Code/corepack.cmd;
CLI2.120.0/npm cache E:/SkyGuideAssets/tools/npm-cache. No owned Docker/browser/server.

All raw SQL/logs/native receipts/baselines outside Git at:
E:/SkyGuideAssets/research/postgres-rehearsal-2026-10-07/.
Key files: release-bracket-applied-baseline.json, release-bracket-baseline-check.sql,
release-bracket-owner/adapter-owner/adapter-creator/k15 receipts; post-* baselines;
concurrent-{a,b,observer}-evidence.json, parallel-transport-probe.json;
release-bracket-final-tests.log. Active phase has exact names/hashes/full evidence.

## Exact next / remaining gates
Checkpoint native benchmark; obtain CLI authentication/independent transport access.
User may authenticate CLI using existing account or separately authorize login
initiation; do not create/read/export a credential, put a token in chat/log/Git, or
open a sensitive browser session by implication. After auth: read-only preflight must
verify target project/current+session user postgres/PG17.11 and complete85 baseline;
inspect actual CLI result format. Run prepared A/B/observer via separate CLI processes,
check distinct live backends/blocking/clock receipts and full baseline after each
ROLLBACK. If API also serializes, stop and review an independently authorized path.
Full R1/P9-I02/D04/V01 OPEN: concurrent/durable/CAS/crash/backup restore/schema down/
SDK/auth remain unaccepted. No real import/consumer/R2–R6 before foundation acceptance.
K04 OneDrive403, K10/K11 SKU/market, K12 bulk reuse prohibited, Q02/Q09/Q10/Q11/Q12,
TGC/media rights, Vercel403/native-device gates remain OPEN.
No /compact shell command, fabricated compaction, quota percentage or completion.