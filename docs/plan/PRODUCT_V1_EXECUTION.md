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
and separate search states. Three focused model tests, lint/typecheck/build PASS.
Browser acceptance NOT RUN; exact next is pushed Preview selection/filter/mobile
verification, then milestone integration and event intake planning.
