# R2 runtime debugging — 2026-10-04

## Goal and scope

Restore existing logical manifest/image delivery through Vercel to private R2.
LARGE investigation, minimal infrastructure patch. Keep the existing browser
paths, JSON proxy and presigned image redirects. Corpus, crawler, mapping,
processing, catalog, UI, environment values and production deployment are out of scope.

## Dependencies and prior decisions

Started from current origin/main `5fd55c5740bc88d5b3976ac465c8496a31414f76`
on `fix/r2-runtime-debug`, after discarding exactly the four user-listed abandoned
files. Working tree was clean. Production deployment `dpl_HV4v2MWRdQBk54EguawG1mZhkr9D`
is READY, main, same SHA. Remote CLI confirms all five R2 keys in Production and
Preview. Existing roadmap remains in IMPLEMENTATION_PLAN.md.

## Evidence and decision

### Production requests before edits

Origin: https://sky-guide-six.vercel.app. Every requested URL below was also its
final URL, with no redirect chain. Content-Length was absent; measured body was
1,155 bytes. Classification: HTML, not JSON/R2 or a Vercel error response.

| Requested URL | HTTP | Content-Type |
|---|---|---|
| https://sky-guide-six.vercel.app/assets/items/manifests/index.json | 200 | text/html; charset=utf-8 |
| https://sky-guide-six.vercel.app/api/manifest/index | 200 | text/html; charset=utf-8 |
| https://sky-guide-six.vercel.app/api/manifest/index.json | 200 | text/html; charset=utf-8 |

Same first 150 safe characters for all three:

```text
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

```

### Remote environment names and deployment

Checked using linked sky-guide CLI (`vercel env ls`), not local env files.

| Key | Production present | Preview present |
|---|---|---|
| R2_ACCOUNT_ID | Yes | Yes |
| R2_ACCESS_KEY_ID | Yes | Yes |
| R2_SECRET_ACCESS_KEY | Yes | Yes |
| R2_BUCKET | Yes | Yes |
| R2_ENDPOINT | Yes | Yes |

CLI inspect and deployment API: production sky-guide-p6g5uini8-dyland1.vercel.app,
dpl_HV4v2MWRdQBk54EguawG1mZhkr9D, READY, main,
5fd55c5740bc88d5b3976ac465c8496a31414f76, exactly origin/main.

### Same-item chain and proven failures

- Logical index, shard, card and both API index spellings: 200 text/html,
  identical SPA response, 1,155 bytes, no redirect.
- Direct R2 index: 200 application/json, 2,037,648 bytes; exact parseAssetIndex passes.
- Deterministic first non-null primary: tsa-cosmetic-0, items-00, version
  0211d69fe833d2dc. Shard: 200 application/json, 148,523 bytes; parseAssetShard passes.
- selectItemAsset returns /assets/items/cards/dea4a8a1447157a6b56839c8ccb70a635463c3cd9807f9d5e9b386de2f12f2d9.webp.
  R2 object exists, image/webp, 15,604 bytes; full decode passes, 300x300 alpha.
- Unchanged vercel.json equals origin/main. Generated config places SPA fallback
  at route 3, API dynamic routes at 4/5; asset dynamic route matches one segment.
  Both generated functions exist.
- Literal manifest function returns 500; remote log reports ERR_INVALID_URL from
  relative /api/manifest/[name]. Local Node-style request reproduces it.
- Fix: explicit routes to function artifacts with validated query parameters;
  default { fetch } export opts handlers into Vercel Web Request/Response contract.
  No architectural migration or environment change is required.

## Implementation and contracts

Affected files: vercel.json, the two api handlers, runtime regression test.
Keep GET/HEAD/405, manifest cache headers, private credentials, image TTL/cache,
path/name allowlists, JSON errors and UI retry behavior. Validate rewritten
parameters using the existing allowlists; never log signed query strings.

## Steps and acceptance criteria

- [x] Cleanup, fresh baseline, production request identification, remote metadata.
- [x] Direct R2 reads, same-item chain and exact parsers.
- [x] Baseline Build Output routing and handler failure reproduction.
- [x] Print ROOT CAUSE/EVIDENCE/MINIMAL FIX/FILES before source edits.
- [x] Minimal routes and handler contract repair.
- [x] Runtime regression: requests dispatch to functions, JSON parses, card
      redirect reaches WebP, GET/HEAD, invalid paths and error responses.
- [x] pnpm lint, typecheck, test, build; API tsc; vercel build (exit 0;
      pre-existing builder diagnostics described below).
- [x] Inspect repaired generated routes and validate production-like endpoints.
- [x] Update handoff and report final diff/status; no push or merge.

## Risks, validation and next step

Routing must target generated function artifacts before SPA; Web export must be
recognized by deployed Vercel runtime. Test local routing plus actual Preview
where possible. Do not infer remote env from local files. Baseline vercel build
exited 0 but emitted S3Client.send type diagnostics; standalone API tsc passed.
Investigate if diagnostics persist in final build without masking checks.

## Validation checkpoint

169 tests pass. Two pre-existing tests assumed config.rewrites on origin/main;
updated their SPA assertions to config.routes without changing app behavior.
New HTTP regression includes Items/detail/Wardrobe reloads. Regression fails with
unchanged origin/main routing and passes with repaired .vercel/output/config.json.
Generated routes 0–3 now directly target existing artifacts; filesystem is 4 and
SPA fallback is 5. Logical index, logical card and API index all dispatch first.

All requested commands exit 0. Local vercel build emits pre-existing TS2339
S3Client.send diagnostics for the manifest handler even though standalone
`npx tsc -p api/tsconfig.json --noEmit` passes. Do not mask them with a cast or
disabled typecheck. Existing Vite directive/chunk-size warnings also remain.

Preview built from local output: https://sky-guide-mzb5gdr9m-dyland1.vercel.app,
dpl_8MC2MD1xjp3ETADkXh9Jo8ocLmgn, READY. Deployment protection retained;
endpoint checks use vercel curl. No production deployment or git push.

## Preview acceptance results

All requests used the protected Preview above through vercel curl. No signed
query credentials were printed. Manifest responses have no redirects and no
Content-Length header. Logical image response is an empty 302, no Content-Type
or Content-Length, followed internally to R2 (signed query redacted).

| Stage/path | Status | Content-Type | Expected | Actual | Result |
|---|---|---|---|---|---|
| Direct R2 manifests/index.json | 200 | application/json | Valid index | 2,037,648 bytes; parser passes | PASS |
| Preview /assets/items/manifests/index.json | 200 | application/json; charset=utf-8 | R2 index | Exact same bytes; parser passes | PASS |
| Preview /api/manifest/index | 200 | application/json; charset=utf-8 | R2 index | Exact same bytes | PASS |
| Preview /api/manifest/index.json | 200 | application/json; charset=utf-8 | R2 index | Exact same bytes | PASS |
| Preview /assets/items/manifests/items-00.json | 200 | application/json; charset=utf-8 | R2 shard | Exact same 148,523 bytes; parser passes | PASS |
| Preview /assets/items/cards/dea4a8a1447157a6b56839c8ccb70a635463c3cd9807f9d5e9b386de2f12f2d9.webp | 302 → 200 | image/webp at R2 | Same card image | Exact same 15,604 bytes; full decode passes | PASS |

wikiBucket(tsa-cosmetic-0) selects 00; selectItemAsset on the Preview shard selects
the exact card path above. Image SHA-256:
3dfa8655a7e4e2405f2d03949681f61050909331f41eb2a35b6258737dd76381.

Final changes: two handlers, vercel.json, new r2Runtime.test.mjs, two stale SPA
config test assertions, this plan, master-plan pointer and CURRENT_STATE.md.
Follow-up authorization: maintainer requested commit/push to the new branch and
will review/merge personally. Delivery branch: origin/fix/r2-runtime-debug.
No merge, environment writes, corpus mutation or production deploy by this task.
Exact next step: maintainer review of the proven patch and Preview. Keep
main/develop unmerged from Codex.
