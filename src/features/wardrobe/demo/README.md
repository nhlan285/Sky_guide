# Production-safe Wardrobe demo V1

`manifest.json` is a dedicated `self_created_demo` package, not the public Sky catalog and not the Phase 0 SVG test fixture. All geometry was newly drawn for this editor; every asset remains `placeholder=true`, `fixture=true`, `legalStatus=self_created_placeholder`, with synthetic IDs and no source/download paths. K13/full assets remain **pending legal confirmation**.

The fictional `demo-model-wayfarer` / `demo-model-r1` uses a normalized 0–1 viewBox, top-left origin, x right and y down. Four `fixture-demo-size-*` presets are self-created proportions, not in-game sizes. Config, assets, bindings and calibration have explicit revisions. JSON anchors stay unscaled; the renderer applies binding scale locally, then character scale once on the enclosing group. SVG maps that coordinate system to the viewport.

Twelve fictional items cover the six project slots, each with capacity 1. Both capes have rear and front bindings. Fabric/panel dye uses declared inline mask geometry and a six-color palette; missing masks preserve the original color. Rules are empty in the visible demo; synthetic size overrides/conflicts are exercised only in behavioral tests. State uses a pure reducer with explicit replacement and keeps base/effective size separate.

`validation.ts` validates this dedicated demo entry point on module load. The editor route loads the package once, independently of the public catalog/export pipeline; it never imports `tests/fixtures/wardrobe/`. No persistence, share codec or verified game compatibility is provided.

Verification: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`. No browser automation is used. **MANUAL VISUAL CHECK REQUIRED**: Daylight/Sunset/Night, Vietnamese/English, equip/replace/remove, all scale presets, palette/reset, narrow mobile panels, landscape and landing scrollbars.
