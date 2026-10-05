# P4-W04–W06 — visible fixture scale override

## Goal / scope / dependencies
MEDIUM. P4-W02/W03 renderer and reducer DONE; size/priority/conflict tests exist,
but visible package rules empty. Expose one fictional tile-mask -> small-scale
rule with priority/reason and fixture disclosure; preserve chosen base size.
Keep existing geometry/layout/native controls. No Sky chibi calibration/assets,
generic alias/tombstone pipeline, provider or deployment. Full P4-U01 needs
manual visual check and remains OPEN until all UX acceptance is covered.

## Contracts / compatibility decision
Package revision bumps demo-wardrobe-v1-r1 -> r2 for rule addition. Item/size/asset/
geometry identities stay identical. One explicit, demo-ID-scoped r1->r2 snapshot
projection validates every field under current package; unknown versions/items
still reject, no fallback aliases/removals. Preserve existing r1 local library
key for this compatibility pair. Read projects valid r1 snapshots in memory;
explicit save writes current revision. Future/corrupt envelopes retain wrapper
protection. Share decode accepts this exact pair; domain validators stay strict.
This is required to avoid stranding existing P4-W09/W10 work, not generic P4-W11.

## Files / steps / UX
Demo manifest+README, bounded compatibility helper, engine/share/persistence/draft
callers, copy and editor. Use native controls, active reason/base/effective output
even when chosen base equals override; remove restores chosen base. Distinguish
rule conflict, missing size/anchor/asset/revision warning from generic action error.
Current accepted outfit remains after rejected action; remove/reset recover.
No new icons/styles/dependencies or source claims.

## Validation / acceptance / checkpoint
Behavior tests using actual production demo: equip/change base/remove, scale once,
reason active, missing calibration and conflicts stable; exact old library/share
preserved with invalid/future IDs rejected. Focused regression then full tests,
lint/typecheck/catalog/build. Browser/manual visual checks NOT RUN unless actually
performed; do not call full UX DONE. DONE2026-10-06 branch
codex/master-plan-execution, pushed baseline08a80f1. Seven new behavior tests,
54 focused and251 full tests PASS. Final lint/typecheck/catalog1808/build PASS;
existing Router directive/large chunk warnings unchanged. Initial conflict test
used nonexistent hair-wave ID; corrected to actual hair-round, no rule disabled.
Compatibility helper used by share/library/reducer/draft; no unrelated identities,
geometry or styles changed. Rule failures carry transient issueRuleIds for UI
feedback; none are persisted. Follow-up [local QA](PWA_WARDROBE_QA.md) verifies
visible override/remove/keyboard and dye/share/save/reload at390/1366; broader
P4-U01 acceptance remains PARTIAL.
Exact next: checkpoint/push; implement independent K03 Wiki staging portion of
P2-D07 using cached revision. K04 adapter/reconciliation remains access-blocked.
