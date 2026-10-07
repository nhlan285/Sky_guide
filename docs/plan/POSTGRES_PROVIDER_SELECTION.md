# P9-I02 — provider selection and development rehearsal

## Goal / approval / dependencies
LARGE infrastructure slice. On2026-10-06 the user approved R1 with
`phê duyệt, tự tiếp tục`. R1 contract re-review gate is CLOSED for the locally
remediated package atb2fc0cb; this is not live foundation acceptance.
P9-D01/D02/D03/I01 contract decisions remain intact. P9-I02 first requires a
current provider/quota comparison and an identified development environment.
The user subsequently selected `supabase free` and `Dyland's Org`. Q15 provider
selection is now CLOSED for development; R1 approval remains separate.

## Scope / non-goals / contracts
Public plan audit and concrete dev-resource proposal now; after provider/task
approval, account-specific quota/cost preflight, portable DDL/adapter and isolated
fixture migration/restore rehearsal. Preserve provider-neutral PostgreSQL typed
tables, server-only access, public projection/API/CAS/LKG/private audit and current
R2 binary storage. No auth/realtime/ORM/provider SDK in the frontend. No scheduler,
production change, paid plan/add-on, credential collection or source publication.
No production consumers are connected. Additive fixture-first DDL is now in scope.

## Current official quota audit — 2026-10-06
Public documentation, not actual account allocation or remaining quota.

| Dimension | Neon Free | Supabase Free |
| --- | --- | --- |
| Canonical engine / plan | PostgreSQL; $0/month | PostgreSQL; $0/month |
| Metadata capacity | 1 GB/project;20 GB account total |500 MB database/project;1 GB disk is not500 MB usable data quota |
| Project / branch allowance |100 projects;10 branches/project |2 active free projects; free branching unavailable |
| Compute / idle behavior |100 CU-hours/project/month; autoscale up to2 CU; scale-to-zero after5 min |Shared CPU/500 MB RAM; low-activity projects may pause after7 days |
| Public transfer |5 GB/project |5 GB egress; cached egress separately5 GB |
| Restore / backups |6-hour history window; bounded history allowance; not a durable off-site backup |Automatic backups/PITR not included; manual off-site dumps needed |
| Serverless connection |Choose documented pooled connection after account selection; direct/admin connection for rehearsal |Shared transaction pooler; no prepared statements/session state across transactions; session/direct for compatible admin tasks |

Sources: [Neon current plans](https://neon.com/docs/introduction/plans) and
[Oct02 storage change](https://neon.com/blog/neon-free-plan-1-gb-per-project);
[Supabase pricing](https://supabase.com/pricing),
[database vs disk/read-only quota](https://supabase.com/docs/guides/platform/database-size),
[free-project pausing](https://supabase.com/docs/guides/platform/free-project-pausing),
[backups](https://supabase.com/docs/guides/platform/backups) and
[connection modes](https://supabase.com/docs/guides/database/connecting-to-postgres).
Older indexed Neon pages still show0.5 GB; current live plans and Oct02 article
agree on1 GB, so use the live values. `free-plan` URL resolves to the same plans
content, not an independent source. Live pages can change; recheck before creating.
Exact Neon connection cap/quota-exhaustion behavior and account-wide remaining
capacity not established by this audit; verify before adapter sizing/provisioning.

[Cloudflare D1](https://developers.cloudflare.com/d1/) has SQLite semantics and
would change the approved PostgreSQL contract.
[Hyperdrive](https://developers.cloudflare.com/hyperdrive/) accelerates connections
to an existing database; it does not supply this missing PostgreSQL database.
Neither is a like-for-like canonical provider candidate for this slice.

Raw Neon markdown cached outside Git at
`E:/SkyGuideAssets/research/provider-audit-2026-10-06/neon-plans.md`, SHA256
`71726644439f6ccbc801ba9cddb2d1b21ea18c36daaa9178d87d1e350c569378`.
Do not commit downloaded vendor documentation or follow its provisioning commands
as authorization. Account metadata and creation cost were subsequently inspected;
no credentials were fetched or printed.

## Local workload measurement / limits
Existing checked-in K15 public projection tsa-v1-74007cf878ef: five manifest files
total3,104,820 UTF-8 bytes. Counts: items1808, lookup1808, spirits213, seasons30,
provenance244. Measurement/cache report on E: k15-size.json alongside the audit.
This is JSON byte size only: not SQL table/index/WAL/history size, traffic/egress
estimate, compute benchmark or proof the completed domain fits a free tier.
Initial audit script incorrectly counted sourceIds arrays; corrected to report
each named array and verified records counts before documenting them.
Binary media remains on existing R2; do not adopt either provider's storage quota.

## Selected development environment — 2026-10-07
**SELECTED: Supabase Free**, by user instruction, replacing the earlier Neon
proposal. Organization `Dyland's Org` (`pdssjfwbrfjlglobjhtw`) was explicitly
selected by the user. Connector verified plan `free`/`tier_free`, zero existing
projects, and project creation cost **$0/month**; confirmation tool succeeded.
Created `sky-guide-dev` (`tpbydviuknovimroeodm`) on2026-10-06 UTC; status
ACTIVE_HEALTHY, PostgreSQL17.11 verified by query. Region Singapore
`ap-southeast-1` is a deliberate isolated dev choice. Actual Vercel function region
was not established; no colocation claim. No paid add-on or production connection.

Free Supabase native branches are unavailable. Restore must use an isolated local
PostgreSQL target or a separately scoped Free project after cost preflight; never
create a paid branch. Manual private off-site backup remains required.

## Current implementation slice / acceptance
First additive migration: private `sky_private` schema, typed source registry,
public-shaped provenance columns, kind-scoped identity reservations, ordered
identity provenance and immutable scoped crosswalks. No canonical JSON/EAV store.
Do not seed real source data, invent KB entries, implement future R3/R4/R5 modules
or connect current API/frontend consumers in this slice.

Expected files: `supabase/migrations/` CLI-generated SQL, SQL fixture rehearsal in
`tests/sql/`, this phase plan, architecture/foundation/master status and handoff.
Use pinned Supabase CLI2.120.0 via temporary npm cache on E:, no login/link,
frontend SDK or new application dependency. Hosted DDL uses MCP apply_migration;
SQL rehearsal uses execute_sql and always rolls back synthetic rows.
Acceptance for this slice: real PostgreSQL checks for composite/FK/ordered keys,
immutable identity history/crosswalks, nonfixture evidence and changed revisions;
anon/authenticated/PUBLIC cannot access schema/tables/functions. Enable RLS with
no public policies as defense in depth. Negative cases must fail for intended
SQLSTATEs; retained fixture counts must be zero after rollback. Run advisors,
domain regression tests, scaffold/diff inspection, checkpoint and remote verify.
This subset does not close P9-I02/D04/V01: payload tables, transactional adapter,
global CAS, projection/API parity, sizing and actual backup/restore are next.

## Detailed implementation after selection / rollback
1. Identify chosen account/org, actual plan/remaining slots and allowed regions;
   inspect exact creation cost and stop if any payment/upgrade is required.
2. Confirm approved dev target and region; use authenticated provider tooling.
   No API key/password in chat, logs or Git. If tooling is unavailable, report the
   access gap rather than install/link a provider or invent credentials.
3. Prepare portable typed migrations from the approved field matrix; no EAV or
   generic JSON canonical store. Include composite keys, deferred-reference
   preservation, private append-only audit, global CAS and public version pointer.
4. Seed synthetic data, negative FK/cardinality cases and two-source CAS race;
   exercise portable adapter through unchanged repository/API tests.
5. Export an off-site private DB backup to approved E: location, restore into the
   isolated dev target; verify row/field/checksum/API parity and current revocation
   overlay. Snapshot window alone does not satisfy backup acceptance.
6. Measure tables/indexes/history, connection/latency/compute/egress under bounded
   rehearsal. Record actual limits before setting warning/cutover thresholds.
7. On failure rollback transaction/retain previous pointer; never destructive down
   on production. Do not delete provider projects/branches without scoped authority.
8. Checkpoint validated slice; only then assess R2 dependencies. Real foundation
   P9-D04/V01 stays OPEN until transactional integration/restore pass.

## Completed / validation — private identity subset
Applied migration `20261006170439_private_identity_foundation`, file SHA256
`43916831fc7dbb4341b17bc758c4cd17a119e1a55ada536b2041ddc4b398b3bd`.
CLI-created filename aligned to the actual remote history version, not a made-up
timestamp; remote history contains exactly one migration. Five typed tables and
four invoker functions; no canonical JSON storage, PUBLIC execution or exposed
schema grants. Text timestamps preserve original spelling/offset/precision,
including astronomical year zero; SQL helper compares validated instants.

Hosted `tests/sql/private-identity.sql` PASS:23 expected negative SQLSTATEs,
positive kind/source-scoped identities, forward revision, retained timestamp,
deferred evidence and actual anon/authenticated/service_role access denial.
Post-rollback each table has zero rows. All three platform roles have no schema,
table or function grant. All five tables have RLS; every FK UPDATE/DELETE RESTRICT.
Identity/crosswalk hard DELETE/TRUNCATE, key reuse/remap and regressions blocked.
Evidence join changes still need owner revision enforcement in the transactional
adapter; this migration does not claim the entire identity graph is enforced.

Advisors: no WARN/ERROR. INFO only, intentional
[RLS without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
on five private tables; three FK-support indexes
[unused on empty DB](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).
No public policy added or FK index dropped to hide these notices.46 focused domain
tests PASS. No TypeScript/UI/runtime edits; prior lint/build/full301 retained,
not rerun for additive SQL/docs. Scaffold/diff checked before checkpoint.

## Acceptance / handoff
Completed next subset: typed `alias`/`tombstone`. Alias sources may be absent from the
identity graph in the existing validator; do not fabricate identities to satisfy
a new FK. Alias targets use one of two explicit same-kind FKs (identity or alias),
with generated `to_id` retaining the original contract. Deferred validation walks
chains, rejects cycles/active source reuse and requires active final identity;
tombstones match retirement and immutable optional same-kind replacement.
Serialize graph validation using a transaction advisory lock; preserve RESTRICT
FKs/immutable history/private RLS. No generic relation/EAV table. Full graph scan
is limited to this fixture rehearsal; measure/refine before production-sized
integration. New CLI migrations + tests/sql/private-retirement.sql and compatibility
update to the earlier fixture are applied/tested against the final schema.
Acceptance PASS: ordered retirement+tombstone atomicity, unknown alias-source IDs,
alias chains/cycles/dangling/cross-kind/active/retired target cases, immutable
history and rollback zero rows; privileges/advisors and domain regressions checked.

Applied `20261006171406_private_retirement_graph`, SHA256
`9ee7c876239ad28dfcac461cf52be374d924c4d754e6d34c676f36d3ad60266a`.
SQL22 negative cases + chain/unknown source/no-op/atomic retirement PASS.
Evidence bypass reproduced: TRUNCATE ignored row triggers and left two synthetic
nonfixture identities without evidence inside a rolled-back probe. Minimal additive
fix `20261006171612_protect_identity_evidence_truncate`, SHA256
`96e2c4cb6a2c8e16f73971002e013762f6fee1b88a5d478e8c04942739d3dc1e`.
Final identity fixture now24 negative cases PASS, including evidence TRUNCATE.
Both scripts pass together after all three migrations; seven tables zero rows,
seven RLS, all FKs RESTRICT, seven invoker functions, platform roles no grants.
Final advisors no WARN/ERROR: INFO7 no-policy RLS,5 unused indexes. Seven identity
TypeScript regressions PASS after retirement addition; earlier46-domain PASS
retained. Two-session races/stronger isolation/production-scale full graph scan
NOT RUN; READ COMMITTED fixture is the demonstrated scope. No adapter/promotion
or actual backup/restore acceptance. Checkpoint6c766f5 pushed and SHA verified
before this coherent follow-up; new checkpoint required at this milestone.

Selection subset: dated official evidence, alternatives, budget constraints,
measured current artifact size and exact proposal documented. Docs scaffold/
links/task IDs and git diff checks before checkpoint; runtime tests not rerun for
docs-only selection. Subsequent live dev creation/private identity SQL PASS above;
no complete typed payload/adapter integration or restore PASS claimed. Prior301 full tests and latest61
focused/lint/typecheck/build/focus QA PASS remain scoped to previous checkpoints.
Branch codex/master-plan-execution, base1650df9 verified clean and remote matched.
## Active typed catalog slice — 2026-10-07
Goal: implement every current K15 item/lookup/spirit/season/provenance field as
explicit typed rows, preserving original order, null/presence, strings/translations,
PartialTime precision/offset/raw label, composite option keys and unknown/free
prices. R1 field ownership and existing validators are authoritative. The completed
identity/retirement constraints remain intact; no generic canonical JSON/EAV.

Scope: private additive catalog SQL tables, translation/source-key/ordered joins,
field-provenance field-presence rows (empty maps allowed, each field array requires
nonempty evidence per existing validators), acquisition costs/evidence/source offers,
future typed-ID references preserved with documented deferred target FKs. Codec
maps validated domain payloads to explicit row columns and back. Item/Spirit
optional fieldProvenance and Lookup optional null image/images retain presence
flags. Nonempty deferred dye/compatibility/media payloads require their reviewed
typed modules; fail explicitly before writing, never drop or infer them. Current
K15 has no such payloads. Canonical publication still uses existing validators.

Out of scope: source crawl, real provider import/publication, R3 events, R2 media,
new dependency/SDK, deployment/UI, connection secrets, scheduler, snapshot-release
metadata/CAS/promote and backup/restore completion (next slices).
Expected files: next CLI-created additive migration, src/server/catalogRows.ts,
tests/data/catalogRows.test.mjs, tests/sql/private-catalog.sql, active phase and
existing architecture/master/handoff. Dependencies: R1 approved, actual dev Free
resource, migrations20261006170439/171406/171612 applied and fixture PASS.

Steps: typed DDL and row codec; local every-field K15 encode/decode parity;
negative corruption/optional/time/price/composite-key tests; hosted synthetic row
rehearsal and domain projection reconstruction; compare schema columns with codec;
private privileges/RLS/FK/index/advisor checks; lint/typecheck/build/focused suite;
update handoff and push SHA-verified checkpoint. Hosted fixtures always rollback.
Do not claim full PostgreSQL K15 import from local row parity or fixture SQL alone.
Acceptance: all current legitimate fields preserved including empty evidence maps,
translations and independent forward/reverse source arrays; no private fields leak;
typed acquisition/FK/cardinality constraints reject intended cases; rollback leaves
zero rows; schemas/platform roles remain private. Runtime DB isolation/two-session
concurrency/relation revision CAS still need the actual transactional adapter.

### Typed catalog milestone / evidence
Applied `20261006173438_private_catalog_payloads`, SHA256
`a9dbfd085fa4f81f727db36fe69b9385fdf7bd8044b30775f87699f1de76d8dd`:
26 new private typed tables (33 total), explicit column codec for30 payload-owner
tables (four reused from identity foundation), no JSON canonical columns. Initial
reserved parameter name `precision` caused a transactional parse rejection;
verified item table absent/history still3 before fixing/reapplying. No partial DDL
or failed migration history entry retained. Files aligned to authoritative hosted
versions after CLI generation.

Local full current K15 every-field row round-trip PASS:1808 items/lookup,213 spirits,
30 seasons,244 provenance; canonical public bytes + hashes identical after export.
Synthetic deferred node/IAP/asset/rule/tree/realm/map/article IDs, null/presence,
translations including literal __proto__, independent ordered arrays, empty
fieldProvenance maps, exact source strings and scoped repeated option IDs retained.
Unsupported valid nonnull media fails explicitly before write; private payload
fields stripped, malformed/missing/orphan/wrong-type rows rejected.

Hosted codec-generated fixture -> actual SQL rows -> complete domain payload parity
PASS.32 negative SQLSTATE cases + positive known/free zero, deferred evidence/time,
FK/scoped key/cardinality/range/bypass checks PASS. No real K15 records imported.
Raw bounded SQL/actual fixture response/schema metadata stay outside Git on E:
`research/postgres-rehearsal-2026-10-07`; private schema has0 rows after rollback.
All30 codec column contracts match actual schema; all33 tables RLS, all FKs
RESTRICT, platform roles no schema/table/function grant and0 SECURITY DEFINER.
No unvalidated constraints. Advisor INFO33 intentional no-policy RLS/15 unused
indexes; no WARN/ERROR. Keep least-privilege runtime grant/policy design deferred.

Probe found valid500-digit tiny instant rejected by helper float underflow. Added
`20261006174420_preserve_instant_fraction_precision`, SHA256
`cc9755060b337115eb33ca1684a3d03c6f83b1d68c455d8a7584a987ea0ff7b0`.
Helper retains source text and bounds only computational microseconds; range
comparison uses whole seconds + padded fractional text, avoiding numeric scale
limits.500/17000-digit precision checks PASS.11 affected immutable-function CHECKs
recreated and revalidated in the same transaction, per
[PostgreSQL constraint guidance](https://www.postgresql.org/docs/17/ddl-constraints.html).
Legacy numeric key is no longer used by canonical CHECKs. Prior24 identity +22
retirement SQL cases rechecked PASS after helper change.

Validation:51 focused domain/codec tests +306 full tests, pnpm lint/typecheck/build
PASS; catalog1808. Added valid future-media and native known/free-zero assertions
then rechecked5 codec tests/native catalog rehearsal PASS. Existing Router/chunk
warnings retained. Docs scaffold/diff before checkpoint. Provider quota/publication/
API/production/SQL backup/restore acceptance NOT inferred from this milestone.
P9-I02 remains PARTIAL; snapshots/release metadata, durable audit, transactional
adapter/owner revision/global CAS, isolated restore and measurements remain OPEN.

Exact next: typed public-release/source metadata and ordered membership projection;
then transactional adapter/global CAS/private audit per the
approved preservation matrix. Isolated PostgreSQL backup/restore remains OPEN.
Docker CLI exists but daemon was unavailable (`dockerDesktopLinuxEngine` pipe
absent); no images/container/start attempted. No DB connection password requested
or obtained. This blocks local pg_dump/restore tooling currently, not further safe
hosted additive SQL slices.
Do not request R1, provider or organization selection again. Source/legal/
production gates persist. Resource creation is not migration/adapter acceptance.

## Active release metadata slice — 2026-10-07
MEDIUM implementation inside the approved R1 PostgreSQL subsystem, following
verified pushed catalog checkpoint dd7fb11. Goal: preserve manifest source paths,
optional source/import-summary presence, nullable future pins, every dataset's own
envelope timestamp/source order, canonical checksum and independent record order.
Scope: additive private typed release/dataset/source/snapshot/import-summary tables,
five explicit ordered membership tables, provider-neutral codec, corruption/parity
tests and rollback-only hosted synthetic rehearsal. Existing catalog/identity SQL,
validators and public reader remain authoritative and unchanged.
Out of scope: real import, publication pointer, immutable historical payload store,
connection SDK/credentials, auth/UI/deployment, global CAS and restore completion.
Membership records pin identity revisions; without a historical projection owner,
changed current rows must fail checksum/revision checks instead of reconstructing
an old release from new payloads. This does not complete versioned SQL history.
Expected files: CLI-created migration, src/server/releaseRows.ts, focused tests and
SQL fixture builder/body, existing architecture/phase/master/handoff/README.
Steps: encode canonical validated K15 -> rows; reconstruct using typed payload
rows and ordered membership; verify original canonical hashes/bytes; test optional
absence, private-field stripping, distinct envelope times, corruption, revision
drift and unsupported migration/media modules; hosted scalar-row parity, native
constraints/FK/RLS/grants and rollback; lint/build/full tests; checkpoint/push.
Acceptance: every legitimate current manifest/envelope field survives; forged
hashes, missing/extra/duplicate rows, wrong owner/revision/order, fixture/draft or
unverified publication fail closed. Dataset timestamps need not equal manifest
timestamp. No generic JSON canonical store, generic relation/EAV or new service.
Risks: FK IDs alone do not prove historical bytes; checksums and revision guards
are mandatory. SQL structure is necessary but cannot replace publication boundary
validation. Independent SQL concurrent mutation/canonical revisions remain next.
Exact next after this slice: transactional adapter/global CAS, durable private
audit and immutable public projection history; actual isolated backup/restore.

### Release metadata milestone / evidence
Applied20261006180131_private_release_metadata (CLI-created20261006175728, aligned
to authoritative hosted history); file SHA256
71877b82c4723b9b3f207ff37999cbd028fb20b44c9d8a7ef4cb3ae44ccc9b74.
11 typed private tables added (44 total); explicit subtype membership and revision
pins, dataset path/version/hash/schema/instant/source/fixture, manifest metadata,
optional source/import-summary flags, typed counters/rejected-empty and ordered
source path/blob SHA. Repeated source paths are valid and retained by position;
empty/nonempty/null assetManifestVersion preserved without assuming media validity.
Nonnull migration-bearing aliases/tombstones remain reviewed-adapter gated.
No public pointers, canonical JSON columns, real imported data or grants added.

Local full current K15 manifest/envelopes + canonical public bytes/hashes PASS:
1808 items/lookup,213 spirits,30 seasons,244 provenance. Codec strips undeclared
input fields through existing validators, detects missing/extra/duplicate rows,
wrong owner/revision/order/hash/version/fixture and refuses latest-payload fallback.
Distinct dataset generatedAt values preserved, not replaced by manifest timestamp.
Architecture/preservation matrix refined accordingly without public contract change.

Hosted synthetic catalog/release actual scalar rows -> complete canonical fixture
bytes/manifest PASS;38 negative SQLSTATE assertions PASS. Second hosted positive
fixture without source/importReport and null media pin reconstructed exactly.
Both ROLLBACK; all44 tables verified0 rows.11 writable release column contracts
match actual PostgreSQL schema;44 RLS, all FKs RESTRICT,0 unvalidated constraints/
SECURITY DEFINER/platform schema-table-function grants. Root version reservations
permanent; child candidate metadata remains editable until future reviewed seal/
promotion. No historical payload reconstruction or SQL checksum computation claim.
Advisors no WARN/ERROR: intentional
[RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
and empty-schema [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)
INFO retained. Actual rehearsal SQL/responses/schema JSON remain outside Git on E:.

4 focused release tests +310 full tests, lint/typecheck/build/catalog1808 PASS.
Initial lint failed four missing node:url imports in test-only modules; added imports
and rechecked PASS. After field-ownership documentation refinement and schema
verifier addition, focused migration/release tests, lint/typecheck/scaffold rechecked
before checkpoint. Existing Router/large chunk warnings unchanged. P9-I02/D04/V01
remain PARTIAL/OPEN; real K15 SQL import, historical projection sealing, canonical
transactional adapter/global CAS/private audit/race/restore/measurement NOT RUN.

Exact next: define/implement immutable historical public projection owner and its
version-bound read contract, then trusted transactional adapter with global CAS,
owner revisions, private audit/source health and atomic reviewed promotion. Reject
drift and preserve LKG. Use existing ingestion/repository contracts; no SDK/consumer
mount or connection-secret read assumed. Isolated restore tooling remains blocked
by unavailable Docker daemon; independent safe foundation work can continue.

## Active immutable projection slice — 2026-10-07
MEDIUM approved R1 implementation after pushed f85a6cb. Goal: store immutable,
version-bound derived public manifest/dataset bytes and seal candidate metadata,
so an old release remains readable after canonical payload owners change.
Typed canonical tables remain authoritative; explicit projection text is a derived
cache only, never an arbitrary canonical JSON document/EAV owner. SQL checks UTF8
hashes using PostgreSQL17 built-in sha256 (no extension). Reader validates the
existing publication boundary and canonical bytes before serving detached copies.
Scope: two private projection tables, completeness/hash/immutability constraints,
candidate metadata seal guards, provider-neutral row codec/version-pinned reader,
local full K15/API parity and hosted rollback-only history/corruption rehearsal.
Dependencies: approved R1, Free dev, six SQL migrations/typed metadata parity PASS.
Out of scope: global publication pointer, lifecycle/CAS/audit/source health writers,
real source import, driver credentials/SDK, consumer mounting, media modules, restore.
Expected files: CLI-created additive migration; server projection rows codec;
focused tests; bounded SQL builder/body; architecture/master/phase/handoff/README.
Steps: encode validated canonical projection, exact decode and version-bound read;
SQL deferred file/header FK and five-dataset completeness/hash/path checks; immutable
history/metadata guards; tests that mutable current payloads change while stored
old bytes/API remain exact; native SQL corruption/bypass tests and schema/grants;
lint/typecheck/build/full tests; checkpoint/push verified SHA.
Acceptance: no current-row fallback, no orphan/partial/edited/unverified/fixture or
noncanonical bytes served, all projection/metadata mutation/TRUNCATE bypass denied
once materialized. Materialization/sealing is not reviewed promotion: pointer/CAS
and rights revocation overlay remain explicit follow-up owners.
Risks: hashes prove byte integrity, not source rights/review. Metadata/root lock is
necessary for sealing races; two-session proof remains with actual transactional
adapter. Derived cache storage doubles public bytes; quota/sizing is not inferred.
Exact next: transactional adapter/global CAS/private audit/source health and atomic
reviewed pointer promotion, isolated backup/restore and measurements.

### Immutable projection milestone / evidence
Applied20261006181325_immutable_release_projection; CLI timestamp20261006181110
aligned to actual hosted history. File SHA256
7c1e20a72bc0f5f950680848816d5387e8761d8b2f494e96f272ed4c0df28804.
Two private derived-cache tables (46 total); exact UTF8 manifest/file checksums,
five-file completeness/path/hash parity, deferred header FK, sealed child metadata
and immutable bytes/root history/TRUNCATE guards. Files inserted before header;
header means materialized/sealed, not reviewed/promoted. Canonical entity payloads
remain typed/current; this is public projection history, not full entity-versioning.
Source rights/latest revocation and lifecycle approval remain separate owners.

4 focused tests preserve full current K15 canonical bytes/complete public repository
and representative list/filter/existing item+spirit detail/404/event503 API parity.
Wrong version/missing/extra/edited/rehash-private/fixture/draft/noncanonical bytes
fail closed. Unicode UTF8 sizing and optional metadata absence retained. Read model
is detached from caller/consumer mutation and current canonical owners.

Hosted24 negative SQLSTATE cases PASS for byte hashes, completeness/FKs/path/hash
mismatch and immutable/sealed mutation/bypass. Native current payload name/revision
advanced while stored old bytes/revision pins remained intact. Actual fetched row
response -> historical canonical bytes/repository parity PASS. Initial fixture helper
assembled candidate metadata with constraints immediate, rejecting setup before
target operation; fixed helper to assemble deferred, then validate complete metadata
before each negative test. No initial false-positive cases counted as PASS.
Prior38 release metadata cases and absent-optional hosted fixture rechecked PASS
after seal guards. All fixtures rollback, no real records imported.

46 tables verified0 rows/RLS; two writable projection column contracts match actual
SQL. All FKs RESTRICT,0 unvalidated constraints/SECURITY DEFINER/platform schema,
table or function grants. Advisors no WARN/ERROR; INFO intentional
[RLS no policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
and [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)
retained. SQL/actual rows/schema evidence outside Git on E:.
314 full tests/typecheck/build/catalog1808 PASS; initial test-only lint Request
global declaration corrected to globalThis.Request, then4 focused tests/lint PASS.
Scaffold/diff before checkpoint. No runtime driver/global CAS/public pointer,
two-session race proof, actual backup/restore or production consumer acceptance.
Exact next: implement approved SyncStore transactional contract with global CAS,
durable private lifecycle/audit/source health and atomic reviewed projection pointer;
validate SQL role boundaries/revisions/concurrency, then restore/measurements.

## Active SQL sync metadata/CAS slice — 2026-10-07
MEDIUM within approved R1; pushed8214612 verified before work. Implement typed
global generation/current acceptance, immutable private acceptance/audit and
independent source health/attempt/failure/retry. Shared global CAS must reject stale
generation before metadata writes, retain LKG on failure, bind acceptance to sealed
projection and source identity, and preserve exact review/lifecycle timestamps.
Scope: private additive SQL and rollback-only native promotion/reconfirmation/
failure/two-source conflict tests plus metadata row codec/read projection pointer.
Out of scope: claiming complete SyncStore, historical canonical identity graph,
canonical payload transaction writer, runtime driver/credentials/new SDK,
authenticated reviewer/admin endpoint, actual parallel sessions, consumer mount,
production and isolated restore. No scope regression: these remain required next.
Metadata CAS alone cannot atomically persist canonical payload; future adapter must
lock global generation before canonical mutation and rollback every write on false.
Expected files: CLI-created migration, focused lifecycle codec/SQL tests and builder,
existing architecture/master/active phase/handoff/README. No generic canonical JSON.
Steps: typed DDL/scalar CAS; exact review digest/timestamp/transition checks; complete
global+per-source read metadata; native duplicate/stale/cross-source/time/FK/rollback
and history/bypass cases; role/schema checks; lint/typecheck/build/tests; checkpoint.
Acceptance: one global monotonic generation across all sources; immutable private
review/audit, source isolation, pointer from sealed projection, failure does not
replace LKG, exact accepted retry/reconfirmation policy remains existing SourceSync.
One fixed singleton row seeds revision0; this is control state, not imported data.
No grant/public policies. Source IDs still use existing K01–K15 registry.
Risks: scalar metadata validates lifecycle integrity but not arbitrary candidate
rights or full semantic contentHash. Existing reviewed ingestion validators and
authenticated reviewer remain mandatory. Native sequential conflicts do not prove
two-session concurrency or adapter rollback of canonical writes.

### SQL sync metadata/CAS milestone / evidence
Applied20261007014843_private_sync_metadata_cas (CLI-created20261007014619, aligned
to actual hosted history). File SHA256
faed341f276664e5c423fd64fb92073b253609c0bee0902e9f67e96c98fe25b6.
Four private tables (50 total); shared monotonic generation/current acceptance,
sealed projection FK, exact review tuple/lifecycle time checks, immutable private
acceptance/audit and independently scoped source attempt/success/failure/retry.
Deferred consistency checks pointer/audit continuity/source counters and health.
Staged acceptance has a deferred audit FK; cannot commit orphaned after losing CAS.
Scalar apply_sync_metadata_cas locks one global row; returns false before metadata
writes on stale generation. Canonical writes are still outside this subset.

Native bounded two-source synthetic sequence PASS: first reviewed acceptance,
failure preserves LKG, second source failure/acceptance does not rewrite first source
health, sequential stale CAS writes nothing, same-content reconfirmation and source
recovery.34 negative SQLSTATE cases PASS including stale clocks/wrong review hash/
source/outcome, orphan accepted staging after losing CAS, invalid health/counters,
generation regression/skip and immutable delete/update/TRUNCATE bypasses.
Actual SQL selected-source frames decode to expected global pointer/private audit
and separate source freshness; candidateHash equals existing candidateReviewHash.
Two initial fixture setup issues corrected: defer multi-table consistency until
operation boundary; split mutating CAS calls from post-write condition assertions.
No failed rehearsal counted as PASS. No actual multi-session race claimed.

All native fixtures ROLLBACK: only the intentional singleton revision0/null pointer
control row remains; all49 other tables empty.50 tables RLS; four writable metadata
column contracts match actual SQL; all FKs RESTRICT,0 unvalidated constraints/
SECURITY DEFINER/platform schema-table-function grants. Advisors no WARN/ERROR;
intentional INFO
[RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
and [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)
retained. Bounded fixture/schema/actual response JSON outside Git on E:.
4 focused metadata +318 full tests, lint/typecheck/build/catalog1808 PASS; scaffold/
diff before checkpoint. Added selected-source success-vs-current acceptance guard
and rechecked4 focused tests/lint/typecheck PASS. Existing Router/chunk warnings unchanged.

Exact next: archive canonical identity graph/ordered explicit relation owners and
implement typed payload transaction writer/provider-neutral SyncStore read/CAS,
using existing reviewed SourceSync contracts/budgets. Complete adapter must lock
global generation before canonical mutation, use deferred consistency, force all
constraints before commit and rollback on any false/error. Then real two-session
conflicts/rollback/provider parity/restore/measurement and least-privilege runtime
role/authenticated review. No SDK/credential/consumer mount approved by implication.
P9-I02/D04/V01 remain PARTIAL/OPEN; metadata SQL is not full foundation completion.

## Active canonical graph history slice — 2026-10-07
MEDIUM approved R1 subsystem work after verified pushed53498f6. Preserve complete
IdentityGraph and ordered candidate.provenanceIds by acceptance revision, including
retired/nonpublic identities, crosswalks, unknown-source aliases, tombstones and all
20 declared typed relation kinds. Do not infer archive from latest canonical rows
or from the public subset: those lose historical revisions/private canonical nodes.
Scope: server row codec with immutable header/count/hash and ordered explicit rows;
seven snapshot owners plus20 explicit typed relation tables (no generic relation/
EAV/document canonical owner). SQL reviewed/applied/rehearsed after full field/order
parity; acceptances and domain validators remain authoritative. Snapshot header seals
rows, validates FK/cardinality/retirement/event-parent consistency and array order.
Out of scope: full domain payload history beyond current published projection,
new module game data/UI, runtime SDK/credentials, full SyncStore writer/driver,
actual races, production/publication and isolated restore. These remain required.
Dependencies: existing sourceSync validateIdentityGraph/current/previous semantics,
eight approved dev migrations, immutable projection and private acceptance metadata.
Expected files: server graph history codec, focused all-kind/K15/corruption tests,
CLI migration and native fixture builder/body/verifiers, existing architecture/
master/phase/handoff. Existing candidateReviewHash/contentHash ordering must survive
reconstruction. Arrays preserve order across different typed relation tables.
Steps: explicit row vocabulary -> domain validator -> encode/decode -> every-field
full K15 graph and synthetic all-kind/alias/retirement/event tests -> typed SQL and
hosted actual-row parity/negative constraints/immutability -> roles/lint/build/tests
-> durable checkpoint. No automatic DONE for whole source/infrastructure roadmap.
Acceptance: private/nonpublic canonical nodes and field evidence IDs retained;
zero unsupported relation drops; exact kind-qualified IDs and arrays; future payload
module not claimed from identity graph metadata. Full graph hash/counts and existing
validator reject changed/cyclic/cross-kind/orphan/retired/required/event-parent rows.
Exact next: typed canonical payload transaction writer + provider-neutral SyncStore,
locking generation before mutation and committing graph/projection/acceptance/audit
atomically; then actual concurrency/provider/restore/measurements.

Completed graph history milestone: migration20261007020927_private_acceptance_graph,
SHA2561113dd8d404cad0731d5573b08928d93cf74602d0d3ba2cc789593fbbbc498bea,
applied to the approved isolated Free development project.27 new private tables:
acceptance header, ordered candidate/identity evidence, independent identity revision
metadata, crosswalk, alias, tombstone and20 explicit relation owners. Fixed endpoint
kinds are generated SQL columns; never a generic relation/document canonical owner.
Historical metadata has no FK to mutable current identity revision. References to
registered provenance preserve IDs; provenance payload history is a separate gate.
Children precede header; deferred header/evidence/typed target FKs reject unfinished
frames. Parent acceptance lock serializes header sealing vs inserts; no insert,
update, delete or TRUNCATE after seal. Global lock must precede all future driver
writes. Required/to-one/one-to-one, mixed relation order, exact retirement, alias
cycles/terminal/replacement and event parent checks enforced. Previous-frame revision/
crosswalk/alias/tombstone continuity still requires validateIdentityGraph(previous).
SQL validates hash vocabulary/structure/counts/order; graphHistoryRows reconstructs
and checks the exact JS byte digest. No claim SQL proves the reviewed content hash.
Existing metadata acceptances may omit a graph; the future full adapter must require
graph + reviewed projection + typed canonical payload in the same transaction.

Five focused tests PASS: all14 kinds/20 relation arrays, every field/order, unknown
alias sources, cross-kind shared IDs, fixture/private and retired identities; full
K15 graph2051 identities preserves actual SourceSync contentHash/candidateReviewHash
after physical row reordering; corruption fails closed; prior revision continuity.
Hosted rollback-only fixture stages two independent frames with owner revision/edge
change; readback matches codec after mutable catalog change.141 SQLSTATE negatives
PASS, including32 malformed frames,108 per-owner update/delete/TRUNCATE/sealed-insert
guards and missing acceptance. Initial migration syntax failed on unquoted position
in function output; fixed before successful application/history verification.
Initial builder missing-header count adjustment fixed before native PASS. No failed
attempt counted as success. Evidence SQL/actual rows/schema on E: outside Git.

77 private tables all RLS; exact27 writable column contracts, RESTRICT FKs,
0 unvalidated constraints/SECURITY DEFINER/platform schema-table-function grants.
One revision0 control row remains; all76 other tables empty. Advisors no WARN/ERROR;
same intentional no-policy RLS and unused-index INFO. Schema audit exceeded the
100-argument JSON function limit initially; split bounded objects and verified.
323 full tests/lint/typecheck/build/catalog1808 PASS; scaffold/diff before checkpoint.
No real import/SDK/credentials/consumer/rights change.
This completes the graph metadata slice, not full canonical payload history,
transactional SyncStore/provider driver, authenticated review, races or restore.
Exact next: typed canonical payload transaction writer + provider-neutral SyncStore;
lock global generation before mutation, decode immutable graph/projection alongside
sync metadata, validate complete candidate, write acceptance/audit atomically, force
deferred constraints before commit and roll back ALL writes on false/error. Then
real two-session conflicts/provider parity/restore/measurement/runtime role review.

## Active SyncState read composition — 2026-10-07
MEDIUM approved R1 continuation from pushed2e81dc3. Compose pinned global acceptance
metadata + historical graph + immutable public projection into validated SyncState.
Reuse SourceSync's exact content hash/projection/domain/budget checks; preserve source
health independently of global LKG and historical fetched/staged/review/promotion.
In scope: provider-neutral row frame decoder, detached state, corruption/budget/
cross-source/failure/initial and existing promotion/failure API tests. No runtime
DB driver/SDK/credentials/grants/current payload writes/consumer mount. Read frame
must come from one consistent provider transaction/snapshot, not independent fetches
that can mix generations. Header hash alone is insufficient reviewed candidate proof.
Expected: sourceSync restoration validator, syncStateRows, focused fixture tests,
existing handoff/phase/master/architecture. Acceptance: exact current K15 candidate
and review digest, whole frame rejection for missing/unpinned/tampered rows, no
mutable canonical reads, unchanged LKG when selected source has no success/fails.
Next after this slice: typed canonical payload transaction writer/full SyncStore CAS,
then actual DB transaction/provider/concurrency/restore acceptance. No DONE inferred.

Verified ordering dependency: first composition test fails existing contentHash
because canonical public manifest bytes sort datasets keys, while SourceSync embeds
the validated manifest with source-supplied Record key order (actual K15 uses
items/lookup/spirits/seasons). Deep field/public byte parity does not establish
JSON.stringify order parity. Preserve the approved hash/public byte contracts;
do not alter existing reviews or guess order from current canonical data. Extend
this slice with one typed acceptance_manifest_dataset owner (exact four names and
positions), immutable/deferred complete at commit, pinned to acceptance. Decoder
reorders validated manifest.datasets from those rows before existing SourceSync
hash validation. Migration is additive; no completed projection/graph migration
rewrite, payload/UI change or new provider dependency. Metadata-only acceptances
still exist; full reader requires explicit order. Future writer must archive it
with graph/projection/acceptance/audit. Validate all24 possible key orders locally
and actual hosted rollback-only row composition after migration. This is explicit
review byte metadata, not an arbitrary JSON/EAV/domain owner or a new game fact.

Completed read composition milestone: migration20261007022023_private_acceptance_manifest_order,
SHA2567de86899e856d31516039793d4e3dffe2e5ca0d1b9fec5a2db52b54984f95b3d,
adds one private immutable typed acceptance dataset-order owner (78 tables total).
Four names/positions, parent acceptance lock and deferred completeness enforce
whole ordered frame at commit; update/delete/TRUNCATE and partial/orphan/extra/
duplicate frames reject. SQL accepts metadata-only acceptance without order; full
reader requires it. No previous migration/history/hash definition changed.
syncStateRows composes pinned metadata/graph/projection/order into a detached
SyncState; validateStoredSyncCandidate reuses existing SourceSync validators,
public allowlist/budgets and exact content digest, then candidateReviewHash binding.
Provider must fetch one consistent transaction/snapshot with bounded row/byte
transport. Decoder budget rejection does not bound provider allocation/transport.
Private reviewer reference is not authentication, and review hash is not rights.

Seven focused read tests PASS: full actual K15 graph/public fields/content-review
hash; all24 manifest dataset orders; initial/first failure; selected source with no
success while global LKG exists; health/retry/promotion parity; detached state;
self-consistent forged graph/projection/hash or mixed generation/extra/missing/
bad-order/over-budget frames fail closed. First two tests exposed order loss, fixed
through explicit historical metadata rather than weakening digest checks.
Native rollback-only fixture uses actual staged synthetic candidate and exact
approval hash; metadata + archived graph + projection + dataset order reconstruct
that candidate after mutable catalog change and two-source failures.11 native
SQLSTATE cases PASS; actual K15/K01 selected frames preserve independent health/
retry with global LKG/approval. SQL/rows/schema evidence retained outside Git on E:.
78 RLS; new writable columns/FKs exact;0 unvalidated/non-RESTRICT FK/SECURITY DEFINER/
platform grants; one revision0 control baseline, other77 tables empty. Advisors
same intentional INFO/no WARN/ERROR.330 full tests/lint/typecheck/build/catalog1808
PASS; scaffold/diff before checkpoint. No real import/SDK/credentials/runtime role/consumer.
This is complete read composition, NOT provider transaction driver/full SyncStore
writer. Exact next: typed canonical payload transaction writer/provider-neutral
atomic CAS, persist order with graph/projection/acceptance/source/audit; preserve
previous graph continuity and lock global generation before any writes; force all
deferred checks before commit/rollback every false/error. Then actual multi-session
race/provider/restore/measurements and runtime-role/authenticated-review gates.

## Active transactional SyncStore slice — 2026-10-07
MEDIUM approved R1 continuation from verified e275df6; complete portable read/CAS
orchestration for the existing SourceSync candidate contract. Runtime connection
driver/SDK/credentials/grants, authenticated reviewer, actual two-session races,
backup/restore and real source consumer mount remain separate gates.
In scope: parameterized PostgreSQL transaction interface, consistent pinned read
frames; global FOR UPDATE before ANY write; reproduce existing promotion/failure
transition validation; typed full current K15 payload writer + identity reservations/
crosswalk/alias/tombstone + archive/projection/order/acceptance/source/audit atomics.
Current SourceSync carries full public K15 and complete private identity graph
metadata; it does not carry future module/private fact payloads. Preserve all graph
kinds/edges, require unknown nonpublic evidence to be previously registered, never
fabricate provenance facts. No arbitrary canonical JSON/EAV/drop-and-reseed strategy.
Dependencies: ten applied private migrations, existing row codecs and SourceSync
validators/budgets/transition clocks. Previous graph history remains authoritative.
Affected: server SQL transaction/read/write modules, focused actual K15/retention/
revision/binding/conflict/rollback tests, bounded native SQL emitted by same writer,
existing architecture/master/phase/handoff. No new package/provider API/production.
Steps: retain typed owner payloads, enforce all changed entity/lookup payload fields
require higher owner revision -> bounded static parameterized SQL -> compose read/
CAS with exact existing SourceSync transition -> native generated DML parity,
stale generation no writes, failures LKG, injected rollback, old release independent
of current mutation -> focused/full checks -> pushed durable checkpoint.
Canonical arrays: incoming published records first, retained old records afterwards
in old order. Explicit retirement changes retained record_status/identity metadata;
other retained fields stay last known, not inferred new private facts. Public
membership/order lives in immutable release rows and does not equal canonical row
position. Positions may be relocated to a temporary disjoint positive range then
compacted within the locked transaction; no immediate UNIQUE constraint rewrite.
Replace mutable child rows only for current typed payload owners, never identity
reservations/historical release/projection/acceptance. Register sources, upsert
provenance/identities before typed owners/children and graph FKs. Missing proof or
unsupported typed module rejects/rolls back, not silent drop. Existing current
private evidence stays registered and ordered. Retained typed retired payload fields
represent last-known facts; live graph edges require active nodes separately.
Acceptance: current K15 every field/unknown/free/order preserved; exact next state
matches approved SourceSync behavior; global lock/CAS precedes mutation; partial
publication impossible under transaction interface; defer then force constraints
before COMMIT; every error/false after mutation throws to rollback the WHOLE tx.
Validate schema/FKs/projection pinning/history and all native fixture mutations in
ROLLBACK; real connected driver/concurrency/restore are NOT proven by statement
replay. Do not mark whole P9/R1 or future payload modules DONE from this slice.
Exact next after portable writer: actual provider transaction driver/least-privilege
role approval boundary, multi-session/provider failures and isolated restore/scale.

Verified writer prerequisite: SourceSync validateProjection deliberately permits
public record.provenanceIds to be an ordered subset of canonical identity evidence.
catalogRows currently assumes exact equality and reconstructs record evidence from
identity_provenance. This cannot preserve a valid reviewed public subset while
retaining extra private canonical evidence. Do not reject this valid contract or
expand the public record by guessing/filtering graph order. Before writer DML,
add one typed payload_provenance binding owner for item/spirit/season; keep full
identity_provenance canonical graph evidence distinct. Payload evidence references
canonical identity evidence by FK, preserves independent order and requires evidence
for nonfixture payloads. Upgrade encode/decode explicitly; rows without declared
payload evidence are invalid, not a legacy fallback. Additive development migration;
baseline has no real payload seed. New native codec fixture/projection subset
parity plus missing/non-subset/immutable-key/evidence/order checks, full current K15
byte parity and current private schema/count/role audit before checkpoint. This is
necessary to the full writer and preserves SourceSync/public/hash/rights contracts;
not evidence of complete SyncStore/provider driver or new private game facts.

Completed writer prerequisite: migration20261007023752_private_payload_evidence,
SHA256334631deae66e5e026bf3a2d3d6f68c6df64f9260fab5fe54b71c9b8f3f19ead;
79 private RLS tables, no platform grants, revision0 control/other78 empty verified
after rollback-only rehearsals. Independent typed payload evidence owner/ordering,
composite RESTRICT binding, deferred root/completeness/order guards and truncate
protection; old actual owners backfilled exact old evidence without new facts.
Three new local tests +333 full tests/lint/typecheck/build/catalog1808 PASS.
Actual hosted private graph plus exact public subset preserves reviewed candidate,
content/review hash and every public byte;13 native SQLSTATE negatives and correctly
ordered evidence replacement PASS. Rebuilt catalog32/read composition11 native
negatives and actual decoded parity PASS. Advisors no WARN/ERROR; intentional INFO.
Evidence retained outside Git on E:. No real imports/role/SDK/consumer mounts.
Full transaction writer still OPEN. Exact next: typed payload retention/revision
plan and static parameterized DML, then provider-neutral locked atomic SyncStore
orchestration/rollback proof. Delete payload evidence before replacing canonical
identity evidence; derive explicit scoped public row frame from reviewed files
for release metadata, persist full canonical evidence separately. Unknown private
proof requires an existing registered SourceRecord; no implicit facts/public filter.

Completed canonical prepared-write milestone (base pushed f5b4a47):
canonicalPayloadPlan validates candidate/hash/budgets, current typed payload and
previous full graph; retains unpublished roots/lookup/proofs, applies only explicit
retirement metadata and requires higher SAME owner revision for changed item/
spirit/season/lookup facts. Public record order and independently ordered evidence
stay exact; scoped public rows feed release metadata without overwriting private
canonical graph evidence. Unknown private proof/missing current owner/corruption/
guessed active retained joins reject the entire preparation. Detached results.
canonicalPayloadWrite emits static parameterized scalar SQL with explicit caller
row/byte budgets/100-row batches. Sources/proofs/full graph identity reservations
before bindings; payload evidence deleted before canonical evidence; positive
disjoint root position relocation/compact keeps immediate UNIQUE; typed mutable
children replaced in FK order, stable roots/history retained. Canonical crosswalk/
alias discriminator/chains/tombstones preserve prior validated reservations.
Seven focused tests PASS; full actual local K15 every field/public byte and bound
statement generation, retention/retirement/private proof/revision/wrong sibling/
corrupt frame/unknown new private evidence/row+byte limits.340 full tests/lint/
typecheck/build/catalog1808 PASS, latest strengthened full K15 target PASS.
Actual prepared SQL replay on PostgreSQL17.11 PASS: new/retired/retained typed
roots/evidence/positions, nested unknown/null -> known zero costs and decimal offer,
crosswalk/alias chains/tombstone/future-kind reservation parity. Old public immutable
projection and new version remain exact; repeated fragment idempotent. Two injected
mid/end failures rollback all canonical writes. New release metadata must be
deferred while its rows are inserted; first builder failure fixed, no DDL changes.
No current real source rows: outer ROLLBACK, revision0 control/other78 empty verified.
Native SQL/actual rows/schema retained outside Git on E:. Prepared fragment is NOT
whole publication/CAS/Store/connected driver, and native replay is not concurrent
session or authenticated review proof. No new migrations/provider/SDK/credentials.
Exact next: provider-neutral transaction interface + bounded consistent frame reads,
global FOR UPDATE before ANY mutation, reproduce exact SourceSync transitions,
canonical fragment + release/projection/archive graph/order/acceptance/source/audit
in ONE transaction. Validate frame/archive/current alignment; false/error after
mutation must throw rollback, stale generation must return false before writes;
force all deferred checks before commit. Then connected role/driver authorization,
actual multi-session races/provider failures/restore/measurements gates.

Active full SyncStore slice (verified fd99b64): MEDIUM continuation inside approved
R1 server foundation. Portable SQL transaction/query interfaces; repeatable-read
readonly consistent pinned frame, read-committed CAS with global FOR UPDATE first.
Driver transport must enforce explicit row/byte limits while decoding; SQL LIMIT
and decoder checks are additional bounds, not transport guarantees by themselves.
Validate current typed payload/evidence/reservations against archived global graph
and latest public projection before mutation. Reproduce existing SourceSync
promotion/failure using capturing store and compare whole proposed state, including
Map file bytes and manifest Record order. Stale expected generation returns false
before writes; any false/error after mutations throws to roll back the whole tx.
Reuse prepared canonical fragment; materialize new release/projection once, verify
exact immutable bytes for reused version; acceptance/graph/order then SQL metadata
CAS/audit/source health and force deferred constraints before commit. Failure never
changes canonical/LKG/publication/review. Test interface driver commit/rollback,
full statement replay/native returned read parity; real connected concurrent driver
and role/reviewer authentication/restore remain gates. No new SDK/grants/provider/
migration/import, no production consumer or source/legal gate change.

Completed portable full SyncStore orchestration (base fd99b64): postgresSyncRows
uses static typed columns/scalar bindings/LIMIT and cumulative row/byte checks;
SqlConnection requires limits enforced DURING transport/decoding, exact JS-safe
bigint conversion and no successful truncation. SqlDatabase requires one connection/
snapshot, commit only on callback success, rollback every callback/commit error,
cleanup and no implicit callback retries. Read uses repeatable-read readonly;
CAS uses read-committed with global FOR UPDATE as FIRST SQL operation. Stale
returns false before further reads/writes. Whole next state is replayed through
existing SourceSync promotion/failure with captured proposed state; every field,
Map file byte and manifest Record order must match. Explicit nullable fields reject
undefined; server clock/failures/retry/review/source rules preserved. Contract
validator reused, no duplicated weakened state machine.
Current canonical identity/evidence/crosswalk/alias/tombstone rows must equal pinned
global archived graph. Typed payload/proof/order must be a no-op replay of latest
reviewed public snapshot; direct mutable fact/rights/order drift rejects before
mutation. Registered proof pool may exist before first acceptance, but no unreviewed
typed roots/reservations. Prepared canonical writes + new release/immutable
projection + acceptance/full graph/order + source/audit/global SQL CAS are one
callback; reused version must match EXACT immutable bytes and gets no sealed row
mutation. Full write budgets include archive parameter rows and bytes. CAS false/
wrong result/error after mutation throws, forced deferred checks/post-read parity
and canonical alignment must succeed before callback can commit. Failure only
registers own source + metadata CAS; canonical/graph/projection/review remain intact.
Ten focused tests PASS, including full pinned local K15 through Store promotion/
read (1808 items/213 spirits/30 seasons/2051 identities), stale no writes, early/
late/CAS false/constraint/post-read/commit rollback, independent initial/source
failure, reviewed reconfirmation/reused version, forged files/review/retry/health,
typed/proof/order/reservation drift, budgets/driver scalars/explicit nullability.
Scripted driver tests prove interface behavior, not actual provider transport or
multiple-session races. Actual PostgreSQL replay executes exact Store SQL queries/
writes;866 positive result assertions match independently expected frames. Five
phases: first publication, changed payload/retirement/new reserved kind/alias-chain,
independent K01 failure, own K15 failure, same-content new review reconfirmation.
Private proofs/cost null->known zero/decimal offer, historical public bytes and
source-specific health/retry/global LKG/approval remain exact. Wrong late SQL CAS
and forced deferred incomplete-release validation each roll back WHOLE publication,
including canonical/release/projection/graph/order/acceptance/audit/control. Synthetic
rehearsal793321 bytes/SQL SHA25698c9c0262cc0664a3083f1f71da07434f010c32132fb9fdabdb3f6d79944505e;
evidence outside Git on E:. Strengthened nullable input checks leave generated SQL
identical (SHA rechecked). No migration/role/grants/credentials/new dependency.
Outer ROLLBACK/current schema audit confirms79 RLS/all RESTRICT FKs/0 unvalidated/
SECURITY DEFINER/platform schema-table-function grants; revision0 singleton/other78
empty. Native sequence is one fixture connection, NOT actual separate transaction
commits/parallel sessions/connected runtime driver/authenticated reviewer/restore.
Exact next: prepare concrete minimal connected driver/runtime least-privilege and
authenticated-review contract + rollback/credential handling; check existing SDK
capability before choosing a dependency. Do not collect secrets or apply grants/
consumer mounts as implied permission. Then approved real provider transaction/
transport/cancel/commit errors, simultaneous sessions, isolated restore/measurements
and real adapter integration. P9-I02/D04/V01 remain PARTIAL/OPEN, R2–R6 gated.
