# Current handoff — 2026-10-07

## Task / branch / checkpoint
Autonomous Sky Guide master run on codex/master-plan-execution; goal active,
master roadmap OPEN. Last verified pushed checkpoint/base
f5b4a4720210eed14dbf2fe9673a3e580bc0c8b9. This file accompanies the canonical
payload plan/prepared SQL milestone; resolve latest SHA with git log -1 and verify remote.
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
Earlier checkpoints92025c1/dd7fb11/f85a6cb/8214612/53498f6/2e81dc3/e275df6:
private identity/provenance/crosswalk/alias/tombstone; typed K15 every-field codec
and exact time fractions; release metadata; immutable derived public projection;
global metadata CAS/LKG/source health/acceptance/audit; immutable full graph/all20
relations and manifest dataset order; complete detached SyncState read composition.
Current K15 content/review/public byte contracts unchanged. Metadata CAS/read
composition is not full SyncStore. Historical graph is not proof/module payload history.

New20261007023752_private_payload_evidence; SHA256
334631deae66e5e026bf3a2d3d6f68c6df64f9260fab5fe54b71c9b8f3f19ead.
One typed payload_provenance owner for item/spirit/season; payload record evidence
is an independently ordered subset of full canonical identity_provenance.
SourceSync permits this distinction; old codec equality assumption lost valid
private evidence or rejected valid public subset. Architecture decision recorded
before additive migration/codec upgrade; no existing hash/history/schema rewrite.
Immediate RESTRICT composite FK binds record evidence to canonical owner evidence.
Deferred root/binding triggers require actual payload, nonfixture evidence and
contiguous order; truncate guarded. Existing typed owners backfilled exact old
equality spelling/order; development baseline had no real payloads.
catalogRows encodes/decodes both lists independently and fails closed on missing,
unregistered/non-subset/cross-owner/duplicate/gapped rows. No legacy fallback or
private-to-public filtering. Full private catalog still cannot implicitly export
through scoped releaseRows; future writer must derive an explicit reviewed public
row frame for release metadata while persisting full canonical rows.
Changed areas: codec/migration; shared synthetic payload fixture, focused tests,
native rehearsal builder/row+schema verifiers; existing architecture/phase/master/
foundation/handoff/supabase README. No dependency or production consumer changes.

New canonicalPayloadPlan/canonicalPayloadWrite: revalidate reviewed candidate/hash/
budgets, current typed payload/full graph and previous graph continuity. Incoming
public record order stays exact; retain old unpublished item/lookup/spirit/season/
proof facts for historical FK ownership. Retirement only applies explicit reviewed
metadata; changed entity/lookup fields require higher SAME owner revision. Unknown
private proof rejects; active retained relationships cannot be guessed. Explicit
scoped public rows preserve reviewed release metadata while full canonical evidence
stays private. Preparation is detached; no review authentication or revision allocation.
Static parameterized SQL/scalar binds, explicit caller row/byte limits/100-row
batches, full graph reservations/source/crosswalk/alias chain/tombstone ownership.
Root UNIQUE positions move to disjoint positive band then compact; roots/history
never deleted. Payload evidence deletes BEFORE identity evidence; acquisition
children before options/field evidence before markers. Native repeat fragment
is idempotent. This is a prepared canonical fragment, NOT complete SyncStore: MUST
execute under global generation lock in one whole publication transaction.
New intentionally changed areas: two server modules, seven focused tests/shared
fixture helpers/native actual-statement builder/verifier plus existing plans.

## Validation / evidence
340 full tests, pnpm lint/typecheck/build/catalog1808 PASS. Seven writer tests and
updated full K15 statement preparation/bounded bind test PASS. Earlier three tests prove
private identity evidence plus exact public record subset/order and candidate/
review/projection/release byte parity; malformed frames fail closed. Existing
every-field full K15 codec and all24 manifest key orders remain PASS.
Native new fixture13 SQLSTATE negatives/deferred evidence replacement PASS;
actual hosted rows reconstruct exact staged candidate and reviewer hash without
private proof in any public file. Rebuilt old catalog32 negatives/actual every-field
parity and composed SyncState11 negatives/two-source health/global LKG parity PASS.
Actual prepared writer SQL -> exact typed payload/private evidence, new/retained/
retired roots, aliases/chains/crosswalk/future-kind reservations and old/new immutable
projection parity PASS. Nested acquisition unknown/null -> known zero plus decimal
raw offer survives typed readback. Two injected mid/end fragment failures rollback
all canonical changes; repeated fragment preserves positions/facts. Initial native
builder forgot to defer newly inserted release metadata after forced checks; fixed
before PASS, no migration/schema weakening. SQL fixture ROLLBACK; replay proves
fragment/DML behavior, not full Store CAS/error policy or simultaneous sessions.
All fixtures ROLLBACK. Current79 private tables/RLS, exact new writable columns,
all FKs RESTRICT;0 unvalidated constraints/SECURITY DEFINER/platform schema-table-
function grants. Revision0 sync_generation singleton; all78 other tables empty
verified after all fixtures. Advisors no WARN/ERROR; intentional no-policy RLS/
unused-index INFO retained. SQL/actual rows/schema outside Git:
E:/SkyGuideAssets/research/postgres-rehearsal-2026-10-07.
Scaffold/diff before checkpoint; existing Router/chunk build warnings unchanged.
No real import/full atomic SyncStore/connected provider/authenticated review,
actual parallel race, future/provenance payload history or restore/scaling claim.

## Exact next action / gates
Implement provider-neutral full SyncStore atomic transaction/CAS orchestration
using completed SyncState/LKG decoder and canonicalPayloadWrite prepared fragment.
Read bounded canonical/pinned frames from ONE transaction, verify actual current
typed owner/evidence/reservations match authoritative archived graph. Lock global generation
BEFORE writes; validate full candidate/previous graph continuity and reproduce
existing SourceSync promotion/failure transition. Changed item/spirit/season/
lookup payload fields require higher owner revision. Retain older typed payloads
for immutable release FK ownership; update retirement metadata from reviewed graph,
never infer missing private facts. Retain independent canonical/payload evidence;
register sources/proofs/identities before typed children; delete payload_provenance
BEFORE replacing identity_provenance (immediate RESTRICT FK).
Archive graph/projection/order/acceptance/source/audit in one transaction; force
all deferred constraints before commit; rollback ALL mutations on CAS false/error.
Use explicit scoped public rows derived from reviewed files for release encoder.
Unknown nonpublic proof requires registered typed SourceRecord; no invention.
Canonical root order may relocate temporarily to disjoint positive positions then
compact, preserving old retained records; do not drop/reseed roots or rewrite UNIQUE.
Then actual two-session conflict/rollback/provider parity, least-privilege runtime/
authenticated review, isolated restore and measurements. P9-I02/D04/V01 PARTIAL/OPEN.
No implicit SDK/credential/consumer permission. Docker daemon absent; restore
tooling remains blocked, independent approved work continues.

K02/P1-D02 ten-node/nine-edge/root-cost uncertainty; K01/K03 staged adapters and
K15 loader preserved. [WIKI_SOURCE_VERIFICATION](plan/WIKI_SOURCE_VERIFICATION.md)
and [DATA_FOUNDATION](plan/DATA_FOUNDATION.md) authoritative. Source/legal/QA gates:
K04 OneDrive403; K10/K11 market/SKU; K12 bulk reuse prohibited; Q02/Q09/Q10/Q11;
Q12/TGC/media rights; Vercel403; native install/icon/device/accessibility.
Future nonempty dye/compatibility/media needs reviewed typed owners. W12 PARTIAL/
W11 OPEN; no R2–R6/master DONE, source recrawl or inferred rights/facts.

## Continuity
Stage intentional files only, checkpoint/push/verify SHA. Corpora/private evidence/
secrets/cache/build output excluded. No owned browser/server/test process remains.
Native compaction only; no shell /compact or invented context/quota. Resume the
exact writer action above and active phase; do not reconstruct the whole repository.
