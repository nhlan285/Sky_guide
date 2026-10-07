# R1 — portable data and storage foundation

## Goal / scope

Historical maintainer verdict2026-10-06: **REQUEST CHANGES — architecture direction accepted,
contract not yet approved for P9-I02**. Active work is
[R1 contract remediation](R1_CONTRACT_REMEDIATION.md), preserving completed slices.
Remediation2026-10-06: **LOCAL CONTRACT REVIEW READY**. All requested local findings
addressed;46 domain/296 full tests, pnpm lint/typecheck/build PASS.
User approval2026-10-06: `phê duyệt, tự tiếp tục`. **R1 LOCAL CONTRACT APPROVED**;
re-review gate closed by human approval, not self-approval. Active next slice is
[provider selection](POSTGRES_PROVIDER_SELECTION.md). Exact provider/account/
region and resource/task quota preflight were subsequently completed: Supabase
Free/Dyland's Org/isolated Singapore `sky-guide-dev`; private identity SQL subset
applied/fixture-tested. Full payload/adapter/restore acceptance remains OPEN.

LARGE/ARCHITECTURAL master run; current slice P9-D01–D03 + P9-I01.
Turn Q20 into reviewable relational mapping, executable identity/relationship
validation, provider-neutral read API and media delivery contracts. Preserve K15
IDs, existing catalog validators, unknown/free semantics and R2 routes.
No provisioning, real-data migration, new acquisition, UI redesign or deployment.

## Dependencies / current state

R0 baseline `8b371de6a2b852e3175a55b5f8de2b9cc11d8b54` is clean and pushed as
`codex/roadmap-data-event-media-refresh`. Remote main already points to that commit
at preflight; this run did not merge it. Execution branch:
`codex/master-plan-execution`, pushed and remotely verified at the same baseline.
Existing P2 typed validators and K15 catalog loader remain authoritative for entity
payloads. Relational identity validation supplements them, never replaces them.

## Prior decisions / contracts / expected files

Q20 canonical relational data, Q21 role-based media, Q22 shared preview/Music,
Q23 event rules/LA time; Q15 provider/quota approval remains required.
`src/data/domain/` holds identity and public access contracts; entity payloads
remain in `src/data/catalog/`. `docs/architecture/data-foundation.md` maps tables
and migration/rollback. `tests/data/domain*.test.mjs` covers synthetic contracts.
No binary files or credentials in domain data. Public export is allowlisted.

## Steps and acceptance

- [x] Locate, validate and push R0; create/push one execution branch.
- [x] D01: relational mapping and identity graph validation: composite identity,
  revisions, scoped crosswalks, FK cardinalities, aliases/tombstones, provenance.
- [x] D02 contract slice: injected snapshot repository + request handler contracts for item and
  spirit lists/details; explicit unavailable event endpoint until R3. Pagination,
  filter, version mismatch, errors, unknown values and no private-field spread.
- [x] D03 contract slice: AssetRegistry metadata/delivery interface, hash/key/rights/relations,
  public evidence allowlist and revocation overlay; preserve existing R2 paths.
- [x] I01: backup/restore/migration/rollback/quota runbook and review checklist.
- [x] Focused tests, lint/typecheck/catalog/build and docs checks; inspect diff.
  Remediated contracts passed; latest master-run full296 PASS atc5804c6. This is
  local validation, not provider/schema review or live migration acceptance.
- [x] Checkpoint drill commit/push/remote verification; continue next safe slice.
- [x] D04/V01 local contract subset: synthetic staging/quarantine/review digest,
  atomic compare-and-swap promotion, bounded retry/health/LKG and snapshot restore.
  This follows the master-run instruction to implement provider-independent
  contracts/tests while provisioning is gated. It does not satisfy I02 dependencies
  for real integration, nor mark D04/V01 DONE; no scheduler or source fetch.
- [x] Record provider/review gates and audit remaining independent work.
  Maintainer REQUEST CHANGES addressed locally; user subsequently approved R1.

## Risks / UX / security

No production consumer changes. Missing provider/source gives unavailable, not an
empty successful dataset. Unknown price/date stays null. Version pins prevent
mixing snapshots between pages. Fixture/draft/private evidence never exports.
Restoring older snapshots must apply current revocations before public delivery.
No guessed TTL: unmeasured API responses use no-store until a verified policy.
Event response shape is reserved; schedule generation belongs to R3.

## Validation

`node --test tests/data/domain*.test.mjs`; `pnpm lint`; `pnpm typecheck`;
`pnpm test`; `pnpm build`; `.commands/Check-Scaffold.ps1`; `git diff --check`.
Approved dev SQL up and rollback-only native fixtures PASS. Actual down/backup/
isolated restore remain OPEN; contract tests cannot establish full live completion.

## Blockers / decisions / exact next step

P9-I02 contract review/provider selection/preflight now approved/completed.
Supabase Free dev project created; first private identity/provenance/crosswalk
migration and hosted fixture validation PASS; details in POSTGRES_PROVIDER_SELECTION.
P9-D04/P9-V01 real integration depends on remaining I02 payload/adapter/restore;
R2–R6 retain their foundation/checkpoint dependencies. D01–D03/I01 local contracts
and the bounded synthetic D04/V01 subset above are already implemented and
checkpointed and locally remediated; do not restart them or ask for R1 approval
again. Public quota comparison and proposal now in POSTGRES_PROVIDER_SELECTION;
Typed release/source metadata and ordered membership now PASS locally on full K15
canonical bytes and hosted rollback-only fixtures. Immutable derived byte projection
now retains historical public release after current payload mutation and seals child
metadata. SQL metadata CAS/private acceptance-audit/global pointer and source health
now pass native fixtures; this is not complete reviewed canonical promotion/SyncStore.
Immutable full identity graph/ordered candidate evidence metadata now PASS:27 typed
history owners/all20 relations, full K15 content/review hash parity and141 native
negative cases. Historical graph metadata does not imply full module/provenance
payload history. Full SyncState row read composition now PASS with explicit
historical manifest dataset key order; existing content/review hash unchanged.
Typed payload evidence prerequisite PASS: canonical identity evidence and exact public record subset/order have distinct typed owners;13 native negatives/actual review byte parity. Canonical payload preparation/static parameterized SQL now PASS; retention/own revisions/private evidence plus two native injected rollbacks/idempotence/history parity. Portable full SyncStore atomic orchestration now PASS; exact SourceSync transitions/current alignment/whole publication SQL and866 query results/two rollbacks. Exact next: connected driver/runtime least-privilege/review-auth contract,
then real races/provider parity/backup restore.
No complete live foundation
acceptance. Independent W12 sequence and focus QA completed; full W12 remains
PARTIAL until W11 dependencies.

## Handoff / compact

Read [CURRENT_STATE](../CURRENT_STATE.md) for latest commit/checks and gates.
Branch `codex/master-plan-execution`; checkpointdd7fb11 verified pushed before the
release metadata slice. Supabase Free dev in Dyland's Org is provisioned;44 private
tables at that milestone; now79 private tables with no platform grants. Domain
implementations remain unmounted from production consumers. Latest350 full tests/
lint/typecheck/build PASS;7 read composition tests/11 native negatives plus5 graph history tests/141 native
negatives/actual two-frame parity PASS; prior lifecycle metadata/source isolation/
projection byte checks retained. Intentional revision0 control baseline, other tables empty. Existing
Router/chunk warnings unchanged. See handoff for exact
latest checkpoint, migration hashes and open live adapter/restore gates.
Checkpoint drill: PASS — `199bdd58c37b848b6b550b1adfdb7e7e70a5f791` committed,
pushed and verified with ls-remote; work continued with D02/D03 and later slices.
Native compaction has since resumed from verified checkpoints; no agent-invokable
manual compaction or quota restoration is claimed. Q12/K04/rights remain separate
gates; the roadmap is OPEN.
