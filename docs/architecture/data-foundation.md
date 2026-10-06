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

### Read API and snapshot adapter

`DomainRepository.readCatalog()` returns one validated public snapshot or null.
`createSnapshotRepository` verifies the supplied manifest's dataset bytes before
using existing K15 parsers. It rejects draft/fixture/unverified provenance and
returns detached copies. This compatibility adapter supports the existing K15
release only; migration-bearing manifests require a reviewed canonical adapter.
It performs no filesystem/network reads. Callers supply approved manifest files.

Remediation: only items/lookup/spirits/seasons plus provenance are accepted; unknown
datasets, unreferenced files and colliding dataset paths fail closed.
`canonicalizeSnapshotFiles` serializes explicit envelopes and validator-returned
records with stable object keys, retaining original record order and legitimate
K15 fields. Hashes are regenerated from those exact bytes. Staging stores this
canonical projection; promotion revalidates and rejects a noncanonical/edited
projection even if parsing would strip the extra fields. Original caller JSON is
never promoted. Source/record verification still cannot prove arbitrary strings
inside declared public fields are safe; reviewed public provenance remains required.

`createDomainApi` is an unmounted Web Request/Response handler:

| Endpoint | Contract |
|---|---|
| GET /api/items | q/slot/season/spirit, limit 1–100, offset; stable ID sort |
| GET /api/items/:id | Allowlisted Item payload, original costs/nulls |
| GET /api/spirits | q/season, same pagination |
| GET /api/spirits/:id | Allowlisted Spirit payload |
| GET /api/events/* | 503 source_unavailable until R3 has verified schedules |

Envelope: schemaVersion, catalogVersion, generatedAt, serverTime, freshness,
allowlisted provenance, data; lists add page offset/limit/total/nextOffset. First
page captures catalogVersion; later offsets require that version. Snapshot changed
→ 409 version_mismatch, restart pagination. Invalid/duplicate query → 400; missing
record → 404; provider/validation failure or no snapshot → 503; non-GET → 405.
No raw error/SQL/credentials are exposed. The adapter owns validation; a future DB
adapter must pass identical contract/parity tests. Fixture substitution is not
proof of a working DB adapter.

Cache-Control remains no-store pending measured quota/TTL policy. Missing validity
or expired validity produces stale; offline keeps LKG payload with its label. No
per-second request loop is introduced. The actual event response contract reserves
absolute timestamps, IANA LA timezone, source type/confidence and scheduleVersion;
R1 does not fabricate occurrences. Frontend migration/routes remain gated.

### Media metadata and delivery

`validateMediaRecord` validates hash/key/MIME/role/revision/source/provenance and
typed relation IDs. New immutable keys use media/<sha256>.<extension>; legacy keys
items/{thumbnails,cards,detail}/<sha256>.webp retain current /assets/items delivery
paths. Identity never uses a signed URL. Real binaries remain in object storage.

Verified publication requires approval of the current revision, public evidence
URL, public credit/provenance and fixture=false. Private evidence is excluded.
Caller supplies validated active relation IDs and reviewed public evidence URLs;
the validator cannot establish legal permission from the URL itself.
`publicMedia` applies the current revoked ID/hash overlay even on older snapshots.
`ObjectStorage.resolveDelivery` hides signing/provider SDKs and credentials;
`resolveMediaDelivery` checks the current ledger before and after resolution,
rejects expired/unsafe URLs and fails closed when storage/ledger is unavailable.

This does not retrofit enforcement into the deployed R2 signer. Already-issued
signed URLs may remain usable until expiry; the production adapter must define
bounded expiry and a tested purge/deny mechanism before rights-sensitive rollout.
R1 no-store applies to its response contract; actual provider caches and old
clients require deployment acceptance in P9-I02/P9-V01. Audio identity is retained
for Call; media playback/transcoding belongs to R4, not this contract slice.

### Review checklist

### Local sync contract subset (P9-D04/P9-V01)

`stageSourceSnapshot` enforces an explicit byte budget, hashes source and normalized
content, validates graph/projection consistency and quarantines invalid output.
It does not fetch, schedule, persist raw data or publish. `ReviewApproval` binds
the exact content digest and base generation; edits invalidate approval.
`promoteReviewedSnapshot` validates again and uses an injected atomic CAS store.
Generation/LKG must be global across sources, with separate source health; a
per-source CAS cannot safely protect shared canonical data. The DB adapter must
persist canonical payload, projection pointer and audit metadata in one transaction.
That adapter is still gated; only an in-memory test double has run.

Failure records leave LKG untouched, record offline health and use only explicitly
supplied retry delays; exhausted policy disables retry. Identical reviewed data
recovers health without re-promoting content. Source freshness and review metadata
remain separate. Local export/restore revalidates checksums and preserves API
payloads; this is not a SQL migration or DB backup-restore rehearsal. Current
revocation overlay remains mandatory at delivery after any restore.

No full generic canonical payload/storage adapter or live upstream integration is
claimed. K15 snapshot compatibility remains scoped; unsupported migration manifests
are rejected. SQL up/down, durable transactions, provider failure injection and
live restore are still P9-I02/P9-V01 acceptance gates.

- Review table/cardinality mapping and API/media contracts, including private
  export, revocations, version pinning and inactive future modules.
- Choose provider after current free-tier quota/terms comparison; approve exact
  development resource/task and migration environment. No credentials requested
  until the chosen provisioning workflow needs them.
- P9-I02: actual SQL migration/adapters, concurrency and up/down rehearsal OPEN.
- P9-D04: sync/promotion/LKG integration depends on that transactional adapter.
- P9-V01: full foundation/backup restore acceptance remains OPEN until above.
- R2–R6 cannot be called complete from synthetic contract tests.
