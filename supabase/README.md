# Development database migrations

Current target/status and authorization: [P9-I02 phase](../docs/plan/POSTGRES_PROVIDER_SELECTION.md).
These are additive portable PostgreSQL migrations. `sky_private` is not a browser
Data API schema. No real source records, application credentials or binary media
are included. Existing frontend/API consumers remain disconnected.

CLI tooling is pinned to `supabase@2.120.0`; temporary npm cache stays on E:.
Create new files with `supabase migration new <name>` after inspecting `--help`.
Hosted changes use MCP `apply_migration`; record its authoritative version and
align the freshly generated local filename to that returned version before commit.
Do not replay a locally timed filename as a second migration or repair/rewrite
already accepted remote history. The first file was CLI-created as20261006170142
and aligned to the provider's actual applied version20261006170439.

Fixture rehearsal: [private-identity.sql](../tests/sql/private-identity.sql).
Run as the migration owner on an isolated rehearsal database only. The script
asserts expected SQLSTATEs, uses synthetic IDs and rolls its entire transaction
back. No helper functions/data persist. Recheck row counts and role privileges
after running; a successful SQL call alone is not the full acceptance criteria.
Never run destructive reset/down operations against this project or production.

Eight applied migrations cover identity/provenance/crosswalk reservations,
alias/tombstone consistency, evidence-TRUNCATE protection and typed K15 payloads/
fraction-precision correction plus private release metadata/membership and immutable
derived public projection and private sync metadata/CAS.
Identity/retirement files were
CLI-created as20261006171156/20261006171555 and aligned to actual hosted versions
20261006171406/20261006171612. Run both
[identity](../tests/sql/private-identity.sql) and
[retirement](../tests/sql/private-retirement.sql) fixtures on the final schema.
Unknown alias-source IDs are retained without inventing identity rows; targets
use explicit identity-or-alias FKs, preserving original to_id as a generated column.

Catalog files CLI-created as20261006172339/20261006174236 aligned to hosted versions
20261006173438/20261006174420. [Row codec](../src/server/catalogRows.ts) covers all
current K15 payload fields through explicit scalar columns and typed ordered joins.
Full checked-in K15 row/public byte parity passed locally; hosted data is synthetic
only. No generic JSON document/EAV canonical store or real source publication.

Build the rollback-only hosted catalog rehearsal with
`node tests/sql/build-catalog-rehearsal.mjs E:/SkyGuideAssets/research/postgres-rehearsal-2026-10-07/catalog-fixture.sql`.
The [body](../tests/sql/private-catalog.sql) asserts32 negative SQLSTATE cases plus
known/free zero and500/17000-digit precision. The builder emits bounded fixture
inserts and a derived actual-row response for codec verification, then ROLLBACK.
JSON response is transport, never canonical JSON persistence. Do not commit its
output or treat its temporary fixtures as reviewed source data.

Release metadata migration20261006180131 adds11 private tables (44 total),
preserving manifest optional source/import report and each dataset's own envelope
timestamp/hash/source plus five ordered subtype membership tables. Build with
`node tests/sql/build-release-rehearsal.mjs E:/SkyGuideAssets/research/postgres-rehearsal-2026-10-07/release-fixture.sql`.
The [body](../tests/sql/private-release.sql) checks38 negative SQLSTATE cases;
`--without-optional` builds a second positive fixture without source/importReport
and with null media pin. Both scripts end ROLLBACK. Verify actual response JSON
with tests/sql/verify-release-rehearsal.mjs (matching optional flag) and fetched
schema metadata with tests/sql/verify-release-schema.mjs. Keep outputs outside Git.
Full local K15 canonical metadata/bytes and hosted synthetic parity PASS; no full
real K15 SQL import. Checksums/revisions reject drift. Private candidate metadata
is not reviewed/promoted history: root reservations immutable; the following
projection migration seals child metadata once its header exists. Metadata SQL
alone does not calculate checksums.

Projection migration20261006181325 adds2 private tables (46 total); derived
canonical public bytes are checksummed with PostgreSQL17 sha256/UTF8, immutable
and version-bound. Files precede header in a single transaction; the deferred FK
permits this order, and header insertion seals metadata. Completion verifies all
five file hashes/paths. Decode validates publication/canonical bytes independently
of mutable current payloads. Materialization is not reviewed pointer publication.
Build `node tests/sql/build-projection-rehearsal.mjs E:/SkyGuideAssets/research/postgres-rehearsal-2026-10-07/projection-fixture.sql`.
The [body](../tests/sql/private-projection.sql) checks24 native negatives and changes
current payload/revision while retaining old projection. Verify fetched JSON with
tests/sql/verify-projection-rehearsal.mjs and schema with verify-projection-schema.mjs.
Always rollback fixtures; no real imports or production use. Canonical SQL owners
remain typed; projection text is a derived cache, not generic canonical JSON/EAV.

Sync metadata migration20261007014843 adds4 tables (50 total): immutable acceptance/
audit, global generation/acceptance pointer and independent source attempt/health/
failure/retry. apply_sync_metadata_cas provides scalar metadata CAS, not complete
canonical payload persistence. Writes run with initially-deferred consistency
constraints; explicitly validate before commit. Future driver must lock global
generation before canonical writes and rollback every write when CAS returns false.
Build `node tests/sql/build-sync-metadata-rehearsal.mjs E:/SkyGuideAssets/research/postgres-rehearsal-2026-10-07/sync-metadata-fixture.sql`.
The [body](../tests/sql/private-sync-metadata.sql) tests34 native negatives plus
two-source conflicts/LKG/reconfirmation/recovery. Verify fetched JSON/schema with
verify-sync-metadata-rehearsal.mjs and verify-sync-metadata-schema.mjs.
All fixtures ROLLBACK. Expected baseline is now one sync_generation row at revision0,
null pointer/promotion, all49 other tables empty; no real source/review imported.
Metadata codec returns private lifecycle facts, not SyncState/SyncStore. Historical
canonical graph/payload transaction writer and authenticated reviewer remain OPEN.

Graph history migration20261007020927 adds27 immutable typed owners (77 total):
complete IdentityGraph plus ordered candidate provenance IDs by acceptance revision,
including private/fixture/retired identities, alias chains and all20 relation kinds.
Build `node tests/sql/build-graph-history-rehearsal.mjs E:/SkyGuideAssets/research/postgres-rehearsal-2026-10-07/graph-history-fixture.sql`.
Use verify-graph-history-rehearsal.mjs and verify-graph-history-schema.mjs for
actual fetched rows/schema: two historical frames/141 native negatives PASS.
Only revision0 control remains after ROLLBACK; all76 other tables empty. Writable
columns exclude generated endpoint kinds. Insert acceptance -> child graph rows ->
sealing header; enforce deferred constraints before commit. Header counts/order and
domain relationship/retirement checks supplement the existing TypeScript validator.
SQL does not reconstruct the JS digest: pinned decoder validates that on reads.
Metadata-only acceptances remain allowed; full driver must require archived graph
and validate previous-frame revision/crosswalk/alias/tombstone continuity. Graph
metadata is not future module/provenance payload history or authenticated review.

Acceptance manifest order migration20261007022023 adds one immutable typed owner
(78 total). Existing public sorted JSON and SourceSync's manifest Record key order
are distinct; four archived dataset names/positions preserve reviewed content hash
without changing earlier hash/byte contracts. Metadata-only acceptance remains
allowed, but syncStateRows full read decoder requires explicit order + graph +
projection and revalidates existing source/content/review/projection/budget contracts.
It is not a database driver/transaction writer. Read frame must come from ONE
consistent transaction with bounded transport, not independent provider calls.
Build `node tests/sql/build-sync-read-rehearsal.mjs E:/SkyGuideAssets/research/postgres-rehearsal-2026-10-07/sync-read-fixture.sql`.
Use verify-sync-read-rehearsal.mjs/verify-sync-read-schema.mjs on actual rows/schema.
Two-source failure/LKG after canonical mutation plus11 native negatives PASS.
Current baseline: revision0 singleton, all78 other tables empty; all79 RLS/no grants.

Revision checks for changed current entity relations/provenance, full payload history,
complete transactional SyncStore/driver and
PostgreSQL backup/restore are subsequent slices. The existing TypeScript domain
validators remain required; database constraints supplement them.

RLS is enabled without policies intentionally: canonical writes/read projection
are server-only and no runtime DB role has been provisioned. The table owner runs
the rehearsal. The future least-privilege server role needs a separate reviewed
grant/policy contract. Do not grant a browser/platform role access to silence the
advisor's INFO notice. FK indexes retained despite unused-index INFO on empty DB.

Payload evidence migration20261007023752 adds one typed mutable owner (79 total).
Canonical identity_provenance retains full private graph evidence; payload_provenance
retains each item/spirit/season record''s exact independently ordered subset.
Composite RESTRICT FK/deferred completeness/order/root guards prevent dangling
proofs and unowned or nonfixture-empty payloads. Replace payload bindings BEFORE
identity bindings. Existing roots backfilled exact old codec evidence; no real seeds.
Build/verify payload-evidence-rehearsal.mjs and verify-payload-evidence-schema.mjs
on actual hosted rollback-only output.13 native negatives + rebuilt catalog32/read11
and every-field/public reviewed byte parity PASS;333 tests/lint/typecheck/build.
Full transaction writer/runtime role/provider driver and restore still OPEN.

Canonical prepared SQL milestone: canonicalPayloadPlan/canonicalPayloadWrite retain
typed unpublished roots/private evidence and enforce same-owner payload revisions.
Statements use scalar parameters/static identifiers/explicit byte+row budgets;
replace bindings/children in FK order and relocate/compact immediate UNIQUE root
positions without deleting historical owners. Fragment requires global lock and
whole SyncStore transaction before it can publish. No migration or runtime grant.
Build tests/sql/build-canonical-write-rehearsal.mjs to an E: path; run
verify-canonical-write-rehearsal.mjs on actual hosted returned rows. Native synthetic
replay validates exact typed cost/offer/evidence/retirement/alias/reservation parity,
old/new immutable bytes, repeated fragment and two injected rollback cases. Outer
ROLLBACK leaves revision0 baseline/other78 empty.340 full tests/lint/typecheck/build
PASS. Whole Store CAS/read/write/audit transaction and real connected concurrency/
runtime role/review authentication/restore remain subsequent gates.

Portable full Store now implemented: postgresSyncRows/postgresSyncStore use explicit
SqlDatabase transaction/SqlConnection transport interfaces. Read is repeatable-read
readonly; CAS locks global generation FIRST, validates current facts/archived graph,
replays exact SourceSync transition and runs whole canonical/public/archive/audit
publication atomically with forced checks/post-read parity. Late false/error throws
rollback; stale false does no writes; failure preserves canonical/LKG/review.
Actual driver must enforce transport bounds, JS-safe bigint decoding and connection/
commit/rollback/cleanup contract. No SDK/credentials/runtime grants or route mount.
Build tests/sql/build-postgres-sync-rehearsal.mjs to E:; run
verify-postgres-sync-rehearsal.mjs on hosted rows.5 synthetic phases/866 actual
query-result assertions/two whole publication rollback cases PASS; actual Store
read/canonical/private evidence/history/source health parity.350 full tests plus10
focused/lint/typecheck/build PASS. Outer ROLLBACK restores revision0/other78 empty.
Native single fixture connection is NOT real connected concurrent driver proof;
runtime-role/review auth/isolated restore and future proof/module payload history
remain OPEN. See phase/handoff for exact connected-contract next step.

Bounded read transport preparation now available in postgresSyncTransport. It
lowers only existing static private SELECTs into materialized server-side byte/
row guards before payload transport; retains the limited FOR UPDATE query and
strict explicit text/OID decoding. No SDK/credential/runtime grant or route mount.
Native90 assertions PASS (Unicode/exact boundary/1.2 MB single field/locked head/
safe bigint/bool), followed by verified revision0/all78 noncontrol owners empty.
Generate an E-drive fixture with:
`node tests/sql/build-postgres-transport-rehearsal.mjs E:/SkyGuideAssets/research/postgres-rehearsal-2026-10-07/postgres-transport-fixture.sql`.
Run only in approved isolated dev; it inserts synthetic rows within BEGIN/ROLLBACK,
creates no objects/roles/grants.135076 bytes, SHA256
539085dac77f5127ccc37eadea60bcc1a7a9ff03c44a835a74f243e5bc20f4e2.
7 focused/357 full tests/lint/typecheck/build PASS. DataRow payload budget is not DB
work/protocol metadata/SDK cancellation proof; bool text estimates are conservative.
Actual lost-COMMIT acknowledgement needs durable witness reconciliation, not a
blanket rollback assumption; contract/privilege/Auth/rollback proposal in active
phase remains unmounted. No actual parallel session/backup-restore acceptance.

Runtime privilege review generator now available:
`node tests/sql/build-runtime-privilege-proposal.mjs <native-inventory.json> <E-review-directory>`.
It validates pinned79-table/27-function/143-trigger metadata against the11 current
migrations and emits scoped grant/revoke/preflight, never executes SQL. Native
read-only preflight PASS;5 focused/362 full tests/lint/typecheck/build PASS.
Actual roles/policies/grants NOT APPLIED; dev-specific authorization requested.
2 NOLOGIN role groups,193 RLS policies;5 helper EXECUTE only writer.4 invoker-lock
columns get proposed UPDATE USING(true)/WITH CHECK(false), actual UPDATE rejected;
effective ACL/RLS/lock/rollback proof must follow authorization. No SDK/password/
membership/Auth/consumer change. Column revoke is required in addition to table
revoke; no PUBLIC denial inferred from explicit role REVOKE. See phase/handoff.

Portable postgresTransactionKernel now implements SqlDatabase lifecycle over a
raw-text protocol port; no SDK/connect/credentials/role application. Driver-owned
BEGIN/isolation/local timeouts/COMMIT/ROLLBACK and static callback statement gate
retain read lowering, exact CAS bool, empty DML results and configured bounds.
Absorbed errors/pending or overlapping queries forbid COMMIT; timed-out/uncertain
leases are discarded and late work cannot reuse callback connections. Confirmed
COMMIT survives failed release; unknown COMMIT ACK stays indeterminate. Synthetic
protocol tests cover complete5-phase Store sequence and injected failure/deadline
cases; fixture frames are installed at CAS, not actual DML execution. Prior native
SQL receipts remain separate. Actual SDK/pool exclusivity/abort/drain/concurrent
sessions/role/restore acceptance is OPEN. Unchanged SourceSync catches Store errors
as rejected; outward fence/durable intent/quarantine/fresh immutable-witness
reconciliation must precede mount. See active phase for exact next action.
14 kernel tests included in376 full tests/lint/typecheck/build/catalog1808/scaffold
PASS; existing Router/chunk warnings unchanged. Test log retained on E: only.
