# P6-R01/R02 — Web Push and future native criteria

## Goal / scope / state
MEDIUM docs-only research after P0-U02/Q07. DONE2026-10-06 for the research
deliverable, not a deployed notification service or native app. Preserve local
foreground V1; no subscription collection, worker, sender, account, credentials,
paid resource or native project created. Branch codex/master-plan-execution,
pushed baselinec44a40e. Existing schedule/permission/provider gates remain.

## Primary evidence checked2026-10-06
Web Push receives server messages through an active service worker. A subscription
includes an endpoint and encryption material; the endpoint is sensitive, not a
public profile identifier. Subscription changes need lifecycle handling.
[MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API).

Notification permission should be requested in a user gesture, with secure-context
and capability checks. Permission state is distinct from successful delivery.
The document's Notification constructor examples target desktop; most mobile
browsers require ServiceWorkerRegistration.showNotification instead.
[MDN Notifications](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API).

WebKit's2023 platform contract introduced Web Push for Home Screen web apps in
iOS/iPadOS16.4, with a direct interaction for permission. It uses standards-based
Push/Notifications/service workers and does not require Apple Developer Program
membership for Web Push. This is a platform-document claim, not this project's
device/install/delivery test or an end-to-end $0-cost guarantee.
[WebKit platform notes](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

## Alternatives and current decision
| Option | State and cost boundary | Capability boundary |
|---|---|---|
| Foreground in-app reminders | Approved V1 direction; local opt-in, no subscription DB | Requires verified schedule/time; tab sleep/closure has no delivery promise |
| Foreground system notifications | Approved direction after capability/permission; no remote sender required | Mobile may need a service worker notification adapter; do not activate before tested capability/schedule |
| Web Push | Research only; private server subscription registry + sender + operations needed | User opt-in, lifecycle, platform/install limits; no exact-time delivery guarantee |
| Native app | Separate future scope and budget | Evaluate measured web gaps first; no automatic project/bootstrap |

## Proposed server/privacy/operations boundary — NOT APPROVED implementation
Keep subscription storage separate from catalog/public API/export and outfit
backup. Minimum record: opaque installation/subscription ID, endpoint/keys,
consent revision/time, event preferences, expiry/status and last successful send.
No QR/game identity needed. Protect register/remove endpoints, require proof of
installation ownership, rate-limit changes and never log raw endpoints/keys.
Server-only sender credentials cannot enter frontend bundles.

Unsubscribe/consent withdrawal should stop sends and purge associated private
records; invalid/expired subscriptions need removal. Proposed inactive cleanup
and diagnostic retention periods require maintainer decision before collection;
do not retain raw payloads merely for debugging. Document deletion/backup policy
and test rollback cannot reactivate withdrawn consent. These are design criteria,
not a declaration of legal compliance or an implemented retention job.

Use reviewed EventOccurrence/version/validity, idempotency per subscription/event
and bounded retries; stale schedule or withdrawn opt-in suppresses send. Sender
must not derive a guessed recurrence or poll a third-party source per recipient.
Expiry, duplicate suppression, disable/re-enable, rotation, server outage and
client permission changes need explicit tests. Granting permission is insufficient
for an active-delivery label.

Cost assessment: zero resources purchased in this research. Future budget must
measure active subscriptions, occurrences/day, recipients/occurrence, average
payload bytes, retention/write volume, egress, sender invocations/retries and
monitoring. Provider free-tier quotas/terms and overage protection are unverified;
no provider selected or $0 deployment promised. Reuse Q20 provider abstraction,
but a private subscription service is a distinct scope from public game data.

## P6-R02 — criteria for a separate native proposal
Create a proposal only when a measured requirement exceeds the tested web path:
necessary closed-app reminders, install/onboarding friction, offline recovery,
accessible audio/input latency or platform capability gaps. Include target
devices/OS versions, reproducible web measurements and acceptable missed/delayed
delivery behavior. Compare improving PWA with a native client using the same
canonical API and stable item IDs, migration/backup and privacy boundaries.
List distribution/maintenance/testing costs, owner/team capacity, permissions,
deadline and explicit non-goals. Native alone does not remove verified-source,
rights, backend-sender or OS-delivery constraints. No stack selected now.

## Validation / blockers / exact next
Primary docs read and cited; diff/scaffold link validation required before push.
No application change, so additional runtime/build tests NOT RUN for this slice;
latest264-test/lint/typecheck/build baseline remains c44a40e.
P6-U02/H01/H02 still need verified Event schedule/time and real capability tests;
Web Push requires explicit scope/provider/quota/privacy approval. Native requires
a separate user request/approved baseline. Exact next: checkpoint this research,
then audit independent P6-I01 manifest/install entry against existing self-created
branding/assets; actual install checks and service-worker pipeline dependencies
must stay separately visible, not fabricated as completed.
