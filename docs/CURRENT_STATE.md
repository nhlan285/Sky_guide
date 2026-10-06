# Current handoff — 2026-10-07

## Task / branch / checkpoint
Autonomous Sky Guide master run on `codex/master-plan-execution`; goal active,
master roadmap still OPEN. Last verified pushed checkpoint/base
`dd7fb11a79e4e3dc1649fa7660a3cf8b4f3d7b08`. This file accompanies the typed release
metadata/membership milestone; resolve latest SHA with git log -1 and verify
remote before resuming. Master [IMPLEMENTATION_PLAN](plan/IMPLEMENTATION_PLAN.md);
active detailed [POSTGRES_PROVIDER_SELECTION](plan/POSTGRES_PROVIDER_SELECTION.md).
No merge, production deployment, paid resources or destructive Git operations.

## Authority / environment / constraints
R1 LOCAL CONTRACT APPROVED: user `phê duyệt, tự tiếp tục`; `supabase free` and
`Dyland's Org` explicitly selected. Do not ask again. Dev sky-guide-dev
(tpbydviuknovimroeodm), org pdssjfwbrfjlglobjhtw, Free; creation $0/month confirmed,
PostgreSQL17.11. Singapore is isolated dev choice, not verified Vercel colocation.
Node24/pnpm10.30.3 (E:/Code/corepack.cmd), Supabase CLI2.120.0 pinned/cache E:.
No login/link/new SDK, credential read, runtime DB role or consumer mount. No
provider Auth/Storage/Realtime/scheduler/paid native branch. Existing R2 unchanged.

## Completed / intentionally modified areas
Previous92025c1/dd7fb11: identity/provenance/crosswalk/alias/tombstone/evidence
reservation and typed K15 payload SQL/codec; exact source order/null/presence,
unknown/free prices, explicit deferred refs. Fraction precision correction retains
raw source text; dependent immutable-function CHECKs recreated/revalidated. Prior
24 identity/22 retirement/32 catalog negative SQL cases PASS; all tables empty.

New migration20261006180131_private_release_metadata, SHA256
71877b82c4723b9b3f207ff37999cbd028fb20b44c9d8a7ef4cb3ae44ccc9b74:
11 explicit typed private tables added (44 total). Manifest optional source/report
flags, typed import counts/rejected-empty, source snapshot/path/blob SHA, dataset
path/version/hash/schema/timestamp/source/fixture and five ordered subtype
memberships with identity revision pins. CLI timestamp aligned to hosted history.
releaseRows codec validates canonical input/output against existing publication
boundary, exact hashes and revisions. Changed payloads fail closed; no latest-row
fallback or silent drop. Distinct per-dataset generatedAt and repeated source paths
preserved. Architecture/field-ownership matrix refined without public contract change.
Nullable assetManifestVersion retained verbatim; no media usability implied.
Aliases/tombstones nonnull remain reviewed canonical adapter gated.

Important limit: SQL rows are private candidate metadata. Root version reservations
are permanent; child metadata is not yet sealed by promotion. No publication
pointer, immutable historical payload owner or SQL checksum computation implemented.
Files: src/server/releaseRows.ts, src/data/domain/migration.ts, additive migration,
focused tests/shared fixture/SQL builder/body/two verifiers, existing architecture/
master/phase/foundation/handoff and supabase README. No UI/runtime consumer change.

## Validation / evidence
Local full K15 manifest/envelopes/canonical files+hashes round-trip PASS:1808 items/
lookup,213 spirits,30 seasons,244 provenance. Hosted synthetic actual SQL scalar
rows -> complete canonical fixture bytes/metadata PASS;38 negative SQLSTATE cases
PASS. Second hosted positive fixture without source/importReport and null media pin
parity PASS. Both rollback; all44 tables verified0 rows.11 release writable column
contracts match actual PostgreSQL;44 RLS, all FKs RESTRICT,0 unvalidated constraints/
SECURITY DEFINER/platform schema-table-function grants. Advisors no WARN/ERROR;
INFO intentional RLS no policies and unused indexes in empty dev schema.
Raw SQL/actual response/schema evidence remain outside Git at
E:/SkyGuideAssets/research/postgres-rehearsal-2026-10-07.

4 focused release tests +310 full tests, pnpm lint/typecheck/build/catalog1808 PASS.
Initial test-only lint import omissions fixed; lint PASS. After ownership refinement/
schema verifier addition:9 focused migration/release tests, lint/typecheck/scaffold/
diff rechecked before checkpoint. Existing Router use-client/large-chunk warnings.
No full real K15 SQL import, live adapter/global SQL CAS/two-session race/stronger
isolation/historical restore/scaling/production foundation PASS claimed.

## Exact next action / gates
Define and implement immutable historical public projection owner/version-bound
read contract, then trusted transactional adapter/global CAS, owner revisions,
private audit/per-source health and atomic reviewed promotion using existing
repository/ingestion contracts. Preserve LKG, checksums and revocation overlays.
P9-I02/D04/V01 remain PARTIAL/OPEN. Actual isolated backup/restore and measurements
remain OPEN. Docker CLI exists but daemon unavailable (dockerDesktopLinuxEngine
pipe absent); no start/install/pull/container, psql or connection password obtained.
This blocks local restore tooling, not further safe hosted additive SQL work.

K02/P1-D02 graph evidence/root-cost uncertainty and K01/K03 staged adapters/K15
loader retained; [WIKI_SOURCE_VERIFICATION](plan/WIKI_SOURCE_VERIFICATION.md) and
[DATA_FOUNDATION](plan/DATA_FOUNDATION.md) authoritative. Prior R1 remediations,
Wardrobe sequence/focus checks remain scoped to their pushed checkpoints.
Source/legal/QA gates: K04 OneDrive403, K10/K11 market/SKU observations, K12 bulk
reuse prohibited, Q02/Q09/Q10/Q11 decisions, Q12/TGC/media rights, protected Vercel
403, native install/icon/target-device/accessibility. Future dye/compatibility/media
modules need reviewed typed owners. P4-W12 PARTIAL/W11 OPEN; no R2–R6/master DONE.

## Continuity
Stage intentional files only; commit/push/verify SHA at meaningful milestones.
Never stage corpora/secrets/cache/build output or overwrite unrelated work. No
owned QA server/browser/test process remains. Use native automatic compaction,
not shell /compact; do not invent context/usage percentage. Resume this exact next
action from handoff/active plan, without a full repo reread or source recrawl.
