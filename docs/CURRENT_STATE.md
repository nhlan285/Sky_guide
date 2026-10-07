# Current handoff — 2026-10-07

## Task / branch / checkpoint
Autonomous Sky Guide master run on codex/master-plan-execution; goal active,
master roadmap OPEN. Last verified pushed checkpoint/base
ac17a74ba757b2c88dca66412a9861f560d9f89a (verified local/remote before this slice).
This file accompanies portable transaction kernel work; resolve
latest checkpoint SHA with git log -1 and verify remote.
Master [IMPLEMENTATION_PLAN](plan/IMPLEMENTATION_PLAN.md); active detailed phase
[POSTGRES_PROVIDER_SELECTION](plan/POSTGRES_PROVIDER_SELECTION.md).
No merge/production/paid resources/destructive Git or unrelated changes.

## Authority / environment / constraints
R1 LOCAL CONTRACT APPROVED: user `phê duyệt, tự tiếp tục`; `supabase free` and
`Dyland's Org` selected; do not ask again. Dev sky-guide-dev tpbydviuknovimroeodm,
org pdssjfwbrfjlglobjhtw, Free; $0/month creation confirmed; PostgreSQL17.11.
Singapore is dev choice, not verified Vercel colocation. Node24/pnpm10.30.3 via
E:/Code/corepack.cmd; CLI2.120.0/cache E:. No new SDK/login/link/credentials/runtime
DB role/grants/consumer mount, Auth/Storage/Realtime/scheduler/paid branch.
Existing R2/UI, source/projection/public hash/rights contracts preserved.

## Completed / intentionally modified areas
Earlier checkpoints through fd99b64: typed private identity/provenance/K15 every
field/exact time fractions; release metadata; immutable public projection; global
SQL metadata CAS/LKG/source health/acceptance/audit; full historical graph/all20
relations; manifest Record key order; detached SyncState read composition;
independently ordered payload evidence subset vs full private identity evidence;
retained canonical payload plan and parameterized SQL fragment.11 applied migrations/
79 private tables; latest20261007023752_private_payload_evidence SHA256
334631deae66e5e026bf3a2d3d6f68c6df64f9260fab5fe54b71c9b8f3f19ead.
Full phase/architecture contain prior migration hashes and native evidence.

New postgresSyncRows/postgresSyncStore implement PORTABLE full atomic orchestration.
SqlDatabase requires one connection/snapshot, callback success before commit,
rollback callback errors, distinguish uncertain COMMIT, cleanup/no implicit retry.
SqlConnection enforces row/byte limits DURING transport/decoding, JS-safe integer
conversion and no successful truncation. Static typed columns/binds/LIMIT +
cumulative decoder budgets are additional checks, not driver transport proof.
Readonly read: repeatable-read. CAS: read-committed; global FOR UPDATE FIRST SQL;
stale generation false before more reads or writes. Exact next state replayed
through existing SourceSync promotion/failure; compare every field, Map file bytes
and manifest Record order. Explicit nullability rejects undefined; no auth inferred.

Current canonical identity/evidence/crosswalk/alias/tombstone must equal pinned
archived global graph; typed payload/proof/order must replay latest reviewed public
snapshot without change. Drift rejects BEFORE mutation. Registered proof pool may
exist before first acceptance; unreviewed typed roots/reservations cannot.
Prepared canonical fragment + release/projection + acceptance/graph/order +
source/audit/global SQL CAS execute in ONE callback. Reused version needs exact
immutable bytes/no sealed row mutation. CAS false/wrong result/error after writes
THROWS rollback; force deferred checks and verify post-read state/canonical
alignment before commit. Failure writes only own source registration + metadata
CAS and preserves canonical/LKG/review. Historical proof/future fact payloads remain OPEN.
Intentionally modified: two server modules, existing SourceSync validator export/
canonical write budget stats, ten focused tests/two fixtures/native SQL builder/
verifier, existing handoff/phase/master/foundation/architecture/supabase README.
No migration/dependency/resource changes, real source/reviewer import or route mount.

## Validation / evidence
350 full tests +10 focused Store tests, lint/typecheck/build/catalog1808 PASS.
Full pinned LOCAL K15 through portable Store promotion/read:1808 items/213 spirits/
30 seasons/2051 identities and exact public/graph/content-review parity.
Stale zero writes; CAS/provider/constraint/post-read/commit rollback; source failure/
LKG independence; reviewed reconfirmation/reuse; forged bytes/review/health/retry,
current typed/proof/order/reservation drift; transport/row/write budgets/driver
scalar/explicit nullable field failures tested. Scripted driver proves interface
policy, NOT real connection transport/parallel sessions/commit cleanup behavior.

Actual PostgreSQL executes emitted Store SQL:5 phases (first publish, changed facts/
retirement/new kind/alias chain, K01 failure, K15 failure, reviewed reconfirmation),
866 POSITIVE native query-result assertions and exact actual row/Store parity.
Late wrong SQL CAS and forced deferred incomplete-release validation each rollback
WHOLE publication including canonical/release/projection/graph/order/acceptance/
audit/control. Historical public bytes/private evidence/cost unknown-null->known
zero/decimal offer/source-specific health/retry/global LKG remain exact.
Rehearsal793321 bytes; SQL SHA256
98c9c0262cc0664a3083f1f71da07434f010c32132fb9fdabdb3f6d79944505e.
Nullable guard refinement leaves emitted SQL identical (SHA rechecked).
Native sequence is ONE fixture connection; no separate-commit/concurrent-session/
connected runtime transport/authenticated reviewer/restore claim. Outer ROLLBACK.
Current audit79 RLS/all FKs RESTRICT/0 unvalidated/SECURITY DEFINER/platform schema-
table-function grants; revision0 singleton/other78 empty verified AFTER fixture.
No DDL; prior intentional advisor INFO/no WARN/ERROR unchanged. Evidence outside Git:
E:/SkyGuideAssets/research/postgres-rehearsal-2026-10-07/postgres-sync-{fixture.sql,rows.json,schema.json}.
Scaffold/diff before checkpoint; existing Router/chunk warnings unchanged.

## Exact next action / gates
Bounded read transport now PASS: postgresSyncTransport lowers only existing static
private SELECT vocabulary (all79 owners), keeps original FOR UPDATE once, performs
server aggregate UTF8/DataRow budget checks BEFORE returning payload. Overflow
returns fixed NULL/false guard; exact supported OID/text decode rejects unsafe int8,
unsupported/binary/malformed/nonfinite values. Reader cumulative/LIMIT+1 checks
remain intact. Bool ::text is conservative; DB work/metadata/network/error sizes
and actual SDK transport/cancellation are separate gates. No driver mounted.
90 actual native assertions PASS including Unicode/exact byte boundaries/oversized
single1,200,000-byte field/locked head/MAX_SAFE_INTEGER/fraction/bool. Outer ROLLBACK
verified revision0 and ALL78 noncontrol owners empty. Fixture135076 UTF8 bytes,
SHA256539085dac77f5127ccc37eadea60bcc1a7a9ff03c44a835a74f243e5bc20f4e2;
E:/SkyGuideAssets/research/postgres-rehearsal-2026-10-07/postgres-transport-{fixture.sql,result.json,tests.log}.
7 focused/357 full tests/lint/typecheck/build/catalog1808/scaffold/diff PASS.
Existing Router/chunk warnings unchanged.

Concrete runtime contract is in active phase: provisional server-only pg candidate,
one client/isolation/deadlines/cleanup, private dedicated least-privilege roles/RLS,
verified maintainer principal, credential injection/rollback. No SDK installed or
secrets/grants/auth/consumer changes. Lost COMMIT acknowledgement is indeterminate:
ROLLBACK attempt cannot prove noncommit; reconcile immutable exact audit/review
witness using fresh connection, otherwise quarantine/no blind retry/recordFailure.
This corrects comment/architecture wording only; SourceSync public API unchanged.

Explicit privilege proposal now implemented: runtimePrivilegePlan/Baseline and
compact native trigger fixture.79 SELECT/78 column INSERT/9 mutable column UPDATE/
4 invoker-lock UPDATE/23 child DELETE owners,5 writer helper EXECUTE;193 RLS policies.
Both role groups NOLOGIN/nonowner/NOBYPASSRLS. Existing invoker locks need key-column
UPDATE on public_release/sync_acceptance/acquisition_option/field_provenance_field;
proposed USING(true)/WITH CHECK(false) preserves locking, denies actual UPDATE.
No immutable-data mutation allowed. Trigger/helper/79-full-column fingerprints
include omitted generated discriminators;27 bodies match local11 migrations.
Pure generator emits reviewed preflight/grant/rollback, never executes SQL.
Native read-only preflight PASS;5 focused/362 full tests/lint/typecheck/build/
catalog1808/scaffold/diff PASS. Actual role/RLS proof NOT RUN;
no roles/grants/policies/credentials/SDK/Auth/consumer applied. E: runtime-privilege-*
review files/metadata/receipts/log; only curated fingerprints/tests/code tracked.
Grant84451 bytes/SHA256a287cb55b2e778efeacd17710f1a837728e1760f4474d6a88cb7b3ac30d81bcf;
rollback34115 bytes/SHA25649735785bf0715ced419058f2dd61ad9f434708e0ddb5e1ce3d7db3655c11749.
Rollback revokes column and table privileges; no CASCADE/data deletion, refuses
unrelated memberships; must inspect unchanged baseline before applying. Effective
PUBLIC/inherited rights still need actual role checks, not just explicit ACLs.

User dev-only role/RLS apply/allow-deny/rollback authorization question pending
(AGENTS22 + existing no-grants-by-implication gate); unanswered is not approval.
Portable transaction kernel/static statement gate now implemented over exclusive
raw-text lease; explicit isolation/three SET LOCAL timeouts/input and read budgets,
callback closure/taint/deadlines/COMMIT/ROLLBACK/release/discard. No retry. Confirmed
COMMIT survives release failure; lost/malformed ACK stays indeterminate. Port must
attest real ErrorResponse/ReadyForQuery, exclusive physical lease and safe eviction.
Synthetic complete5-phase Store/control/fault tests do not execute SQL or prove
actual SDK/network cancellation/races/roles; existing native receipts are separate.
Current modified areas: two server modules, protocol fixture/kernel tests and
existing handoff/phase/master/foundation/architecture/supabase README. No dependency,
migration/provider/grant/Auth/credential/consumer changes in this slice.
Validation:14 kernel tests included in376 full tests; lint/typecheck/build/
catalog1808/scaffold75 Markdown/14 profiles/173 tasks/diff PASS. Existing Router/
chunk warnings unchanged. Test log on E: postgres-rehearsal-2026-10-07/
postgres-kernel-tests.log outside Git. No owned live QA handles remain.
Exact next while pending: outward uncertainty fence + durable intent/quarantine/
fresh immutable audit/review witness reconciliation. Existing SourceSync catches
Store errors as rejected; kernel alone is not that fence or restart durability.
Before implementing, refine current active slice/contracts, preserve public API
and define absent/mismatched witness/concurrent successor/uncertain failure writes.
If explicitly approved, pinned CLI migration for reviewed
NOLOGIN role/RLS package and actual role/5-phase SQL/lock-only update/platform denial/
effective column-helper grants/rollback evidence before driver mounts. SDK/credential/
Auth/principal membership remain distinct gates, not covered by that role approval.
R1/provider/org already approved; do not re-request. Then authorized real driver/
cancel/commit/parallel sessions, isolated restore/measurements and real adapters.
P9-I02/D04/V01 PARTIAL/OPEN; Docker daemon absent, restore tooling OPEN.

K02/P1-D02 source sample DONE at pushed2e6d110: ten nodes/nine edges reconciled;
root cost remains unknown and totals partial. Live adapter/coverage is separate.
K01/K03 staged adapters/K15 loader preserved. [WIKI_SOURCE_VERIFICATION](plan/WIKI_SOURCE_VERIFICATION.md) and
[DATA_FOUNDATION](plan/DATA_FOUNDATION.md) authoritative. K04 OneDrive403; K10/K11
market/SKU; K12 bulk reuse prohibited; Q02/Q09/Q10/Q11; Q12/TGC/media rights;
Vercel403; native install/icon/device/accessibility; future nonempty dye/compatibility/
media needs reviewed typed owners. W12 PARTIAL/W11 OPEN; no R2–R6/master DONE or recrawl.

## Continuity
Stage intentional files only; checkpoint/push/verify SHA. Corpora/private evidence/
secrets/cache/build output excluded. No owned QA process/browser/server remains.
Native compaction only; no shell /compact or invented context/quota. Resume exact
next action + active phase instead of rereading repository or reconstructing chat.
