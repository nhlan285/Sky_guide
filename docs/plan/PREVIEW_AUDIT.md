# P0-I04 / P4-I01 — existing preview audit

## Scope / evidence2026-10-06
Read-only MEDIUM acceptance reconciliation. Preserve Vercel routes, account,
protection, production and resources. No deploy/promote/rollback command run.
README's2026-10-01 scaffold acceptance already records root/about render/reload,
authenticated HTTP200 and rollback workflow for separate initial Preview.
P0-I04 scaffold was historically accepted; master row had not recorded DONE.

Existing project `prj_3sHO9ZlRQaxuKsST5RNLxu7jK5y6` / sky-guide inspected via
Vercel connector. Initial deployment dpl_DgsFKuuevzd5TpRYuG7TMm1szZdM remains
READY, source cli, commit746c0a79; it is not the master-run build. Public root/about
HTTP200 responses are authentication pages, not proof of app content.

Bounded branch list and deployment inspection confirm current existing Preview
[sky-guide-25sjmfjw2-dyland1.vercel.app](https://sky-guide-25sjmfjw2-dyland1.vercel.app)
READY, source git, branch codex/master-plan-execution, commit
588bb316510bb4540e277006e7e9f7597aebce02; deployment
dpl_Co4uyYAMTVRMVKFrhmjKt3H9h2NT, target null (preview), GitHub nhlan285/Sky_guide.
Branch alias sky-guide-git-codex-master-plan-execution-dyland1.vercel.app.
This run's normal checkpoint pushes therefore already produce previews; no extra
deployment needed. No claim that production contains this branch.

Protected `/about` fetch via connector fails403 at read_protection_bypass: current
connection cannot authorize this project's protected-content access. No retries,
protection changes, bypass secrets or authentication page counted as app success.
Maintainer can authorize project/team access or inspect the Preview themselves.
P4-I01 remote Wardrobe/deep-link/refresh/share smoke remains BLOCKED by access and
broader P4-U01 acceptance; local synthetic Wardrobe smoke is separate evidence.

## Configuration / rollback / related conditional task
Current vercel.json frozen install, lint+build/dist and filesystem/SPA fallback
remain in place with existing API/R2 routes before fallback. README rollback keeps
compatible code/data/assets, validates separate preview before maintainer production
action, and avoids Git rewrite. No actual production rollback performed or claimed.
P0-I04 DONE scaffold; fresh content/render smoke is not verified by metadata.

P3-I01 conditional proxy: K05's2026-10-05/06 single `/skytime` sample has HTTP200,
epoch-ms JSON and Access-Control-Allow-Origin `*` for anonymous simple GET. No
evidence currently requires a proxy. Close this conditional decision with **no
proxy added**; preserve owner repeat-call notice, unknown TTL/quota and local-clock
fallback contract. This does not implement schedule/time consumer P3-D01/D02 or
claim a deployed browser request test. Reopen if an actual consumer shows a CORS
failure, and verify response/call budget before introducing any proxy.

## Validation / next
Docs-only diff/scaffold; latest269 code tests/lint/typecheck/catalog/build and local
lookup/wardrobe QA retained. No paid resource or new deployment. Next continue
remaining independent local acceptance checks, retaining R1 provider/review and
data/rights/owner gates; do not promote partial fixture evidence to real integration.
