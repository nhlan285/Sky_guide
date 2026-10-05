# K01 — Sky Wiki (Fandom): item/cosmetic

## Item module contract verified — 2026-10-05 (P1-D01)

Two bounded sequential CLI requests returned HTTP200 without API warnings/errors.
The web reader could not open the endpoint; direct public HTTP retrieval succeeded.
[Minimal evidence](evidence/k01-item-module-contract-2026-10-05.json) records the
request, response SHA-256, source revision, sample fields and limits. Raw41,479-byte
module response is working data on E:, not a new public dataset.

- `action=query`, `format=json`, `formatversion=2`, `prop=revisions`,
  `rvprop=ids|timestamp|content`, `rvslots=main`, titles specified in evidence.
- [Cosmetics/data revision100805](https://sky-children-of-the-light.fandom.com/wiki/Module:Cosmetics/data?oldid=100805):
  100 rows, Scribunto content is a **literal Lua table**, parsed without executing
  Lua. Two duplicate keys are recorded by the existing parser, using Lua's last
  literal value semantics. It is not the complete seasonal/event item catalogue.
- [Spirit Item/data revision98798](https://sky-children-of-the-light.fandom.com/wiki/Module:Spirit_Item/data?oldid=98798):
  40 **generic type definitions**, not40 individually priced cosmetic items.
- Siteinfo reports CC-BY-SA and links Fandom licensing, but does not state a version.
  No image rights are inferred. With `origin=*` and an Origin header the response
  included `Access-Control-Allow-Origin: *`; this is HTTP evidence, not browser QA.
  Published rate limits and exact attribution/license-version obligations remain
  unverified. No production browser fetch or import is introduced.

| Observed field | Proposed normalized mapping | Boundary |
|---|---|---|
| Lua row key | sourceRecordKey, module title/revision provenance | Not a canonical cross-source item ID |
| name | LocalizedText.default | Do not translate or infer identity from display name |
| alt_name | Source aliases after literal-array normalization | Do not silently merge ambiguous items |
| item_type | rawSlot/category evidence; explicit reviewed slot mapping | `outift` typo exists; outfit/footwear do not imply top/bottom |
| spirit / elder | Source relation labels awaiting crosswalk | Do not infer missing season or spirit IDs |
| price | Raw acquisition price expression | Explicit `free` differs from absent price; H/AC retained as source labels until grammar verified |
| generic cost | Type default only | `3 SC SP` cannot be assigned as a specific cosmetic's price or summed as currencies |
| icon/real/front/back/side/interior/exterior/held | File-title role candidates | Not runtime URLs or image-rights evidence |

Missing price remains unknown; mixed currency/pass tokens require separate
grammar/source verification before P2-D05 price normalization. No currency conversion,
live availability claim, K15 overwrite, public export or image download occurred.
P1-D01 endpoint/format/sample acceptance is complete; P1-D13 across all sources,
P2-D05 adapter and rights/publication gates remain open.

## Verified catalogue-media adapter — 2026-10-03

The owner requested live public image URLs for local Item Catalogue testing.
The public [MediaWiki API](https://sky-children-of-the-light.fandom.com/api.php)
was queried successfully. Literal Lua module data, paginated category membership,
page image relationships and `imageinfo` provide source revisions, actual
thumbnail/original URLs, uploader and extmetadata. The complete scan, module
revisions, exclusions and diagnostics are in
[`data/wiki-media/discovery.json`](../data/wiki-media/discovery.json); current
coverage is in [`report.json`](../data/wiki-media/report.json).

See [reproducible pipeline and mapping rules](../docs/WIKI_MEDIA.md). Unknown
image permission remains unverified; the CC-BY-SA text label from siteinfo is not
applied to image rights. Factual enrichment is an overlay with conflicts and
provenance, preserving verified catalogue values. No prices are inferred. The
older unverified-endpoint notes below are historical brief assumptions.

## Historical brief

- **Nguồn/link:** Sky Wiki (Fandom). Brief không có URL wiki, tên module hoặc trang API chính xác; chưa có link truy cập đã xác minh.
- **Dữ liệu theo brief:** tên, giá, slot; có module dữ liệu cấu trúc. Season/spirit liên quan cần kiểm tra các liên kết thực tế.
- **Format:** MediaWiki API; chưa biết action, tên module, dạng nội dung module hoặc envelope response. Không khẳng định module là JSON: nội dung có thể cần parser riêng sau khi xem mẫu thật. JSON chuẩn hóa nội bộ không phải response upstream.
- **Truy xuất đề xuất:** xác minh host + API entrypoint + trang module; lấy response mẫu và revision; xác định phần parse được; lưu attribution; tạo adapter xuất Item/CurrencyAmount. Không khóa endpoint hoặc trường upstream trước Phase 1.
- **Rủi ro/ghi chú nguyên văn:** “Nội dung text CC-BY-SA; ảnh vẫn là IP của TGC”.
- **Trạng thái:** đã sẵn sàng dùng cho text theo brief; icon chỉ là placeholder theo K13. Kết nối kỹ thuật chưa xác minh. Không coi CC-BY-SA là giấy phép asset.
- **Thiếu:** URL, phiên bản giấy phép text, mẫu module, rate limit, cách ghi attribution/đánh dấu sửa đổi cụ thể. Không giả định hỗ trợ CORS.
- **Đầu ra chấp nhận:** mẫu có nguồn/revision; bảng ánh xạ tên/slot/giá kèm giá trị unknown; kiểm tra mất field và giá nhiều loại tiền; không tự đổi một loại tiền sang loại khác.
- **Tham chiếu:** [Schema](../docs/DATA_SCHEMA.md), [pipeline](../docs/ARCHITECTURE.md), [K13](13-tgc-assets.md).
