# K01 — Sky Wiki (Fandom): item/cosmetic

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
