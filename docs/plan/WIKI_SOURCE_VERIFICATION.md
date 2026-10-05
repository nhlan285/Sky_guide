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
