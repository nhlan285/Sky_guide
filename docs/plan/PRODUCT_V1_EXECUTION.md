# Visible V1 execution — active phase

## Goal / dependencies / authority
Direct takeover2026-10-08: deliver visible working V1 in the existing app. Reuse
source-verified K15 catalogue, original SVG renderer, slot engine, save/share,
K02/K03 evidence and current staging. R1 remains OPEN; independent slices proceed.
No main/production/paid changes, inferred art rights or speculative source data.

## Current slice: Analytics → Item/Wardrobe
Analytics: actual CLI confirms existing project sky-guide on Dyland Hobby, active,
no trial. Web Analytics already enabled. Official free limits verified2026-10-08:
50,000 events/month shared by team,1 month reporting; custom events unavailable.
Sources: https://vercel.com/docs/analytics/limits-and-pricing and
https://vercel.com/docs/analytics/package.
SDK2.0.1 mounts once outside StrictMode with explicit React Router pathname/route.
No local collection; no custom events/identity calls. Pageviews omit search/hash,
reject unknown/private paths and external sensitive referrers. No-referrer policy
prevents query values from leaking in same-origin analytics HTTP Referer headers.
Acceptance: lint/typecheck/build/privacy tests, Preview script/network evidence,
SPA navigation without query/hash duplicates, dashboard Preview ingestion.
Production ingestion remains dependent on a later separately authorized release.
Owner metrics: Visitors/Page Views per public page/route, device/browser/country,
ordinary public referrers, item-detail routes. No custom dashboard or Hobby events;
pageviews are navigation signals, not proof of saving/equipping an outfit.
Dashboard Production starts at0; switch environment filter to Preview for QA.

Wardrobe: bounded public ID pilot in source-verified cape/mask/hair slots. Preserve
generic demo, stable real IDs in selected/saved/shared outfit and unrelated slots.
Original self-created geometry is explicitly an illustrative representation;
never claim game calibration/media rights or infer source top/bottom mapping.
Unsupported records remain unavailable with contextual return to lookup.
Acceptance: compatible slot replacement, real ID selection/visible preview,
save/reload/share, old demo compatibility, desktop/mobile keyboard/empty/error.
Relevant modules: features/wardrobe package/intent/editor/render/save/share,
features/items detail action, focused domain tests, shared analytics/root/privacy.

## Validation / handoff
Analytics3 privacy tests/lint/typecheck/build PASS locally. Preview7a1d17a READY,
rendered root→hub→items→item detail in authenticated in-app browser; one SDK2.0.1
script with disableAutoTrack1/no-referrer meta verified. Dashboard received real
pageviews (first2 root/hub,1 visitor); Preview filter selected. Raw collection POST
body/status capture is not available through this browser API and remains OPEN;
DOM/runtime checks and ingestion are separate evidence. Query churn exercised;
Dashboard Preview later showed exactly4 pageviews for4 routes (root/hub/items/
item1011) after Blue→Red→Blue query churn; pages omit queries. No Production release.
Pilot implementation now6 exact source records (cape6/1011/1012, mask4, hair5/10).
Own cloned geometry/anchors carry explicit self-created status; real IDs remain
in outfit, game dye/compatibility never inferred. r3 is an additive package;
only exact r1/r2 backwards compatibility and unchanged library key accepted.
4 focused pilot tests PASS; full461 tests/0fail/0skip and build PASS. Browser
Previewa47a15f verified lookup→Blue Cape actual SVG bindings with real1011 ID;
adding hair5 then replacing cape with1012 preserves hair; saved QA pilot appears.
Reload exposed old URL intent re-equipping1011 over saved1012. Fix marks consumed
intent in navigation history, preserving source return link and fresh-link actions;
5 navigation tests/lint/build PASS. Updated Preview reload/share/mobile acceptance
PASS on14933c1 branch Preview: saved1012+hair5 survive reload; share restores same
IDs after reset; unsupported Sit0 preserves outfit;360px viewport no horizontal
overflow (345px content/client); no console errors. Six-item illustrative pilot
VISIBLE/accepted. No full game wardrobe/media/calibration claim. Preserve exact failures, do not call
authentication page or deployment metadata a rendered PASS. Latest checkpoints
and exact continuation live in ../CURRENT_STATE.md. Subsequent slices refine this
phase when their source/dependency evidence is ready; no future implementation log.

## Current slice: verified source tree and repeat visits
Use saved K02/K03 bounded evidence and existing FriendshipPath calculator. UI
exposes10 reviewed nodes/9 prerequisite edges, multi-node selection, deduplicated
closure, separate currencies, explicit partial subtotal/root unknown. Repeated
Leaping Dancer TS#12/#115 remain separate date-only records; ends/timezone unknown,
no current countdown/prediction or fabricated current schedule. Source-scoped
stable IDs are distinct from unreviewed K15 canonical crosswalk; do not infer item
FK or change the published catalogue. Render bounded source sample with attribution,
revision/date and unknown labels, not full catalogue coverage. No image fetch.
Files: features/spirits source-sample model/UI, App routes, Hub entry links, existing
styles/primitives, focused source/calculation tests. Validate graph corruption,
overlapping selection/unknown subtotal, repeated visits/date precision, lint/build,
browser node selection/filter/navigation and360px layout. Then checkpoint and
continue event slice when its reviewed-source intake contract is ready.
Implementation: source-scoped draft graph validated at module entry; no K15
crosswalk/public release mutation. Existing calculator used directly by checkbox
selection; known subtotal and unknown root remain separate. Two repeated visits
retain source visit IDs/date precision. App titles/route keys preserve navigation
and separate search states. Four focused model tests, lint/typecheck/build PASS.
First Preview83da713 failed because knowledge is excluded from deployments.
Added minimal reviewed-sample projection, tested against both original files;
retained .vercelignore boundary and excluded raw response/request corpus.
Preview73f09b5 READY/browser PASS: Hub navigation, R4+L4 unique subtotal5C/4H/1AC
and unknown C1, filter empty/recovery/clear, TS#12/#115 distinct date-only history,
360px no overflow on both routes and no console errors/warnings. Bounded sample
VISIBLE/accepted; crosswalk/full coverage/live schedule remain OPEN. Next milestone
integration and bounded event intake staging below.

## Event manual intake — bounded current work
Goal: reusable manual schedule draft staging while event source verification/live
service remains OPEN. Reuse SeasonEvent/PartialTime/provenance/FK validators; no
new provider, API, recurrence inference, public schedule or database changes.
Trusted maintainer context supplies registered event IDs, verified sources and
per-field reviewed evidence. Input cannot mint verification or approve itself.
All records must be draft; quarantine entire batch on bad relationship, conflicting
date precision, source drift or unknown ID. Preserve date-only/null bounds; never
turn dates into midnight instants. Source type stays explicit, no promotion of
community/calculated to official. Retain previous accepted input on failure.
Files: catalog/manualEventInput.ts, focused tests, catalog export/docs. Max50
records/100k bytes; sanitized error code/path only. Acceptance: trusted review
matching, date-only/instant distinction, invalid ranges/FKs, duplicate IDs, private
field projection, atomic failure and last-known-good preservation. Real schedules,
IANA recurrence/override resolution, live API/time and countdown remain OPEN.
Next after staging checks: original 15-note instrument as independent visible V1.
Completed bounded staging:6 focused tests PASS; lint and initial typecheck PASS.
Review binds complete declared fields (including fixture status) and source
ID/URL/revision/retrieval pins; source drift requires new review. Invalid batch
returns no candidates and retainEventDraft preserves previous identity. Synthetic
spring/fall LA-offset instants retained, not a recurrence/DST resolver proof.
INVISIBLE domain capability; no real schedule/source review, editor or public
live API delivered. Workflow: maintainer verifies source/field facts and registers
review + stable IDs outside input; stage JSON; inspect quarantined sanitized
reports or draft diff; canonical promotion/public export remain separate gates.

## Current visible slice: original music instrument
Goal: /music playable15-note3x5 grid using original generated Web Audio tones.
No game audio/rights claims, account, microphone, autoplay or new service/package.
Dependencies: existing SPA shell/primitives and authorized original sample path;
independent of unaccepted R1/event feeds. Support mouse/touch/keyboard, volume,
mute/stop and an explicit activate gesture. Lazily create only active instrument;
bounded voices and cleanup on blur/hidden/route leave. Keep errors/retry and
keyboard focus visible; no page scrolling from key shortcuts outside the grid.
Files: features/music note model/audio adapter/component, style/App/Hub links,
focused domain/audio lifecycle tests. Validate mapping/frequency/polyphony and
silence/cleanup; lint/build and actual Preview interaction/mobile/navigation.
Original waveform is illustrative, not a mapped catalogue instrument. Known item
deep links remain unsupported until verified music metadata/rights crosswalk.
Refined pilot: exact K15 Harp81 and Piano227 identities now explicitly map to the
same original tone set, not game timbre. Source slots/categories stay unknown;
no name-based global classification. Selector, item detail CTA, instrument query
and unsupported deep-link warning added; one active original set, no sample fetch.
Full476 tests PASS before this mapping,5 focused music tests PASS after mapping;
latest lint/typecheck/build PASS. New Preview acceptance pending.
Implemented original sine pluck with lazy AudioContext,8 bounded voices, mute/
volume/stop, generation cancellation of pending playback and blur/hidden/unmount
cleanup. Scoped keyboard shortcuts on grid only;15 standard buttons support
mouse/touch/Enter/Space. Four lifecycle/model tests, lint/typecheck/catalog/build
PASS. Preview/browser NOT RUN. Next push/verify exact deployment, keyboard/pointer/
mute/mobile/navigation acceptance, full tests then poster-first original media.

## Next slice: original poster-first media pilot
Shared preview supports an original wave video and original call audio; no game
catalogue relation, remote footage, sample rights inference, upload or new service.
Use browser-native Canvas/MediaRecorder only after explicit preparation action,
480x480/24fps/3s WebM <=300kB; original2s mono WAV <=100kB generated on demand.
Poster rendered first, no fetch/prepare on gallery entry. Only active selected
sample exists; Blob URLs/tracks/frame callbacks/recorders disposed on switch/leave.
Explicit playback, native accessible controls, reduced-motion poster default,
prepare/error/retry/unsupported/rights-withheld states. Original assets stay local
in memory and cannot be promoted to game media/R2 without separate reviewed
metadata/provenance/rights gates. No encoder install needed; unsupported recorder
leaves poster and explains limitation. Validate sizes/waveform/cancellation,
browser preparation/playback/switch/mobile and lifecycle cleanup. R4 actual game
coverage/storage/integration remains OPEN; this is an authorized original pilot.
Implemented bounded native recording and WAV generation;6 focused media tests
PASS (header/duration/non-silence/abort/overflow/track cleanup). Lint/build PASS
after test-only TextDecoder import correction. Browser acceptance pending.

## Integration defect: old Preview chunks
Actual console reported missing SpiritSamples-smIbltQ-.js on branch alias after
deployment updated. Probe:HTTP200 text/html, not JS, because old hash is absent
and SPA fallback applies. Minimal route error boundary keeps shell/navigation,
explains interruption and offers user-triggered reload; no automatic reload loop
or storage deletion. Use immutable per-commit Preview URL for reliable QA.
Boundary error injection NOT RUN; lint/build and normal-route navigation required.
Full483 tests PASS. Immutable Preview9474401 browser: initial poster/zero players,
WebM75.2kB480x480 plays to2.953s/end; WAV88.2kB2s plays; switch/unavailable rights/
abort-on-route-leave/360px no overflow PASS. No current-host console errors. One
selector-unavailable title mismatch fixed; license uncertainty now visible and
error boundary focuses heading. Latest lint/build PASS; held old-alias tab3 on
9474401 Hub will test genuine changed lazy chunk after next update. Physical
audio capture/raw network trace unavailable. Dashboard Preview observed36 views/
1visitor across10 pathname-only pages incl music/media; no custom events.
