# Current handoff — 2026-10-04

Branch: fix/r2-runtime-debug. Production baseline: 5fd55c5740bc88d5b3976ac465c8496a31414f76.
Active task: [R2 runtime debug plan](plan/R2_RUNTIME_DEBUG.md).
Whole-project roadmap: [existing implementation plan](plan/IMPLEMENTATION_PLAN.md).

Completed investigation: authorized abandoned edits removed; fresh origin/main;
remote env keys present for Production/Preview; production same SHA; R2 index,
shard and real card valid; exact parsers pass. Proven failures: routing reaches
SPA before dynamic functions, and default Node handlers expect Web Request URLs.

Modified areas: explicit artifact routes, Web fetch handler exports, scoped
regression and task documentation. No corpus/catalog/UI/env changes.
Validation complete: lint, typecheck, 169 tests, app build and standalone API tsc
pass. Vercel build exits 0; it emits pre-existing S3Client.send diagnostics, while
standalone API tsc passes. Existing Vite warnings remain. Regression fails against
baseline routing and passes against repaired generated Build Output.

Preview: https://sky-guide-mzb5gdr9m-dyland1.vercel.app
(dpl_8MC2MD1xjp3ETADkXh9Jo8ocLmgn, READY). Protected CLI requests prove logical
index, both API index spellings and shard are 200 JSON identical to direct R2.
The tsa-cosmetic-0 card redirects 302 to R2, returns 200 image/webp and identical
15,604-byte fully decoded data. Exact application parsers pass on Preview.

Modified files: api/asset/[...path].ts, api/manifest/[name].ts, vercel.json,
tests/data/r2Runtime.test.mjs, tests/data/itemLookup.test.mjs,
tests/data/landingLayout.test.mjs, docs/plan/IMPLEMENTATION_PLAN.md,
docs/plan/R2_RUNTIME_DEBUG.md, docs/CURRENT_STATE.md.

Maintainer authorized committing and pushing this verified patch to the new
branch. Delivery branch: origin/fix/r2-runtime-debug. The maintainer will review
and merge personally. No environment value change, corpus write or production
deployment performed by this task. Next: maintainer review of branch/Preview.
Do not merge main/develop from Codex.
