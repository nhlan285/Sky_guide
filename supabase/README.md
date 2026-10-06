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

Six applied migrations cover identity/provenance/crosswalk reservations,
alias/tombstone consistency, evidence-TRUNCATE protection and typed K15 payloads/
fraction-precision correction plus private release metadata/membership.
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
is not sealed/promoted history: root reservations immutable, child editing still
requires the future promotion contract. SQL does not itself calculate checksums.

Revision checks for changed entity relations/provenance, immutable historical
projection and canonical promotion/CAS, projection read adapter and actual
PostgreSQL backup/restore are subsequent slices. The existing TypeScript domain
validators remain required; database constraints supplement them.

RLS is enabled without policies intentionally: canonical writes/read projection
are server-only and no runtime DB role has been provisioned. The table owner runs
the rehearsal. The future least-privilege server role needs a separate reviewed
grant/policy contract. Do not grant a browser/platform role access to silence the
advisor's INFO notice. FK indexes retained despite unused-index INFO on empty DB.
