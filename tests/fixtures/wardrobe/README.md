# Wardrobe Phase 0 — static SVG fixture pack

**fixture=true — self-created placeholder, not a Sky asset.**

Open [paper-doll.fixture.svg](paper-doll.fixture.svg) directly in an SVG viewer/browser. It contains three generic geometric groups in document paint order: `fixture-binding-rear` (zIndex=-1), `fixture-binding-silhouette` (0), `fixture-binding-front` (1). The visible labels and SVG metadata distinguish the illustration from game assets. Shapes were authored in this project without downloaded images, game files or imitation of Sky artwork/model.

This is the minimal visual evidence for P0-W01: silhouette plus overlapping rear/front layers. All coordinates, dimensions, IDs and revisions are illustrative fixtures. `viewBox="0 0 1 1"` demonstrates normalized coordinates with top-left origin, x right and y down. Width/height only map the illustration to display pixels; there is no size override or character scale in this static SVG. The `data-z-index` attributes document the fixture paint order; no renderer reads or sorts them yet.

The generic figure uses `modelId=fixture-model-generic`, `modelRevision=fixture-r1`, `sourceId=null`, `provenanceIds=[]`, `placeholder=true`, `legalStatus=self_created_placeholder`. It has no K13 provenance, game size/chibi code, anchor calibration or permission evidence. Group IDs illustrate bindings; they are not exported AssetRegistry/Item/LayerBinding records. A full versioned demo manifest remains P1-W01, and runtime tables/engine remain Phase 2/4.

Keep this pack in `tests/fixtures/wardrobe/`, separate from `src/`, `public/` and `data/public/`. It is not imported by the app or listed in any Preview/Production manifest; `.vercelignore` already excludes `tests/fixtures`. Do not relabel fixtures to pass public export gates. Full 3D/game assets remain **pending legal confirmation**.

The configurable slot/anchor/conflict/size contract and fixture logic examples are in [Architecture](../../../docs/ARCHITECTURE.md#contract-wardrobe-2d-đã-chốt--p0-w01--p0-w02--q08-2026-10-02) and [DATA_SCHEMA](../../../docs/DATA_SCHEMA.md#contract-q08--configurable-project--fixture-behavior-2026-10-02). This SVG is static evidence, not a functional picker, resolver or Phase 4 renderer.
