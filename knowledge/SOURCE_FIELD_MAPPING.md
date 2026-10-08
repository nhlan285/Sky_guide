# Source field mapping — P1-D13 (2026-10-06)

Reviewed mapping for verified samples, not runtime import/publication approval.
Evidence and source revisions are linked in each profile. K04 columns remain
BLOCKED; the whole-source P1-D13 task is PARTIAL. No generic adapter silently
fills missing values. K15 remains the approved Item Lookup runtime source.

| Source / raw field | Normalized target / transform | Missing or gated fields |
| --- | --- | --- |
| [K01](01-wiki-items.md) Lua record key/name/alt_name | Item source key/name; reviewed aliases only, not canonical ID by name | ID/spirit/season crosswalk; unclear alias quarantined |
| K01 item_type/price | retain rawSlot; exact verified types map only; typed cost token or unknown | Outfit/footwear not forced into top/bottom; absent price != free; raw unfamiliar currency retained |
| [K02](02-wiki-regular-spirits.md) name/category/realm | Spirit name/regular classification; realm name awaits FK | canonical spirit/realm/item IDs required from caller/crosswalk |
| K02 tree/node keys and reviewed parents | FriendshipTree variant/revision scope; FriendshipNode parentNodeIds from reviewed edges | coordinates not graph inference; optional=null absent |
| K02 explicit/default cost | CurrencyAmount with field provenance; C=candle,H=heart,AC=other + original label; default only when renderer+data+prose verified | root cost unknown; shared ancestor closure counted once; partial totals stay incomplete |
| [K03](03-wiki-traveling-spirits.md) Visit#/Date | scoped TS visit key, startsAt date-only; repeated visits retained | endsAt/timezone null; SV/Error/never-returned rows not TS; hints/upcoming not prediction/history |
| [K04](04-ts-calculator.md) directory link/ActiveCell | attribution/link verified; tab hint retained only as raw hint | actual workbook columns/export unavailable403; no normalized visits |
| [K05](05-thatskyapi.md) epoch/timezone | TimeReference sourceInstantUtc from epoch milliseconds; IANA America/Los_Angeles | receivedAtDevice separate; no event schedule, validityUntil/quota/license unknown |
| [K06](06-official-patch-notes.md) heading/date/version/link | official article title, release date-only, raw version, source URL; original concise summary | stable revision/exact updatedAt/build null; relative age not instant |
| [K07](07-wiki-map-shrines.md) realm/location/file | text location with revision; file title and dimensions are candidate media metadata | map FK/coordinate system/precise markers unknown; Self/Fairuse not publication grant |
| [K08](08-appunwrapper.md) article/date/scope | source metadata and original summary; mark obsolete/unverified passages | no automatic RouteStep from old guide; unknown map creator/media rights |
| [K09](09-wiki-video-playlists.md) Wiki caption/video ID/oEmbed | original link, creator/title verified; per-part source when footage reviewed | no fabricated timestamps/route steps from unseen video; playlist membership unknown |
| [K10](10-app-store-iap.md) listing label/amount/storefront | dated iOS/US/USD raw observation, source/time | label not SKU; contents/tax/promo/VND unknown; no current-price relabel |
| [K11](11-google-play-iap.md) package/gl/hl/range | Android app identity, region request vs locale separate | per-SKU prices absent; app free/range not item price; no iOS substitution |
| [K12](12-apppricinglab.md) label/$/checked date | manual source/raw label only; provider checked date != retrieval time | currencyCode/market/SKU/contents not verified; cannot construct valid PriceObservation; one stale snapshot not full history |

Every real domain record needs explicit SourceRecord/provenance IDs and a
supplied canonical registry. SourceRecord retains source URL/revision/retrievedAt,
attribution/licenseNote/transformNote/verification status. Cross-source fields
keep their own evidence; do not replace canonical IDs or verified values by fuzzy
names. Unknown/free/zero and node-cost/path-total remain distinct. Only reviewed
records can advance toward export; source verification alone never sets published.

Unknown fields stay null/raw where the target supports them. Missing required
identity, SKU, market or source evidence is a review/quarantine error, not a guessed
default. Raw text/assets, private evidence, share locators and downloaded corpora
stay outside Git/public projection. Provider, RIGHTS/TGC, Event Rule and Q12
license-version gates remain independent of mapping completion.
