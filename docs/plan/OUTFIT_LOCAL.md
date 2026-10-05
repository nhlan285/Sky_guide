# P4-W09 — local demo outfit library

## Goal / scope / dependencies

MEDIUM independent lane after P2-U01 and existing P4-W07 dye behavior. Add explicit
save, rename, delete and reload restoration for validated demo outfits. Preserve
Q08 base/effective size separation, fixture labels and existing renderer/reducer.
Reuse versioned storage, native controls and existing panel styles. No game assets,
cloud/account, autosave, share codec or package migration in this task.

## Expected files / contracts / risks

`src/features/wardrobe/persistence.ts`, local library UI, editor/reducer integration,
localized copy, scoped CSS and tests. Store only OutfitSnapshot fields, never
effective size, rules/render layers or private profile/QR. Library keys include
package ID/revision so a new package cannot overwrite incompatible saved outfits.
Bound library to 50 entries, names to 80 characters and encoded data to 100k chars.
The limits are application guards, not browser quota assumptions.

Compatibility evolution2026-10-06: the exact identity-preserving demo r1->r2
transition retains the original library key and revalidates snapshots in memory;
see [size-rule decision](WARDROBE_SIZE_RULES.md). Other package/revision keys stay
isolated. This avoids stranding saved outfits without general version fallback.

## Steps / Definition of Done

- [x] Library parsing and pure save/rename/delete/select operations; invalid ID,
  revision/dye/size rejected and one deletion leaves other records untouched.
- [x] Reducer restore validates snapshot and derives effective state anew.
- [x] Editor save/list/load/rename/delete controls and latest saved reload.
- [x] Empty, invalid/corrupt/quota, long name, keyboard/mobile and retry UX.
- [x] Focused tests + project lint/typecheck/build; visual checks if feasible.
- [x] Update roadmap/handoff, commit/push and continue P4-W10 share contract.

## Validation / exact next step

Baseline f0348ab, 209 tests PASS. R1 provider review still waiting; this slice has
no external dependency. Implementation complete; next is P4-W10 after push.
Do not mark P4-U01 entire UX or full game Wardrobe DONE from this slice.


Implemented with 215/215 full tests and full lint PASS; typecheck/catalog/build PASS. Browser QA passed desktop reload, long-name rename, focus, mobile 390x844 without overflow, delete cancel/confirm and empty state. No console errors. Read-denied retry regression covered. Next: checkpoint then P4-W10.
