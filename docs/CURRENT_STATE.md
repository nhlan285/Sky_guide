# Current handoff — 2026-10-07

## Task / branch / checkpoint
Autonomous Sky Guide master run on codex/master-plan-execution; goal active,
master roadmap OPEN. Last verified pushed checkpoint/base
53498f631128e62b4d9aa7700c088c1b03dc20d6. This file accompanies canonical graph
history milestone; resolve latest SHA with git log -1 and verify remote on resume.
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
Earlier92025c1/dd7fb11/f85a6cb/8214612/53498f6: private identity/provenance/crosswalk/
alias/tombstone reservations; typed K15 every-field codec, exact time fractions;
release manifest/envelope/order metadata, immutable derived public projection;
SQL global metadata CAS/LKG/source health/private acceptance/audit. Full K15
canonical bytes/API parity retained. Metadata CAS is not complete SyncStore.

New20261007020927_private_acceptance_graph; SHA256
1113dd8d404cad0731d5573b08928d93cf74602d0d3ba2cc789593fbbbc498bea.
27 additional private typed graph owners (77 total): acceptance header, ordered
candidate/identity evidence, identities with historical revisions, crosswalks,
aliases (unknown source IDs/chain discriminator), tombstones and20 explicit
relations. Preserve private/fixture/retired nodes; no reconstruction from current
canonical/public subset. Global relation position preserves mixed-array review
hashes. Generated endpoint kinds/typed historical FKs, required/cardinality/active
endpoint/order/evidence/retirement/alias/event-parent checks. Children before header;
parent acceptance lock serializes seal vs insert; immutable insert/update/delete/
TRUNCATE guards. Deferred FKs reject unsealed or orphan child frames at commit.
graphHistoryRows encodes/decodes exact validated graph + candidate.provenanceIds,
revalidates domain semantics and SHA; no silently dropped/extra/cross-version rows.
Files: src/server/graphHistoryRows.ts, additive migration, focused tests/shared
fixture, SQL builder/actual row+schema verifiers; existing architecture/master/
phase/foundation/handoff/supabase README. No canonical JSON/EAV or new dependency.

## Validation / evidence
5 focused graph +323 full tests, pnpm lint/typecheck/build/catalog1808 PASS.
Full K15 graph2051 identities retains SourceSync contentHash/candidateReviewHash
after provider row reordering. All14 kinds/20 relations/every field/order, scoped
same IDs, alias chains/null tombstones/fixture-private nodes and revisions tested.
Native two-frame synthetic history remains exact after owner revision/edge change
and mutable catalog mutation.141 SQLSTATE negatives PASS:32 malformed frames,
108 per-table update/delete/TRUNCATE/sealed-insert guards, missing acceptance.
Actual hosted rows -> expected graph parity PASS; fixture ROLLBACK.
Initial SQL syntax/builder issues fixed before success; no failed attempt claimed.
77 RLS; exact27 writable columns (generated endpoint kinds excluded); all FKs
RESTRICT;0 unvalidated constraints/SECURITY DEFINER/platform schema-table-function
grants. Baseline: one sync_generation revision0/null pointer row, all76 others empty.
Advisors no WARN/ERROR; intentional no-policy RLS/unused-index INFO. Evidence SQL/
actual rows/schema outside Git on E:/SkyGuideAssets/research/postgres-rehearsal-2026-10-07.
Scaffold/diff before checkpoint; existing Router/chunk build warnings unchanged.
No real source import, actual parallel race, full writer/driver/authenticated
review, provenance/future module payload history, restore/scaling or production proof.

## Exact next action / gates
Implement typed canonical payload transaction writer + provider-neutral SyncStore,
compose immutable graph/projection + metadata read into validated SyncState/LKG.
Lock global generation BEFORE canonical writes; validate candidate and previous
graph continuity; require graph/projection/acceptance/source/audit in one atomic
transaction; force deferred constraints before commit; rollback ALL writes on CAS
false/error. SQL graph digest spelling/structure checks do not compute JS content
hash or authenticate reviewer. Metadata-only acceptance remains allowed until full
adapter requires graph. Graph evidence references retain IDs, not old proof payloads.
Then actual two-session conflict/rollback/provider parity, least-privilege runtime/
authenticated review, isolated restore and measurements. P9-I02/D04/V01 PARTIAL/OPEN.
No implicit SDK/credential/consumer permission. Docker CLI exists but daemon absent;
no start/install/pull/container/psql or connection password. Restore tooling blocked;
safe independent work continues.

K02/P1-D02 ten-node/nine-edge graph/root-cost uncertainty; K01/K03 staged adapters
and K15 loader preserved. [WIKI_SOURCE_VERIFICATION](plan/WIKI_SOURCE_VERIFICATION.md)
and [DATA_FOUNDATION](plan/DATA_FOUNDATION.md) authoritative. Source/legal/QA gates:
K04 OneDrive403; K10/K11 market/SKU; K12 bulk reuse prohibited; Q02/Q09/Q10/Q11;
Q12/TGC/media rights; Vercel403; native install/icon/device/accessibility. Future
nonempty dye/compatibility/media needs reviewed typed owners. W12 PARTIAL/W11 OPEN;
no R2–R6/master DONE, source recrawl or inferred rights/facts.

## Continuity
Stage intentional files only, checkpoint/push/verify SHA. Corpora/private evidence/
secrets/cache/build output excluded. No owned QA browser/server/test process remains
after checks. Native compaction only; no shell /compact or invented context/quota.
Resume exact next action from these files instead of rereading the repository.
