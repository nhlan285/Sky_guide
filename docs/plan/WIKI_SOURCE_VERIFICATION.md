# P1-D01 — K01 item module verification

## Goal / scope / dependencies
MEDIUM source research after P0-D02. Existing media discovery already verified
the endpoint and nine Lua data modules in 2026-10-03, but K01 does not retain a
small item-field/price sample that satisfies its original metadata acceptance.
Inspect that evidence first; make a bounded module/siteinfo request only to fill
the gap. Use sky-wiki-source. No corpus refresh, asset download, price import,
catalog mutation or publication; K15 remains the runtime source.

## Evidence / files / contracts
`knowledge/01-wiki-items.md`, a small provenance/shape/sample evidence JSON under
`knowledge/evidence/`, this plan and roadmap/handoff. Raw response working data
on E: only. Record endpoint/action/format, module title/revision/time, literal Lua
versus JSON envelope, observed fields and unknown fields. Reuse safe literal Lua
parser without evaluating upstream code. Source labels do not grant image rights.

## Validation / acceptance
Bound response size and calls; API warnings/errors do not count as success. Pin
revisions/checksum and record retrieval time. Compare one factual item/price sample
and field mapping against raw module. Preserve unknown versus free and currency
units; no inferred conversion or claim of current price. Validate evidence JSON,
parser-focused tests and document links. If live access fails, record precise
blocker and historical evidence without calling it current verification.

## State / next action
Execution checkpoint `3e0b1be` pushed. Existing discovery modules: Cosmetics/data
rev100805 and Spirit Item/data rev98798. Read minimal live samples and siteinfo,
then document findings. No provider/legal gate changes.

P1-D01 DONE2026-10-05: direct HTTP200, revision-pinned Cosmetics100805/SpiritItem98798; 100/40 rows, fields/typo/price-absent boundaries recorded; origin=* HTTP CORS observation.18/18 parser/media tests, JSON parsing, scaffold and diff checks PASS. K15 untouched, raw working responses on E:, no assets. Exact next: verify K02 Regular Spirits plus one concrete tree using bounded API page/source samples; do not infer missing edges.

## Current slice — P1-D02 K02 (2026-10-05)
Dependencies P0-D02 satisfied. Scope: Regular Spirits index and one concrete friendship tree, source revision and explicit node/cost/prerequisite evidence. Reuse K01 endpoint; bounded metadata/text requests only, raw on E:. No automatic tree inference from layout or generic default costs. Expected files K02 profile/evidence and current plans. Acceptance: manually reconcile sample nodes/edges/costs, preserve missing facts and distinguish node cost from path total. Samples are cached; exact next action is recorded below.

### Session checkpoint — source samples fetched, reconciliation incomplete
P1-D01 was pushed at `f1d32e5`. P1-D02 remains OPEN. Three sequential API
responses returned HTTP200 without warnings/errors; raw working files at
`E:/SkyGuideAssets/research/k02-2026-10-05/`, outside Git:

| File / retrieved UTC (2026-10-05) | Pinned revisions | SHA-256 |
| --- | --- | --- |
| pages.json / 00:14:11.687 | Regular Spirits101182; Pointing Candlemaker110293 | d4c31016d91f81e0c08a78c29709132e1cb851a092167c824473e8a53f7b502a |
| templates.json / 00:14:29.473 | Template:Friendship Tree71718; Template:Cost88945 | 2a45852d06feec397370b6b62b57919c2f7313320d3f5fb8c694fc2b66737607 |
| renderers.json / 00:14:51.476 | Module:Friendship Tree106368; Module:Cost89344 | f760b8bd582bd7a80f239b9c2faadad2aedf67945917a09c850c8774c26fc236 |

Extracted `Friendship-Tree.lua` and `Cost.lua` are cached beside responses;
upstream Lua was not executed. Page sample explicitly declares emote upgrades
1/2/2 C, Outfit4 H, wing1 AC, hair free, spell/heart nodes. Its prose puts
levels3/4 and Outfit after Wing Buff. Generic defaults are not accepted as
individual prices; prerequisite edges and currency grammar remain unreconciled.
No K02 evidence/profile edit, totals, import or task completion claimed yet.

Exact next: reuse cached files; inspect Friendship-Tree.lua lines380-465 for
connector semantics and Cost.lua token handling. Follow observed Module:Cost/data
only if needed, pin revision, then manually reconcile nodes/edges/costs and write
K02 profile/small evidence JSON. Validate JSON, relevant tests, scaffold/diff;
update master task/handoff and checkpoint before proceeding. Raw responses stay
on E:; K15/runtime and rights/provider gates remain unchanged.

### P1-D02 completion — 2026-10-05
Ten sample nodes and nine prerequisites reconciled; graph acyclic. Cost/data89343
retrieved16:46:56.898Z, SHA787b4197bc6002941c83dba05505075dfe1f5bcc6c5fcf823af50fb6993d1d66,
HTTP200/2808 bytes. Root emote has NO default cost: unknown retained. Three
blessing/heart defaults independently corroborated by index prose; wing explicit
1 AC overrides generic2 AC. Known subtotal14 C/4 H/1 AC matches index aggregate,
but complete=false. Outfit/shared paths preserve unknown and deduplicate trunk.
K02 profile/evidence/master updated, no runtime/code/schema/public mutation.
Working verification script remains on E:, not Git.
Validation: exact page values/pinned default costs, response envelopes, nine-edge
DAG, unique closure/subtotals checked. Exact next: P1-D03 K03 bounded revision
sample; date-only remains date-only, history separated from prediction. Continue
independent source tasks while R1 provider/review gate waits.

## Current slice — P1-D03 K03 (2026-10-05)
MEDIUM source verification after P0-D02. K02 completed/pushed2e6d110. Scope:
Traveling Spirits page contract and one historical visit with raw range,
precision/timezone/provenance. Source plan, K03 profile/evidence and master/handoff
only; no event feed/parser/runtime/public data, prediction or scheduled resource.
Acceptance: actual revision/content shape and a past date-range sample; unknown
clock/timezone preserved, no invented instant or merged repeat visits.
Next: bounded MediaWiki revision request, inspect observed history references only.

### P1-D03 completion — 2026-10-05
Traveling Spirits111680 → Spirit Visits111650; Leaping Dancer110664 corroborates
TS#115/2024-06-06 and TS#12/2020-06-25. Date means arrival; end/timezone unknown
retained, no96h extrapolation. Repeated visits separate; SV/Error/never-returned
rows/upcoming not silently treated as completed TS history. Modern schedule has
boundary ambiguity and historical exceptions. No runtime/public data changed.
Exact next: P1-D04 K04 find actual ln.cookie sheet link/structure from public
source; never invent spreadsheet ID/export/API. If unavailable record blocker
and proceed P1-D05 independently.

## Current slices — P1-D04/K04 and P1-D05/K05 (2026-10-05)
MEDIUM independent source verification, dependencies P0-D02 satisfied.
K04: exact ln.cookie public sheet via attributable directory, actual tab/column
sample and access/export capability; no login/private Drive, no permission bypass.
K05: actual owner/domain/endpoint/units/semantics, response/time sample only after
identifying service; no guessed host/path or default event feed. Profile/evidence
and plans only. Missing attributable endpoint is a blocker, not proof no service.
Bounded public searches/requests; retain raw on E:. Continue next source if gated.

### K04/K05 checkpoint — 2026-10-06
Directory Fan-Made Sky Tools111722 supplies attributable public links. K04
OneDrive embed403: tab hint not data, columns/export unknown, task BLOCKED; no
private access or guessed export. K05 /skytime200/JSON has epoch milliseconds
and IANA America/Los_Angeles. Actual sample matches local fields;6 synthetic
DST/season-offset cases validate interpretation, not live endpoint history.
HTTP ACAO* observed, browser not run; quota/TTL/license unknown and repeat-call
notice recorded. Time-only response cannot establish schedule feed. P1-D05 source
sample DONE, adapter not implemented. Profile/evidence/plans only; raw/link on E:.
Exact next: P1-D06 K06 official patch note URL/article/date/version, then K07.

## Current slices — P1-D06/K06 and P1-D07/K07 (2026-10-06)
MEDIUM source metadata research after P0-D02; K04 blocked independently.
K06: official patch note section plus one article title/date/version/link; own
short summary, no full article copy or guessed feed. K07: revision-pinned Map
Shrines text/location plus source artwork title/creator/license status, no binary
map download, inferred coordinates or public asset. Profile/evidence/plans only.
Acceptance: actual source links and observed fields, missing rights/data explicit.
Next: section navigation and bounded Map Shrines revision source sample.

### K06/K07 completion — 2026-10-06
K06 official section→article Hotfix34.4/2026-08-10/PlayStation+iOS; date-only,
relative51d updated label not an instant, edited availability notice respected.
Own short summary only; no newest-release/feed/revision claim. K07 page110075,
filepages89073/108291 + imageinfo: Ray1000² and game-HD2000²; creator/acknowledgment
and Self/Fairuse distinguished, pending rights retained. One Home text location,
coordinates/map crosswalk unknown;65 current vs57 historical guide not merged.
Three K07 response envelope/hash/location/rights/metadata assertions PASS; manual
K06 heading/date/platform/link comparison PASS. JSON/scaffold/diff validation
before commit. Exact next: P1-D08 K08 specific Eden/season article; original brief
forbids copying walkthrough, current game correctness unknown until compared.

## Current slices — P1-D08/K08 and P1-D09/K09 (2026-10-06)
SMALL bounded source checks after P0-D02. One AppUnwrapper Eden/season article,
source date/scope, own concise paraphrase and outdated/unverified limits. One
Wiki-observed playlist/original video + creator metadata; no binary/frame download,
rehost or embed rights inference. Profile/evidence/plans only. If media text
unavailable, preserve observed directory link and missing creator/current checks.
Next: actual article link and Wiki-linked playlist, avoid invented content.

### K08/K09 completion — 2026-10-06
AppUnwrapper2019-08-19 Eden article reviewed; obsolete glitch/unknown map artist
and unverified current mechanics recorded, own summary only. Wiki Spirit Visits
points TS playlist credited Tara; Eye of Eden109730 points original video,
YouTube oEmbed200 verifies Tara channel/title. Footage/date/timestamps/membership
not verified, no invented route or binary/frame download. Metadata evidence
manual link/date/credit comparison and JSON/hash checks before checkpoint.
Exact next: P1-D10/D11 reuse2026-10-04 listing evidence, verify acceptance coverage
and unresolved market/SKU facts; P1-D12 AppPricingLab actual Sky/export contract.
