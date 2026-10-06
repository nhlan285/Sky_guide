# R1 — portable data and storage foundation

## Goal / scope

Maintainer verdict2026-10-06: **REQUEST CHANGES — architecture direction accepted,
contract not yet approved for P9-I02**. Active work is
[R1 contract remediation](R1_CONTRACT_REMEDIATION.md), preserving completed slices.

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
  Contract milestones passed; latest master-run full274 PASS atc53a111. This is
  local validation, not provider/schema review or live migration acceptance.
- [x] Checkpoint drill commit/push/remote verification; continue next safe slice.
- [x] D04/V01 local contract subset: synthetic staging/quarantine/review digest,
  atomic compare-and-swap promotion, bounded retry/health/LKG and snapshot restore.
  This follows the master-run instruction to implement provider-independent
  contracts/tests while provisioning is gated. It does not satisfy I02 dependencies
  for real integration, nor mark D04/V01 DONE; no scheduler or source fetch.
- [x] Record provider/review gates and audit remaining independent work.
  Concrete contracts delivered; maintainer review question remains pending.

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
DB up/down/restore against real PostgreSQL is NOT RUN until provider/environment
approval. Contract tests cannot establish live DB completion.

## Blockers / decisions / exact next step

P9-I02 requires maintainer schema/API review, provider selection and quota/task
approval. No provider chosen. P9-D04/P9-V01 real integration depends on I02;
R2–R6 retain their foundation/checkpoint dependencies. D01–D03/I01 local contracts
and the bounded synthetic D04/V01 subset above are already implemented and
checkpointed; do not restart them. Exact next action: maintainer reviews
[relational/API/storage contracts](../architecture/data-foundation.md), domain
interfaces and tests. After review, compare approved provider options and quotas;
obtain provider/task approval before provisioning I02. The pending review question
has no answer. No live DB/migration/integration acceptance can be claimed.

## Handoff / compact

Read [CURRENT_STATE](../CURRENT_STATE.md) for latest commit/checks and gates.
Branch `codex/master-plan-execution`; checkpoint60cdc36 was verified pushed before
this documentation correction. Scaffold:71 Markdown files/173 unique tasks PASS;
pnpm10.30.3. Domain implementations remain unmounted from production consumers;
no provider resource is provisioned. Latest full274 tests/lint/typecheck/catalog/
build PASS atc53a111; this docs-only correction does not rerun runtime checks.
Checkpoint drill: PASS — `199bdd58c37b848b6b550b1adfdb7e7e70a5f791` committed,
pushed and verified with ls-remote; work continued with D02/D03 and later slices.
Native compaction has since resumed from verified checkpoints; no agent-invokable
manual compaction or quota restoration is claimed. Q12/K04/rights remain separate
gates; the roadmap is OPEN.
