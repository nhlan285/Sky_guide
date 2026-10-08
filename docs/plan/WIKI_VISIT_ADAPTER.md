# P2-D07 — independent K03 Wiki visit staging

## Goal / dependencies / scope
MEDIUM. K03 source P1-D03 and per-source field map verified; P2-D02 visit validators
DONE. K04 sheet/export remains403-blocked, so whole P2-D07 stays PARTIAL.
Implement pure bounded Spirit Visits wikitext adapter against cached111650;
no HTTP, public history update, schedule rules, predictions or sheet assumptions.

## Contract / files
scripts/wiki/visits.mjs accepts wikitext, pinned verified K03 SourceRecord for
Spirit Visits, explicit historical cutoff date and mappings with spiritSourceKey,
sourceVisitKey (TS#n) and complete draft TravelingSpiritVisit seed. Supplied visit
and spirit IDs must be registered. Seeds must have unknown start/end and null
tree (crosswalk/variant unresolved). Preserve fixture status, canonical IDs, source
date label and field provenance; status confirmed means source-observed arrival,
not independent official or completed-visit confirmation.

Require recognized Appearances by Spirit table/header. Parse only mapped rows,
with exact Wiki link key; parallel visit/date lines aligned before excluding
SV/Error, never-returned season-end or future rows. No fuzzy names, sorting keys
as identity, modern96h ends, timezone or inferred clock. Exact English calendar
date normalization retains date precision, timezone/end null. Separate mappings
for repeat visits produce separate caller IDs. Unknown markup/alignment/missing
mapped visit rejects whole batch with null candidates and sanitized report paths.
Raw module/table limit1MiB; do not expose whole source in diagnostics.

## Validation / acceptance / next
Tests: actual supported layout synthetic fixture; repeated visits/parallel SV and
Error positions; no inferred ends; exact cutoff; malformed headers/counts/dates,
duplicate crosswalks and missing references/source metadata; no input mutation or
empty-catalog replacement. Offline111650 dry-run with synthetic canonical IDs,
never production crosswalk. Tests/lint/typecheck/catalog/build; update source
profile/master/handoff and push. K03 scoped adapter DONE2026-10-06, baseline548db41;
whole P2-D07 PARTIAL. Seven focused/258 full tests, lint/typecheck/catalog1808/build
PASS. Offline cached111650 staged TS#1152024-06-06 and TS#122020-06-25 with synthetic
IDs, raw abbreviated labels and ends/timezones null, matching pinned evidence.
No production crosswalk or records written. Unsupported selected layout remains
quarantined; unselected rows are not a whole-corpus coverage claim. Headers use
actual Icon column, not a hypothetical Expression field. Supported dates are exact
abbreviated English labels; other formats quarantine until verified and tested.
Exact next: checkpoint/push; proceed to independent P6-U03 outfit local backup/
import/reset contract. K04 integration/reconciliation, coverage and public
promotion remain OPEN with access/rights gates.
