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
