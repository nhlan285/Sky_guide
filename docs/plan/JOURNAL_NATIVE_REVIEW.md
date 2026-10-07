# P9-I02 — v2 journal development review package

Status: **DEV SCHEMA/ACL APPLIED / NATIVE METADATA AND OWNER/CREATOR/DENIAL PASS / K15 TIMEOUT, BENCHMARK OPEN** (2026-10-07).
This package replaces the old79-owner runtime-role proposal for future application;
it does not replace the current installed-schema baseline. User approval of R1,
Supabase Free and Dyland's Org persists. The earlier runtime-role question remains
superseded by user2026-10-07 explicit abd8712 package approval INCLUDING temporary
creator postgres SET TRUE/INHERIT FALSE/ADMIN FALSE. ALL temporary membership and
fixture data share the same ROLLBACK transaction; baseline before/after, STOP on
drift. No new principal/credentials or retained temporary membership. Schema/K15
gates remain mandatory. No SDK, Auth or consumer mount included.

## Maintainer remediation — 2026-10-07

User authorized repository fixes after REQUEST CHANGES; hosted application is
still outside this authorization. Preserve the eleven applied migrations and
the historical79-owner proposal. Fix exact portable lifecycle comparisons and
retry arithmetic, provenance ownership, and strengthen the current83-owner
preflight/rollback for trigger state, function settings, constraints/indexes and
role membership in both directions. Add focused regression and SQL review
fixtures. For repeated full release/retirement validation, prepare a bounded
full-K15 cost rehearsal and require its native result before importing real data;
do not weaken deferred integrity or claim a measured timeout without execution.

Acceptance: no Date.parse lifecycle bypass; payload evidence mapping matches
encoder/decoder; altered enforcement metadata/memberships fail closed; generated
artifacts and handoff agree; focused/full tests, lint, typecheck, build, scaffold
and diff checks pass. Native SQL execution, timings, restore and durable/session
proof remain NOT RUN. Repository fixes and preparation are complete; the native
cost finding remains OPEN until measured, not presumed fixed by a fixture.

Completed: shared exact instant comparison/retry addition covers staging, stored
candidate, review/promotion, failure, identity, freshness/API and media. A targeted
audit found the same coercion in manual official evidence; it now compares exact
instants too, preserving draft/source boundaries. Store replay accepts only the
canonical integral-millisecond server promotion clock, never truncates reviewed
source fractions. item/spirit/season evidence maps to payload_provenance, with an
encoder/decoder regression proving its independent canonical superset/order.

The current83 guard checks enabled custom AND internal FK triggers, origin session
enforcement, function language/search_path/volatility/strictness/parallel/kind/
leakproof, all installed physical columns, exact installed CHECK/FK/PK/UNIQUE and
index definitions/validity. Expanded read-only native79 receipt:443 columns,
503 non-trigger constraints (all validated),233 indexes (valid/ready/live), no
disabled triggers,11 migration versions unchanged. It expands the fingerprint
baseline, never replaces old body/trigger checks. Raw receipt on E:
runtime-structure-baseline-receipt.json, SHA256
`b9104131a4b9654585dc97d7dc83d0fa76b220d0643def27dd499b0754f248d5`.
This audit did not refresh row counts or grant native83 acceptance.

Native83 structural receipt has been explicitly reviewed against up SHA256
4ad16e6200129114098936f1b0408fd78050e6a3413f299d0b857ec6ee5eeb7e:52 validated,
immediate CHECK/FK/PK/UNIQUE constraints and7 valid/ready/live indexes match UUID,
source/digest/revision/time/health/global-tuple/row-budget rules, restricted FK
actions, PK/UNIQUE key order and active-control index. Installed fingerprints
unchanged. Receipt E: authorized-journal-structure-receipt.json; intentionally
pinned constraints797ac2761349e5eedc6a282bf8084911 and indexesbc5a8dcaeaa5f63abf24a536b071059a,
then regenerated artifacts before grants. Never auto-adopt future drift; unreviewed
definitions still require NULL and fail closed. Native83 preflight and ACL metadata PASS.

Membership guard checks runtime roles as both parent and member, including ADMIN,
INHERIT and SET options. Only optional PG17 creator edge is accepted: current
actor equals member, grantor is PostgreSQL17 bootstrap superuser(OID10), ADMIN
true, INHERIT false, SET false. Grant sets
transaction-local createrole_self_grant='' before CREATE ROLE. Any other edge,
including a different rollback actor's creator edge, needs scoped review.

The creator exception follows [PostgreSQL17 role attributes](https://www.postgresql.org/docs/17/role-attributes.html),
[self-grant defaults](https://www.postgresql.org/docs/17/runtime-config-client.html#GUC-CREATEROLE-SELF-GRANT)
and the [PG17 bootstrap OID](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/include/catalog/pg_authid.dat).
Read-only actor inspection confirms hosted API actor postgres is CREATEROLE but
NOT SUPERUSER, self_grant='', bootstrap OID10 is supabase_admin(superuser).
Default role/denial fixtures require an authorized superuser executor before any
DML/SET ROLE; they cannot run through that hosted API actor as-is. No superuser,
credentials or principal are provisioned to solve this.

A separate creator rehearsal is AUTHORIZED/NATIVE PASS: existing postgres
creator only, require exactly two bootstrap ADMIN-only edges/no other membership,
temporarily self-grant SET TRUE/INHERIT FALSE/ADMIN FALSE under the same outer
ROLLBACK as ALL test data. No durable membership/login/new principal. This is an
additional explicit privilege authorization scope; approval of schema/ordinary
grants alone does not approve it. Use --roles --creator-set-rehearsal for the
adapter builder; creator-denial is prepared separately, never overwrite the
ordinary denial artifact. Confirm authoritative membership/schema/data baseline
after rollback/error. If this narrower scope is not authorized and no approved
superuser executor exists, role proof remains BLOCKED; do not broaden grants.

Full K15 cost rehearsal prepares46,341 canonical/4,367 release rows, including
2,051 identity and4,103 membership events. It locks the global head, refuses a
populated baseline, measures canonical/release/deferred durations separately and
forces ALL deferred checks under outer ROLLBACK with a30-second statement cap.
The cap is a dev rehearsal budget, not production capacity. Native packed execution
timed out during deferred checks; complete timings missing. Before real import: pass this rehearsal, verify its
complete receipt and authoritative empty-baseline rollback receipt; if timeout or
unacceptable measured cost, prepare/review an additive optimization and repin
metadata. Do not rewrite applied migrations, disable triggers or suppress later
writes with a session flag. Historical79 grant/rollback bytes stay unchanged and
are superseded for application by this package.

## Concrete application scope

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
   Collect/review the structural receipt and deliberately pin the new four-table
   definitions before generating an executable grant. NULL fingerprints stop it.
3. Apply the refreshed scoped grant package:2 NOLOGIN/NOINHERIT/NOBYPASSRLS groups,
   SELECT on83 explicit private owners; writer has existing canonical column
   writes plus intent INSERT25 nongenerated columns, applied/receipt INSERT,
   active_intent_id UPDATE only.201 RLS policies/10 helper EXECUTE, including
   transitive lock helper. No credentials/login/principal memberships, PUBLIC/
   anon/authenticated/service_role grants, blanket or default privileges.
4. Run native owner and role adapter SQL,8 actual forbidden-operation checks and
   read-only effective ACL/policy inspection. Fixtures use synthetic SourceSync
   frames under outer ROLLBACK. Verify original canonical baseline afterward.
   Run full-K15 validation cost rehearsal and verify rollback before real imports.
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

Source up: `supabase/proposals/sync_commit_journal_up.sql`,19250 bytes,
SHA256 `4ad16e6200129114098936f1b0408fd78050e6a3413f299d0b857ec6ee5eeb7e`.
Source down:1623 bytes,
SHA256 `0483b6c4c16ae2075c54d7df55d9f766aa5e2ff297e358637079cb2ea4c0a9c7`.
Qualified receipt audit/acceptance column references remove a static variable-name
collision; [PostgreSQL variable substitution rules](https://www.postgresql.org/docs/17/plpgsql-implementation.html)
explain the ambiguity. Owner and approved creator native execution now PASS.

Initial native up failed42601 at unparenthesized CASE in the applied-witness IF;
after-error baseline was identical to before. Constant native reproducer proved
parentheses compile;2-character correction preserves expression semantics. Applied
schema version20261007132330 and runtime privilege version20261007132621; old11
migrations unchanged. CLI filenames aligned with server-assigned versions. Grant
migration omits proposal BEGIN/COMMIT only; migration tool owns transaction.
Post-grant baseline:83 tables,201 policies,2 NOLOGIN roles, global revision0 and
no fixture data; two bootstrap creator ADMIN-only edges, INHERIT/SET FALSE. No
temporary SET membership retained. Native owner/creator/denial PASS; K15 timed out
at deferred checks. Down/durability remain NOT RUN.

Prepared outputs live outside Git in
`E:/SkyGuideAssets/research/postgres-rehearsal-2026-10-07/`:

| File | Bytes | SHA256 |
| --- | ---: | --- |
| runtime-journal-preflight.sql | 61396 | 21b12a25fb5a8298e2f2928095f1633e56f73883b82d0a0aab2c12bb85e0e776 |
| runtime-journal-structure-audit.sql | 7142 | 80d9ffa4db1121ec2555d293f33cf1dd5893b89cca1954c9e1764c1079eea08a |
| runtime-journal-grant-proposal.sql | 112250 | 23d27981a44b9b09de1aa766151402442d50ac0fc195abd16b54a63c5313b47e |
| runtime-journal-rollback-proposal.sql | 163007 | 43ab9a8702daa41e8c7e42280103867ede1c3686c9327d0b86c5c15dfeb4d2a9 |
| runtime-journal-role-check.sql | 126736 | 8d73e1ddeae4bca8ce730cdf34431a140a1501e66b91f3ae80fcf2af6c01b7ce |
| runtime-journal-denial-fixture.sql | 2898 | aa9d5f36a4d45a26cd6e421952ae9a1c2849e485224b1040a3f57c6538f41cb5 |
| runtime-journal-manifest.json | 88783 | 153515a4a47de455fe3676640721fa21d2f0cd3ed34903a1f1090594d6cd0e7d |
| sync-commit-adapter-fixture.sql | 1727377 | 193edbd597d1663d5318c9ebb93ffa8aac1d32f3632a85537061e545118bd41c |
| sync-commit-adapter-role-fixture.sql | 1729129 | bb3fa11015c6a914bfc078d38ab251b26bc9697544e861306c7689d3ef032834 |
| full-k15-validation-fixture.sql | 4530701 | 24eb64bb37b73b958dfdcf83161fbc5daaa91685ae0c3474dbe4c295cde5911c |
| sync-commit-adapter-creator-fixture.sql | 1730412 | f78bc02cc090d67b4c7987f3f2b9d2f468d787dc5e437c4efd694deaaced59c9 |
| runtime-journal-creator-denial-fixture.sql | 4181 | 7109011646dcc2200af5d8454858b97221cf0c860e918bcbe470390ba0a1af58 |

Actual v2 kernel transcript:5 phases/39 callbacks/978 query assertions/6 token
negatives. It includes bounded lowered reads and original claim/require/finalizer/
resolve SQL, no substituted legacy CAS. The earlier26-negative proposal transcript
remains a distinct prepared control fixture. Role variant sets reader for5 read
callbacks/writer for34 callbacks. Do not represent the outer-ROLLBACK ordering as
physical concurrency/durability. `verify-sync-commit-adapter-rehearsal.mjs` compares
actual full intent/control/applied/receipt output; its synthetic tests are not
native receipts. Current native owner/creator receipts were independently verified;
full baseline matched after each rollback. K15 timing acceptance remains OPEN.

Local validation after remediation:425 full tests plus final10 Store/6 ACL tests,
lint/typecheck/build/catalog1808 PASS. Existing Router/chunk warnings unchanged.
Old79-owner grant/rollback bytes and SHA256 unchanged. New proposal preparation is
bounded; whole grant/rollback files are below200KB. Tests cover complete helper
closure, generated/control/history privileges, expected metadata drift, rollback
guards, disabled triggers/internal FK enforcement, function settings, exact clock
precision and evidence ownership, actual v2 grammar and native-output verifier
rejection. Full-K15 receipt verifier tests are synthetic; no measured PASS claimed.

After authorized native execution:427 full tests/13 focused/lint/typecheck/build/
catalog1808/scaffold/diff PASS, Supabase security advisors no lints. Historical79
fixture explicitly retains first11 migrations; new83 guard/coverage is separate.
These checks do not close the native benchmark:57014 timeout and missing complete
timing receipt remain OPEN. Native one-connection role proof is not SDK/race/crash.

## Exact next

Native owner and approved creator adapter PASS:39 callbacks/978 query checks/6
token negatives each; complete returned rows verified independently.8 creator-role
denial checks PASS. Each rehearsal used one outer ROLLBACK for membership and data;
after EACH run the full authoritative after-grants baseline matched exactly, with
no retained temporary SET edges/data. Two bootstrap ADMIN-only creator edges remain.
Receipts on E: journal-native-{owner,creator}-receipt.json and post-{owner,creator,denial}-baseline.json.
Full-K15 native packed run failed57014 at SET CONSTRAINTS ALL IMMEDIATE inside
validate_release_metadata line29, scanning full release membership against current
domain_identity. No complete timing receipt returned. After-timeout authoritative
baseline identical; no data or SET membership retained. Benchmark remains OPEN.
Raw4.53MB connector request was rejected before execution; packed1.397MB transport
reconstructed EXACT original SQL and checked SHA256 before executing the same DO,
statements, deferred checks and timing boundaries. No batching/new DB object.
E: journal-native-k15-timeout-receipt.json (bounded error + full after baseline),
SHA256bf90932b48890f9e4c67d86329b0f78a17002a461120b50cc17c4568d2b82bfb.
Next: prepare/review additive optimization and repin intentionally BEFORE new
authorized DDL; preserve enforcement and re-run exact K15 benchmark. No native
optimization applied. Down/durable/session/crash/restore/SDK remain separate gates.
