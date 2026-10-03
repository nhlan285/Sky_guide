# Real catalogue media

This feature is local-only on `feature/item-real-media`, based on develop
`b873a47cc091e717f17aad5805de5b45183cc808`. The branch disables its automatic Vercel
deployment in `vercel.json`. It does not change the wardrobe asset registry.

## Reproduce and update

Use the pinned Node/pnpm versions from the repository:

```sh
pnpm media:wiki:update
pnpm media:wiki:validate
pnpm media:wiki:stats
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The update resumes the snapshot in `.cache/wiki-media/current.json`. Completed
API responses are keyed by their sorted query hash, so interruption resumes
without re-fetching completed requests. To take a new snapshot of the live Wiki:

```sh
pnpm media:wiki:update --refresh
```

Keep the snapshot directory until the update finishes. No credential is needed.
Two concurrent workers, a global 250 ms request-start interval, 45-second
timeouts and four attempts with exponential/Retry-After backoff bound requests.
API errors, unexpected warnings and unsupported literal syntax fail the import;
the failure ledger is written under ignored `data/quarantine/wiki-media/` and
the command exits unsuccessfully. A failed request does not publish an empty
replacement index. Missing upstream file titles are reported separately from
request failures. Do not treat a cached run as a fresh crawl.

## Discovery and matching

The verified public endpoint is
<https://sky-children-of-the-light.fandom.com/api.php>. The importer uses query
formatversion 2, `allcategories`, `allpages` (module inventory), recursive
`categorymembers`, `info`, `revisions`, `images`, `links`, `categories`,
`pageimages`, `imageinfo`, normalization and redirects. Every continuation token
is forwarded; repeated tokens are rejected. All relevant category names,
including source entity names and event years, are scanned. Cosmetic index
links add pages absent from category membership. Raw source/cache is not shipped.

Nine literal data modules cover spirits, seasons, events, cosmetics, emotes,
instruments, music sheets and generic spirit item definitions. Two further
modules are inspected and recorded with reasons: `Season Item/data` explicitly
labels itself WIP/not used on live pages; `Cosmetics/Outfits/data` computes its
table from the underlying modules already scanned. No upstream Lua is executed.
Duplicate literal keys follow Lua's last-value semantics and are recorded in the
discovery diagnostics. Prices are deliberately not imported from these tables.

The mapping combines names, canonical aliases/redirects, stable TSA identifiers,
spirit/season relations, category-page template evidence, file titles and
explicit item-to-file fields. Arbitrary variant suffixes do not inherit generic
item aliases. Ties remain ambiguous. File-name fallback requires a cosmetic
category-page relationship; a matching event banner alone is insufficient.
`scripts/wiki/overrides.json` contains reviewable corrections outside parser code.

Specific isolated/render names rank first, then source-declared clean/reference
views, item inventory icons, worn previews, alternate views and other gallery
images. PNG does not imply transparency. Shared generic backpacks cannot become
a primary image. No-cosmetic/question-mark placeholders, generic music-sheet
overlays and season symbols are not substituted for unique item imagery. Music
sheets without a unique image remain unavailable. No claim of complete coverage
is made; expressions/upgrades and unmatched names remain significant gaps.

Unknown catalogue categories and missing season/spirit relations can be filled
by a separate Wiki overlay. Existing verified values and prices remain intact.
Both sources survive disagreements in `conflicts.json`, with the resolution
`preserve-catalogue`. Provenance includes module fields/revisions and category
page evidence; aliases are searchable. Snapshot dates are observation dates,
not assertions that all pages were edited simultaneously.

## Files and frontend

- `data/wiki-media/manifest.json`: corpus checksum and SHA-256 of each 250-record
  audit chunk. The complete discovered corpus includes unmapped files.
- `data/wiki-media/discovery.json`: scanned pages/categories, revisions, module
  inspection, redirects, missing file titles, requests and source rights metadata.
- `data/wiki-media/entries.json`, `mappings.json`, `conflicts.json`: item relations,
  evidence and unresolved disagreements.
- `data/wiki-media/report.json`: counts, gaps, ambiguity and category breakdown.
- `public/data/wiki-media/<content-hash>/index.json`: compact thumbnail/alias
  summaries, fetched once by the catalogue. No upstream crawl runs in the client.
- `public/data/wiki-media/<content-hash>/items-XX.json`: details and credits in
  stable groups of 100 upstream IDs, loaded on opening an item.
- `src/data/itemLookup/wikiManifest.json`: the tiny bundled version pointer,
  published last. Immutable paths prevent mixed index/detail caches.

Only metadata and public URLs are committed; no image corpus is downloaded.
The runtime validates responses and shows a retry action for metadata failures.
Failed external images retain their square stage and show a quiet unavailable
message. Category glyphs do not occupy item image stages. The catalogue sorts
items with images first, retaining every unmatched item in search and filters.

Cards use lazy/async thumbnails, a square contain stage, 248 px minimum desktop
width and one column below 640 px. Opaque, subdued stage colors follow all three
themes. Detail uses a large image beside identity/context links and separate
responsive preview/reference grids. Originals are used only at reasonable
dimensions; larger files retain their API thumbnail. Attribution lives in the
detail Sources section, with MediaWiki HTML rendered as inert text.

## Rights and scope

The owner explicitly requested real public Wiki image references for this local
catalogue feature. This supersedes the old reference-only presentation for this
feature; it does not establish new IP permission. Every record says
`usageMetadata.mode: external-reference` and `permissionStatus: unverified`.
`siteinfo.rightsinfo` reports CC-BY-SA for text. Individual `extmetadata` license
and credit fields are preserved; absent image licenses stay absent. An uploader
is not assumed to be the rights holder. Neither MIT catalogue licensing nor Wiki
text licensing is applied to image rights. Full wardrobe/game assets remain
pending under K13. No game extraction, binaries, deployment or browser automation
is part of this work.

## Manual visual acceptance

MANUAL VISUAL CHECK REQUIRED. Automated checks use Node model/parser tests and
server-rendered component markup only. A human should open the local app and:

1. Inspect masks, capes, hair, outfits, accessories, props and instruments in
   daylight, sunset and night, including transparent edges and narrow phones.
2. Open item details with primary, worn and alternate images; inspect attribution.
3. Block an external image request and confirm the neutral stage keeps its size.
4. Follow Season of Abyss, spirit and category links, combine filters, refresh,
   open a detail and return; verify the URL retains the chosen filters/page.
5. Compare any suspect mapping against its file page and source module revision;
   add reviewed corrections to the override file, then rerun update/validation.

For a clean snapshot check, the original workspace currently has unrelated empty
untracked `constellation/StarField.tsx` and `constellation/useTheme.ts` files. The
latter shadows the tracked `useTheme.tsx`. These files are preserved; final
typecheck/build verification uses a clean checkout of the feature commit.
