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
