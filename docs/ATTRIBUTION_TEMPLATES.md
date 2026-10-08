# Attribution templates — P1-U01 draft, 2026-10-06

Maintainer/editor templates for text, sheet, route and asset credits. These are
review drafts, not a license decision, release approval or implemented UI.
Q12 remains OPEN. Use the verified source profile and pinned evidence for each
record; never use the project license to replace an upstream license.

## Scope and field contract

Reuse [SourceRecord](DATA_SCHEMA.md#sourcerecord--provenance) and
[source mapping](../knowledge/SOURCE_FIELD_MAPPING.md); no schema change.

| Credit information | Existing record / review location |
| --- | --- |
| Source title, public creator/publisher, public link | `attribution`, `sourceUrl`; distinguish creator, publisher and uploader |
| Page/file/row key and pinned revision | `sourceRecordKey`, `sourceRevision`; unknown stays null |
| Retrieval and separate observation date | `retrievedAt`, `observedAt`; date-only source dates keep PartialTime precision |
| License name, version, link, restrictions and unresolved rights | `licenseNote`; do not resolve missing terms by assumption |
| Translation, summary, mapping, crop or other actual changes | `transformNote`; describe only changes actually made |
| Verification and source relationships | `verificationStatus`, domain `provenanceIds` / `fieldProvenance` |
| Media rights and approved revision | Existing Asset/Media record and [legal review](LEGAL_STATUS.md), independently of text credits |

Bracketed placeholders below are editor prompts. Never ship them as literal
credits or fabricate a value to fill them. Unknown values belong in the private
draft record and review note; a release candidate needing those facts stays
gated. Source verification alone does not authorize reuse. Public credits contain
only reviewed public information: no ticket, private message, local path,
reviewer/contact, private evidence reference or raw transcript.

## Text: Wiki, original summaries and translations

Wiki-derived text template:

> Text/data adapted from “[page/module title]”, Sky: Children of the Light Wiki
> contributors. Source: [verified public page link], revision [verified revision].
> License: [verified exact name/version and license link]. Changes: [actual
> mapping, abridgment or translation]. Checked: [retrieval date].

Keep the source credit distinct from project editorial work. Credit individual
authors where the reviewed source/license requires it; “contributors” is not a
replacement for a specific required credit. Preserve source risk notes and review
the reuse scope/terms before releasing adapted content.

Original concise summary template:

> Sky Guide summary of “[article title]” by [verified publisher]. Source:
> [verified article link]. Source release date: [date and precision]. Reviewed:
> [observation date]. Changes: summarized in our own words; [other actual changes].

Do not label an original summary as a licensed copy of the full article. If
quotations or images are proposed, review those separately. Absence of a claim
in an article does not refute that claim.

Pinned example: [K06 Hotfix 34.4](../knowledge/06-official-patch-notes.md),
publisher thatgamecompany Support, release date2026-08-10 (date-only), observed
2026-10-05T17:06:08Z. [Evidence](../knowledge/evidence/k06-official-note-2026-10-06.json)
supports an original short summary and source link; upstream revision and exact
update instant are null. This is one historical sample, not the latest news.

## Spreadsheet: row-level provenance and author credit

> [actual imported/compared fields] from “[verified workbook title]” by
> [verified author], [verified workbook link], [tab/row key], [revision or dated
> observation]. Changes: [actual normalization/formula-independent mapping].
> Terms/license: [verified scope and credit requirements].

For K04, retain **ln.cookie** as the verified author. If a record also uses Wiki
data, credit both sources and attach their provenance to the appropriate fields.
Do not credit a workbook as a data input merely because its directory link was
seen. [K04](../knowledge/04-ts-calculator.md) access returned403: columns,
export and contents remain unknown; there are no imported K04 rows to credit.
Do not invent a tab schema, formula, permission or update date.

## Route: guide/video references and independently checked steps

> “[route title]” — Sky Guide [actual original editorial work]. References:
> [guide title, creator/publisher, public link and source revision/date];
> [video title, verified creator, original link, checked timestamp range].
> Changes: [actual rewritten steps, corrections or localization]. Checked against
> [actual game/platform/version and date]. Referenced media rights: [reviewed scope].

Credit each source per derived step when multiple sources contribute; a route
title-level link must not hide step provenance. Missing footage review means
timestamps and steps stay unknown. An old guide is not current mechanics QA.
Linking the original video does not grant thumbnail/frame/rehost rights.

Pinned [K09](../knowledge/09-wiki-video-playlists.md) metadata verifies Tara's Sky
Journey and the original Eden video link, but no footage/timestamp/current route
accuracy was reviewed. Credit can describe that reference; it cannot claim an
implemented route. [K08](../knowledge/08-appunwrapper.md)2019 guide includes obsolete
glitch advice and an unknown map creator; those parts must not become current steps.

## Asset: creator, game IP and modification scope

> “[asset/file title]” by [verified creator], source [verified public file link],
> revision [approved revision]. Rights: [verified grant/license and scope].
> Changes: [actual crop/recolor/annotation/derivative changes]. Game IP credit:
> [required reviewed wording]. Community creator credit: [required reviewed wording].

Review access/use/display/redistribution/modification independently for the exact
asset revision. A text license, public image URL, Wiki upload, `Self`/`Fairuse`
template, acknowledgment or credit line cannot replace that review. Uploader is
not automatically the creator or rights owner. TGC permission does not grant
rights to a community artist's work. Unknown/restricted/revoked assets remain
excluded by the existing public export gate; use the approved fallback.

Pinned [K07](../knowledge/07-wiki-map-shrines.md) candidate
`Map-of-map-shrines-Ray.png` has observed artist credit Ray808080 and filepage89073;
permission remains pending. `Game-map-HD.png` has acknowledgments and a Fairuse
template; no verified publication grant. These are review examples, not released
assets. The self-drawn fictional wardrobe fixture has `fixture=true`; never
relabel it as extracted game artwork or as proof of permission for a real asset.

## Existing approved K15 integration

[K15](../knowledge/15-thatskyapplication.md) remains the separately approved
Item Lookup utility catalogue source, pinned at
`74007cf878ef44c764eb5a143ef01d4c80982509`. Its existing source credit and full MIT
notice, Copyright (c)2025 Jiralite, ship through
[SourceCredits](../src/features/items/SourceCredits.tsx) and
[utility notice](../public/licenses/thatskyapplication-utility.txt). Preserve
that notice and the per-file provenance. This draft does not replace those
credits or extend the utility license to game imagery, Wiki text or K04 data.

## Review and release acceptance

1. Resolve each actual source/revision/creator and its applicable terms from
   evidence; keep unresolved values explicit in the draft.
2. Record actual changes and separate source facts from project interpretation.
3. Match each credit to provenance and, for media, the approved revision/scope.
4. Check public credit placement and link/notice availability in the actual
   consuming view/export; no runtime integration is claimed by this document.
5. Preserve stale/unknown labels and private-evidence boundaries; release only
   through existing publication/rights gates.

Cached Wiki `siteinfo` reviewed on E: declares `CC-BY-SA` with a Fandom licensing
link but no explicit version. It is source-declared metadata, not resolved Q12 or
image permission. Maintainer must verify exact version and applicable credit
requirements before finalizing Wiki adaptation credits. K04 access, route QA and
per-asset permissions remain separate dependencies.

### Q12 evidence follow-up
2026-10-06 [review metadata](../knowledge/evidence/wiki-license-review-2026-10-06.json):
the licensing endpoint returned402. An indexed extraction of Fandom's
[Help:Licensing](https://community.fandom.com/wiki/Help%3ALicensing) reports a default
CC-BY-SA3.0 Unported for text unless otherwise noted, source/article or author
credit, license links, identified changes and applicable share-alike terms. It
separates image/video licenses. The index reports a three-month-old crawl and
direct access is robots-blocked. This provides a version lead; it does not confirm
exceptions or the applicable version for each pinned Sky Wiki record. Q12 stays
OPEN; no repeated blocked fetch or rights approval.
