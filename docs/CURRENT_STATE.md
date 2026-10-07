# Current handoff — 2026-10-07

## Task / branch / checkpoint
Autonomous Sky Guide master run on codex/master-plan-execution; goal active,
master roadmap OPEN. Last verified pushed checkpoint/base
82146120963ea56fa04b4caa070d65439386aa28. This file accompanies SQL sync metadata/
CAS milestone; resolve latest SHA with git log -1 and verify remote before resume.
Master [IMPLEMENTATION_PLAN](plan/IMPLEMENTATION_PLAN.md); active detailed phase
[POSTGRES_PROVIDER_SELECTION](plan/POSTGRES_PROVIDER_SELECTION.md).
No merge/production/paid resources/destructive Git or unrelated edits.

## Authority / environment / constraints
R1 LOCAL CONTRACT APPROVED: user `phê duyệt, tự tiếp tục`; `supabase free` and
`Dyland's Org` selected. Do not ask again. Dev sky-guide-dev tpbydviuknovimroeodm,
org pdssjfwbrfjlglobjhtw, Free; creation $0/month confirmed. PostgreSQL17.11.
Singapore is isolated dev choice, not verified Vercel colocation. Node24/
pnpm10.30.3 via E:/Code/corepack.cmd; CLI2.120.0 pinned/cache E:.
No login/link/new SDK/credentials/runtime DB role/consumer mount. No provider
Auth/Storage/Realtime/scheduler/paid branch. Existing R2/UI contracts unchanged.

## Completed / intentionally modified areas
Earlier92025c1/dd7fb11/f85a6cb/8214612: private identity/provenance/crosswalk/alias/
tombstone reservations; typed K15 every-field codec, exact time-fraction handling;
release manifest/envelope/order metadata; immutable derived public projection.
Full K15 canonical bytes/public repository and representative API parity PASS;
old public bytes survive current payload mutation. Projection header seals metadata;
materialization alone is not reviewed publication. Typed canonical owners retained.

New20261007014843_private_sync_metadata_cas; SHA256
faed341f276664e5c423fd64fb92073b253609c0bee0902e9f67e96c98fe25b6.
Four private typed tables (50 total): global generation/current acceptance,
immutable acceptance/private audit, independently scoped source attempt/success/
health/failure/retry. Exact review tuple digest/timestamp ordering, sealed projection
FK, audit continuity/pointer/counter checks and permanent control/history guards.
Scalar apply_sync_metadata_cas locks global singleton, rejects stale generation
before metadata writes, retains LKG on failure. Deferred acceptance-audit FK rejects
orphan staging after a lost CAS. Multi-table writes use initially-deferred
consistency constraints and must explicitly validate before transaction commit.
syncMetadataRows decoder returns private metadata only, NOT SyncState/SyncStore.
Loader selects global head/latest audit, one source and referenced acceptance frames.
Files: src/server/syncMetadataRows.ts, additive migration, focused tests/shared
fixture, SQL builder/body/row+schema verifiers, existing architecture/master/phase/
foundation/handoff/supabase README. No generic canonical JSON/EAV or new service.

## Validation / evidence
4 focused metadata +318 full tests, pnpm lint/typecheck/build/catalog1808 PASS.
Native two-source synthetic sequence PASS: acceptance, failure/LKG, sequential
stale CAS with no writes, independent health, second-source acceptance, same-content
reconfirmation, recovery.34 negative SQLSTATE cases PASS for review/clock/source/
outcome/orphan-staging/counter/history/bypass errors. Actual SQL frames -> expected
global pointer/private audit and independent source freshness parity PASS; digest
matches existing candidateReviewHash. Initial fixture deferred-boundary/combined
mutation-assertion ordering issues fixed before any PASS claim.
Native fixtures ROLLBACK. Intentional baseline: one sync_generation row at revision0,
null pointer/promotion; all49 other tables empty.50 RLS, four writable metadata
column contracts match actual SQL; all FKs RESTRICT;0 unvalidated constraints/
SECURITY DEFINER/platform schema-table-function grants. Advisors no WARN/ERROR;
INFO intentional no-policy RLS/unused indexes. SQL/actual rows/schema evidence on E:
SkyGuideAssets/research/postgres-rehearsal-2026-10-07, outside Git.
After final selected-source success/audit guard:4 focused tests/lint/typecheck PASS.
Scaffold/diff before checkpoint; existing Router/chunk warnings unchanged.
No real source import, actual parallel-session race, full canonical transaction
adapter, authenticated reviewer, restore/scaling or production acceptance claimed.

## Exact next action / gates
Archive canonical historical identity graph with explicit ordered typed relation/
crosswalk/alias/tombstone owners; implement typed payload transaction writer and
provider-neutral SyncStore read/CAS using approved SourceSync contracts/budgets.
Lock global generation BEFORE canonical writes; defer then force consistency
before commit; rollback ALL writes on CAS false/error. Metadata CAS alone cannot
prove atomic canonical persistence. Then real two-session conflicts/rollback/provider
parity, least-privilege runtime/authenticated review and isolated restore/measurement.
P9-I02/D04/V01 remain PARTIAL/OPEN. No implicit SDK/credential/consumer permission.
Docker CLI exists but daemon unavailable; no start/install/pull/container/psql or
connection password obtained. Local restore tooling blocked; other safe work continues.

K02/P1-D02 ten-node/nine-edge graph/root-cost uncertainty, K01/K03 staged adapters
and K15 loader preserved. [WIKI_SOURCE_VERIFICATION](plan/WIKI_SOURCE_VERIFICATION.md)
and [DATA_FOUNDATION](plan/DATA_FOUNDATION.md) authoritative. R1 remediations and
Wardrobe sequence/focus QA retain their pushed evidence. Source/legal/QA gates:
K04 OneDrive403; K10/K11 market/SKU; K12 bulk reuse prohibited; Q02/Q09/Q10/Q11;
Q12/TGC/media rights; Vercel403; native install/icon/device/accessibility. Future
nonempty dye/compatibility/media needs reviewed typed owners. W12 PARTIAL/W11 OPEN;
no R2–R6/master DONE. No source recrawl or inferred rights/facts.

## Continuity
Stage intentional files only, checkpoint/push/verify SHA. Corpora/private evidence/
secrets/cache/build output excluded. No owned QA server/browser/test process remains.
Native automatic compaction, no shell /compact or invented context/usage percentage.
Resume exact next action from these files instead of rereading the entire repository.
