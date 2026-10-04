# R1 data foundation — contract review package

Status: implementation contract candidate for P9-D01–D03/P9-I01. Q20 approves
the direction; maintainer review is still required before P9-I02. This document
does not select a provider, provision PostgreSQL, or certify a migration.

## Relational mapping

Use explicit typed tables, not a generic JSON document/EAV store. The identity
graph in `src/data/domain/identity.ts` is a validation view over these keys and
relations, never the canonical payload or a substitute for entity validation.

| Table / key | Relationships and constraints | Existing payload contract |
|---|---|---|
| domain_identity (kind, id) | Global kind-scoped ID reservation; positive revision/schema_version, updated_at, retired_at, fixture. No hard delete/reuse. | Identity graph |
| source_registry (id) | Only verified KB entries; no invented K numbers | Existing SourceId registry |
| provenance (id) | source_id FK; source revision/URL/retrieval/verification/attribution; public fields separate from private evidence | SourceRecord |
| identity_provenance (kind, id, provenance_id) | Composite identity FK + provenance FK; real identity requires evidence | DomainMetadata |
| field_provenance (kind, id, field, provenance_id) | Field allowlist from entity schema; source evidence may differ per field | Existing FieldProvenance validators |
| source_crosswalk (source_id, kind, source_key) | Unique scoped external key → identity FK; immutable mapping; source numeric IDs never joined across providers | Crosswalk |
| item (id) | Preserve tsa-cosmetic-N; source_keys mapped into crosswalk; typed name/slot/raw_slot/dye state | Item |
| acquisition_option (id) / acquisition_cost (option_id, position) | item FK; nullable integer amount, explicit known/unknown/free, currency label; never collapse missing to zero | AcquisitionOption/CurrencyAmount |
| spirit (id), season (id), location (id) | Spirit optional location FK; unknown date uses precision/timezone fields without fabricated instant | Spirit/Season/Map/Realm |
| item_season, item_spirit, spirit_season | Composite join PKs, active FK targets in published projection | Existing arrays |
| cosmetic (id) | Unique item_id FK, metadata only; wardrobe bindings remain separately revisioned | Item cosmetic metadata |
| event (id) | Typed event metadata and confidence; future R3 payload validation | Q23 |
| event_rule (id) | Required event_id FK; revisioned IANA timezone/anchor/offset/interval/effective bounds, calculated method/input versions | R3; not implemented in R1 |
| event_override (id) | Required event_id; optional rule_id must belong to same event; private reviewer/evidence separate; effective bounds/priority | R3 |
| event_occurrence (id) | event/rule/override must agree; pinned revisions, absolute instants and schedule version | R3 |
| source_snapshot (id), source_health (source_id) | Hash, normalized version, private raw reference; separate last_attempt/last_success/validity/LKG; never public raw data | R1 sync / R3 pending |
| media (id) | storage key/hash/bytes/MIME, revision, role/provenance/rights; no binary/blob/base64 | AssetRegistry |
| item_media, emote_media, call_media, sample_media | Explicit typed joins; role part of binding, partial unique primary item image; role evidence before publication | R2/R4/R5 |
| sample_set (id), instrument (id) | Instrument unique item_id; sample_set_id required; variants share set | R5; no second Item catalogue |
| emote (id), call (id) | Unique item_id; preview relation points to media with poster/video/audio metadata | R4 |
| alias (kind, from_id), tombstone (kind, id) | Same-kind active final target, acyclic aliases; retired identity retained, replacement agrees with alias | Identity graph |

All FK updates/deletes use RESTRICT. Retire through a reviewed transaction; do not
cascade-delete history. Use composite kind FKs/check constraints for subtype
identity, unique constraints for one-to-one extensions and join keys. SQL adapter
must enforce these constraints plus transaction revision checks. Graph validation
tests the provider-neutral rules; PostgreSQL constraints/up/down are not yet run.
Record content changes must increment revision, including changed relations and
field provenance. The graph checks identity metadata changes; payload checks and
transaction CAS belong to the repository adapter and must be tested in P9-I02.

## Migration sequence and preservation

1. Inventory immutable catalog manifest/version/hash and existing K15 validators.
   Export every source dataset plus aliases, tombstones and current revocation
   ledger; capture row counts and checksums. Raw/private evidence stays outside Git.
2. Review additive DDL and provider-independent transaction API before applying it.
   Pin schema version; retain old public reader/projection through cutover.
3. Restore that backup into an isolated approved environment first. Verify counts,
   FKs, per-field provenance, unknown/free prices, date precision and rights denial.
4. Backfill a small synthetic set, then reviewed K15 data. Copy IDs verbatim; use
   source_crosswalk for other sources. No name/fuzzy/numeric-ID merge. Quarantine
   collisions with a report; never silently drop failed records.
5. Compare canonical → public export to current K15 payloads (including nulls),
   require provider-swap API parity and monotonic revisions. Reviewed promotion
   commits data + projection version atomically. Failures retain Last Known Good.
6. Roll out read facade only after validation/review. Existing frontend loader and
   R2 route remain usable until explicit consumer migration; no dual writers.

## Restore / rollback / scaling runbook (P9-I01)

Before an operation record provider/plan/region, approval reference, backup ID,
schema/catalog/media versions, checksums, operation owner and rollback trigger.
Preflight storage available for DB plus backup and restore, request/operation
limits, connection cap, egress, CPU/RAM/IOPS and concurrency. Do not invent free
tier quotas. Collect current provider documentation at selection time.

Restore rehearsal must use an isolated environment and a read-only candidate
until row/FK/checksum/alias/revision checks and API contract parity pass. Compare
source and restored null/unknown/free values. Reapply the **latest** revocation
ledger to restored data and invalidate manifests/delivery caches before serving.
An older backup is never authority to restore withdrawn rights.

On a failed migration, abort the transaction and retain the prior published
pointer. After cutover, point readers to the last safe code/schema/projection
bundle, with current revocations overlaid; retain failed candidate for private
diagnosis. Do not run destructive down migrations on production by default.
Down migration must be rehearsed on the isolated copy and inspected for data loss.
If schema compatibility or rights cannot be guaranteed, serve unavailable.

Measure DB bytes/growth, query p50/p95, connections, CPU/RAM/IOPS, egress, cache
hit ratio and API latency. Set warning/cutover thresholds only after measurement
and approved service quota. Query indexes start with stable PK/FKs, crosswalk
lookup and published-version pagination; use EXPLAIN on actual queries before
adding speculative indexes. Scaling target may be a larger managed PostgreSQL or
Sky Guide PostgreSQL server; preserve repository/API contracts and export format.

## Review and remaining gates

- Review table/cardinality mapping and API/media contracts, including private
  export, revocations, version pinning and inactive future modules.
- Choose provider after current free-tier quota/terms comparison; approve exact
  development resource/task and migration environment. No credentials requested
  until the chosen provisioning workflow needs them.
- P9-I02: actual SQL migration/adapters, concurrency and up/down rehearsal OPEN.
- P9-D04: sync/promotion/LKG integration depends on that transactional adapter.
- P9-V01: full foundation/backup restore acceptance remains OPEN until above.
- R2–R6 cannot be called complete from synthetic contract tests.
