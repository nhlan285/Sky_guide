# Item assets on E:

This feature branch is for local review. No browser automation, upload, deployment,
or merge is part of the pipeline. Acquisition is independent of reuse permission.
Public Wiki text licensing does not approve the images.

## Storage and preflight

Copy `.env.example` to `.env`, or set the named environment variables in PowerShell.
Node reads `.env`; existing process variables take precedence. The shared
`scripts/assets/config.mjs` defaults to `E:\SkyGuideAssets`. Absolute E: paths are
required; C:, UNC, relative paths, drive roots, repo `.vscode`, cache, Temp and
node_modules locations are rejected. Missing/unwritable E: and unsafe junctions
stop the command. There is no fallback, temporary image directory, or repo cache.

```
E:\SkyGuideAssets\
  raw\images\                  SHA-256 originals, format sniffed from bytes
  raw\responses\               resumable paginated MediaWiki response snapshots
  metadata\pages\              discovery snapshot and crawl checkpoint
  metadata\files\              source HTTP validators/hashes and optimization state
  metadata\mappings\           complete corpus, mapping evidence, source-to-hash
  processed\thumbnails\        fit inside 256px, never upscale
  processed\cards\             fit inside 512px, never upscale
  processed\detail\            fit inside 1024px, never upscale
  manifests\                   local preview manifests and full item audit
  reports\                     discovery, preflight, assets, validation, safety stops
  failed\                      per-source failures, exclusions, processing failures
  logs\                        command and failure history
```

Each command checks free space, raw cache usage, write access and directories.
Defaults: raw cache soft limit **15 GiB**, minimum free space **20 GiB**, network
concurrency **4** (configurable integer 1–8), Git asset budget **64 MiB**.
Before requests, workers reserve up to the 40 MiB per-response maximum against
both raw capacity and free space. API responses use the same raw capacity guard.
Optimization also checks free space before writing. `CACHE_LIMIT_REACHED` stops
new downloads, lets in-flight work checkpoint, and writes the attempted URL,
usage, configured limit and remaining work into `reports/cache-stop.json`.

## Commands

Use the repository's pinned **pnpm 10.30.3 / Node 24**:

```powershell
pnpm assets:wiki:preflight
pnpm assets:wiki:discover
pnpm assets:wiki:download
pnpm assets:wiki:build
pnpm assets:wiki:validate
pnpm assets:wiki:stats
pnpm dev
```

`discover --refresh` creates a new API snapshot; a normal run reuses the completed
snapshot. API queries are paginated, rate spaced, retried with backoff, cached per
snapshot and limited to two workers. Interrupted discovery resumes from cached
responses without duplicating completed requests. The earlier complete discovery
can be adopted once with `discover --import-snapshot=<path>`; the snapshot's
timestamp/revisions and import source are retained, rather than claiming a fresh
network crawl. The full same-day crawl on this branch was adopted this way.

Discovery covers category descendants, item-index links, season/event/spirit
pages, page galleries, File pages, redirects and nine literal data modules. Lua is
parsed as data, never executed. It is not limited to one season. Videos/SVGs are
indexed and explicitly reported as unsupported raster inputs, with zero download
attempts. They are not silently attached as cosmetic artwork. Music Sheets are
included in discovery; a shared generic note icon is not evidence for an individual
sheet and is not promoted to an item primary.

Downloads use source revision/file timestamp, local SHA-256 and ETag/Last-Modified.
Completed per-file metadata is written atomically before moving to the next file;
an interrupted aggregate run resumes by reading those records. Missing/corrupt raw
files are repaired. Transient HTTP/network failures get four attempts with timeout
and exponential backoff; 400/401/403/404/410 and invalid images are recorded without
repeated requests. Access controls are never bypassed. A failed source retains
URL, page/item IDs, HTTP status/error, attempts, retries and timestamp.
Permanent failures are cached against source revision/file timestamp. Use
`download --retry-permanent` to explicitly retry them without an upstream change.

Validation checks HTTP success, Content-Type, binary signature, nonzero size,
dimensions and full decode. The CDN sometimes returns WebP at a PNG-named URL;
the stored extension follows the actual decoded format. Raster input is capped at
40 MiB and 80 million pixels; larger or unsupported inputs remain in discovery and
failure reports. GIF previews use their first frame and retain `pages` in raw
metadata. Transparent renders use lossless WebP and preserve alpha; opaque media
uses quality 90. Variant identity incorporates the content hash and processing
version, and intact outputs are not rewritten.

## Mapping, manifests and runtime

`data/wiki-assets/item-overrides.json` holds aliases, binding mappings, primary
selection overrides, and separately reviewed rights records. Existing reviewed
binding overrides are retained. Matching uses canonical names/identifiers,
category, redirects, aliases, spirit and season relations, module fields and page
usage. Ties stay `ambiguous` with no assignment. Statuses are `exact`,
`high-confidence`, `manual`, `ambiguous`, `unmapped`.

Clean isolated/transparent renders are preferred, then inventory reference images,
item screenshots and worn previews. Multi-item generic files cannot become a
primary automatically. Gallery roles remain `worn-preview`, `alternate` and
`reference`. A manual primary requires the mapped media ID and a review reason.

`manifests/items.json` preserves per-item source pages, revisions, File pages,
source filenames, download timestamps, raw absolute source paths, uploader,
attribution, separate rights metadata, hashes, dimensions, primary and galleries.
`metadata/mappings/source-to-hash.json` also includes downloaded but unmapped
media. Runtime index/detail shards omit filesystem paths; the catalogue loads one
index and detail shards only on demand. Source URLs are links in credits, never
image sources. Cards lazily load 512px variants; detail primary loads eagerly.

`pnpm dev` serves E: manifests and processed files through a narrowly scoped Vite
middleware at `/assets/items/...`. Only known manifest names and SHA-256 WebP
paths are allowed, with junction checks and no directory listing. Local unknown
rights media can be inspected under the owner's task authorization; this does not
mark it verified. The manifest explicitly records publishing eligibility.

Build output exports **verified rights only**. Unknown/restricted records remain
in the E: store and audit, while public runtime manifests show neutral placeholders.
A `verified` rights override requires reason, evidence URL, review date, credit
and license; neither public availability nor a Wiki license label verifies reuse.
Review actual asset permission before adding such an override.

The storage adapter constructs content-addressed paths and never uploads. A later
operator-controlled migration can set `SKY_ASSET_PUBLIC_BASE_URL` to an owned HTTPS
bucket/CDN prefix, sync processed files separately and rebuild manifests. Fandom
or Wiki CDN bases, credentials in URLs and unsafe paths are rejected. The bundled
`assetStorage.json` pins the allowed origin/prefix so arbitrary external URLs cannot
become image sources. No credentials or cloud services are needed for local review.

Before public copying, the report calculates count, bytes, average and largest
eligible variant files. Assets exceeding the Git budget remain on E: with public
placeholders and an object-storage recommendation. Raw responses/images, complete
corpus and bulk manifests are never copied into Git. Only small public manifests,
summary reports, code/config/tests and eligible bounded binaries are candidates.

## Cleanup and checks

```powershell
pnpm assets:wiki:clean-raw --confirm-delete-raw
```

This explicitly destructive command validates the resolved exact `raw` directory
and rejects symlinks before removing it. It never deletes the asset root, processed
files, metadata/mappings, manifests, reports or repository assets. A following
download rebuilds only missing raw data; processed variants remain reusable.

Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and all non-destructive
asset commands. Tests use synthetic bytes under E: `metadata/tests`, remove only
their own verified temporary test directory, and never use browser automation.
The human checks day/sunset/night catalogue stages, cape/hair edges, placeholders,
gallery, mobile/desktop detail and contextual filter persistence manually.
