# P6-I01 / P4-U01 — existing PWA audit and local Wardrobe QA

## Scope / dependencies / acceptance
MEDIUM verification slice after P3-U02, P4 fixture rules and P6-U03. Audit existing
manifest/icons, then test current Wardrobe on isolated local production preview.
No icon replacement, branding redesign, production deployment, browser personal
data inspection, service worker or native install claim. Full P6-I01 needs icon
provenance and actual target-browser installation; full P4-U01/P7-U01 need remaining
theme/locale/long-text/reduced-motion and target-device checks.

## P6-I01 static evidence — PARTIAL2026-10-06
Existing manifest: Sky Guide name/short name, start_url/scope `/`, standalone,
background/theme `#071a38`. index.html links `/manifest.webmanifest?v=3`, favicon
and apple-touch-icon-v4.png. Sharp metadata verified declared PNG dimensions:
192/512 any, 192/512 maskable; Apple touch180. No duplicate files needed.
Existing favicon-mark.svg is a self-contained vector, but code/Git presence does
not establish authorship or reuse rights. Commit20e99c0 replaced icons without
rights evidence in its message; no tracked branding provenance record found.
Preserve branding; provenance gate remains OPEN. Real Chrome/Edge/Android/Safari
install tests NOT RUN; an in-app browser is not a substitute.

## Local QA — PASS scoped checks / remaining limits
Production preview of c44a40e code at localhost6194; synthetic outfits only, initially
empty origin. In-app browser at390x844 and1366x900; viewport reset afterwards.
- Chosen Cao + Mảnh sứ derives Nhỏ with visible fictional reason; removal restores
  Cao. Native ArrowLeft changes base to Tiêu chuẩn while override stays Nhỏ.
- Save, backup preparation and correctly named Blob download link PASS. Download
  event timed out via both click/wait and documented downloadMedia; actual saved
  download NOT VERIFIED. No console errors captured; do not infer app success or
  failure from the tool timeout alone. Check on target browser before release.
- Native chooser accepts synthetic JSON, displays1/50 replacement preview; cancel
  preserves existing record; apply replaces library while editor stays unchanged.
  Invalid JSON envelope raises alert and preserves imported library.
- Reset cancel preserves library; confirmed reset clears only library and leaves
  active outfit. Reload then returns empty/default as expected: draft is document
  lifetime only; saved library is the reload source. No implicit autosave introduced.
- Dye Hồng đất + Cao/override share: fresh reload does not auto-apply share, explicit
  apply restores items/dye/base; save then reload restores accepted outfit with rule
  recomputed. Desktop has picker/preview/outfit columns; mobile segmented panels
  switch normally. Observed document width375/1351 within viewport390/1366.

Evidence remains untracked on E: `SkyGuideAssets/research/local-qa-2026-10-06/`
wardrobe-mobile.jpg and wardrobe-desktop.jpg; synthetic fixture files there too.
No corpus/screenshots/build output committed. No runtime changes; latest264 full
tests/lint/typecheck/catalog/build PASS retained, not rerun for docs-only evidence.

## Next / handoff
P6-I01 and P4-U01 remain PARTIAL/OPEN for listed acceptance gaps. Generic P4-W12
alias/tombstone sequence still depends P2-D12/P4-W11; tested demo sequence does not
close that gate. Audit independent P3-U04 filter preference slice using existing
storage wrapper and URL contracts; market/spoiler UI still depends data/owner gates.
