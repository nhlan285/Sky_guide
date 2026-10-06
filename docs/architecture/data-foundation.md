# R1 data foundation — contract review package

Status2026-10-07: **LOCAL CONTRACT APPROVED** by user2026-10-06 after maintainer
REQUEST CHANGES remediation.46 domain/296 full tests and lint/typecheck/build PASS
locally. Re-review gate closed. Supabase Free development project is created;
current SQL scope/status lives in [provider phase](../plan/POSTGRES_PROVIDER_SELECTION.md).
Resource creation alone does not certify migration or foundation acceptance.

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
| acquisition_option (item_id, option_id) / acquisition_cost (item_id, option_id, position) | Item-scoped identity, item FK; preserve optional node/product references, nullable amount, known/unknown/free and raw currency | AcquisitionOption/CurrencyAmount |
| spirit (id), season (id), location (id), realm (id FK location) | Realm is typed Location subtype with unchanged ID; spirit.realm_id targets Realm, graph spiritLocation targets same Location ID | Spirit/Season/Realm; GuideMap separately owned |
| item_season, item_spirit, spirit_season | Composite join PKs, active FK targets in published projection | Existing arrays |
| cosmetic (id) | Unique item_id FK, metadata only; wardrobe bindings remain separately revisioned | Item cosmetic metadata |
| event (id) | Typed event metadata and confidence; future R3 payload validation | Q23 |
| event_rule (id) | Required event_id FK; revisioned IANA timezone/anchor/offset/interval/effective bounds, calculated method/input versions | R3; not implemented in R1 |
| event_override (id) | Required event_id; optional rule_id must belong to same event; private reviewer/evidence separate; effective bounds/priority | R3 |
| event_occurrence (id) | event/rule/override must agree; if both rule and override selected, override's optional rule must match selected rule; pinned revisions/time/version | R3 |
| source_snapshot (id), canonical_generation, source_health (source_id) | Content/candidate audit hashes and fetched/staged/reviewed/promoted times; global revision/LKG/lastPromotedAt; separate source attempt/success/health/retry/validity; private reviewer/raw refs | R1 local sync / live adapter pending |
| media (id) | storage key/hash/bytes/MIME, revision/source/provenance/rights; no owner/semantic role or binary/blob/base64 | MediaRecord |
| item_media, emote_media, call_media, sample_media | Explicit typed joins; role part of binding, partial unique primary item image; role evidence before publication | R2/R4/R5 |
| sample_set (id), instrument (id) | Instrument unique item_id; sample_set_id required; variants share set | R5; no second Item catalogue |
| emote (id), call (id) | Unique item_id; preview relation points to media with poster/video/audio metadata | R4 |
| alias (kind, from_id), tombstone (kind, id) | Same-kind active final target, acyclic aliases; retired identity retained, replacement agrees with alias | Identity graph |

All FK updates/deletes use RESTRICT. Retire through a reviewed transaction; do not
cascade-delete history. Use composite kind FKs/check constraints for subtype
identity, unique constraints for one-to-one extensions and join keys. SQL adapter
must enforce these constraints plus transaction revision checks. Graph validation
tests the provider-neutral rules. Private identity/provenance/crosswalk and
alias/tombstone SQL up/rollback-only fixtures PASS on Supabase Free dev; full
typed schema/up/down/backup restore and production-sized graph validation OPEN.
Record content changes must increment revision, including changed relations and
field provenance. The graph checks identity metadata changes; payload checks and
transaction CAS belong to the repository adapter and must be tested in P9-I02.

Alias SQL preserves unknown alias-source IDs without fabricated identity metadata.
Targets have exactly one explicit same-kind identity or alias FK; generated to_id
retains the original alias target. Deferred graph validation checks chains/cycles,
active final identities and matching tombstones. Current full-scan advisory-lock
validation is rehearsed at READ COMMITTED only. Two-session races and stronger
isolation levels are NOT RUN; the adapter must establish/validate its isolation
contract and measured cost before live acceptance. RLS/private schema remain
closed to browser/platform roles; no least-privilege runtime role provisioned yet.

## Ownership decisions and field preservation inventory

**Acquisition identity: Option B.** `(item_id, option_id)` is the relational key;
option IDs may repeat across items, never within one item. Costs, evidence, offer
metadata and future joins carry both key columns. Keep the current public option
ID verbatim; `validateAcquisitionOptionKeys` checks this choice during staging.
The current K15 naming convention is not evidence of a global uniqueness rule.

`friendshipNodeId` and `iapProductId` remain exact nullable domain-ID columns with
deferred FK enforcement until their canonical typed modules exist. Do not drop,
guess, rename or null a supplied value because no table is provisioned. Keep
target-kind semantics explicit; future backfill resolves reviewed IDs before
activating FKs/public module support. Existing validators still require supplied
node/product registries; an unresolved candidate stays private/quarantined rather
than being published with a fabricated reference. Local tests preserve nonnull
IDs with synthetic supplied registries; no module or live DB is implied.

**Geography:** Realm is a Location subtype, not a renamed map or arbitrary area.
`location.location_type=realm`, with `realm.id` PK/FK to the same unchanged
Location ID. Spirit keeps public `realmId` and canonical `realm_id` targeting the
typed Realm; `realmLocationRef` maps only registered Realm IDs to the identity
graph's `spiritLocation`. Null remains null. An area Location cannot be substituted
silently. GuideMap has its own ID/table/realm FK; TypeScript shape inheritance is
not domain identity inheritance. Realm/map modules absent in current K15 retain
exact deferred references and remain gated until actual typed entities are reviewed.

[Executable ownership inventory](../../src/data/domain/migration.ts) covers every
actual K15 field, nested cost/time/offer/source fields and envelope/manifest metadata.
These are explicit future typed owners, not EAV persistence, DDL or an implemented
DB exporter. Field-coverage tests fail when a real payload adds an unmapped field;
canonical projection tests compare all current public values, including nulls.

| Public fields | Status / typed owner / preservation rule |
| --- | --- |
| Every item/spirit/season `id, updatedAt, fixture` | Columns: unchanged typed entity ID + domain_identity update/fixture |
| `recordStatus` | Column on typed entity; retain status, public only published |
| `provenanceIds, fieldProvenance` | Identity/field provenance joins with original ordered arrays, per-field evidence and absent-vs-present semantics |
| Every `name.default, name.translations` | Entity name_default + typed translation(locale,text) table; retain language keys, empty strings/maps |
| Item `sourceKeys` | item_source_key(label,value); registered Kxx keys also source-scoped crosswalk; tsaIdentifier is a retained label, not a new SourceId |
| Item `slot, rawSlot, accessoryAnchor, dyeStatus` | Typed item columns; null/unknown/unsupported distinct |
| Item `seasonIds, spiritIds` | Ordered item_season/item_spirit joins; do not conflate independent upstream arrays |
| Item `acquisitionOptions` and each option `id, kind, costStatus` | Composite option key, typed columns + original position |
| Option `costs`; each `currency, sourceCurrencyLabel, amount` | Composite-key cost rows/position; nullable integer amount, raw label, unknown != free != explicit zero |
| Option `friendshipNodeId, iapProductId` | Preserved deferred typed domain refs as above |
| Option `validFrom, validTo`; time `value, precision, timezone, rawLabel` | Typed nullable time columns; absent time distinguished from a present PartialTime with unknown precision/null members |
| Option `provenanceIds` | acquisition_provenance with both option key columns and position |
| Item `assetIds, dyeRegions, ruleIds, compatibility` | Future typed module fields, retained exactly; currently empty/null. Nonempty unsupported payload requires its reviewed validator/owner, never silently dropped or serialized as generic EAV |
| Lookup `id, upstreamId, identifier, category, categoryEvidence` | Item FK + typed item_k15 columns; metadata category independent of wearable slot |
| Lookup `offers`; offer `id, acquisition, seasonPass, bundle, money, sourceUrl` | acquisition_source_offer by composite option key; retain order/flags/link/raw money; unknown currency/market not invented or converted to CurrencyAmount |
| Lookup optional `image, images` | Future typed item_media/public compatibility projection; preserve optional/null distinction; no current K15 images claimed |
| Spirit `category, realmId` | spirit.category column; exact nullable/deferred Realm subtype ref |
| Spirit `seasonIds, treeIds` | Ordered spirit_season joins; future typed spirit_tree references retained |
| Season `kind, startsAt, endsAt, timeStatus, summary` | Typed season columns/time precision; kind retained, no inferred instant/schedule |
| Season `spiritIds, itemIds` | Ordered season_spirit/season_item joins; preserve source arrays independently of reverse item/spirit arrays |
| Season `realmIds, mapIds, officialArticleIds` | Future typed realm/map/article joins; exact ordered IDs retained, module support gated |
| Provenance `id, sourceId, sourceUrl, sourceRecordKey, sourceRevision` | Typed provenance/source-registry columns/FK; nullable public key/revision kept, no private evidence |
| Provenance `retrievedAt, observedAt, attribution, licenseNote, transformNote, verificationStatus` | Typed provenance columns; actual observation distinct from retrieval, original credit/risk notes preserved |
| Envelope `schemaVersion, dataVersion, generatedAt, sourceIds, fixture` | public_release columns + ordered release_source; fixture false for public |
| Envelope `records` | Derived typed projection in preserved source order; no generic canonical document store |
| Manifest `schemaVersion, catalogVersion, generatedAt, datasets, provenance` | public_release + release_dataset(path,dataVersion,exact-byte sha256); regenerated checksums after canonical serialization |
| Manifest `aliases, tombstones, assetManifestVersion` | Future reviewed release projection/media pin; current null kept, migration-bearing manifests still rejected by compatibility adapter |
| Manifest `source`; `repository, revision, normalizationVersion, sourcePaths, transport, status` | release_source_snapshot + ordered release_source_path(path,gitBlobSha), explicit public source schema |
| Manifest `importReport`; `accepted, rejected, excluded, unknownCategory, unknownCost` | Typed public import counters; current rejected=[] retained. Nonempty raw rejection report is private and needs a separate reviewed public schema |

Nothing in the current legitimate K15 payload is intentionally excluded. Unknown
operational/private fields are outside that schema and stripped. Join positions,
explicit nulls, optional field presence and PartialTime precision are round-trip
requirements for future DDL and DB export acceptance; no SQL rehearsal occurred.

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
The current ~1.8k-item K15 snapshot supports in-memory filtering/pagination.
A future PostgreSQL adapter should serve a materialized/versioned public read
model or cached equivalent, not rebuild/query the entire relational graph for
every HTTP request. Cache by committed catalog version, atomically replace the
read-model pointer after reviewed promotion, retain LKG/rollback and enforce
pagination version pins. Preserve the interface/API until measured query needs
justify another adapter contract; no speculative SQL pagination or new cache
service is introduced. Production invalidation/quota measurements remain gated.
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

Remediation decision: binary MediaRecord has no owner or semantic role.
MediaBinding uses `(ownerKind, ownerId, mediaId, role)` and nonempty role evidence
`provenanceIds`. Valid owners: itemImage/referenceImage→item, emoteVideo→emote,
callVideo/callAudio→call, musicSample→sampleSet. Poster explicitly permits only
item/emote/call; instrument artwork binds through its item, not an unrestricted
domain relation. The collection rejects duplicate bindings, two item primaries,
duplicate reference hashes, and one item's primary hash appearing as a reference.
One binary can serve different valid roles/owners. Binary rights remain separate.
This refines the already accepted typed joins; no live schema migration occurs.

`validateMediaRecord` validates hash/key/MIME/revision/source/provenance/rights;
`validateMediaBindings` validates role evidence, active owner/media references and
collection cardinality. Graph media edges represent deduplicated owner/media
topology; role/evidence live in the binding joins. New immutable keys use
media/<sha256>.<extension>; legacy keys
items/{thumbnails,cards,detail}/<sha256>.webp retain current /assets/items delivery
paths. Identity never uses a signed URL. Real binaries remain in object storage.

Verified publication requires approval of the current revision, public evidence
URL, public credit/provenance and fixture=false. Private evidence is excluded.
Caller supplies validated active owner IDs and reviewed public evidence URLs;
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

Compatibility: no deployed R2 consumer uses the unmounted R1 MediaRecord shape.
Existing item object keys and `/assets/items/...` routes remain unchanged. If a
future old role/relations reader is migrated, project one owner-specific binding
into `{role, relations:[{kind:ownerKind,id:ownerId}]}` at its compatibility boundary;
never persist one global binary role or reinterpret a signed URL as identity.
Binary IDs/hashes/keys are unchanged by binding migration. Legacy path and
revocation/signing-race tests pass; this is local compatibility, not live rollout.

### Review checklist

### Local sync contract subset (P9-D04/P9-V01)

Audit remediation decision: fetchedAt is successful source retrieval completion
supplied by the trusted backend; stagedAt is normalization/validation completion
from the server clock. Approval reviewedAt must follow stagedAt. Promotion time
comes from the server clock and must follow review. Public Freshness.lastSuccessAt
retains its API name but means the latest successful reviewed snapshot acceptance
(including same-content reconfirmation), not fetch time. lastAttemptAt is the
latest completed source-attempt event: fetchedAt on success, failure completion
time on error. Source health/retry state is independent of the global generation.
Global lastPromotedAt records the latest reviewed acceptance across all sources;
source failures retain it. It prevents a different source/clock from regressing
canonical audit time. Source Freshness.lastSuccessAt remains independently scoped.
Ordering: fetchedAt <= stagedAt <= reviewedAt <= promotion time. Stale attempts
or a clock behind previously accepted success cannot regress state.

ReviewApproval binds contentHash/baseRevision plus candidateHash over content,
base and fetched/staged timestamps; changing audit instants also invalidates
review. An exact already-accepted retry is read-only/idempotent. New same-content
reconfirmation needs a valid new review and CAS; it updates health/audit without
changing public bytes. ReviewerRef/approval remain private. Future admin adapters
must obtain authenticated reviewer identity and event times server-side; these
library contracts do not authorize client-supplied review/clock values. Injected
clocks are for deterministic tests, not an HTTP timestamp override.

`stageSourceSnapshot` enforces an explicit byte budget, hashes source and normalized
content, validates graph/projection consistency and quarantines invalid output.
Local acceptance budgets are required configuration: maxSnapshotBytes (raw UTF-8),
maxNormalizedBytes (entire accepted candidate JSON with file Map encoded as entries,
including graph/manifest/file contents and stage metadata), maxRecords (graph identities/crosswalks/
aliases/tombstones/provenance IDs plus public-envelope records), maxRelations
(graph edges). Check cheap counts and public bytes before parsing, then full size
before and after canonicalization; promotion rechecks the same bounds. These are
local safeguards, not measured production capacity or provider quota. Fixture
values are test-only. They cannot prevent allocation/CPU inside a normalizer;
future live workers require separately bounded execution/task approval.
It does not fetch, schedule, persist raw data or publish. `ReviewApproval` binds
the exact content digest and base generation; edits invalidate approval.
`promoteReviewedSnapshot` validates again and uses an injected atomic CAS store.
Generation/LKG/lastPromotedAt/last canonical approval must be global across sources,
with separate source health/attempt/success/retry; a
per-source CAS cannot safely protect shared canonical data. The DB adapter must
persist canonical payload, projection pointer and audit metadata in one transaction.
That adapter is still gated; only an in-memory test double has run.

Failure records leave LKG untouched, record offline health and use only explicitly
supplied retry delays; exhausted policy disables retry. Identical reviewed data
recovers health without re-promoting content. Source freshness and review metadata
remain separate. Local export/restore revalidates checksums and preserves API
payloads; this is not a SQL migration or DB backup-restore rehearsal. Current
revocation overlay remains mandatory at delivery after any restore.

Synthetic two-source tests cover independent retry budgets/health, global CAS
conflicts, loser restaging, one source's recovery leaving another offline, and
global promotion-clock regression. K01 is a synthetic trigger over the supported
K15 compatibility projection; this does not implement a Wiki adapter, scheduler
or actual multi-source PostgreSQL sync. Future DB transactions must retain an
append-only private audit history, not merely the latest pointer/approval tested
by the in-memory store.

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
