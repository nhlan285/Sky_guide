# P4-H01 — catalog entry and session draft continuity

## Goal / dependencies
MEDIUM existing item/editor navigation after P3-H02, P3-W01 and P4-W09.
Baseline `22a29aa` verified locally/remotely with clean tree on 2026-10-05;
222 tests + lint/typecheck/catalog/build passed at preceding milestone.
Keep unsaved selection/dye/base size while navigating Hub/items/editor in this
tab. Item detail offers a contextual Wardrobe entry with explicit unavailable
game rendering explanation and a return link preserving lookup filters.

## Scope / contracts / non-goals
- Memory-only draft adapter, independent from local saved library. Validate against
  package revision; no new disk autosave. Reload still restores last explicit save.
- Query `item` carries stable catalog ID. Remaining recognized lookup filters are
  preserved for the return link; never accept arbitrary return URLs.
- Resolve canonical item name from bundled K15 metadata on demand; no query-name
  trust, no arbitrary fetch. Invalid/missing ID has recovery navigation.
- No mapping real Sky items to fictional demo items. Existing demo remains labeled;
  unsupported item is explained and never equipped as a lookalike.
- No asset downloads, provider, new dependency, game rendering or alias migration.

## Files / implementation / risks
`draft.ts`, navigation helper, editor and ItemDetail links, localized strings,
small intent component. Avoid loading the large catalog for ordinary demo entry.
Async catalog resolution must ignore stale/unmounted requests. Existing lookup
context must not be lost. Draft may not outlive a document reload by design.

## Acceptance / validation
Tests for draft mutation isolation/revision/invalid data, route encoding and
filter preservation. Browser: edit → Hub → editor preserves selections/dye/size;
item detail → demo explanation → back preserves filters, unknown item safe;
mobile/keyboard labels. Focused tests then lint/typecheck/full suite/build.

## State / exact next action
Implement pure draft/navigation helpers and integration; validate and checkpoint.
R1 provider review remains pending. P4-W11 still depends on P2-D12; no gate bypass.

Browser QA 2026-10-05 PASS: split cape + rose dye + tall size survived Hub return and ItemDetail round-trip. Warrior of Love Hair intent resolved its canonical name and did not equip demo hair; back link retained q=Warrior+of+Love. Unknown item displays recovery; 390x844 has no horizontal overflow; no console errors. Screenshot outside Git: wardrobe-navigation-mobile.jpg. Typecheck/focused lint, 16 related tests and existing 31 wardrobe tests PASS; final suite/build running.

Final validation PASS: full226/226, lint/typecheck/catalog/build, docs scaffold and diff checks. Existing large catalog chunk and React Router directive warnings remain. Next: checkpoint/push, then inspect earliest independent source-verification tasks (P1-D01) using required skills; no automatic legal permission request or publication.
