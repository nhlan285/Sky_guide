# P9-I02 — provider selection and development rehearsal

## Goal / approval / dependencies
LARGE infrastructure slice. On2026-10-06 the user approved R1 with
`phê duyệt, tự tiếp tục`. R1 contract re-review gate is CLOSED for the locally
remediated package atb2fc0cb; this is not live foundation acceptance.
P9-D01/D02/D03/I01 contract decisions remain intact. P9-I02 first requires a
current provider/quota comparison and an identified development environment.
No provider/account/region was named in the approval. Provider selection remains
an explicit Q15 decision; do not interpret R1 approval as choosing an account.

## Scope / non-goals / contracts
Public plan audit and concrete dev-resource proposal now; after provider/task
approval, account-specific quota/cost preflight, portable DDL/adapter and isolated
fixture migration/restore rehearsal. Preserve provider-neutral PostgreSQL typed
tables, server-only access, public projection/API/CAS/LKG/private audit and current
R2 binary storage. No auth/realtime/ORM/provider SDK in the frontend. No scheduler,
production change, paid plan/add-on, credential collection or source publication.
No DDL executed or migration authored in this selection-only slice.

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
as authorization. No provider connector/account/credential read performed.

## Local workload measurement / limits
Existing checked-in K15 public projection tsa-v1-74007cf878ef: five manifest files
total3,104,820 UTF-8 bytes. Counts: items1808, lookup1808, spirits213, seasons30,
provenance244. Measurement/cache report on E: k15-size.json alongside the audit.
This is JSON byte size only: not SQL table/index/WAL/history size, traffic/egress
estimate, compute benchmark or proof the completed domain fits a free tier.
Initial audit script incorrectly counted sourceIds arrays; corrected to report
each named array and verified records counts before documenting them.
Binary media remains on existing R2; do not adopt either provider's storage quota.

## Recommendation / reviewable resource proposal
**PROPOSED: Neon Free for the isolated development rehearsal**, because the
current metadata allowance and included branches/history support dev/restore
experiments without introducing unused auth/storage services. This is an
engineering inference from the comparison, not a final provider decision.
Supabase Free remains valid if the maintainer prefers the already connected
management workflow; it needs manual backups and pause-aware recovery.

Proposed task: one new `sky-guide-dev` Free project in the maintainer's selected
account/organization, one primary database and at most one isolated restore
branch, no paid option. Account and region still UNSELECTED. Region should match
the actual Vercel function region where feasible; do not infer from user timezone.
Keep existing deployment consumers disconnected throughout rehearsal. Use
fixture-only inputs first, no real-data import until reviewed migration parity.

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

## Acceptance / validation / handoff
Selection subset: dated official evidence, alternatives, budget constraints,
measured current artifact size and exact proposal documented. Docs scaffold/
links/task IDs and git diff checks before checkpoint; runtime tests not rerun for
docs-only selection. No live DB, quota remaining, resource creation, SQL migration,
adapter integration or restore PASS claimed. Prior301 full tests and latest61
focused/lint/typecheck/build/focus QA PASS remain scoped to previous checkpoints.
Expected files: this phase plan, master/foundation/remediation approval status and
CURRENT_STATE. Branch codex/master-plan-execution, baseb2fc0cb verified clean.
Exact next: maintainer choose Neon Free or Supabase Free and intended dev account;
then perform account-specific preflight before any creation. R1 approval is already
recorded and must not be requested again. Source/legal/production gates persist.
