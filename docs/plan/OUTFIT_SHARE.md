# P4-W10 — versioned demo outfit links

## Goal / dependencies / scope
MEDIUM existing Wardrobe subsystem, after P4-W09 checkpoint `8173045` (215 tests,
lint/typecheck/build and desktop/mobile QA PASS). Implement Q13 compact JSON →
gzip → base64url in URL fragment. Share selection/dye/base size plus schema and
package revision only. No name, timestamps, local IDs, QR/profile, URLs or media.
No backend, new dependency, real assets, alias migration or cloud storage.

## Contracts / implementation
- `#outfit=v1.<base64url>` transport; schemaVersion inside payload remains required.
- Native CompressionStream/DecompressionStream gzip; unavailable engines show a
  recoverable unsupported state, no network fallback. Standard reviewed 2026-10-04:
  <https://compression.spec.whatwg.org/>.
- Maximum fragment 2048 ASCII characters; uncompressed UTF-8 16 KiB. Bound input
  before decode and streamed output before JSON parse, reject invalid UTF-8,
  compression/base64/schema/revision/IDs/dye/rules. Final URL max4096 characters.
- Reuse package validators and derive effective state; no arbitrary asset fetch.
- Opening a link offers explicit Apply so delayed decode or hash changes never
  replace work being edited. Existing saved library is untouched until explicit save.
- Generate link explicitly; copy is a separate user action preserving clipboard
  activation. Readonly selectable text fallback if clipboard denied; no stale
  generated link displayed after selection changes.

## UX / risks / acceptance
Loading/ready/error/unsupported/too-large, empty selection, long link, mobile and
keyboard labels. Async parsing cancels stale results on hash changes/unmount.
Round-trip non-default dye/base size; missing/foreign IDs/version fail closed;
decompression expansion limited; private metadata excluded; blank-session link
applies correct state; browser clipboard/manual-copy fallback and no errors.

## Files / validation / next action
`share.ts`, `OutfitShare.tsx`, editor/copy/CSS, `outfitShare.test.mjs`, schema docs.
Focused codec tests then lint/typecheck/full test/build and localhost browser QA.
No external blocker. P4-W11 remains dependent on P2-D12 public migration loader.
Next: implement codec/tests, UI integration, validate and push milestone.

Completed 2026-10-04: 7 focused codec tests, 222/222 full tests, lint/typecheck/catalog/build PASS. Browser copy + empty editor apply restores six items/rose dye/tall size without saving library; mobile 390x844 has no horizontal overflow; focus returns, stale link hidden after edit; no console errors. Screenshot outside Git: outfit-share-mobile.jpg. Native unsupported APIs covered by unit tests; clipboard-denied branch implemented, not simulated in browser. P3-W01 existing Hub demo link now opens last saved outfit through P4-W09, no additional widget needed. Next: push milestone and inspect independent remaining roadmap tasks.
