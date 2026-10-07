# P9-I02 — v2 journal development review package

Status: **PREPARED / NOT APPLIED / NATIVE NOT RUN** (2026-10-07).
This package replaces the old79-owner runtime-role proposal for future application;
it does not replace the current installed-schema baseline. User approval of R1,
Supabase Free and Dyland's Org persists. The earlier runtime-role question remains
unanswered; neither that question nor automatic goal continuation authorizes this
expanded schema/ACL package. No credentials, SDK, Auth or consumer mount included.

## Concrete scope

Target only `sky-guide-dev` (`tpbydviuknovimroeodm`) in Dyland's Org; hard $0.
Last native baseline:11 private migrations,79 private tables/27 invoker functions/
143 triggers, revision0, all78 noncontrol owners empty; no runtime roles/policies
or private platform grants. Revalidate this baseline before any application.

1. Create the additive migration with `supabase migration new` only after scoped
   authorization, then apply through the migration tool. Proposal adds4 private
   typed tables,10 invoker functions/12 triggers/RLS and one empty control row.
   Existing canonical table data/contracts, schema exposure and platform ACL stay
   as before. Do not put test data in migration history.
2. Verify proposed83-owner/37-function/155-trigger metadata, physical journal column
   types/nullability/generated expression and no unexpected ACL/policies. Expected
   new trigger/get-expression spellings are predicted, NOT native receipts. If
   PostgreSQL differs, stop and inspect; never automatically adopt fresh metadata.
3. Apply the refreshed scoped grant package:2 NOLOGIN/NOINHERIT/NOBYPASSRLS groups,
   SELECT on83 explicit private owners; writer has existing canonical column
   writes plus intent INSERT25 nongenerated columns, applied/receipt INSERT,
   active_intent_id UPDATE only.201 RLS policies/10 helper EXECUTE, including
   transitive lock helper. No credentials/login/principal memberships, PUBLIC/
   anon/authenticated/service_role grants, blanket or default privileges.
4. Run native owner and role adapter SQL,8 actual forbidden-operation checks and
   read-only effective ACL/policy inspection. Fixtures use synthetic SourceSync
   frames under outer ROLLBACK. Verify original canonical baseline afterward.
   Results may prove SQL/role behavior only; they cannot prove durable separate
   commits, SDK transport/cancellation, independent sessions, crash or restore.

This is an infrastructure/migration/privilege action subject to user's AGENTS
rule22. Approval must cover the concrete scope and rollback below. No production,
merge, paid operation, service/extension installation or source publication.

## Rollback / failure handling

Quiesce consumers first (none mounted by this work). ACL rollback checks unchanged
schema/body/trigger/column definitions, role attributes, exact201 policies and
effective column/helper rights before revoking this package's grants/policies and
dropping its two groups. Unexpected memberships require scoped review. It cannot
erase catalogue data or forensic intent history.

The additive schema down SQL holds head→control writer barrier and removes only
these4 tables/10 functions/12 triggers when all intent/applied/receipt owners are
empty and control is singleton1/NULL. It REFUSES pending/forensic records. Use
one authorized migration transaction after ACL removal/definition verification;
never CASCADE, truncate/delete history or run the old unfenced writer after durable
journal records exist. Preserve LKG/history and fix forward instead; isolated
restore and durable record creation are separate gates. An uncertain native
transaction needs authoritative rollback/baseline confirmation before retry.

## Pinned artifacts

Source up: `supabase/proposals/sync_commit_journal_up.sql`,19248 bytes,
SHA256 `b9644820e9746e8333e53f19d426b5515636e6f24367f24c9d97b4342e62e200`.
Source down:1623 bytes,
SHA256 `0483b6c4c16ae2075c54d7df55d9f766aa5e2ff297e358637079cb2ea4c0a9c7`.
Qualified receipt audit/acceptance column references remove a static variable-name
collision; [PostgreSQL variable substitution rules](https://www.postgresql.org/docs/17/plpgsql-implementation.html)
explain the ambiguity. No native execution of that repair is claimed.

Prepared outputs live outside Git in
`E:/SkyGuideAssets/research/postgres-rehearsal-2026-10-07/`:

| File | Bytes | SHA256 |
| --- | ---: | --- |
| runtime-journal-preflight.sql | 46433 | 28afce685bf0582b85ee2cf611de1161fd2eae90049eac69233f5b27b628fbe5 |
| runtime-journal-grant-proposal.sql | 96557 | db17bf3bc8a802edb9b554d4be967b882010ad08da9e4b262e4d1eee1ed6909f |
| runtime-journal-rollback-proposal.sql | 147350 | 8a62fb14815176b9d10267bcd425679a76045e464153613f2ffd0fda7aed4b0d |
| runtime-journal-role-check.sql | 111079 | 3657ba70bdc6716f01d8053ce3ebb39f723730a72733b852b482046fe2e31fb4 |
| runtime-journal-denial-fixture.sql | 2640 | a0127b7528b125a1e3e213c6da6885a4bdfba358876a6b6797da788c6e30d409 |
| runtime-journal-manifest.json | 88454 | 108dd07e6df3a68fb9992c885f9703314ec88e37ae551549431aae615f69ff04 |
| sync-commit-adapter-fixture.sql | 1727377 | 193edbd597d1663d5318c9ebb93ffa8aac1d32f3632a85537061e545118bd41c |
| sync-commit-adapter-role-fixture.sql | 1728871 | d0d88920b9ec2b71424af975cd83212eedcb508abfa0fe4c23876da9d34d56c7 |

Actual v2 kernel transcript:5 phases/39 callbacks/978 query assertions/6 token
negatives. It includes bounded lowered reads and original claim/require/finalizer/
resolve SQL, no substituted legacy CAS. The earlier26-negative proposal transcript
remains a distinct prepared control fixture. Role variant sets reader for5 read
callbacks/writer for34 callbacks. Do not represent the outer-ROLLBACK ordering as
physical concurrency/durability. `verify-sync-commit-adapter-rehearsal.mjs` compares
actual full intent/control/applied/receipt output; its synthetic tests are not
native receipts. No actual native output exists for this package yet.

Local validation:31 focused tests plus final6 focused checks;416 full tests,
lint/typecheck/build/catalog1808 PASS. Existing Router/chunk warnings unchanged.
Old79-owner grant/rollback bytes and SHA256 unchanged. New proposal preparation is
bounded; whole grant/rollback files are below200KB. Tests cover complete helper
closure, generated/control/history privileges, expected metadata drift, rollback
guards, actual v2 emitted grammar and full native-output verifier rejection.

## Exact next

Checkpoint/push/verify SHA, obtain refreshed dev-only package authorization; then
revalidate native baseline and create the CLI migration. No role/schema application
before that answer. SDK/Auth/credentials/principal memberships/consumer mount,
durable commits, parallel sessions/crash and restore remain separate gates.
