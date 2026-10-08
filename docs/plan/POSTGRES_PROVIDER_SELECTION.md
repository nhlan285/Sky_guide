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

## Active slice — bounded private read transport / runtime contract

MEDIUM preparatory implementation within the approved PostgreSQL subsystem.
Goal: lower existing static private SELECTs into server-budgeted results before a
future SDK buffers fields; decode explicit text/OID results without lossy bigint
or timestamp conversion. Dependencies: portable SyncStore and79 typed owners at
3e21e88. No existing SQL client/auth adapter/environment connection is present.

Scope: static SELECT allowlist, one materialized locked snapshot, row/UTF-8
DataRow budget guard, scalar decoder, synthetic native SQL checks; concrete driver,
runtime privilege, review-auth and uncertain-commit decisions below. Out of scope:
install SDK, credential operations, roles/grants/policies, consumer routes, real
imports, production, actual cancellation/commit/race/restore claims. Expected:
src/server/postgresSyncTransport.ts, focused tests and native fixture builder,
architecture/phase/master/current handoff. No UI behavior or public API changes.

Steps: implement bound lowering and strict decode; verify input injection/type/
Unicode/null/overflow boundaries; execute bounded synthetic reads on dev inside
ROLLBACK, including locked head and oversized single field; run lint/typecheck/
tests/build and scaffold; update handoff, checkpoint/push/verify. Acceptance:
over-budget field values never appear in SQL result, no partial success; explicit
supported OIDs only, exact safe integers; unchanged Store/public contracts. Risk:
this bounds DataRow payload only, not database work, protocol metadata or network
packets; actual SDK integration still needs connection/timeout/cancel proof.

## Connected runtime contract — prepared, not mounted

Existing SDK audit: package/lock/runtime contain AWS/React tooling, no PostgreSQL
client or Auth adapter. No database connection environment variable names were
present; no values/keys/passwords were inspected. Prefer a server-only low-level
node-postgres driver for the existing parameterized SQL and per-query array/text
type parsing; postgres.js is a plausible alternative but has no existing repo
integration to preserve. Supabase HTTP/PostgREST RPC would require a new privileged
RPC/schema exposure and cannot directly satisfy this callback/connection contract.
No new SDK/version is installed or implicitly approved by this proposal.

Driver boundaries and concrete initial configuration for the next dev slice:

- One acquired client per transaction; explicit BEGIN REPEATABLE READ READ ONLY
  for reads, BEGIN READ COMMITTED READ WRITE for CAS; no pool.query inside callbacks.
  Driver owns BEGIN/COMMIT/ROLLBACK; callback cannot send transaction-control SQL,
  DDL, multi-statements, arbitrary SELECTs or named prepared statements. Existing
  SET CONSTRAINTS and emitted static scalar DML remain valid. New CTE lowering
  applies to reader SELECTs; metadata CAS is a separately allowlisted one-bool
  function result. Reject unexpected DML RETURNING/results. No callback retry.
- Explicit host/database/user/port and secret injection; UTF8 server/client,
  verified TLS/hostname/approved CA. Reject missing settings, SSL query-string
  overrides and rejectUnauthorized:false; do not fall back to developer PG*
  environment defaults. Pool maximum2 for isolated simultaneous-session testing
  only after verifying actual provider connection quota. No autoscaling claim.
  Proposed starting deadlines: connect5s, lock2s, statement15s, idle transaction10s,
  callback wall30s, cleanup5s. Confirm measured full K15 transaction fits before
  accepting them as runtime defaults; all deadlines must be explicit/bounded.
- SDK rowMode=array with query-local identity text parsers (not global type-parser
  changes). OID16/20/21/23/25/701/1043 only; timestamps stay text. Binary/JSON/date/
  numeric/unknown types fail closed until explicitly mapped. Safe int8 only;
  float8 represents an existing finite SQL double, not arbitrary decimal money.
  preparePrivateReadTransport guards byte/row payload at the server; decode checks
  flags/columns/types/UTF8 budget again. Existing reader adds its cumulative frame
  and LIMIT+1 overflow check. Neither successful truncation nor payload leakage
  on a rejected query is allowed. Statement/output budgets do not bound DB memory,
  full-scan time, error/notice message sizes, RowDescription or TLS packets.
- Before COMMIT, force deferred constraints/post-read validation. Callback error
  or confirmed SQL commit rejection: rollback and release only after verified idle;
  rollback/timeout/cancel/connection errors evict/destroy client. Client-side timeout
  alone is not proof the server stopped: cancellation and drained/error state need
  connected tests. No timeout implementation may send COMMIT while work continues.
- Lost COMMIT acknowledgement is INDETERMINATE: evict, use a fresh readonly
  connection and query immutable sync_audit at expectedRevision+1, its acceptance
  (for promotion/reconfirmation), graph/order/projection plus source-specific state.
  Match complete source/outcome/time/review/content witness, not merely current head
  or contentHash; later generations may exist. Missing/unreachable witness is not
  proof of rollback while the old backend remains unconfirmed. Quarantine operation,
  stop automatic retry/recordFailure; reconcile/require operator action. Do not send
  an outward definite rejected/not-published response just because SourceSync caught
  a driver exception. Runtime must own this reconciliation boundary before mounting
  the unchanged SourceSync result API. A confirmed commit followed by local release
  error remains committed; evict/log sanitized cleanup failure without changing result.
- Log only operation category, SQLSTATE (validated5 characters), safe witness/ref
  and deadline reason. No provider error detail/message/SQL/params/cause/connection
  URL/headers/private rows or secrets in responses/logs/checkpoints. No get API keys,
  password reset, admin connection fallback or secret collection as an automatic step.

Least-privilege development proposal (NOT APPLIED): dedicated runtime reader and
writer, separate migration-owner connection; neither runtime role may own objects,
be superuser/BYPASSRLS, create roles/databases/schemas, use service_role or grant
membership to platform roles. Reuse private schema; do not expose it to PostgREST.
Reader: CONNECT, schema USAGE, SELECT explicit79 owners and allowlisted invoker
validation helpers. Writer: reader access plus static insert/upsert payload,
reservation, immutable release/graph/order/acceptance owners; UPDATE only current
canonical roots/proof registry/positions and sync_generation/sync_source_state;
DELETE only replaceable typed child/proof joins. No root, identity, provenance,
source, reservation, release/projection, acceptance/audit/history DELETE/TRUNCATE;
no actual UPDATE immutable release/graph/audit. The four invoker-lock UPDATE-column
privileges below use WITH CHECK(false); they grant locking, not accepted mutation.
source_registry insert only. CAS helper
EXECUTE only writer; no SECURITY DEFINER shortcut. Derive exact table/column/helper
grant list from current emitted SQL and trigger/helper call graph, not ALL FUTURE
TABLES/FUNCTIONS. Dedicated RLS policies per operation/role are required: existing
no-policy RLS correctly denies runtime access even with grants. SELECT head FOR
UPDATE also requires targeted UPDATE privilege/policy. Prove actual allowed and
forbidden role operations natively before retaining any grants. PUBLIC/anon/
authenticated/service_role remain denied; do not alter platform policies.

Rollback/credential handling: role/grant/policy proposal first, separate scoped
dev migration only after authorization; no tracked password/default-admin secret.
Inject secret through an approved local/server secret store, never chat/Git. Stop
runtime, drain/evict connections, revoke CONNECT/schema/table/function privileges
and dedicated memberships/policies; retain schema/data/history and migration role.
If a credential was introduced, revoke/rotate using the approved channel. Record
rollback SQL and before/after catalog grants/RLS assertions in that future slice;
do not delete committed data to roll back transport integration.

Authenticated-review proposal (NOT IMPLEMENTED): provider-neutral server adapter
verifies credential signature/issuer/audience/expiry and maintainer membership;
returns a stable subject/maintainer principal. Build reviewerRef from that verified
subject, never request-body reviewerRef, display name or DB writer credential.
Candidate hash/base/source/time/content remain bound by existing review contract;
require review authority again at promotion, reject revoked/expired/non-maintainer
principals and use server clock. User/session-selected Auth provider is still an
explicit choice; no browser auth, JWT secret or admin endpoint added here. A stored
reviewerRef or maintainer-supplied fixture is not authentication proof. Rollback
disables endpoint/access while keeping immutable review history and API contracts.

Acceptance still OPEN: actual SDK transport and bounded cleanup/COMMIT uncertainty
reconciliation; credential/runtime-role authorization + concrete catalog grant
allowlist/RLS tests; chosen Auth adapter/revocation; independent simultaneous
connections (not one fixture transaction), cancellation and separate commits;
isolated dump/restore and Free-tier SQL/storage/compute measurements. Repo-local
implementation/fixtures cannot substitute for any of those runtime proofs.

Primary docs checked2026-10-07: [pg query/text/type configuration](https://node-postgres.com/apis/client),
[one client per transaction](https://node-postgres.com/features/transactions),
[default types/date precision](https://node-postgres.com/features/types),
[pool cleanup](https://node-postgres.com/apis/pool),
[TLS configuration override](https://node-postgres.com/features/ssl),
[PostgreSQL DataRow format](https://www.postgresql.org/docs/current/protocol-message-formats.html#PROTOCOL-MESSAGE-FORMATS-DATAROW).
CTE budget/role/reconciliation choices above are repository design decisions, not
claims that these documentation pages implement the Sky Guide contract.

### Completed slice / validation / exact next

Bound lowering and strict decode implemented;7 focused tests and357 full tests,
lint/typecheck/build/catalog1808/scaffold/diff PASS. Native90 assertions PASS on
approved dev: all79 owner vocabularies/empty frames/locked head, exact UTF8 bytes,
no partial result on overflow,1.2 MB field hidden, safe int8/fraction/bool retained.
After outer ROLLBACK: revision0 and ALL78 noncontrol owners empty; no DDL/new grants.
135076-byte fixture SHA256
539085dac77f5127ccc37eadea60bcc1a7a9ff03c44a835a74f243e5bc20f4e2;
fixture/result/test evidence in E:/SkyGuideAssets/research/postgres-rehearsal-2026-10-07/.
Existing Router/chunk warnings unchanged. Runtime transport/unknown COMMIT contract
clarified without altering SourceSync or any mounted consumer. Git checkpoint/push
and SHA verification after final diff. No new dependency/credential/Auth provider.

Exact next: derive explicit runtime table/column/helper privilege manifest from
emitted SQL and invoker trigger call graph, denial/rollback checks and provider-
neutral transaction lifecycle/uncertain-commit tests. This must make the scoped
SDK/credential/runtime-role/Auth authorization package concrete before dependent
live steps. No production/paid changes; existing R1/provider/org approval stands.
Actual driver/cancel/commit/races/restore/measurements remain OPEN. Current handoff
is the compact resume entry; do not reread all historical fixture slices.

## Active slice — explicit runtime privilege proposal

MEDIUM within current database integration. Start f2e160e, clean verified remote.
Goal: produce exact table/column/helper/RLS grant and revoke SQL for review before
runtime authorization; derive permissions from both emitted DML and invoker trigger
locks. Dependencies:79 typed owners and existing static Store/writer. Scope: typed
privilege manifest, SQL proposal/preflight/rollback and focused coverage/drift tests;
read-only native catalog snapshot. No roles/grants/policies/credentials installed,
SDK/Auth/consumer integration or production. Transaction lifecycle follows this
proposal; do not substitute a grants document for actual runtime acceptance.

Native inventory:79 tables/143 application triggers/27 functions, no policies or
SECURITY DEFINER. Invoker locks require UPDATE privileges beyond emitted DML:
public_release, sync_acceptance, acquisition_option, field_provenance_field. Preserve
existing serialization locks; proposal uses minimum key-column UPDATE for locking,
dedicated UPDATE USING(true) WITH CHECK(false) policy to deny actual UPDATE on these
four owners, plus existing immutable guards. Actual role/RLS proof remains NOT RUN
until scoped dev authorization; proposal must not claim this assumption verified.
Reader needs table SELECT only, no private helper EXECUTE; writer needs iso_instant,
valid_partial_time, valid_time_range, graph_edges and apply_sync_metadata_cas.
Existing trigger entrypoints are not directly callable runtime APIs; do not grant
all functions or the obsolete/unreachable instant_order_key helper.

Expected: src/server/runtimePrivilegePlan.ts, tests/data/runtimePrivilegePlan.test.mjs,
tests/sql/build-runtime-privilege-proposal.mjs; phase/architecture/current/master.
Steps: explicit manifest and paired grant/revoke policies; validate coverage of
actual5-phase emitted SQL and native inventory/helper closure; baseline-sensitive
preflight and column revoke (table revokes alone do not revoke column privileges);
focused/full tests/lint/typecheck/build/scaffold/diff; checkpoint/push/verify.
Acceptance: unknown table/column/helper/trigger drift in pinned permission contract
fails closed (not a complete constraint/index/type audit); no blanket
future grants, roles/passwords/membership/DDL executed, explicit allow/deny matrix
and rollback preserve data/history/platform policies. Exact next after proposal:
transaction lifecycle/commit-uncertainty implementation, then scoped authorization
for actual role/RLS tests/SDK/credential/Auth choices. Risk: RLS policy behavior,
inherited/PUBLIC privileges, ownership and real connection defaults need native
acceptance; a static manifest or syntax proof is insufficient.

### Completed proposal / native preflight / pending authorization

runtimePrivilegePlan/runtimePrivilegeBaseline now produce exact preflight/grant/
rollback and193 dedicated RLS policies.79 table SELECT/78 column INSERT/9 mutable
column UPDATE/4 lock-only UPDATE/23 child DELETE;5 private helper EXECUTE to writer
only, none to reader. Both roles NOLOGIN/NOINHERIT/NOSUPERUSER/NOBYPASSRLS/no object
ownership. No credential/login/principal membership is part of this grant package.
Baseline includes generated/default discriminator columns omitted by adapter's
explicit SELECT vocabulary; their names are fingerprinted, never INSERT/UPDATE
granted. All27 function bodies match local11 latest migration definitions;143
native trigger fingerprints and a compact metadata fixture detect drift.

5 focused/362 full tests/lint/typecheck/build/catalog1808 PASS. Actual5-phase Store
emitted DML/ON CONFLICT updates are covered by the exact column manifest; local
catalog guard accepts independently reconstructed current bodies/native triggers
and rejects each table/column/RLS/policy/helper/trigger mutation from a valid frame.
Read-only hosted preflight PASS; no roles/grants/policies created/applied. Unknown
metadata/new policies/role-name collisions/SECURITY DEFINER fail before CREATE ROLE.
No claim about real RLS/ACL denial/concurrency or connected SDK authentication.

Review package outside Git at E:/SkyGuideAssets/research/postgres-rehearsal-2026-10-07/:
runtime-privilege-{inventory.json,preflight.sql,preflight-result.json,grant-proposal.sql,
rollback-proposal.sql,manifest.json,tests.log}. Build with
`node tests/sql/build-runtime-privilege-proposal.mjs <inventory.json> <E-review-directory>`;
this validates pinned inventory and only writes files, never executes SQL.
Grant84451 bytes/SHA256a287cb55b2e778efeacd17710f1a837728e1760f4474d6a88cb7b3ac30d81bcf;
rollback34115 bytes/SHA25649735785bf0715ced419058f2dd61ad9f434708e0ddb5e1ce3d7db3655c11749;
preflight37193 bytes/SHA256a03a0d724bc91fe3e3f7fa64a8d14df0b8036c49f8b84e709418e6842a8a8e3f.
Rollback revokes column INSERT/UPDATE separately from table grants, drops only
dedicated policies/roles, refuses unrelated memberships except creator/current
migration actor; role dependency errors abort transaction. Do not execute rollback
blindly after later privilege/policy/membership changes. No CASCADE/data deletion.
PUBLIC privileges are cumulative; a dedicated REVOKE CONNECT alone cannot deny
PUBLIC CONNECT. NOLOGIN/no membership and revoked private schema/table/column/helper
access remain mandatory; actual effective/inherited privileges must be inspected.
Native preflight also proves current owner-only schema/table/column/function ACL
baseline (no existing nonowner/PUBLIC grants); this does not change any ACL. Fixed
ACL iteration handles NULL/zero-dimensional empty arrays via unnest then single-
item aclexplode.4 synthetic ACL-value checks (NULL/empty/owner/PUBLIC) PASS read-only;
no GRANT needed to demonstrate unexpected PUBLIC entries are detected. Final native
receipt and acl-result.json outside Git; no credential data. MD5 fingerprints detect
accidental catalog drift, not authenticated/security attestation or all type/index/
constraint changes. Review package/SQL preflight is not native role acceptance.

Explicit user request now pending for dev-only role/RLS application + native
allow/deny/rollback tests. Gate source: AGENTS rule22 and existing handoff's no
runtime grants by implication; R1/Supabase Free/org approval unchanged. No approval
inferred from an unanswered question or native metadata preflight. Exact next:
independent provider-neutral transaction lifecycle/uncertain-commit tests while
approval is pending; after affirmative authorization, pinned CLI migration for
this package and actual runtime-role checks before driver/credential/Auth mounts.
Native role tests must cover all5-phase Store SQL/forced checks, lock-only UPDATE
denial, helper call closure, reader/owner/history/DDL/column/platform-role denial,
NOLOGIN/nonownership/role inheritance, then scoped rollback/all policies and table/
column/helper effective grants cleared/data retained. Connected sessions/restore
and actual authenticated maintainer remain OPEN, not granted by this role request.

Primary policy support (not hosted permission proof): [SELECT FOR UPDATE privilege](https://www.postgresql.org/docs/17/ddl-priv.html),
[column grants/cumulative rights](https://www.postgresql.org/docs/17/sql-grant.html),
[UPDATE USING vs WITH CHECK and row locks](https://www.postgresql.org/docs/17/sql-createpolicy.html),
[trigger creation privileges](https://www.postgresql.org/docs/17/sql-createtrigger.html).

## Active slice — portable transaction kernel

MEDIUM, starts at verified ac17a74; role/RLS authorization still pending. Goal:
implement same-lease BEGIN/isolation/local deadlines/callback/COMMIT/ROLLBACK,
bounded private text transport and static callback SQL, fail closed on swallowed
query errors/pending background work, distinguish confirmed rollback from lost COMMIT ACK.
Dependencies: existing SqlDatabase/Store, bounded read lowering, scoped privilege
manifest. Scope: provider-neutral raw-text protocol port and lifecycle, focused
failure-injection/whole Store sequence tests. No SDK/connect/credential/grant/Auth/
endpoint mount, actual network cancellation/concurrent session or restore claim.

Port must return acknowledged command tag/ReadyForQuery state on one
exclusively leased connection, honor abort by preventing reuse/new writes,
release/discard synchronously. Pool must not issue the same active physical client
twice; real adapter must prove this contract, not just return matching key objects.
Pool acquisition timeout must discard late leases; no callback retry. Driver owns
transaction/configuration SQL; callback accepts existing static bound statements
only. Reads retain server-budgeted CTE/OID decode; CAS has one exact bool result;
DML/SET has no result rows. Explicit input-byte/output-row budgets before dispatch.
Deadlines checked before/after awaits; JavaScript CPU is not preemptible.

Acceptance: normal read/promotion/failure/reconfirm through complete existing Store;
all begin/statement/callback/deferred/commit/rollback/release/acquire timeout errors,
bad command/state, absorbed errors, unsafe callback SQL and late callback/query
completion fail safely. Confirmed COMMIT remains committed despite release failure;
COMMIT ROLLBACK command tag is rejection, not success; transport loss at COMMIT is
indeterminate even if later ROLLBACK acknowledged. Sanitize private error details.
Future controller/durable intent/quarantine/reconciliation/auth remains required
before mounting unchanged SourceSync API (which catches store errors as rejected).
Kernel alone is not that outward fence or cross-restart durability proof.

Expected files: src/server/postgresStatementGate.ts,postgresTransactionKernel.ts,
tests/data/postgresTransactionKernel.test.mjs, synthetic text-port fixture; existing
phase/architecture/current/master/README. Steps: gate/protocol lifecycle, focused
tests/5-phase Store parity, lint/typecheck/full suite/build/scaffold/diff, checkpoint
and push. Exact next after kernel: outward uncertainty fence + durable witness/intent
contract before real driver/provider integration; apply role/RLS only if approved.

Kernel milestone PASS:14 lifecycle/control/error tests included in376 full tests;
lint/typecheck/build/catalog1808/scaffold75 Markdown/14 profiles/173 tasks/diff PASS.
Existing Router/chunk warnings unchanged. Tests cover actual existing Store callback
SQL grammar and lowered read responses through a synthetic text port; frames are
installed at CAS, not executed DML. Native SQL/read-budget receipts from earlier
slices remain separate. SQL/scalar input byte bounds do not include protocol
metadata/TLS/error/notice sizes. No SDK/socket/role/race/restore assertion. Pending
background work is detected; this is not arbitrary application task supervision.
Monotonic CPU-overrun test proves no late COMMIT dispatch, not CPU preemption.
Test log: E:/SkyGuideAssets/research/postgres-rehearsal-2026-10-07/postgres-kernel-tests.log
(outside Git). Exact next remains outward uncertainty fence/durable intent/exact
witness contract. No provider changes while the scoped role approval is pending.

## Active slice — outward commit fence and immutable witness

MEDIUM portable implementation within approved R1 contracts, base eb28378.
Goal: preserve a durable global intent before Store CAS; surface quarantine above
unchanged SourceSync catch/rejected API; reconcile original revision even after
successor promotions/failures. Dependencies: atomic Store locks global head FIRST,
immutable audit/acceptance owners, kernel noncommit/indeterminate classification,
safe exclusive lease eviction. No SDK/role/Auth/credential/migration/endpoint.

Provider-neutral journal port requires atomic global exclusive claim and durable
acknowledgement, immutable intent, load across restart and ID-scoped durable settle.
Load must be a linearizable journal settlement barrier waiting out earlier claim/
settle calls, not a stale/replica read. Retain terminal ID/resolution receipts and
bound raw bytes before parsing; codec checks bounded acceptance, not allocation.
No in-memory implementation is a production journal. Actual backend storage/ACL,
crash durability and multiworker acceptance remain OPEN before mount. Persist only
bounded private digest/audit/review intent, not corpora/credentials/whole candidate.
Claim/settle/load errors fail closed; unanswered role approval remains pending.

Fresh witness transaction uses READ COMMITTED/read-write, locks global head before
reading the original target audit/acceptance. A mere absent row/stale snapshot is
not rollback proof. This lock waits out original Store transaction; port eviction
must prevent any later dispatch on its old client. Under that contract, a target
slot absent after barrier means not committed ONLY for inline kernel indeterminate
errors proving original COMMIT dispatch/disposal. Restart recovery or a generic
Store error may leave an old worker waiting pre-BEGIN; head lock alone cannot
prevent its later CAS. Absence stays quarantined until a concrete execution-token
fence is checked inside original Store transaction after global lock. Exact occupied
slot (matching or competing) is safe even then: any late original CAS must be stale.
Another complete immutable audit
in target slot proves conflict; exact audit plus full acceptance tuple proves
publication committed even with newer head. Failure audit lacks immutable retry/
failure-count payload: exact failure audit alone cannot prove all requested state,
so lost-ACK failures remain quarantined pending stronger durable witness schema.
No automatic retry, source-failure write or silent uncertain-to-rejected conversion.

Expected files: commit intent/codec, fresh PostgreSQL witness reader, outward
controller, tests using current5-phase frames/kernel and durable-journal contract
fixture; existing docs only. Validate promotion/reconfirmation/own and independent
failure, swallowed exceptions, unknown claim/settle/read, restart pending intent,
successor/competing/malformed/absent witnesses, exact review/time/validity mismatch,
bounded immutable records and connection/barrier order. Run focused/full tests,
lint/typecheck/build/scaffold/diff then checkpoint/push. Next: concrete approved
durable journal backend and stronger failure witness before runtime mount, then
authorized SDK/role/Auth/actual sessions/restore. Do not call ports durable proof.

Portable fence milestone:390 full tests PASS; final exact fractional-time refinement
then14 focused fence tests/lint/typecheck/build/catalog1808 PASS. Scaffold75 Markdown/
14 profiles/173 tasks and diff PASS. Existing Router/chunk warnings unchanged.
Tests explicitly cover pre-BEGIN recovery race: absence cannot settle journal;
generic errors do not attest original disposal. Complete5-phase controller/kernel
sequence and fresh lease/locked head/original revision query order PASS in protocol
model only. Shared journal model survives controller recreation, not process crash
or actual durable backend; no new native/concurrent SQL proof. Final codec uses
existing exact rangeErrors, not millisecond Date.parse comparison, for review times.
Evidence outside Git: E:/SkyGuideAssets/research/postgres-rehearsal-2026-10-07/
sync-commit-fence-tests.log (390 full), final focused test command output.
No migration/dependency/provider/credential/Auth/grant/route change. Next: concrete
private durable journal + immutable full failure witness + execution token checked
after original global lock. Review additive schema/rollback/helper/ACL effect before
any hosted application; old79-owner privilege proposal must not be applied unchanged
if that schema changes. Pending dev role/RLS approval is still unanswered.

## Active slice — durable PostgreSQL journal proposal

LARGE/ARCHITECTURAL local proposal within current R1; base6006542. Reuse isolated
private PostgreSQL provider, no additional service/cost. Need four typed owners:
immutable intent (version2 typed next source/global state), singleton active control,
immutable applied witness tied to exact target audit/digest, terminal ID/resolution
receipt. No opaque candidate JSON, raw corpus or credential. Current v1 codec/Store
and mounted consumers remain unchanged until v2 adapter integration.

Every helper uses READ COMMITTED/read-write and locks global head then journal
control. Durable claim is a separate acknowledged transaction before original CAS.
Writer checks active ID+digest after head lock before canonical mutation; finalizer
uses stored intent fields for metadata CAS, compares actual complete own/global
state, inserts applied witness before forced checks. New generation guard requires
an applied witness, so old unfenced metadata-only writer cannot commit on new schema.
Recovery settlement derives resolution under same locks; clearing absence invalidates
late pre-BEGIN token. Receipt/intent/applied immutable, no expiry or blind retry.

Scope now: reviewable up/down SQL outside migration discovery, typed proposal rows,
five-phase SQL rehearsal + negative cases prepared on E:, local tests/checks. No
hosted DDL/grant, migration history, SDK/Auth/password or endpoint. Native SQL
execution/actual independent sessions/crash durability NOT RUN. Down refuses any
pending or forensic intent/receipt/applied history rather than erase it; empty-only
scoped drops, no CASCADE. Old79-owner privilege proposal becomes insufficient;
new owner/trigger/helper/column inventory/ACL review required before application.

Expected: supabase/proposals/sync_commit_journal_{up,down}.sql, typed row helper,
tests/sql proposal rehearsal builder and focused tests, existing docs. Verify exact
current5-phase source/global rows, statement token-before-DML/finalizer placement,
wrong token/digest/count/retry/global tuple, stale token after recovery/receipt and
missing applied guard. Tests/generator are not PostgreSQL acceptance. Before hosted
application: integrate v2 journal/Store/controller/statement gate, regenerate scoped
privilege package, verify local SQL on approved environment and migration/rollback
authorization. Keep pending role approval distinct; do not apply its old SQL now.

LOCAL PREPARATION milestone PASS:4-table/10-function up19236 bytes SHA256
672ea42a654a10fa81af857712cdcc6d5d2741f3f51860a97de62f46da16e0c2;
empty-only down1623 bytes SHA2560483b6c4c16ae2075c54d7df55d9f766aa5e2ff297e358637079cb2ea4c0a9c7.
Native transcript877746 bytes SHA256e76e2f77bc2d616862fa6374bc723741e40819df639df1392f2fb5863587246d:
5 phases/526 prepared positive query assertions/26 negative cases (wrong digest,
clear without receipt, bad count/retry/global TTL, immutable mutation, missing
generation marker, settled stale token/terminal rewrite). Builder uses existing
validated Store transcript, finalizer before forced checks. Requires proposal
installation first; contains no DDL itself, no source/publication proof inferred.
Native-result verifier compares all intent/control/applied/receipt rows, not count
alone; synthetic verification tests are explicitly NOT native receipts. No actual
SQL parsing/execution/independent sessions/durable commits/crash/down test run.
6 focused/396 full tests/lint/typecheck/build/catalog1808/scaffold75 Markdown/
14 profiles/173 tasks/diff PASS. Existing Router/chunk warnings unchanged.
Evidence on E: sync-commit-proposal-{fixture.sql,tests.log}; raw changelog also E:.
Current v1 prototype unchanged; new v2 adapter/transport/static gate still required.
Once forensic intent exists, down deliberately refuses; stop ingestion/preserve
LKG+schema/history and fix forward, rather than run old unfenced writer or erase
recovery evidence. Authorized isolated restore remains a separate acceptance gate.

Primary design basis: [PG17 locks/waiting and order](https://www.postgresql.org/docs/17/explicit-locking.html),
[typed CHECK/FK constraints](https://www.postgresql.org/docs/17/ddl-constraints.html).
Supabase changelog checked2026-10-07; [PG17.11 minor-release changes](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes)
concern extensions/custom operators absent from this proposal; no provider extension
audit or upgrade performed. Relevant cached docs retained, no connector polling.

### Active local v2 integration — 2026-10-07
Goal: connect the proposed typed journal to the portable Store/kernel and outward
SourceSync fence without installing schema, roles, SDK or consumer mounts. This is
LARGE/ARCHITECTURAL within approved R1; existing public SyncStore/SourceSync APIs
and the old79-owner privilege package remain unchanged.

Dependencies: pushed19b11ba proposal/codec, locked global Store replay, bounded
transport/kernel, original review/graph/projection contracts. Implement a private
v2 factory exposing only intent-bound execution; claim in a separate transaction
under head→control locks; pin full global TTL from that frame; require token as
second execution query before any canonical DML; use applied finalizer. Add finite
four-owner read/intent-insert/helper grammar, UUID text decoding, atomic locked
load/receipt lookup and evidence-derived terminal settlement. Recovery absence may
settle only by atomically invalidating the original execution token. Failure uses
immutable applied witness, never mutable later counts or the audit alone.

Expected files: existing Store/proposal-row/transport/gate, private journal/fence,
focused test fixtures/tests, this plan/current handoff. Acceptance: existing tests
stay green; all5 phases retain state and query order; rejected token performs no
canonical writes; claim failure cannot commit orphan intent; late writer after
absence recovery is denied; receipt replay resolves lost ACK; complete failure
witness survives successors. Model tests are NOT SQL/native durability evidence.
Validate focused tests, full data suite, lint/typecheck/build/scaffold/diff once.
Then refresh83-owner ACL/native transcript for concrete review. SDK/Auth/native
application/crash/race/restore and production stay separate gates.

LOCAL v2 integration implemented: private Store factory has read/claim/intent-only
execute; original public factory retains its contract. Claim is a separate kernel
transaction with head→control, business replay, pinned global acceptance/TTL,
immutable typed insert/activation/forced checks; activation false throws/ROLLBACK.
Execution first locks head, SECOND callback query requires UUID/digest token before
any canonical staging/DML, checks complete desired row and calls applied finalizer.
Canonical writer/graph/manifest-order/projection parity/post-checks remain shared.

postgresCommitJournal exposes locked load, terminal lookup and atomic resolution/
settlement. Every occupied target requires valid immutable applied marker plus
its full typed owner/audit/promotion acceptance; no marker or drift stays unresolved,
including failure audit alone. Committed failure uses original trigger's complete
own count/retry/global TTL witness despite successors. Absence receipt and token
clear occur together under head→control, denying late pre-BEGIN writer. Journal
read limits bound rows/UTF-8 before decoding; UUID OID2950/text v4 and generated
target are explicit. Static gate adds only4-owner exact read vocab, one immutable
intent INSERT and4 bool helpers; no arbitrary SQL/control/receipt DML. It does
not expand the installed79-owner runtime privilege generator.

New syncCommitJournalFence preserves SourceSync public results/validation, uses
evidence after normal or lost execution ACK, remembers uncertain IDs across a
settlement ACK loss and quarantines new local work until recovery. Recovery can
lookup terminal receipt by ID after active control clears. No callback retries,
follow-up failure write, SDK/client endpoint or mount. Legacy v1 fence retained
for its original portable contract; not promoted to durable acceptance.

Validation PASS:14 focused/410 full tests/lint/typecheck/build/catalog1808/scaffold
75 Markdown/14 profiles/173 tasks/diff. Test log: E: sync-commit-journal-tests.log;
existing Router/chunk warnings unchanged. Cases cover all5 complete states and
outward results, token query order, claim denial/orphan rollback, desired-state
substitution, restart absence/late token, missing/wrong failure marker, execution/
claim/settlement ACK loss, terminal lookup, complete rollback, malformed UUID/NULL
OID/budget/closed grammar. Fixtures explicitly model protocol/table expectations,
NOT PostgreSQL execution, physical locks, RLS/triggers, durable storage or crash/
independent-session/SDK acceptance. Proposal SQL/hashes/native transcript unchanged;
native SQL parse/execution/down NOT RUN; installed schema remains79 owners.

Exact next: refresh83-owner scoped ACL/helper/trigger fingerprints and native
transcript from actual v2 execution including lowered reads. Then present concrete
schema/ACL application package; old unanswered79-owner approval is not coverage.

### Active v2 review package — 2026-10-07
Goal: prepare an explicit83-owner ACL/RLS and actual adapter-SQL rehearsal package
for review; no hosted DDL/roles/credentials/membership/SDK/consumer operation.
Dependencies: pushedcd873c2 v2 adapter, unchanged19236-byte journal proposal and
existing79-owner native baseline. Do not rewrite the old installed-schema package.

Expected: shared pure privilege generator with unchanged old wrapper, separate
proposed journal baseline/manifest, scoped grant/rollback/preflight builder and
tests; separate actual v2 kernel query transcript/verifier. New writer privileges:
intent INSERT excluding generated target; applied/receipt INSERT via invoker
helpers; control active_intent_id UPDATE only/no control INSERT or DELETE; existing
canonical column rights. Invoker transitive lock helper needs EXECUTE. Reader gets
SELECT only. All new owners immutable except guarded active control. Future83-owner
body/trigger fingerprints are predicted from pinned proposal, NOT native-verified.

Acceptance: old79-owner generator/fixtures stay unchanged; explicit83 tables,
10 helper closure, 201 scoped policies, no blanket/future/platform grants; native
preflight rejects drift instead of adopting it. Generate actual v2 claim/execute/
resolve/read-lowering SQL without substituting old CAS. Retain bounded preparation
and independent expected full state; distinguish outer-ROLLBACK rehearsal from
separate durable commits/concurrent-session/crash evidence. Tests/full suite/lint/
typecheck/build/scaffold/diff as appropriate. Exact next is concrete additive
application review once this package is ready, not implicit approval from a goal
continuation. Native expected trigger metadata/SQL parsing/role execution NOT RUN.

PREPARED review package: [JOURNAL_NATIVE_REVIEW](JOURNAL_NATIVE_REVIEW.md) records
concrete dev scope, rollback, pinned outputs and acceptance boundaries. Shared
renderer refactor preserves old79-owner grant84451/rollback34115 bytes and exact
prior SHA256. Separate83-owner privileges/37 expected invoker functions/155 triggers,
generated/type/null physical columns and10-helper closure/201 policies; column-only
INSERT excludes generated target, no control INSERT or journal DELETE/immutable
UPDATE. Metadata guard never adopts fetched catalog automatically. New expected
trigger/get-expression fingerprints are predicted, not native-verified.

Rollback checks schema/body/trigger/physical columns, exact policies and effective
column/helper rights/role attributes/no unexpected owner or nonowner grant-option
before removing package; still requires stopped consumers/no unexpected memberships.
Prepared grant96557 bytes SHA256db17bf3bc8a802edb9b554d4be967b882010ad08da9e4b262e4d1eee1ed6909f;
rollback147350 SHA2568a62fb14815176b9d10267bcd425679a76045e464153613f2ffd0fda7aed4b0d.
Role-check is read-only introspection, distinct from prepared8-operation actual
deny fixture and actual reader/writer adapter transcript. No role applied or run.

Static review found local revision variable colliding with3 unqualified receipt
audit/acceptance predicates; qualified column aliases per [PG variable substitution](https://www.postgresql.org/docs/17/plpgsql-implementation.html).
Repinned up19248 bytes SHA256b9644820e9746e8333e53f19d426b5515636e6f24367f24c9d97b4342e62e200;
down unchanged. No global variable-conflict settings or evidence weakening.
Actual v2 kernel SQL transcript, without legacy CAS substitution:5 phases/39
callbacks/978 query assertions/6 token negatives. Owner1727377 bytes SHA256
193edbd597d1663d5318c9ebb93ffa8aac1d32f3632a85537061e545118bd41c;
reader5/writer34 callback variant1728871 bytes SHA256
d0d88920b9ec2b71424af975cd83212eedcb508abfa0fe4c23876da9d34d56c7.
Existing26-negative prepared control fixture remains distinct. Outer ROLLBACK does
not reproduce original physical COMMIT boundaries or separate sessions. Full-row
native-result verifier ready; its synthetic mutation checks are not native receipts.

PASS31 focused + final6 focused/416 full tests/lint/typecheck/build/catalog1808/
scaffold76 Markdown/14 profiles/173 tasks/diff; existing Router/chunk warnings
unchanged. New lint missing URL/structuredClone declarations fixed; final lint PASS.
Evidence on E: runtime-journal-* and sync-commit-adapter{,-role}-fixture.sql;
runtime-journal-package-tests.log. No new migration/provider/role/policy/SDK/Auth/
credential/principal/consumer/public data operation. Native parse/execution/ACL/
down/durable/crash/concurrent/restore NOT RUN. Exact next is refreshed package
authorization and native baseline verification before CLI migration creation.

Read-only preapproval audit at2026-10-07 06:09:52 UTC PASS against pushed dd03095:
79 installed tables, pinned table/function/trigger SHA256 matches, PostgreSQL17.11,
unchanged11 migration versions, revision0/singleton1 and78 empty noncontrol owners.
Runtime groups/policies and nonowner schema/table/column/function ACL counts all0.
One SELECT statement supplied a consistent statement snapshot; no hosted mutation.
E: journal-preapproval-baseline-receipt.json includes exact query/expected hashes/
actual counters, SHA256a7f01ea831fd761a5d3a679eff0f0a2c7c1d580f04f079d236a9c0936878fd07.
This verifies only installed79 state; proposed83 native parsing/roles/rehearsal
and durability acceptance remain NOT RUN. Concrete83-owner authorization question
is pending. Exact next: answer that question; if approved recheck baseline before
CLI migration creation/application. No additional approval inferred from continuation.

## Maintainer remediation — repository fixes COMPLETE, native evidence OPEN (2026-10-07)

User authorized fixes after maintainer REQUEST CHANGES. Scope: exact timestamp
lifecycle/precision, enforcement metadata and role-membership drift, preservation
ownership and full-scale validation cost. No hosted migrations/grants by this task;
preserve11 applied migrations, historical79 proposal and approved R1/provider/org.
Dependencies: current installed79 receipt and pinned unapplied83 up/down contract.
Acceptance: focused/full local checks and refreshed review artifacts/handoff; native
SQL/durability/role/restore/scale acceptance must remain explicit, not inferred.

Completed implementation: core compareInstants/addInstantMilliseconds replace
Date.parse lifecycle/range coercion, keeping arbitrary fractions/source spelling.
SourceSync staging/read/review/promotion/failure, identity and snapshot/API freshness
are covered; nearby media/delivery and official evidence shared the same parser
bug and now use the exact comparator too. Store replay verifies exact canonical
millisecond server spelling. Payload evidence matrix now matches actual ordered
payload_provenance and its separate canonical identity superset.

Current83 preflight and rollback add enabled custom/internal-FK trigger checks,
origin session mode, function execution settings and pinned installed column/
constraint/index definitions/validity. Expanded native79 collection was read-only:
443 columns/503 non-trigger constraints(all validated)/233 indexes(valid/ready/live),
no disabled triggers/11 migration versions unchanged. Body/trigger fingerprints
remain independently pinned. Receipt provenance/hash in current package; row counts
were not refreshed. Membership guard checks both role directions and ADMIN/INHERIT/
SET; only current actor member with PostgreSQL17 bootstrap grantor(OID10),
ADMIN-only creator edge with INHERIT/SET false is
accepted. No memberships are created by this package's grants.
Read-only executor audit confirms API postgres is non-superuser/CREATEROLE;
bootstrap grantor is supabase_admin(OID10), matching PG17 documentation. Default
role fixtures now require an authorized superuser before DML/SET ROLE. Prepared
creator variant requires its own explicit scoped approval: current existing actor
gets temporary SET-only self-edges after exact bootstrap ADMIN-only membership
preflight, all inside outer ROLLBACK. No durable membership/new principal/login or
credential; NOT EXECUTED. Without that scope/authorized superuser, role proof is
BLOCKED. Detailed rationale, fingerprints and commands in current package.

Decision: do not invent native83 CHECK/FK/index spellings. New structural hashes
are NULL and executable grant refuses. After authorized installation, collector
returns FULL definitions; maintainer explicitly compares with pinned up SQL before
changing reviewedJournalStructure and regenerating artifacts. No fresh metadata
auto-adoption. This is a post-install/pre-grant native verification gate, not a
reopening of the approved portable R1 architecture.

Decision on cost: preserve deferred integrity/applied history. Prepare full-K15
canonical/release fragment under generation lock, empty-baseline refusal,
30-second dev cap and outer ROLLBACK.46,341 canonical/4,367 release rows include
2,051 identity/4,103 membership events. Receipt separates canonical/release/deferred
durations. Cost remains OPEN until native measurement; timeout/unacceptable cost
requires additive reviewed optimization and metadata repinning. Fixture generation
does not fix quadratic cost or prove a production capacity. No temp/session flag
suppresses validations, no accepted data/history is committed by rehearsal.

Validation PASS425 full tests, final10 Store/6 ACL refinements, lint/typecheck/build/
catalog1808/scaffold76 Markdown/14 profiles/173 tasks/diff. Existing Router/chunk
warnings unchanged. Old79 grant/rollback/up/down/owner adapter transcript hashes unchanged;
role/denial fixtures now preflight executor capability;
current83 ACL hashes and K15 fixture listed in [current package](JOURNAL_NATIVE_REVIEW.md).
New test receipts are synthetic, NOT native SQL/role/performance evidence.

Exact next: verify new checkpoint SHA; obtain scoped dev schema/rehearsal
authorization, revalidate baseline, create/apply additive CLI migration. Collect
and explicitly review new constraints/indexes, intentionally pin/regenerate before
ACL application within authorization. Run owner/role/denial/K15 cost fixtures,
verify full receipts and authoritative rollback/empty baseline. Actual native83
parsing/roles/down/cost/durable commits/sessions/crash/restore/SDK/Auth/credentials/
principal membership/consumer mount remain NOT RUN; master roadmap remains OPEN.

### Authorized native journal/creator rehearsal — 2026-10-07

Goal: execute the reviewed abd8712 development schema/ACL package and native
owner/creator/denial/full-K15 rehearsals, preserving empty canonical baseline.
User explicitly approved creator postgres ONLY with transient SET TRUE/INHERIT
FALSE/ADMIN FALSE; ALL fixture data and temporary membership in one ROLLBACK
transaction per rehearsal. No new principal/credentials, retained SET membership,
production/paid operation or consumer mount. STOP on any baseline/metadata drift.
Dependencies: pinned abd8712 package; installed79/native27-function/143-trigger
structure/ACL/membership baseline. Before-migration read-only check PASS and saved
on E: authorized-journal-before-receipt.json. Hard $0 remains.

Steps: CLI-create additive migration; apply through migration tool; collect full
native83 structure and explicitly compare against pinned up SQL; deliberately
pin reviewedJournalStructure and regenerate/review artifacts BEFORE grants. Apply
scoped roles/ACL; inspect effective privileges/creator ADMIN-only baseline; run
owner and authorized creator adapter/denial fixtures under ROLLBACK; verify full
receipts and membership/data/schema baseline after EACH transaction. Run bounded
full-K15 cost fixture under ROLLBACK/30s and verify timing + post-rollback baseline.
Any timeout or unacceptable cost leaves benchmark gate OPEN; do not disable
integrity, rewrite history, or bypass native structure review to continue.

Files: CLI-generated migration, intentionally reviewed journal structure pins,
existing phase/master/foundation/handoff/native review/README; SQL receipts/raw
corpora stay on E:. Validation: native metadata/SQL/ACL/8 denied operations/full
adapter output/empty rollback, focused ACL tests/lint/typecheck/build/scaffold/diff
as needed. Backup/restore/concurrent sessions/crash/SDK/Auth/credentials/durable
records remain separate gates. Exact next: authorized additive CLI migration.

Native milestone: pre-migration baseline PASS; first up failed42601 because an IF
expression contained an unparenthesized CASE. Exact after-error baseline matched;
native constant reproducer proved the2-character parenthesis fix before retry.
Old11 migrations unchanged. Up19250 bytes SHA2564ad16e6200129114098936f1b0408fd78050e6a3413f299d0b857ec6ee5eeb7e;
new applied function body MD5b713a6b3c837b058e785dae849bf879a intentionally repinned.
Applied versions20261007132330 journal and20261007132621 scoped runtime privileges;
local CLI filenames aligned to server-assigned versions. Grant migration removes
generator outer BEGIN/COMMIT only, retaining every guard; tool owns transaction.
Reviewed52 new constraints/7 indexes against source; structure hashes pinned
797ac2761349e5eedc6a282bf8084911/bc5a8dcaeaa5f63abf24a536b071059a. Native83
preflight/effective ACL metadata PASS;6 ACL tests PASS. After-grants data is empty
except two singleton controls/revision0; only bootstrap ADMIN-only creator edges,
no SET membership. E receipts: authorized-journal-{before,structure,after-grants}-receipt.json.
Exact next: native owner/authorized creator/denial, EACH with same-transaction
membership+data ROLLBACK and identical authoritative after baseline; then full-K15
benchmark. Native runtime fixtures/K15 timing/down/durability/concurrency NOT RUN.

Native owner AND authorized creator adapter PASS:5 phases/39 callbacks/978 query
checks/6 token negatives each; independent verifier matched complete intent/control/
applied/receipt rows.8 actual forbidden operations rejected under creator SET
rehearsal. ALL temporary memberships and data shared each outer ROLLBACK; exact
authoritative after-grants baseline matched after EACH owner/creator/denial run.
No retained temporary SET edges/data; bootstrap ADMIN-only edges unchanged.
E: journal-native-{owner,creator}-receipt.json and post-{owner,creator,denial}-baseline.json.
Single-connection SQL/role proof only, not durable COMMIT/SDK/concurrent/crash proof.
Exact next: bounded native full-K15 benchmark and authoritative rollback baseline.

Full-K15 raw4.53MB request rejected by connector before DB execution, NOT a measured
timeout. After-error authoritative baseline identical. Added transport-only
pack-full-k15-rehearsal: bounded16-bit dictionary codes, original Unicode SQL
reconstructed byte-faithfully and SHA256 checked on server BEFORE EXECUTE. Prefix/
suffix preserve original baseline guard/transaction/30s cap/ROLLBACK; complete
DO cost statement unchanged including every INSERT and deferred/timing boundary.
No new DB object/extension or batching optimization. Local3 focused tests PASS;
packed fixture1,397,651 bytes/wire1,397,697. Native cost remains NOT RUN until
packed fixture executes and complete timing/row receipt passes verifier.

Native full-K15 packed run reached original SET CONSTRAINTS ALL IMMEDIATE and
failed57014/30s statement timeout in validate_release_metadata line29 (full release
membership UNION joined to domain_identity). No complete phase timing receipt;
45-second API wall clock includes transport/unpacking/parsing and is not canonical
cost. Hash guard reconstructed exact original DO body before execution. After
timeout full authoritative baseline identical: no data/temporary SET edges retained.
E: journal-native-k15-timeout-receipt.json; benchmark gate OPEN, not performance PASS.

Exact next local slice: design an additive optimization preserving every deferred
release invariant. Inspect final-state row trigger behavior for INSERT/UPDATE/DELETE,
version movement, item/lookup equality, contiguous unique positions, current owner
revision/fixture/retirement/publication and provenance constraints. Compare options
(retain full sweeps versus indexed affected-row validation); do not choose a cache
or session flag that can suppress a later invalid mutation. Check definition and
dependent trigger/caller scope before changing completed decisions; document impact
and migration/rollback, prepare a concrete reviewable proposal and focused invariant
counterexamples. Native application/repinning requires NEW scoped migration review;
no optimization authorization inferred from this creator-only rehearsal package.
Re-run EXACT full-K15 fixture under original30s cap and authoritative rollback
after approved optimization; complete receipt required. Do not raise timeout to
claim the original gate passed, publish/import real source data, or mark R1 DONE.

Final validation PASS427 full/13 focused tests, lint/typecheck/build/catalog1808,
scaffold76 Markdown/14 profiles/173 tasks/diff; unchanged Router/chunk warnings.
Initial full suite426/427 exposed legacy79 body collector including newly installed
journal functions. Fixture now pins the exact first11 historical migrations with
count assertion; separate83 tests retain new-native coverage. No old baseline/
generator/migration weakening. Supabase security advisors lints=[] after DDL.
Logs E: journal-native-final-{tests,build}.log. Native K15 gate stays OPEN despite
local green checks. No optimization DDL/SDK/Auth/credentials/consumer/production.

### Active release-scan optimization — scoped dev authorization received

Goal: prepare a narrow additive replacement of validate_release_metadata, preserving
every global check and EVERY deferred row event, with migration/rollback review.
Why: native full-K15 timed out inside its repeated complete membership scan.
Dependencies: pushed2925996/current83 native structure/ACL/body baseline and exact
original full-K15 benchmark. No new tables/roles/membership/source facts/SDK/UI.

Alternatives: keeping duplicate scans preserves enforcement but already hit budget;
incremental affected-row validation requires a new equivalence proof for arbitrary
deferred update/delete sequences; validation queues need new typed owners/rights
and a proof that later writes after an immediate flush always revalidate. First
proposal will fuse existing full membership scans into ONE materialized CTE per
event and derive equality/order/owner/publication/provenance flags from that scope.
Do not deduplicate events, cache validation or introduce a session bypass. This
reduces redundant scans; complexity remains quadratic across N deferred events,
so performance acceptance MUST be measured, not inferred from a SQL rewrite.

Scope: one invoker trigger function body only, same args/settings/owner/ACL and all
11 existing deferred triggers/locks/FKs/indexes. Headers/counts/optional presence,
nonempty items, item↔lookup sets, contiguous positions, exact current revisions,
fixture/retirement/publication and provenance semantics must remain unchanged.
Inspect SQL NULL behavior/missing joined owners, unchanged stale deferred row events
and simultaneous violations. Up/down guards pin before/after body hashes; current
historical79/current83 executable baselines remain unchanged until approved apply.

Files: proposals release_metadata_scan_{up,down}.sql, local invariant/model checks
and native positive/negative preparation, current review document/phase/handoff.
Validation: differential global-invariant cases and exact flags, static body/ACL/
settings/guard checks; focused/full tests/lint/build appropriate. Native proposal
parsing/cost/adversarial SQL/down remain NOT RUN, require reviewed scoped dev DDL.
Acceptance: concrete reviewable package before asking; never benchmark PASS from
local fixtures. Package prepared below; no new hosted authorization inferred.

#### Prepared package / resume

Checkpoint parent2925996; hosted83-table schema remains unchanged. Review source:
[up](../../supabase/proposals/release_metadata_scan_up.sql),
[down](../../supabase/proposals/release_metadata_scan_down.sql), generated by
tests/sql/build-release-metadata-scan-proposal.mjs from the pinned original function
and tests/sql/release-metadata-scan-function.sql. Up replaces ONE invoker function;
down restores the exact original body. Both require postgres/origin, locked empty
revision0/control baseline,83 expected owner counts, exact function metadata/body
and11 enabled deferred triggers. Full schema/ACL checks are mandatory immediately
before/after; these guards are not a replacement for those checks. No schema tables,
roles, policies, indexes, grants, credentials or applied migration history change.

Review identifiers:
- Original body MD5 b2ecccd2deae57f41a2debe3cf806529;
  proposed body MD5 5d499ac07a2d5a3ac590cc0dedb7cac6.
- Up7622 bytes SHA256 0d22bfb19c108dbcbaf596a89fa26300eac8c1b21f8ada7cda5ac554474f3423.
- Down7763 bytes SHA256 85b5f5d435378b1c02f00b6fcaef60ecb101aaeb65d983b3dceb34d68fb31afd.
- E: release-metadata-scan-before-check.sql SHA256
  7438a57afff26546c90d2975de5f6f264f66fdb828ffd63374df2c9e784e87b6;
  after-check SHA256312096b1812c55eaf7b5323f340131a1f56db91b8ad9b8d31a5a2e7facb67035.
  After-check differs only in ONE source-derived expected body hash; no native
  metadata auto-adoption. Historical79/current83 executable baselines remain pinned.

Read-only native evidence:128 synthetic cases,0 legacy/proposed flag mismatches;
independent verifier matched all observations (112 flagged/16 unflagged). Original
SQL predicates are extracted from the pinned applied source, not rewritten as a
second model. Receipt on E: release-metadata-scan-equivalence-receipt.json SHA256
b5bc59b359ec34fac3f5cadc49062d3bdc65724fd4d567ec606e0381605178cc.
Corpus SQL187192 bytes SHA256
dcd7f196f572a88835ef37c21faa56c1471eb6ba77743011165de376bdc826a8.
Pure SELECT parsing also succeeded on empty native schema. NULL/missing-inner-JOIN
cases preserve predicate behavior only; immediate FK/NOTNULL acceptance unchanged.
Full proposed PL trigger compilation/runtime/down and benchmark remain NOT RUN.
Scan fusion preserves all events and all global scans; quadratic cost remains.

User2026-10-07 approved cb95d3a one-function development migration and guarded rollback,
with automatic continuation. Full before checker and authoritative baseline matched
the previous after-grants baseline exactly; no drift. Exact next:
verify full before baseline; create/apply a new CLI migration through migration tool;
verify full after metadata with the deliberately proposed body hash, then update
current83-only expected body override with regressions (historical79 immutable).
Re-run owner/creator/denial proofs and EXACT packed full-K15 under original30s cap.
Every fixture and transient creator SET grant must share its outer ROLLBACK; compare
authoritative baseline after EACH run, STOP on any drift. Existing creator authority
is SET TRUE/INHERIT FALSE/ADMIN FALSE for existing postgres only. No new principals
or credentials. Complete timings required for performance PASS; timeout stays OPEN.
Guarded down may restore original body only on empty/quiescent dev baseline, through
the migration tool, with full metadata verification; never delete migration history.
Schema/down, durable/concurrent/crash/restore, SDK and roadmap gates remain unchanged.

Validation: lint/2 focused/full429 tests and independent128-case receipt verifier PASS.
App build/typecheck previously PASS at2925996, not rerun for SQL proposal-only work.
Raw corpus/checkers/receipts/logs stay E:/SkyGuideAssets/research/postgres-rehearsal-2026-10-07/.

#### Approved native application — 2026-10-07
Applied exact cb95d3a up via migration tool as20261007160926_private_release_metadata_scan.
CLI file aligned to actual server-assigned version; prior13 migration files untouched.
Full schema/ACL checkers PASS before/after. Authoritative baseline differs ONLY by
new migration and source-derived functions_hash
34c8a4aa9e21a1ee3ad57a633778957d852f473a30feafa7bc5e4a1a79db4ca5;
all other metadata/data/membership/settings identical. E: release-scan-{before,after}-baseline.json.
Deliberate current83-only body override; historical79 pins unchanged. Proposal builder
accepts only the two reviewed source endpoints and preserves original review bytes.
8 focused tests PASS. Next: owner/creator/denial then EXACT packed K15/30s, authoritative
baseline after EACH rollback. New-body runtime/down/cost still NOT RUN here.

New-body owner/authorized creator adapter now PASS:5 phases/39 callbacks/978 query
checks/6 token negatives each, independently verified returned rows.8 actual creator
denials PASS. ALL fixture data/temporary SET grants shared outer ROLLBACK; complete
after-migration baseline matched after EACH run. No retained SET membership/data.
E: release-scan-{owner,creator,denial}-receipt.json and release-scan-post-{owner,creator,denial}-baseline.json.
Lint/typecheck PASS. Exact next: unchanged packed full-K15 under30s, then baseline;
new-body cost/down remain NOT RUN, previous timeout gate remains OPEN.

#### Trial failed budget / original body restored — 2026-10-07
EXACT packed K15 again timed out57014/30s at validate_release_metadata line19
materialized-scope query during SET CONSTRAINTS ALL IMMEDIATE. No complete timing
receipt; do not infer phase cost or success. Full after-timeout baseline unchanged.
E: release-scan-k15-timeout-receipt.json (bounded diagnostic/full baseline).
Scan fusion preserves semantics but does not satisfy this performance gate.

Used approved guarded down through migration tool as
20261007161625_restore_release_metadata_scan, exact source bytes unchanged.
CLI filename aligned to actual native version; all15 migrations retained.
Original body b2ecccd2deae57f41a2debe3cf806529 and aggregate functions_hash
dbf5e0bacca3bfed036f314ec70a7a857ff246b0b5058895c5e231ab3938a1e1 restored.
Full schema/ACL checker PASS; entire baseline matches pre-trial except two appended
migration versions. E: release-scan-restored-baseline.json. Current83 original-owner
function pins restored, historical79 unchanged.8 focused tests PASS after restore;
full429 tests PASS on trial pin; after restore lint/typecheck/8 focused/scaffold/diff PASS.
Security advisors lints=[]. Single-function down proof only, not complete schema down.

Next local phase refinement: remove repeated global work, preserving acceptance
for arbitrary later writes, failed statements and savepoint/constraint flushes.
Affected-row checks alone cannot detect an unrelated member made stale earlier in
the same transaction before the next metadata event. A candidate protected typed
clock/witness would invalidate on EVERY private mutation statement and cache only
after a full validation succeeds, scoped by transaction ID + clock + release.
Clients must have no write access to clock/witness and cannot submit a claimed
validated epoch. This may require narrow audited SECURITY DEFINER helpers and new
private owners/triggers/ACL scope; it is a NEW architectural exception/proposal,
not authorization. Existing invoker contracts and actor/principal boundaries remain
until reviewed. Avoid extra automatic validation of historical sealed releases on
canonical writes, which could incorrectly freeze legitimate later owner revisions.
Compare alternatives, prove invalidation/rollback semantics, prepare guarded up/down
and complete source/metadata/ACL expectations BEFORE asking for scoped approval.
No hosted implementation of this next alternative yet. Benchmark and roadmap OPEN.

#### Local clock/witness safety model — planning scope
Goal: test the invalidation argument before choosing or writing hosted SQL/privileges.
Dependencies: restored83-owner baseline at3e9e158, original SQL predicates,128-case
native differential receipt. In scope: local predicate/transaction trace model and
counterexamples. Out of scope: hosted DDL, native cache/ACL/performance claims,
SDK/provider-neutral API changes, new principals, production, consumer and real data.
Files: tests/fixtures/releaseValidationClockModel.mjs and
tests/data/releaseValidationClockModel.test.mjs; phase/handoff only.
Model must include canonical AND metadata mutation invalidation, same-transaction
later writes, failed statement rollback, nested savepoints, transaction identity,
release-specific witness and successful-validation-only claims. Model tests are
necessary safety evidence, not PostgreSQL trigger/locking/ACL equivalence proof.
Acceptance here: compare every observed five-predicate result with independent
reference for all128 cases; never cache a rejection or suppress a later invalid state.
No acceptance of incomplete headers/position UNIQUE/FK states follows from this
predicate-only model. Full original header checks, arbitrary DML/UPSERT/cascade,
native ordering/locking/snapshot/clock overflow and role denials remain SQL gates.
Primary docs: [constraint triggers](https://www.postgresql.org/docs/17/sql-createtrigger.html)
require AFTER ROW; an immediate statement trigger alone cannot replace their deferred
timing. [Function security](https://www.postgresql.org/docs/17/sql-createfunction.html)
and [transaction IDs](https://www.postgresql.org/docs/17/functions-info.html) govern
the candidate's separate security/transaction design. Prepare concrete guarded SQL
and exact allowlisted definer/owner/ACL scope before requesting approval.

Model outcome:128 predicate traces, subsequent canonical mutations, nested savepoint/
failed statement and transaction/release keys covered. Found a decisive counterexample:
a directly callable helper can validate midway through a mutation statement, then a
later row changes under the SAME BEFORE-statement epoch. Deferred events could reuse
that premature witness and accept an invalid final owner revision. Statement-level
invalidation alone is therefore REJECTED, despite other traces matching. Do not build
or authorize that design. A later AFTER STATEMENT marker alone cannot be assumed to
run before every immediate AFTER ROW constraint event; ordering needs native proof.
Exact next: design protected row-level invalidation or another unforgeable final-state
signature; evaluate overhead under original K15 cap, preserve role/helper boundaries
and full metadata predicates. Protected storage/caller restrictions alone do not
solve the mid-statement claim. Local model is evidence of this counterexample only,
not a security/native/performance acceptance result. No next SQL package prepared yet.

#### Active write-bracket proposal preparation — local only
Goal: close the observed mid-statement claim hole without per-row clock updates.
Dependencies: restored83-owner/15-migration state, rejected before-only model,
original full validator/source predicates and existing head→control writer locks.
Alternatives: per-row protected dirty clock is conservative but adds ~46k updates
for the unchanged K15 fixture; partial affected-row validation needs cross-owner
coverage; before-only cache already has a demonstrated false acceptance. Candidate:
BEFORE statement enters a protected write depth and invalidates; AFTER statement
leaves depth and invalidates again. While depth>0, the helper MUST ignore cached
witnesses and NEVER record a new success. Only quiescent depth0 can reuse/record a
successful full validation under transaction ID + epoch + release version. Thus
the immediate-row/AFTER-statement ordering does not decide safety: while writing,
every event validates fully; after leaving, any witness has been invalidated.

In scope: local model/adversarial traces, guarded SQL proposal/up/down, complete
metadata/ACL/structure expectations and review artifact. Out of scope: hosted DDL
before new approval, production, SDK, new principal/credentials, timeout increase,
real import/consumers. Expected files: current model/tests, a local SQL proposal
builder/template, supabase/proposals SQL, current phase/handoff. No app baseline
changes until approved native installation and explicit source-driven review.
Candidate delta (requires new architectural/privilege review):2 private internal
owners (clock singleton and per-release witness);3 narrow postgres-owned SECURITY
DEFINER helpers (enter/leave trigger-only, full validation/cache helper taking ONLY
version);2 statement hooks on EVERY existing83 private owner; original11 deferred
events retained and existing validator remains invoker. No runtime DML/SELECT on
internal owners; writer gets EXECUTE only on full-check helper, no claimed epoch/tx
parameter. Helper performs the exact original checks, never trusts a caller claim.
Head→control→clock→release lock order serializes supported writers; arbitrary
concurrent SQL/locking must be separately proved natively, not inferred from models.
Cache/control writes are excluded from their own hooks and accessible only through
fixed definer code; no dynamic runtime SQL, session flag, new role, public grant or
automatic validation of historical sealed releases on canonical-only writes.

Steps: extend model with nested protected brackets and failed-statement/savepoint
rollback; prove the old counterexample rejects in bracket mode. Prepare source-
derived full-check helper and exact85-table/40-function metadata/ACL expectations;
preserve all original predicates/settings/history. Guard up against complete83
baseline; guard down against exact empty85 baseline; restore original body and
remove only new internal machinery via a new migration, retain history. AFTER hooks
must balance INSERT/UPDATE UPSERT sequences and nesting; overflow/imbalanced depth
fail closed. Missing hooks, forged witness, canonical later writes, direct helper
calls mid-write, zero-row statements and repeated constraint flushes require native
adversarial fixtures once approved. Original K15/30s and authoritative ROLLBACK
baseline remain acceptance gates. Local reduction in modeled full scans is NOT a
native timing/security/concurrency proof. Exact next: model then concrete SQL review.

#### Concrete bracket package — 2026-10-08 / scoped approval granted
Prepared [up](../../supabase/proposals/release_validation_bracket_up.sql) and
[down](../../supabase/proposals/release_validation_bracket_down.sql), reproducibly
generated by tests/sql/build-release-validation-bracket-proposal.mjs. They embed
complete before/after schema/ACL/structure/settings guards in the migration tool's
transaction, with explicit empty-state and original15-history checks. Up may add its
own reviewed migration name; down may add its own reviewed restore name; all original
versions/names must match and all history is retained. Down requires empty85-owner
state, clock epoch0/depth0/no writer and no witness/fixture data; it restores the exact
original validator, drops only new hooks/helpers/internal owners, then verifies83.
Do not use this down against populated/live state. User2026-10-08 approved exact
5d9058eb5026a74fa25caeedcb308566d8774fd5 up/down hashes below; DDL now applied.

Concrete delta:83→85 tables;37→40 functions (3 allowlisted SECURITY DEFINER only);
155→323 custom triggers (166 statement hooks on the exact83 owners +2 new truncate
guards). The existing11 deferred release events and all old metadata/settings/ACL/
policies/triggers/constraints/indexes remain pinned; target wrapper is still invoker.
Internal clock/witness: postgres-owned, RLS enabled/no policies; no runtime table/
column access. Only validate_release_epoch(text) grants writer EXECUTE; enter/leave
are trigger-only with no runtime EXECUTE. Reader/public/platform access, grant options,
future grants, principal/credential/Auth/SDK/consumer/production changes excluded.
Definer functions use empty search_path and qualified owner relations; code contains
no runtime dynamic SQL, caller-supplied epoch/tx, session bypass or swallowed validation
error. Counter and depth additions overflow by raising/rolling back, not wrapping.
Root lock occurs after head→control→clock; added writer serialization/contention is
an architectural cost requiring native concurrency proof and explicit approval.

Why this is different from the rejected clock: entering/leaving both invalidate;
an open write ALWAYS performs original full checks and NEVER reuses/records a witness.
After a completed write, transaction ID+epoch+version can reuse success only until the
next protected mutation. Every83-owner mutation invalidates, including canonical
owners; cache/control writes are isolated and denied to clients. Existing invoker-
only decision needs this narrowly reviewed exception; current app/source83 baselines
and hosted schema remain unchanged until authorized application. No performance claim.

Review identifiers:
- Up341425 bytes SHA256d518e0e751b6c8ab0321f3b66b17a6dfa22f176e02294fc0b70e87124325d8bf.
- Down333305 bytes SHA25664add0eee994e8d5d079fe36e2362e9585b4837c7452a870520d6aae17711b41.
- Before126618 bytes SHA2567438a57afff26546c90d2975de5f6f264f66fdb828ffd63374df2c9e784e87b6.
- After192431 bytes SHA2561e6139ef1ddc4fa77ce43e0aa311d768b1ed6b7c753f0693fbc9d396229c483d.
- Enter body MD5f92de9bd429a275a5a30375b039f9646;
  leave96eb095de72565cb95f3350bfa863a91;
  full-check/cache6dd871de7f44b50b31fc5f62718abff2;
  invoker wrapper04c3e1976587cab96b99153c5b0f79c9.
8 new constraints/2 indexes/7 columns and168 hook definitions are expected from SQL
source, not fetched/adopted metadata. Any native formatting/compilation mismatch
must fail atomically and be investigated; never repin to silence drift.

Prepared native adversarial fixtures on E: (NOT RUN):
- release-validation-bracket-owner-fixture.sql254827 bytes SHA256
  398e2bb7e1f6a12e5fc2dc911bdce2c5a86f31f66fa7345efcdbccfaa3f3ad82:
  7 target-validator rejections,5 positive cases (direct mid-write calls, zero-row
  invalidation, UPSERT balancing, failed subtransaction and explicit savepoint).
  Whole touched canonical/release/clock/witness frames must survive negative rollback;
  final release rows/tx/epoch/depth independently verified from prepared source.
- release-validation-bracket-creator-denial-fixture.sql205648 bytes SHA256
  babc7b253ab69be21ea9dede8bb8cb60c5f9b36fd38617c1551f84f27a335911:
  25 actual permission denials across both runtime groups/internal owners/helpers.
  Existing postgres creator temporary SET TRUE/INHERIT FALSE/ADMIN FALSE only, all
  temporary membership and fixture operations share outer ROLLBACK; no new actor.
Builder: tests/sql/build-release-validation-bracket-rehearsal.mjs;
actual-output verifier: tests/sql/verify-release-validation-bracket-rehearsal.mjs.
No scratch DDL in fixtures. Existing owner/creator adapter proofs and8-denial fixture
must also rerun, with full85 authoritative baseline after EACH ROLLBACK. Nested trigger
ordering/physical cancellation/independent-session races still require native proof;
local predicate model cannot establish them. K15 is the EXACT existing packed fixture
SHA2569b1492072ce09e0dd9b2cb323c159495384a21a7d8aeabbc51c030c9f95eaed7,
original30s budget; complete phase receipt plus baseline required for PASS.

Preparation evidence: full83 before checker + empty/history guard executed natively
without DDL; complete baseline matched restored receipt exactly. E:
release-bracket-preparation-baseline.json. Native constant void-expression delta0
confirmed fixture expression syntax only; new helpers/full PL/85 guards/runtime/
adversarial/cost/down NOT RUN. Model7 + proposal3 focused tests PASS (128 state traces
and old counterexample retained).
Final local checks:439 full tests,10 focused, lint/typecheck PASS. Initial lint found
unused CLI destructuring; removed binding, SQL review bytes unchanged. App build
previous PASS at2925996, not rerun for proposal/test-only work. Scaffold76 Markdown/
14 profiles/173 tasks and diff PASS. No live job remains.
Staged diff caught4 whitespace-only guard lines after the first review checkpoint;
generator now emits empty lines without spaces, source function/checker hashes
unchanged. Regenerated up/down/fixtures with updated hashes above;3 focused
proposal tests PASS. No native/DML/schema behavior changed by this formatting repair.

Preapproval review found a separate checker hole: both the legacy trigger comparison
and new comparison could omit an extra allowlisted-name trigger on an internal table
calling a function outside sky_private. The new comparison formerly filtered the
function namespace; it now observes ALL allowlisted-name hooks on private tables and
pins functionSchema as well as function name. Added an actual-row verifier against
prepared hook metadata and a corruption test demonstrating that the old filter hides
an extra public-schema hook while the corrected verifier rejects it. Wrong namespace
on an existing hook also rejects; observed order may vary.4 focused proposal tests
PASS. Original DDL/helper bodies/permissions/counts/down scope are unchanged; only
guards and fixture-embedded guards changed. Hashes above supersede1d95d95. Existing
83 before-check is byte-identical; no connector/hosted DDL or new native proof this
turn.439 full tests are previous evidence; full suite not rerun for this guard slice.
Current guard slice:4 focused tests/lint/typecheck PASS; no app build rerun.
User2026-10-08 directly approved exact corrected package5d9058e:2 private owners,
3 existing-postgres definers,168 hooks; no runtime internal-owner access, writer
EXECUTE only as prepared. All fixture/temporary SET operations in outer ROLLBACK,
baseline before/after, STOP on drift; prepared empty-state down allowed on failure,
history retained. Full K15 original30s limit and actual concurrency evidence remain
required; no R1 acceptance/dependent work/production/infrastructure/permission expansion.
Exact next: checkpoint approval, revalidate full83 baseline, create CLI migration/apply via
migration tool, review new structure against source, deliberately introduce a separate
85-owner executable baseline (preserve historical79/83), then run prepared native
fixtures/adapter/denials/K15 and authoritative rollback checks. Stop on drift; keep
full schema/down, benchmark, SDK/durable/concurrent/crash/restore/roadmap gates.

#### Approved bracket native application — 2026-10-08
Before DDL: full83 source guard including empty15-history state PASS; whole native
preflight matched restored83 receipt exactly (actor/roles/memberships/ACL/columns/
functions/triggers/physical definitions/settings/policies/control/data/history).
Exact approved up341425 bytes/d518e0e751b6c8ab0321f3b66b17a6dfa22f176e02294fc0b70e87124325d8bf
applied via migration tool20261008044236_private_release_validation_brackets.
CLI2.120.0 migration new generated local script first, aligned afterward to actual
recorded version. Existing15 migrations unchanged;16 versions retained.
Full source-pinned after guard + empty85/history guard PASS, not auto-adopted hashes:
85 tables/40 functions/323 triggers/201 policies; exact3 allowlisted definers with
empty search_path/owner/body/settings; runtime table/column access to internals
denied and writer full-check helper EXECUTE only.168 source hooks include function
namespace. Clock singleton epoch0/depth0/no writer, no witness; all old owners empty
except unchanged generation/control. Source columns/constraints/indexes/triggers/
policies/settings/ACL checked by approved guards. Separate85 executable baseline
builder added; historical79/83 app profiles unchanged. Full source guard precedes
snapshot; after EACH rehearsal ROLLBACK both full guard and exact whole85 snapshot
must pass. E: release-bracket-approved-before-baseline.json,
release-bracket-applied-baseline.json, release-bracket-baseline-check.sql.
Next: application checkpoint,7/5 adversarial and25 denials, owner/creator adapter
39/978/6 and8 old denials, original packed K15/30s; all outer ROLLBACK with exact
baseline. On failure prepared down only with empty85 guard; STOP on drift. Native
function execution/adversarial/cost/down/concurrency still NOT RUN at application.
5 focused proposal/baseline tests PASS, including actual168-hook receipt verifier
and empty clock/witness/count assertions. Application lint/typecheck PASS; app build
unchanged/not rerun. Security advisor returned only INFO
rls_enabled_no_policy for the two internal owners: intentionally RLS/no-policy and
no client privileges, matching approved closed-owner design. Do not add policies to
silence it. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

#### Bracket native rollback proofs — 2026-10-08
First owner fixture failed42704 because SET CONSTRAINTS release_metadata_state was
unqualified; full source85 guard/whole baseline after connector error exactly matched
installation. Qualified sky_private.release_metadata_state at the same flush points;
no DDL/function/permission/data/batching/timeout change. [PG17 name resolution](https://www.postgresql.org/docs/17/sql-set-constraints.html).
Corrected native owner fixture completed7 target-helper check_violation rejections
and5 positives (mid-write no premature witness, zero-row invalidation, UPSERT bracket
balance, failed subtransaction and explicit savepoint rollback). Independent full
receipt verifier initially exposed missing generated dataset fields in expected rows;
expected values now include exact stored items/lookup/spirits/seasons/provenance
discriminators from the original schema. No output field is discarded; corrupt or
missing discriminators reject. Actual7/5 receipt then independently PASS, clock
epoch52/depth0/writerNULL and witness same transaction/epoch/release.
Creator fixture25 actual permission denials PASS; old8 creator denials also PASS.
Owner AND authorized creator adapter5 phases/39 callbacks/978 query comparisons/
6 negative tokens each PASS, with independently verified complete intent/control/
applied/receipt rows. ALL fixtures/tempSET shared each outer ROLLBACK; after EACH
success/error full source85 guard and complete metadata/data/ACL/membership/clock/
witness baseline matched installed empty85 state exactly. No fixture/tempSET retained.
E: release-bracket-{qualified-owner,creator-denial,old-denial}-native-result.json,
release-bracket-owner-receipt.json, release-bracket-adapter-{owner,creator}-receipt.json,
release-bracket-post-{qualified-owner,creator-denial,old-denial,adapter-owner,adapter-creator}-baseline.json.
These remain single-connection SQL proofs, not independent sessions/durable/crash/
SDK acceptance. Full suite initially439/441 PASS: two historical83 tests read the
new85 migration, incorrectly comparing different profile versions. Historical test
reconstruction now explicitly stops at restored83 checkpoint20261007161625; every
unknown-object/definer/body rejection assertion remains. New85 test also verifies
applied migration byte-for-byte against approved source.11 focused and rerun441 full
tests PASS; lint/typecheck PASS. One subsequently added concurrency verifier test
and5 bracket tests PASS; full suite including this new sixth test not rerun yet.
Prepared bounded3-session concurrency SQL (existing postgres, zero-row canonical
writes only). Independent observer must see B physically blocked by A; all3 actual
backend PIDs distinct, A/B xids distinct, B waits and sees clock0 after A ROLLBACK,
each writer produces epoch2/depth0/no owner and each outer transaction ROLLBACKs.
Local application_name/GUCs label test receipts only, no production decision uses
them. No role grants/new actors/DDL/SDK/credential/infrastructure. This establishes
limited lock serialization only, not complete durable adapter races or production
capacity. Script: tests/sql/build-release-validation-bracket-concurrency.mjs.
Next: checkpoint proofs, run bounded concurrent rollback case, then EXACT packed
K15/original30s cap. Original fixture/up/down source hashes
unchanged except the qualified owner fixture hash above. STOP on drift; approved
empty guarded down on failed trial, retaining migration history.

#### Native concurrency transport audit — NOT ACHIEVED
Dispatched A/B/observer connector calls together. A zero-row bracket completed
epoch2/depth0/no owner and rolled back; B/observer failed explicit absence assertions
because active A / blocked B were not observed. Full source85 guard + exact empty
baseline passed after EACH call. No lock/concurrency PASS. Session probe confirms
current_user/session_user both postgres and SET LOCAL application_name appears in
pg_stat_activity; the actor/label filter was correct.
One bounded timeline probe dispatched15s A hold and readonly B together: A backend
163749/xid2151 started05:07:10.871747 UTC, ended05:07:25.877181; B backend163764
executed05:07:27.137556 with seen_a=[]. Thus these attempted connector sessions ran
without overlap despite concurrent client dispatch. Whole85 baseline afterward
matched exactly. This does not prove database serialization under concurrent load;
it proves the required overlap was absent on this execution path.
CLI2.120.0 db query supports Management API --linked --project-ref; read-only
preflight failed because no access token exists in that CLI environment. No login,
token, DB principal/credentials or infrastructure created; no permission expansion.
E: release-bracket-concurrent-{a,b,observer}-evidence.json,
release-bracket-parallel-transport-probe.json,
release-bracket-post-parallel-probe-baseline.json.
Do not repeat this connector probe or call the model a concurrency proof. Separate
authorized concurrent execution transport is needed; durable/SDK/actual races remain
OPEN. Next perform exact packed K15/original30s then evaluate approved guarded down
on failed trial. R1 acceptance/dependent work remain gated regardless of K15 result.

#### Exact full-K15 bracket benchmark — PASS / 2026-10-08
Ran unchanged packed fixture1397651 bytes SHA256
9b1492072ce09e0dd9b2cb323c159495384a21a7d8aeabbc51c030c9f95eaed7. Native hash
guard reconstructed the original DO body before execution. Original data, ordering,
batching, constraints, internal timing boundaries and statement_timeout30s unchanged.
Receipt: canonical3918.485ms + release1309.237ms + deferred11251.532ms =
total16479.254ms. Complete expected/actual1808 items,213 spirits,30 seasons,
244 provenance,2051 identities,4103 memberships;46341 canonical/4367 release rows.
Independent verifyFullK15ValidationReceipt rebuilt expected source locally and PASS,
including complete phase durations/sum/30s bound and exact item/membership counts.
Full85 source/empty guard and whole metadata/data/ACL/membership/clock/witness
baseline matched installation before and after outer ROLLBACK. No fixture retained.
E: release-bracket-k15-{outcome,receipt}.json,
release-bracket-post-k15-baseline.json. API transport/unpack/wall time is not an
internal phase measurement or separate concurrency/durable/production-capacity proof.
New schema/ACL/runtime/adversarial/denial/benchmark checks PASS. Concurrency evidence
absent because available connector requests ran sequentially; this is a transport
gate, not a demonstrated validator failure. Keep approved85 development installation
for continued proof; prepared guarded down remains available on actual failed trial,
NOT RUN. Full schema/down/durable/concurrent/crash/restore/SDK gates stay OPEN.

#### Concurrent transport next action — authentication outside current package
CLI2.120.0 commands/help verified. Independent process transport candidate reuses
Management API with --linked --project-ref tpbydviuknovimroeodm --file <E SQL>
--output json; does not create a DB principal/password, grant, SDK, resource or public
API. CLI presently has no access token. No credentials were read/exported/generated
or stored by this run. User must authenticate that CLI using their existing account,
or separately authorize its login initiation; credentials operation is outside exact
5d9058e package and requires user rule22 approval. Never put tokens in chat/logs/Git.
CLI auth help offers automatic login or --no-browser; do not initiate either before
authorization. After authentication: read-only preflight must verify current_user/
session_user postgres, target project/PG17.11, complete85 source baseline and $0
development boundaries. Inspect actual CLI result format before extracting receipts.
Then use separate CLI processes for prepared A/B/observer SQL; require distinct live
backends, observed blocking edge, rollback-isolated clocks and exact full baseline
after each ROLLBACK. If that API also serializes, stop and review another independently
authorized transport; do not create a credential/principal or pretend serial evidence
proves concurrency. Existing creator rehearsal scope remains approved.
Even limited zero-row lock proof would not satisfy all durable adapter/CAS races;
those remaining acceptance gates must be specified/verified before R1 closure or
opening consumers/R2–R6. Original master objective remains ACTIVE/incomplete.
Final local suite442/442 PASS (including concurrency receipt corruption checks),
lint/typecheck/focused/scaffold PASS; app build unchanged/not rerun. No live SQL/test
job remains. Native benchmark checkpoint is the resume source; don't repeat passed
rehearsals or unavailable connector probes before authentication/transport changes.

#### Full adapter concurrency preparation — native NOT RUN
While CLI authentication remains pending, prepared two complete owner adapter
transcripts plus the independent read-only observer. Builder:
tests/sql/build-release-validation-bracket-adapter-concurrency.mjs; verifier exported
there compares original full intent/control/applied/receipt rows using the existing
independent adapter verifier. Original callback SQL unchanged,39 callbacks/978 query
checks/6 token negatives EACH. Only test barrier/local receipt metadata added.
A locks existing head/control before8s sleep; B must observe live A, physically wait,
then see clock0/witness empty after A ROLLBACK before running its full adapter.
Both final receipts require balanced positive epochs, exact expected release-version
witnesses bound to their own distinct xid, three distinct live PIDs and observer's
actual A→B blocking edge. Older witness epochs within a transaction are permitted;
they are never interpreted as a current-epoch cache hit. Full baseline after each
transaction remains mandatory. No new role/SET grant/DDL/credential/SDK/resource,
all fixture writes in outer ROLLBACK; unchanged30s statement limit.
E: release-bracket-adapter-concurrency-a.sql1728233 bytes SHA256
cd063bbb110d09e81fbae2934c16a6281c2211f59ddb88941ff89f6c5ee997af;
b.sql1729668 bytes SHA256
7e882b64c8247ec878808f222d9be1d17985f70e9ceab034438291f113866c46;
observer.sql1290 bytes SHA256
108c3d92a3ddf9406a316f589fa322c7c1ac1452b93012c04a94666945b7643b.
Two focused preparation/receipt-corruption tests PASS; lint/typecheck PASS. Prior
full442 suite remains checkpoint evidence; expanded full suite NOT RUN (unchanged
app/native inputs). Native concurrent case NOT RUN; credentials question still
pending, no new authentication probe or passed-native rerun. Exact next after
authorized/user-ready CLI: read-only project/postgres/PG17.11/full85 preflight,
inspect actual output format, run this full adapter case with independent processes
and verify actual rows/blocking/rollback baselines. If transport cannot overlap,
stop instead of accepting synthetic or serial evidence. R1 remains OPEN: even this
case would establish rollback-local competing adapter serialization, not durable
commit/CAS-winner/crash/restore/SDK acceptance. Keep K15 PASS and original gates.

Blocked audit2026-10-08: CLI authentication/independent transport authority remains
pending across three consecutive goal turns. Local+remote6d65b7e verified clean;
complete authorized preparation checkpointed, no live job/independent authorized
next implementation. Goal BLOCKED pending direct auth authorization or user-ready
CLI signal; original objective unchanged/incomplete. No new auth probe, credential,
SQL run or dependent phase opened. Resume exact preflight/concurrent steps above.

#### Direct CLI login authority2026-10-08 — authentication in progress
User approved initiating normal CLI login with their existing account solely for
prepared sky-guide-dev concurrent proof, and instructed direct CLI authentication
with no token in chat/log/Git. No new DB account/password/privilege/infrastructure/
production authority. Pinned2.120.0 login help checked; normal automatic browser
flow started in separate visible interactive PowerShell window, PID26700 verified
live. No login output/input redirected, captured or recorded. CLI itself owns
standard credential storage; this run does not read/export the credential.
E: start-approved-cli-login.ps1 / approved-cli-login-status.json store only launcher
code and phase/PID/timestamps/exit code. Status initially running. No auth completion
or native preflight claimed yet. Recheck actual live process/status; after success,
read-only target/account/project/85-source baseline check and actual output-shape
inspection precede independent A/B/observer processes. All fixtures remain outer
ROLLBACK with full baseline after each; missing overlap keeps gate OPEN. If login
fails/cancels, no blind restart. Mandatory durable/restore/CAS/SDK gates unchanged.

#### CLI linked-query role side effect — STOP / recovery REVIEW ONLY
User signalled CLI ready. Login completed exit0 at05:49:12.0605343 UTC. CLI projects
metadata matched sky-guide-dev/tpbydviuknovimroeodm/Dyland's Org/ap-southeast-1/
ACTIVE_HEALTHY. Native identity guard confirmed current/session postgres,PG17.11,
85 owners. Whole source85 baseline matched installation exactly. Actual --output
json has {boundary,rows,warning}; guarded one-row result shape inspected.
Two linked preflight queries emitted 'Initialising login role...'. Examined exact
CLI2.120.0 primary source: query.handler.ts lines244–252 resolves linked DB config,
including temporary login-role mint, although it discards that connection and
executes SQL via Management API. Previous no-new-principal CLI transport assumption
was incorrect and is withdrawn. Stopped passwordless DB CLI commands BEFORE any
prepared A/B/observer fixture. No concurrency result exists from this route.
Read-only independent MCP audit found cli_login_postgres LOGIN/NOINHERIT/non-super/
no-CREATEROLE/no-CREATEDB/no-BYPASSRLS, validuntil2026-10-08T05:55:41.50054+00:00;
one postgres→CLI membership, grantor supabase_admin,ADMIN FALSE/INHERIT FALSE/SET
TRUE. This role/membership is outside fixture ROLLBACK and explicit user authority.
No global role snapshot existed before CLI; do not claim proven creation vs refresh.
Existing85 snapshot pins app runtime groups, not every provider principal, so its
PASS does not prove no external CLI role change. No baseline/profile auto-adoption.
MCP source85 post-incident guard +whole metadata/data/runtime snapshot still EXACT,
clock0/witness0. No live CLI sessions/settings/shared dependencies; postgres has no
ADMIN on managed CLI role. Password expiry does not remove role or SET membership.
Official recovery documented at
https://supabase.com/docs/guides/troubleshooting/permission-denied-when-deleting-the-cli_login_postgres-role-808bae
requires DELETE fixed project's /cli/login-role; ordinary postgres DROP cannot do
this. No cleanup/revoke/NOLOGIN/schema-down/privilege expansion attempted.
Review builder tests/sql/build-cli-role-recovery-proposal.mjs generates fixed
Management API request and READ-ONLY guard requiring exact one expired observed
role/membership, no other cli_login roles, no backend/settings/shared dependencies.
Native guard PASS; strict returned guard receipt independently verified. One local
preparation/corruption test PASS; lint/typecheck PASS; full suite NOT RUN.
E guard1928 bytes SHA25670c98c6943b7c8f4686ff60e56290bd9b9d4fd53dc3669e90b7859c9251899d0;
request1538 bytes SHA256244db0fd5a8d69eda689816a5b3b777c442038b0264efc945d0ec0d688869221.
E approved-cli-{target-project,identity-result,before-concurrent-baseline-result,
before-concurrent-baseline,role-audit,role-dependencies,post-incident-baseline}.json;
cli-role-recovery-{guard.sql,request.json,guard-receipt.json}. No credential captured.
Proposal NOT APPROVED/NOT RUN: use existing CLI account token only in process memory
for fixed project/host DELETE, guard immediately before; require all cli_login roles
absent afterward and all other global role attributes/memberships/settings plus
whole85 baseline unchanged. Endpoint may remove read-only counterparts: one-role
guard forbids any others. Deletion is irreversible; never remint role/credential as
automatic rollback. Failed DELETE/post-guard STOP and review, not schema down.
Also request explicit authority for direct Management API POST database/query with
the same in-memory credential to avoid CLI DB-config mint. No new credential/DB
password/principal/privilege/infrastructure, no secret in chat/log/Git/arguments/
new files. This transport implementation/native proof NOT RUN; no credential read
before approval. After cleanup +target/source85 checks, run unchanged prepared
adapter A/B/observer with independent requests and exact baselines after each
ROLLBACK. If no true overlap, report evidence and keep all R1 gates OPEN.
Exact next: obtain direct recovery/transport authority, implement narrow token
handling with local fake-credential tests before any credential access, reread
current guards, then scoped cleanup and concurrent proof. Stop all DB CLI commands
until role-mint behavior avoided; do not reopen dependent phases or change K15.

#### Recovery comparison preparation while approval pending
Added tests/sql/verify-cli-role-recovery-audit.mjs: read-only source audit of all
role attributes/OIDs, exact memberships including grantors/options, per-role/per-DB
settings, CLI shared dependencies and active sessions. No password/credential
column. Configuration values are hashed with server-side SHA256; only digest and
key names returned, never raw values. OID output initially came back as JSON text,
causing a strict numeric-shape rejection; explicit ::bigint in audit SQL fixed
transport typing without coercing/dropping fields. First incident snapshot retained
on E as diagnostic, inspected configuration KEY NAMES only (no secret keys present).
Native final read-only snapshot33 roles/27 memberships/10 settings shape PASS;
cli dependencies/sessions0. Complete after-removal comparator permits ONLY the
pinned cli_login_postgres role and its one postgres SET membership to disappear;
all other attributes/memberships/settings exactly equal, CLI roles absent. Also
rejects extra/duplicate/malformed rows and unexpected fields. No snapshot auto-
adoption as app/schema baseline; whole85/source/expiry/ownership guards still needed.
Local simulated removal on the real incident snapshot fits strict comparator;
this is explicitly NOT an actual DELETE/post-removal receipt. Two focused recovery
tests PASS; lint/typecheck PASS; expanded full suite NOT RUN. Native cleanup,
credential read, new transport/concurrent fixture NOT RUN. Current8514bec direct
recovery/transport approval question remains pending; request/guard hashes and
authority unchanged. E cli-role-recovery-global-audit.sql and
cli-role-recovery-global-hashed-incident-audit.json. After approval reread current
guards and capture fresh global before/after around cleanup; do not reuse this
incident snapshot as immediate-before evidence. R1/master objective remain OPEN.

Blocked audit2026-10-08: same direct8514bec recovery/transport authority gate persists
across three consecutive goal turns.101f788 verified local+remote, working tree
clean; all authorized preparation complete, no live job or independent authorized
next implementation. Goal BLOCKED awaiting explicit answer to existing approval
question; prior CLI login approval/automatic continuation is not that answer.
No further connector/credential/DELETE/concurrent run or dependent phase opened.
On authorization resume exact fresh guards/global snapshots and scoped actions
above; original master objective and all acceptance gates remain unchanged.

#### Direct8514bec/101f788 approval and narrow transport implementation
User directly approved recovery/API package including the global audit, resuming
from pushed9b55862; this is explicit human authority, not an automated continuation.
The prior approval gate is resolved. No repeat permission request for approved
cleanup, existing credential in memory, fixed Management API or rehearsal.
Added management-api-worker.ps1: native Windows CredReadW/CredFree on only existing
Supabase CLI:supabase/access-token targets, existing CLI fallback file read if needed,
no credential/principal write. Token stays inside the HTTP worker; no token in
arguments, pipe receipts, logs, Git or new files. Fixed API host/project and only
GET project metadata, POST database/query, approved DELETE cli/login-role; redirects
disabled, reflected token rejected, sensitive exceptions omitted. Project response
is restricted to identity/org/region/status. Independent workers permit real HTTP
overlap without invoking CLI DB configuration. SQL retains30s, HTTP65s does not
relax SQL cap. Raw prepared transcripts and safe receipts remain on E outside Git.
Recovery runner rebuilds source85 guard from original audit and compares stored SQL,
compares fresh global roles with incident snapshot, checks exact guard immediately
before DELETE, never retries/recreates, and verifies whole85/global after. Concurrent
runner compares every prepared A/B/observer byte, uses3 independent workers and
checks whole85/global after EACH case including SQL failure; existing independent
receipt verifier decides PASS. No durable/CAS/crash/SDK gate is removed.
Four focused recovery/transport tests PASS using fake credential only; lint PASS.
Native credential read, cleanup and concurrency NOT RUN at this preparation point.
Exact next: execute approved cleanup, verify post-state, checkpoint result, execute
prepared concurrency immediately, then assess remaining dependency-ready work.

#### Approved native CLI-role cleanup PASS
Narrow transport preparation pushed0fd1074. Existing CLI credential read only
inside worker memory; fixed Management API target identity/org/region/status PASS.
First baseline preflight returned23514 because new wrapper was read-only while
original guard calls lock_sync_commit_control requiring READ COMMITTED/read-write.
Stopped before DELETE, preserved receipt; corrected wrapper only to read/write
with30s/ROLLBACK, source guard unchanged. No drift detected or guard relaxed.
Fresh source85 and complete33-role/27-membership/10-setting audit exactly matched
installation/incident snapshots; exact expiry/no-active-session/no-settings/no-deps/
single-role guard PASS immediately before DELETE. Approved Management API DELETE
returned200. Native post source85 exact PASS; global comparator permits exactly
one removed cli_login_postgres and its one postgres SET edge. Remaining32 roles,
26 memberships and10 settings exactly unchanged; all cli_login roles absent. No
credential/principal/password/privilege creation, retry, remint or schema down.
Receipts E approved-api-2026-10-08T07-05-52-751Z-{project,immediate-before-baseline,
immediate-before-roles,immediate-guard,delete,immediate-after-baseline,
immediate-after-roles,cleanup-PASS}.json. Failed first preflight prefix07-05-18-095Z.
Exact next: unchanged A/B/observer independent direct requests, per-case full85 and
global comparisons. R1/all other mandatory acceptance gates remain OPEN.

#### Full native A/B/observer rollback-local concurrency PASS
Cleanup result pushed933b49d; immediate followup uses independent fixed-project
HTTP workers, existing token remains worker memory only, no CLI DB-config path.
Prepared full A/B/observer SQL bytes unchanged; native complete transcripts/receipts
preserved E approved-api-2026-10-08T07-07-24-571Z-*. Distinct backend PIDs
A172177/B172176/observer172175, xids2190/2191. Observer sees B Lock blocked by
A via pg_blocking_pids=[172177]; B waits9096.341ms while A holds actual control lock.
Both original five-phase adapters pass39 callbacks/978 query assertions/6 negative
cases and exact final journal receipts. Witnesses scoped to own xid/version/epoch;
B observes empty clock/witness before and after A ROLLBACK. Every case and final
source85/global metadata comparison PASS; all fixtures outer ROLLBACK, no temporary
SET membership retained. Original SQL30s limit and all acceptance criteria retained.
Independent full receipt verifier PASS. Connector serialization diagnosed as the
old bridge path; direct independent HTTP produces real overlap without new roles.
Expanded full448 tests PASS (42573.7034ms), no failures/skips; lint/typecheck PASS.
Full suite log E approved-api-expanded-tests.log. Add Windows-only annotation to
native fake-credential integration test for Linux CI portability; static credential
policy test remains cross-platform. No unchanged app build/K15 rerun necessary.
Scope: competing complete adapter transactions under ROLLBACK ONLY. Persistent
COMMIT/CAS winner/uncertain ACK/process crash/restart/backup restore/schema down/
actual SDK/Auth still OPEN; Management API JSON is not the kernel's leased wire
protocol port. R1 acceptance/dependent consumer phases are not unlocked.
Next safe slice: prepare read-only empty85 development recovery snapshot and source
manifest on approved E storage; keep physical/logical backup/isolated restore gates
OPEN. No persistent fixture COMMIT or new restore environment is approved yet.

#### Safe continuation — empty development recovery snapshot PASS
Added build-empty-dev-recovery-snapshot.mjs and one corruption test. Read-only
SQL exports only85 private owners; exact3 baseline singleton rows required, every
other table empty, unknown fields/owners/fixture rows rejected. No platform/Auth/
credential catalogs exported. Native snapshot PASS; source85/all32 roles/26
memberships/10 settings before/after EXACT. E prefix
approved-api-2026-10-08T07-14-06-357Z: snapshot-before/after-baseline/roles.json,
empty-snapshot.sql/json and empty-snapshot-manifest.json. Manifest pins all16
migration names/bytes/SHA256, source guard/snapshot/global-audit hashes and each
owner's rows. Approved bracket migration SHA retained. Explicitly NOT pg_dump/full
backup/off-site replication/restore proof; provider/extension objects and migration
statement-array backup excluded. Focused corruption test/lint/typecheck PASS;
previous expanded448 full suite retained, no claim full449 suite ran.

#### NEW reviewable scope proposal — isolated local durable/restore environment
LARGE infrastructure extension, NOT APPROVED / NOT RUN. Prior8514bec/101f788 gate
resolved and work completed. This proposal needs NEW authority under Rule22:
current hosted approval requires fixture ROLLBACK/no new principal/infra. Persistent
COMMIT/CAS winner/crash/restart/restore cannot be accepted under that restriction.
Keep sky-guide-dev exact empty85/global baseline; no further hosted writes.

Proposed resources and boundaries:
- Start already installed Docker Desktop only after explicit approval. Read-only
  docker info confirms daemon unavailable; no startup/pull/container/install tried.
  Host psql/pg_dump/initdb unavailable. No Docker upgrade/global-config change.
- Two task-owned PostgreSQL17.11 containers, durable source and fresh restore target.
  Network disabled/no published ports; independent docker exec clients via local
  Unix sockets, local trust auth, no password/cloud credential or hosted project.
- Official postgres:17.11-bookworm pinned manifest
  sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826;
  Linux/amd64 sha256:66aafa11cf15800a3c94763f7e11d1e7b2e37e5e84bc4ce027cb6e1e4bfaf4df.
  Public registry metadata saved E local-restore-image-metadata.json; compressed
  image158479270 bytes. Require running server_version_num170011; retrieved
  metadata is not an image pull/server proof. No paid resource/license purchase.
- Max1 CPU/768 MiB per container. Data/export/logs in resolved task directory under
  E:/SkyGuideAssets/research/postgres-durable-restore-*; E has~46.1 GB free now.
  Task data2 GiB/logs10 MiB per container cap, stop on excess. Validate E bind mount
  before DB work; no silent C data fallback/global storage change/volume substitution.
  Image cache stays in existing Docker storage. No account/subscription creation.
- NEW LOCAL bootstrap principals only: supabase_admin initialization superuser,
  postgres non-super migrator CREATEROLE/BYPASSRLS, anon/authenticated/service_role
  NOLOGIN platform-name test placeholders, two SQL-defined NOLOGIN runtime groups.
  No hosted role/rights/password change. Placeholder roles do not prove real
  Supabase Auth/SDK parity. Additional principal requires separate review.

Implementation/acceptance after approval:
1. Prepare bounded setup scripts/manifests with fixed paths/labels/images and role
   attributes; inspect existing Docker inventory, never reuse unrelated resources.
2. Reuse16 pinned migrations in order and preserve recorded history, exact85/helper/
   runtime boundary. Explicit local migration-history setup; STOP on an unprepared
   provider prerequisite. Keep hosted guard unchanged; local engine contract must
   distinguish local bootstrap metadata from provider-global roles/OIDs. No schema
   hash adoption from fetched local metadata to bypass source checks.
3. Prepare and independently verify separate-transaction native adapter/CAS/crash
   transcripts before execution. Permit bounded synthetic fixture COMMIT ONLY in
   these local targets. Exactly one durable CAS winner, loser leaves no orphan,
   fresh client sees exact immutable witness/journal state. Crash/restart ONLY task
   source container/process, never hosted or pre-existing workload.
4. Image-bundled matching pg_dump/pg_restore exports task schemas/history to private
   E artifact; restore into fresh second target with required owners/grantees and
   stop on any SQL error. Verify every row/field/order/checksum/body/ACL/constraint/
   history/public projection; preserve existing revocation/API acceptance criteria.
   No password-bearing pg_dumpall globals or hosted credential export. Local proof
   does not close real leased driver ACK-loss/SDK/Auth or hosted full-backup gates.

Rollback/cleanup: hosted state untouched. On failure stop and retain E transcripts/
dumps. Stop/remove ONLY exact task-labelled IDs recorded at creation after matching
name/image/mount guards; never touch existing Docker workloads/global config or
recursively delete E artifacts. No production merge/deploy or paid resource. Docker
startup/two local containers/specified LOCAL principals/local fixture COMMIT are
the new actions needing direct approval. No repeat approval for recovery/API.
After approval refine this current slice, verify setup before durable cases and
checkpoint meaningful proofs; every unproved R1 gate remains OPEN.
Primary restore requirements: [PostgreSQL17 SQL dumps](https://www.postgresql.org/docs/17/backup-dump.html)
requires owners/grantees before restore; database dumps omit global roles.

Direct user reply `duyệt` received for proposal checkpoint6ff3fa7. Local scope
approved exactly as above; startup/setup/roles/local fixture COMMIT/crash/restore
require no repeat question. Hosted no-new-principal/fixture ROLLBACK remains intact.
Current work: bounded setup scripts/manifests, Docker startup and local target
preflight; image/schema/data/native durable cases not yet run.

#### Approved Docker startup failed; scoped runtime repair proposal
Startup attempted once with installed Docker Desktop hidden. Backend09:32:51 UTC
fails before engine: initializing Inference manager cannot remove existing
Docker/run/dockerInference, Windows ERROR_CANT_ACCESS_FILE1920 / invalid endpoint.
Desktop/backend subsequently quit; no current process, daemon pipe absent. No image
pull/container/new local principal/schema/data work. Read-only WSL status confirms
WSL2; no WSL shutdown/termination, update/reinstall/global settings action.
Existing runtime directory contains precisely two zero-byte Archive/ReparsePoint
objects: dockerInference (lastwrite2026-08-10T01:01:09Z) and userAnalyticsOtlpHttp.sock.
fsutil reparse query returns1920 too. Exact failure is also reported in Docker's
own [desktop-feedback issue625](https://github.com/docker/desktop-feedback/issues/625);
that corroborates symptom, not proof that any workaround will succeed here.

NEW Rule22 review package: tests/sql/repair-docker-runtime-proposal.ps1, Audit by
default. Native read-only Audit PASS; E docker-runtime-repair-before.json captures
exact source/destination/two-object metadata with no file contents. Apply would
rename only C:/Users/HP/AppData/Local/Docker/run to its same-parent
run.skyguide-preserved-20261008-6ff3fa7, preserving both original endpoints; then
restart approved Docker Desktop. Before Apply require zero Desktop/backend process,
ordinary parent/source directories, exact two zero-byte reparse objects/metadata,
destination absent and exact paths; STOP on drift. No delete/settings/data VHD/
container/image/credential/WSL/global config change. No broader automatic recovery.
Rollback: with Desktop/backend stopped and original run path absent, rename preserved
directory back. If restart created a new runtime directory, retain BOTH and stop;
never overwrite/delete either automatically. Existing runtime files predate this
task, so their movement is outside approved task-container startup/cleanup scope
and needs separate direct authority, not repeated local-environment approval.

Local environment code prepared: fixed E root/image/task label/two names, exact ID/
image/mount/network/port/memory/CPU/log guard before DB work, no password or credential
arguments, SQL through stdin. One actual corruption test rejects wrong ID/task/
mount/ports/resources/network/password env; PASS. Lint PASS; typecheck pending
completion. Native setup NOT RUN; prepare bootstrap/migration/durable builders while
new runtime repair question is pending, preserve all hosted/R1 gates.

#### First runtime repair executed; new Secrets Engine socket gate
User directly approved a6a83ec guarded directory rename/restart. Fresh guard PASS;
original Docker/run preserved as run.skyguide-preserved-20261008-6ff3fa7. Both
original endpoints metadata unchanged, independently compared with reviewed audit;
E docker-runtime-repair-applied.json. Restart proceeded past Inference but failed
09:46:54 UTC at Secrets Engine removing separate
C:/Users/HP/AppData/Local/docker-secrets-engine/engine.sock, ERROR_CANT_ACCESS_FILE
and invalid listener endpoint. Screenshot supplied by user matches backend log.
Honored explicit STOP on different error: no further repair, reset, delete, settings/
credential/VHD/WSL/workload change. Desktop/backend exited; no engine/container/image
pull/local principal/schema/data work. First runtime repair is completed authority,
not pending approval; original local proposal also remains approved.

NEW Rule22 concrete proposal: repair-docker-secrets-runtime-proposal.ps1 default
Audit. Exact source directory contains ONLY one zero-byte Archive/ReparsePoint
engine.sock, lastwrite2026-08-10T01:01:09.8861919Z. No secret/socket contents read.
Native READ-ONLY guard PASS; E docker-secrets-runtime-repair-before.json contains
only metadata. Proposed same-parent rename to
docker-secrets-engine.skyguide-preserved-20261008-a6a83ec, preserve socket, restart
Desktop. Require no Desktop/backend process, ordinary parent/source, exact one
object/metadata, fixed paths/destination absent; STOP on drift. Never delete/change
settings/credentials/other files/containers/VHD/WSL. If a different error appears,
STOP with evidence rather than extend recovery. Rollback only with Desktop stopped
and original path absent; if new runtime directory was created preserve both and
STOP, no overwrite/delete. Source LF script SHA256
ee849155cea284f1c9f35e0661067bca42834090b2d0643bb065764d19925160.
This touches another pre-existing directory and is outside first repair's explicit
scope; separate direct approval needed. No repeat approval for approved local tasks.

Independent safe preparation completed while engine unavailable: source-pinned
build-local-postgres-replay.mjs and localPostgresReplay corruption/retention test.
Fresh cluster actor supabase_admin/OID10/170011, no existing custom roles/task
schemas; only named local postgres/platform placeholders bootstrap, runtime2 groups
created by original migration. All16 SQL bytes/history retained in bounded30s/local
COMMIT wrappers, nonsuper postgres executor. E local-bootstrap-proposal.sql and
local-replay-manifest.json; preparation only, not a native schema/replay PASS.
Local environment transport fixes Desktop named-pipe explicitly (ignores remote
context), guards real E parent/root/IDs/image/network/ports/CPU/memory/log mounts and
checks2 GiB task data before/after SQL. Two focused tests, lint/typecheck PASS;
previous448 full suite retained, expanded full suite NOT RUN. Native setup/durable/
CAS/crash/pg_dump/restore NOT RUN, R1 unchanged. Exact next after new repair approval:
fresh guard/one rename/restart, healthy engine before any approved setup/migrations.

#### Secrets Engine repair completed; coordinated restart proposal
Direct72db3d9 approval received. Fresh zero-process/exact metadata guard PASS;
Secrets Engine directory preserved at its proposed destination. Second restart
FAILED09:55:23 UTC at dockerInference regenerated09:46:50.3037690 UTC during the
previous startup. Current Docker/run contains only this zero-byte reparse endpoint,
Secrets active path ABSENT; both original preserved inventories/metadatas EXACT.
This is a sequential startup cycle, not failure to preserve the original endpoints.
No guarantee that another startup will succeed. Explicit further-error STOP honored.
Official graceful Desktop stop --timeout20 failed with remaining processes/deadline;
CLI exited, error UI/backend still running. No force-kill/global shutdown/WSL/config
change. No image pull/local container/role/schema/data mutation has occurred.

NEW concrete Rule22 package repair-docker-coordinated-runtime-proposal.ps1:
Audit reads endpoint metadata only and verifies both previous preserved inventories,
active Secrets path absent, one regenerated Inference endpoint/timestamp, ordinary
parents and absent fixed destination. Audit PASS; E coordinated-before receipt.
Apply additionally requires zero Desktop/backend processes and exact reviewed JSON.
Move only current Docker/run to run.skyguide-preserved-20261008-coordinated-72db3d9;
verify preserved metadata/both active paths absent, then one approved restart.
User must Quit error UI because graceful CLI stop failed. New move/destination
requires direct approval; completed72db3d9/a6a83ec/local proposal do not need renewal.
No delete/overwrite/settings/secrets contents/VHD/WSL/workload change. Rollback only
after Desktop stopped and original path absent; if recreated retain all copies/STOP.
Any further error/drift STOP without broader repair. Apply NOT RUN.

Independent local durability builder prepared: complete original39 adapter callback
bodies/978 assertions/6 negatives retained; seed and each positive callback use real
separate native COMMIT, negatives ROLLBACK, original read committed/read-write or
repeatable read/read-only preserved. Each callback emits backend/isolation/boundary
receipt and verifier rejects malformed/wrong terminal acknowledgement/PID. This is
local engine preparation, NOT leased-wire/ACK-loss/CAS race/restore acceptance.
All3 focused local preparation tests/lint/typecheck/PowerShell parse/diff PASS;
expanded full suite/build NOT RERUN. Native durable execution NOT RUN. Continue local slice
only once healthy engine and guarded targets exist. R1/dependent gates remain OPEN.

#### Guarded local runner prepared while coordinated repair approval is pending
Fresh continuation inventory: Desktop/backend now absent; no force-stop or extra
runtime repair/startup performed. Previous goal turn made progress (second approved
rename and new preparation), not native durability acceptance. Newad9845b repair
question remains pending; do not infer authorization from automatic continuation.

run-local-postgres-rehearsal.mjs has separate initialize/durable operations, no
implicit setup/repair. Before schema change verify both fixed task IDs/mounts and
native PG17.11/superuser actor/E PG_VERSION17. Execute approved local bootstrap and
16 original migration bodies under nonsuper postgres; source history statements
must match every original byte/order. Execute unchanged compiled/reviewed source85
guard under ROLLBACK; do not adopt native metadata or weaken provider guards if it
fails. Saved initialization receipt does not prove hosted/SDK/Auth parity.

Durable run requires initialization receipt plus fresh exact source85/history;
STARTED marker prohibits blind rerun after any partial COMMIT. Seed then39 separate
native callbacks, validate terminal acknowledgements and distinct backend IDs,
retain all transcripts; final original complete journal verifier and history check.
SQL transport now executes inspected immutable container ID, avoiding replacement
of a same-name container between guard and execution. No fixture on hosted project.
Five focused tests PASS including corrupt native boundaries/history; lint/typecheck
PASS. E local-durable-adapter-proposal-ad9845b.json pins prepared callback SQL. Native
bootstrap/replay/durable/CAS/crash/restore NOT RUN; no dependent roadmap gate opened.
Next after coordinated approval/healthy engine: approved environment setup, runner
initialize, source85/history acceptance, runner durable; STOP/retain on any failure.

Direct user instruction to repair Docker and continue received. Coordinatedad9845b
Apply fresh guard PASS, current run directory preserved at its fixed new destination,
both older inventories exact. Single approved restart SUCCESS: engine29.0.1 answers
on fixed Desktop Linux named pipe. E coordinated-applied receipt retained. Runtime
permission blocker resolved; proceed with already-approved two local targets and
native source85/history/durable acceptance. No global settings/reset/VHD/WSL changes.

Approved two-container setup executed with exact recorded IDs/image/network/resource/
E mount guards. Both native PG17.11 preflights PASS. Early source preflight arrived
during image initialization and failed before bootstrap; failed receipt preserved.
Confirmed PID1 postgres and pg_isready before retry, now explicit runner prechecks.
Source bootstrap and16 original migrations COMMIT; every history byte/order exact.
Unchanged compiled/reviewed source85 guard PASS under ROLLBACK (no adopted schema
hash or relaxed role check). E local-initialization-PASS.json and all per-migration
logs/receipts retained. Restore remains fresh; hosted untouched. Next durable39
separate callbacks; CAS/crash/restore/leased-wire/SDK gates still OPEN.
