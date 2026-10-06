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

## P7-U01 follow-up — current local acceptance slice
Theme Daylight + English retain two items, rose dye, Tall base/Small override.
Rename synthetic record to80 unbroken characters;320x800 mobile document width305,
no overflowing main elements observed. Target OS reduced-motion/native devices
remain separate; no sensitive browser preferences inspected.
Found real disclosure contrast issue: computed text RGB68/95/112 at12.8px on
transparent Daylight intro. Neighboring rendered JPEG background samples at
1366x900 yield about3.43–4.35 contrast, below project normal-text4.5 target.
Evidence on E: wardrobe-day-before.jpg and read-only measure-contrast.mjs; JPEG
samples approximate, not whole-page accessibility certification. Plan: use existing
primary --text token for this disclosure only (RGB22/52/72 measured day), retaining
layout/branding. Matching samples predict6.61–8.37. Build/lint then verify actual
computed color + screenshots; no new implementation-mirroring CSS tests needed.

Completed follow-up: CSS uses primary token with adequate specificity to override
intro muted text. Full lint and final catalog1808/typecheck/build PASS;269 behavior
tests from588bb31 retained (CSS-only fix, not rerun). Fresh Daylight screenshot's
background changed with ambient scene; actual RGB22/52/72 gives about4.67–5.61 at
same neighboring sample points. Night computed text RGB236/243/248; fixture items,
rose dye/Tall base/Small override and80-character saved name remain after theme,
locale and reload. No new geometry/styles beyond disclosure color. Both images
remain E: wardrobe-day-before.jpg / wardrobe-day-after.jpg, not Git.
Reduced-motion source guards exist in AmbientCanvas/useSkyNavigation/atmosphere CSS,
but OS preference runtime test NOT RUN; do not change OS/browser preferences to
manufacture a pass. Full contrast audit/focus trap/screen reader and real target
devices still OPEN; these samples are not whole-page WCAG certification.

## Completed follow-up — saved-outfit keyboard recovery
MEDIUM bounded P4-U01/P7-U01 slice, resumed at39caf2f. Check local saved-outfit
rename/delete and backup/reset confirmation focus, using synthetic outfits only.
Inspect SavedOutfits/OutfitBackup callers; reproduce any failure in an isolated
local preview before editing. Preserve native inline confirmation UX, tokens,
storage contracts and all data/legal/provider gates. No OS preference, personal
browser state, cloud or target-device inspection. If a disappearing confirmation
leaves focus on body, apply a minimal ref/effect fix in the owning component.
Acceptance: cancel returns to the invoking control; confirmed deletion focuses
the surviving save input; unrelated outfit/state remains unchanged. Run focused
checks and lint/typecheck/build only if a runtime fix is needed. Record actual
browser evidence and remaining gaps, then checkpoint/push/verify SHA.

Observed before edit at39caf2f, localhost6197 isolated synthetic library: pressing
Enter on deletion Cancel unmounts the focused button and leaves activeElement
BODY. Pressing Enter on Save clears name/disables the focused submit button,
also leaving BODY. Exact source: SavedOutfitRow cancel lacks focus restoration;
SavedOutfits successful save only clears name. Minimal fix: retain row delete
button ref and focus it on cancel; focus persistent name input on successful save.
No storage/confirmation/persistence semantics change. Rename and successful
delete already have explicit focus handling. Verify those adjacent paths too.

After rebuilt local production preview: Save via Enter focuses the persistent
name INPUT; delete Cancel via Enter focuses BUTTON aria-label `Xóa: QA focus C`.
Rename opening focuses its input, cancel/submit return to its rename button;
successful delete returns to save input and leaves the other two outfits intact.
Reset cancel preserves library; confirmed reset clears only the temporary QA
library and focuses its reset button. All actions used synthetic outfits in
isolated localhost6197 origin. Viewport556x659, document width541; no override
or OS preference changes. No error-level console logs captured. Screenshot
`E:/SkyGuideAssets/research/local-qa-2026-10-06/wardrobe-delete-cancel-focus.png`
shows restored focus ring; not tracked in Git. Tab and owned preview process
closed afterwards. Existing Button class/type/aria semantics preserved using
the same native-ref pattern as rename/reset controls.

61 focused Wardrobe tests, pnpm lint and pnpm build (catalog1808 + typecheck)
PASS. Existing Router directive/large-chunk warnings unchanged. Prior full301
tests PASS at39caf2f; not rerun for localized focus-only edit. No implementation-
mirroring tests or dependency added; actual keyboard browser behavior verifies
the focus fix. P4-U01/P7-U01 remain PARTIAL for device/screen-reader/reduced-motion,
full accessibility and actual download acceptance. Exact next: checkpoint,
maintainer R1 re-review or supplied evidence for the remaining gated paths.
