# Independent lane — P2-U01 local state

## Goal / dependencies / scope

MEDIUM: implement approved Q13 versioned localStorage boundary while R1's provider
review waits. P0-I01–I03 already exist; pinned install, typecheck/lint/build provide
current acceptance evidence. Reuse that baseline; no framework/provider changes.

In scope: reusable parse/validate/version/migration/memory-fallback wrapper,
legacy locale migration, failure/retry copy in the existing settings dialog.
Out of scope: outfit save/share, cloud/account, new theme system or redesigned UI.
Expected files: `src/shared/storage/`, locale provider/settings/translations and
focused tests. Existing fieldset, note and button styles are reused.

## Contract / risks / UX

Store only validated JSON in a versioned envelope. Unsupported future versions
must not be overwritten; user can explicitly reset this key. Corrupt/quota-denied
storage leaves the app usable with an in-memory value and clear status. An unsaved
selection must not revert to an older stored value on reread. Preserve existing
language and cross-tab behavior; storage getter itself can throw. Reset affects
only the owned key, not other app/browser storage. No private QR/profile data.

## Steps / acceptance

- [x] Implement wrapper with injected storage, detached values and bounded input.
- [x] Tests: reload round trip, malformed/version/migration, quota/getter/read/write
  failures, memory recovery, future-version protection and scoped reset.
- [x] Migrate locale string to envelope; keep public hook contract additive.
- [x] Show local-only status and retry/reset controls in existing settings dialog.
- [x] Focused tests + lint/typecheck/build; update roadmap/handoff and push.

## Validation / next action

Run `node --test tests/data/localStorage.test.mjs`, focused lint, then project
checks at milestone. Browser visual QA not yet performed. Exact next action:
implement storage wrapper and tests before connecting the locale consumer.
R1 DB review remains pending independently. No P2-U01 blocker.

Completed: wrapper and locale consumer, retry/reset UI, legacy/cross-tab tests.
Validation: 7 focused + 200 full tests PASS, lint/typecheck/catalog/build PASS.
React skill checklist reviewed; browser visual QA NOT RUN. Existing styles reused.
Exact next action: commit/push this milestone, then P2-D03 independent schemas.
