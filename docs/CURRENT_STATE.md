# Current handoff — 2026-10-07

## Task / branch / checkpoint
Autonomous Sky Guide master run on `codex/master-plan-execution`; goal remains
active, no master completion claim. Last verified remote/base checkpoint
`92025c128fd99a9d4ad0cea188cb3389ca3729f1`; this file accompanies the K15 typed
catalog SQL/codec milestone. Resolve latest commit SHA with `git log -1` and verify
remote before resuming. No merge/production/paid resources.
Master [IMPLEMENTATION_PLAN](plan/IMPLEMENTATION_PLAN.md); active detailed phase
[POSTGRES_PROVIDER_SELECTION](plan/POSTGRES_PROVIDER_SELECTION.md).

## Authority / environment / constraints
R1 LOCAL CONTRACT APPROVED by user2026-10-06 `phê duyệt, tự tiếp tục`; provider
`supabase free` and organization `Dyland's Org` explicitly selected. Do not ask again.
Dev `sky-guide-dev` (`tpbydviuknovimroeodm`), org `pdssjfwbrfjlglobjhtw`, Free,
creation $0/month confirmed; Singapore is isolated dev choice, not verified Vercel
colocation. PostgreSQL17.11. CLI2.120.0 pinned, cache E:, no login/link/new SDK.
No credentials read, production consumers or R2 delivery change. No paid branch,
provider Auth/Storage/Realtime/scheduler. Native Free branches unavailable.

## Completed / modified areas
Prior6c766f5/92025c1: identity/provenance/crosswalk/alias/tombstone and evidence
TRUNCATE protection, immutable reservations, scoped FKs, chains and deferred proof.
New applied migrations20261006173438/20261006174420:
- 26 typed payload tables added (33 total); all current K15 item/lookup/spirit/
  season/provenance fields, independent ordered joins, translation/source keys,
  field evidence/presence, composite acquisition/cost/offer/evidence columns.
- server catalogRows codec validates both directions, strips private payload fields,
  rejects malformed/orphan/wrong-type rows and future nonnull unsupported modules.
  Source strings/null/presence/unknown vs free preserved, no canonical JSON/EAV.
- Valid source tiny fractional instant originally failed float conversion; fixed
  additively.11 dependent immutable-function CHECKs recreated/revalidated in same
  transaction; exact range uses seconds + padded fraction text. Raw text unchanged.
  Failed initial reserved-parameter parse rolled back (no partial DDL/history).
Files: src/server/catalogRows.ts, two new SQL migrations, codec unit tests/shared
synthetic fixture, SQL body/rehearsal builder, supabase README, phase/architecture/
foundation/master/handoff. No UI/API mount or real source DB import/publication.

R1 remediation e802c36/55bf8f6/e4d0de5/071d5a2/c5804c6/a565652 retained: public
allowlist/parity, media bindings, acquisition keys, limits, lifecycle/global CAS/
source isolation. Wardrobe39caf2f/b2fc0cb sequence/focus retained. K02/P1-D02 ten
nodes/nine edges/unknown root/partial costs and K01/K03 staged adapters/K15 loader
unchanged; source/legal evidence in [WIKI_SOURCE_VERIFICATION](plan/WIKI_SOURCE_VERIFICATION.md),
R1 contracts in [DATA_FOUNDATION](plan/DATA_FOUNDATION.md).

## Validation / evidence
Local every-field typed row round-trip:1808 items/lookup,213 spirits,30 seasons,
244 provenance; canonical public files + hashes exactly match original canonical
release. Hosted synthetic codec inserts -> actual PostgreSQL rows -> complete
payload parity PASS, including literal __proto__ keys, quotes/backslash/newline,
independent source array orders and valid nonnull deferred reference IDs.
SQL32 catalog +24 identity +22 retirement negative SQLSTATE cases PASS on final
schema; positive known/free zero/deferred/500 and17000-digit fraction checks PASS.
All33 tables zero rows after rollback.30 codec column contracts match actual SQL
schema;33 RLS, every FK RESTRICT,0 unvalidated constraints/SECURITY DEFINER and
platform role schema/table/function grants. Advisors no WARN/ERROR; INFO33
intentional no-policy RLS/15 unused indexes. Actual SQL/schema/fixture response
outside Git at E:/SkyGuideAssets/research/postgres-rehearsal-2026-10-07.
51 focused domain/codec +306 full tests, pnpm lint/typecheck/build/catalog1808 PASS.
Then5 codec tests/native SQL rechecked for valid future media and known/free zero.
Existing Router use-client/large-chunk warnings unchanged. Scaffold/diff checked
before checkpoint. No actual full K15 SQL import, release/API adapter, global SQL
CAS, real restore, production-scale graph or two-session concurrency PASS claimed.

## Gates / exact next action
Next: typed public-release/source/import-summary/envelope metadata and ordered
release membership; preserve original manifest source/importReport and nullable
aliases/tombstones/media pins. Then transactional adapter/owner revisions/global
CAS/private audit/public projection parity and isolated backup/restore/measurement.
P9-I02/D04/V01 remain PARTIAL/OPEN; source/rights/provider gates preserved.
Future typed dye/compatibility/media/nonempty modules require reviewed owners;
registered deferred IDs retained exactly, not silently dropped or guessed.
READ COMMITTED fixture scope only; stronger isolation/races still NOT RUN.

Docker CLI exists but daemon unavailable; no start/install/pull, psql or connection
password obtained. Local pg_dump/restore tooling/access still blocked; this does
not block further hosted additive metadata SQL. Source/legal/QA gates separate:
K04 OneDrive403, K10/K11 SKU/market observations, K12 bulk reuse prohibited,
Q02/Q09/Q10/Q11 decisions, Q12/TGC/media rights, protected Vercel403, native icon/
install and target-device/full accessibility evidence. P4-W12 PARTIAL/W11 OPEN;
offline/SW/source-dependent UI gated. No R2–R6 or whole master DONE claim.

## Continuity
Stage intentional files only, checkpoint/push and verify SHA. No force/reset/rebase/
merge/production. Corpora/private evidence/secrets/cache/build output excluded.
No owned QA server/browser/test process remains. Use native automatic compaction;
no shell /compact or invented context/usage percentage. Continue exact next action,
not a full repository reread or source recrawl.
