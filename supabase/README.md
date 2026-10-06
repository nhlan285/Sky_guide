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

This migration contains identity/provenance/crosswalk reservations only. Alias/
tombstone consistency, revision checks for changed entity relations/provenance,
typed entity payloads, canonical promotion/CAS, projection read adapter and actual
PostgreSQL backup/restore are subsequent slices. The existing TypeScript domain
validators remain required; database constraints supplement them.

RLS is enabled without policies intentionally: canonical writes/read projection
are server-only and no runtime DB role has been provisioned. The table owner runs
the rehearsal. The future least-privilege server role needs a separate reviewed
grant/policy contract. Do not grant a browser/platform role access to silence the
advisor's INFO notice. FK indexes retained despite unused-index INFO on empty DB.
