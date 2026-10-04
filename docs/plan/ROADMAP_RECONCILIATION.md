# R0 — Roadmap reconciliation, 2026-10-04

## Goal / why

MEDIUM, docs-only: reconcile the stable [master roadmap](IMPLEMENTATION_PLAN.md)
with maintainer-approved data, storage, event and media decisions. Preserve
completed work and historical IDs; make the next implementation slice reviewable.

## Dependencies / current state / prior decisions

Clean working tree checked before edits; fetched `origin/main` at
`c0c0ee0c55bc11d15a24269b2c0b591fb7940287`, merge PR #10. `origin/develop`
is 13 behind / 0 ahead. Branch: `codex/roadmap-data-event-media-refresh`.
Read the required roadmap, handoff, Architecture, Schema, PRD, UX, Legal,
image/source phase plan, K15, source dossier and KB; also the brief, asset/runtime
docs, contribution workflow and docs validation commands.

## In scope / out of scope

Update decisions, task/dependency and feature matrices, direct documentation
contradictions, status vocabulary and handoff. No feature code, framework/SSR
change, cloud provisioning, provider choice, bulk crawl/download, deployment,
main/develop merge, reset or force push. Commit docs and stop.

## Contracts / expected files / risks

Primary: `IMPLEMENTATION_PLAN.md`; minimal consistency edits to Architecture,
Schema, PRD, CURRENT_STATE, KB/source-phase pointers and affected asset/status
documentation. Q01 history stays; Q20 evolves canonical ownership to relational
DB, JSON projections remain. Q15 retains no automatic paid resources. Public
API contracts hide providers; user state stays local in V1. Rights/evidence
boundaries remain fail closed. Risk: design approval confused with implementation
or source research confused with complete verification.

## Steps / acceptance criteria

- [x] Verify clean Git baseline, latest main and merge evidence; create branch.
- [x] Read required context and inspect existing task parser/checks.
- [x] Add Q20–Q23 and R0–R6 track using unused P9 task IDs; retain old IDs/DONE.
- [x] Update event dependencies, canonical ownership and media role contracts.
- [x] Reconcile direct contradictions and replace obsolete PR #10 pending handoff.
- [x] Validate Markdown tables/links, unique IDs, references, decisions and scope.
- [x] Review final diff, commit docs-only and record next slice in CURRENT_STATE.

## UI / API / data / security

This phase changes documentation only. Future UX acceptance includes missing
media, source failure/LKG, offline/stale, keyboard/touch, explicit audio activation
and no per-second API polling. Public projections cannot expose private evidence
or credentials. Asset rights and source verification are independent gates.

## Validation / completed / blockers

`Check-Scaffold.ps1`, `Get-PlanTasks.ps1`, bounded table/ID/reference/link-anchor
checks and `git diff --check` passed; all 25 historical DONE rows retained.
Found pre-existing unescaped enum pipes in DATA_SCHEMA Markdown tables; escaped
only those table delimiters while reconciling that document, without schema changes.
No browser QA or product test rerun: Markdown-only, no runtime contract/code
changed. No R0 blocker. Provider/quota, source coverage and rights remain future
implementation gates. See CURRENT_STATE for final handoff.

## Decisions / exact next step / handoff

Use existing `docs/plan` planning system, not a duplicate `docs/plans` system.
R slices are execution checkpoints inside additive Phase 9; all task rows use P9
IDs so the existing task parser keeps working. Next: **R1 contract slice
P9-D01–P9-D03 + P9-I01**, reviewed schema/API/storage/migration contracts and
small synthetic fixtures first; no DB provisioning before review. Future detailed
phase plan is refined then. This task stops after its docs commit.
