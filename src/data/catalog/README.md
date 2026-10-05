# Catalog domain validation — P2-D02

For offline K01 staging, `scripts/wiki/items.mjs` exports `stageWikiItems(moduleText, sourceRecord, mappings, context)`. Each mapping supplies `sourceKey`, a complete draft Item seed with empty acquisitionOptions, and an explicit acquisitionId. The registered, verified SourceRecord must identify revision-pinned Cosmetics/data. Literal parsing never executes Lua; duplicate keys reject the entire batch. Success returns draft candidateItems and raw field review notes; quarantine returns candidateItems=null, never a replacement empty catalog. This pure adapter performs no IO or publication and leaves K15 runtime lookup unchanged. See `docs/plan/WIKI_ITEM_ADAPTER.md`.

For independent K03 staging, `scripts/wiki/visits.mjs` exports `stageWikiVisits(wikitext, sourceRecord, cutoffDate, mappings, context)`. Mappings supply exact spiritSourceKey/TS sourceVisitKey and a registered draft Visit seed with unknown start, null end/tree. Only recognized selected table rows are parsed; parallel lines are aligned before SV/Error exclusion. Exact calendar arrival dates retain rawLabel, precision=date and timezone=null; no duration-derived end or canonical IDs are invented. Failure quarantines all candidates as null. K04 sheet reconciliation and public history remain separate gates.

Import types and validators from `index.ts`. This module implements LocalizedText, AcquisitionOption, Item, Spirit, FriendshipTree/Node, shared Season/Event, and separate TravelingSpiritVisit/Prediction contracts from `docs/DATA_SCHEMA.md`. Validators accept unknown input and reuse the core ValidationResult, path/code errors and declared-field projection. Required nullable keys must be present; missing arrays, costs and references are never filled in.

Pass a `CatalogContext` containing read-only ID sets for provenance and each referenced entity. Registries represent known IDs supplied by the caller, not network lookups or proof of publication eligibility. Asset/rule/map/article/IAP references are checked for existence without implementing their later schemas. Domain records include fixture, recordStatus, updatedAt and provenanceIds; only explicitly marked fixtures may have empty record provenance. Acquisition options retain their own provenance. Field provenance maps validate declared field names and non-empty, resolved provenance lists. The map is required on Season/Event and Visit records and optional on other records.

Use `validateFriendshipGraph({trees, nodes}, context)` for a complete tree/node bundle. It derives local tree/node registries from that bundle, rejects duplicate record IDs and references, checks membership in both directions and parents in the same tree, and reports deterministic back-edge paths for cycles including self-parenting. It does not modify records or supplied registries. Individual tree/node validators check shape and FK existence; they cannot prove membership or acyclicity on their own.

Item retains rawSlot and explicit unknown values. Its deferred `dyeRegions` and `compatibility` boundaries accept an empty array and null by default. Non-empty metadata requires explicit `ItemMetadataValidators` callbacks that validate and project the later contract. Generic Item types carry those callback result types; no DyeRegion/Wardrobe schema or game conflict rule is implemented here. Callbacks must follow the same unknown-input, no-coercion, declared-field projection contract.

Known costs require explicit numeric amounts; free status rejects unknown or positive costs. Empty costs with unknown status remain unknown, and explicit known zero stays distinct from free. Comparable date/instant ranges reject reversed endpoints, with offsets and fractional seconds respected. Mixed/unknown precision is preserved without inventing a time. A confirmed date remains a date and cannot establish a precise countdown.

Visit and Prediction have separate validators and collection APIs. Opposite-contract fields are rejected, including hybrid records; distinct visit IDs for the same spirit are retained. Prediction requires non-blank methodDescription and inputDataVersion and resolved candidate IDs. It does not infer a method, confidence, probability or publication approval. Q09 and source/rights/export gates remain outside this module.

`pnpm test` runs synthetic behavioral fixtures through the production TypeScript modules using Node 24's built-in test runner. `pnpm lint`, `pnpm typecheck` and `pnpm build` cover the shared project checks. No React, external adapter, live data or new package is involved.

P2-D06 manual file input: parse JSON at the caller and pass
`{schemaVersion:1, graph:{trees:[...], nodes:[...]}}` to `validateFriendshipInput`
with explicit canonical/provenance registries. Use existing full Tree/Node fields,
including nullable unknowns, supplied IDs, source provenance and `recordStatus=draft`.
Validation never generates IDs/edges, executes Lua, fills missing prices, writes a
file or approves publication. Unknown envelope fields are projected away; invalid
version/graph/FK/status fails. Real source crosswalks require a separate review.

`calculateFriendshipPath(graph, context, {treeId, nodeIds})` validates a complete
graph and nonempty selection, then includes each selected node and its prerequisite
ancestors once. Optional siblings are not added. Returned IDs/totals are stable;
duplicates in a selection do not duplicate costs. `knownSubtotal` groups exact
currency plus raw label (no unreviewed label aliases or C/AC merging). Unknown
cost status or nullable amounts produce `complete=false` and `missingCostNodeIds`;
even a matching aggregate elsewhere never fills missing cost. Explicit known zero
and free remain different node facts. Overflow/invalid input fails without a numeric
estimate. Neither function mutates input or persists anything. A future UI must
label incomplete results as partial and keep source revision/provenance available.
