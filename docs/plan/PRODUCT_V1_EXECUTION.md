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
Analytics3 privacy tests/lint/typecheck/build PASS locally; Preview network and
ingestion pending first integration push. Preserve exact failures, do not call
authentication page or deployment metadata a rendered PASS. Latest checkpoints
and exact continuation live in ../CURRENT_STATE.md. Subsequent slices refine this
phase when their source/dependency evidence is ready; no future implementation log.
