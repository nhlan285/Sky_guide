# K03 — Wiki: Traveling Spirits

- **Nguồn/link:** trang “Traveling Spirits” trên Sky Wiki; brief chưa có URL cụ thể.
- **Dữ liệu:** lịch sử các lần xuất hiện TS. Tên spirit, khoảng thời gian, trạng thái xác nhận là schema dự kiến, phải đối chiếu mẫu trang.
- **Format:** API revisions/wikitext theo K01; bảng Spirit Visits và infobox spirit đã khảo sát trong mẫu dưới.
- **Truy xuất đề xuất:** xác minh trang, lấy revision qua adapter Wiki khi phù hợp; chuẩn hóa TravelingSpiritVisit; đối chiếu K04 và lưu cả hai chứng cứ khi bất đồng. Không dùng dự đoán để bổ sung lịch sử.
- **Rủi ro/ghi chú nguyên văn:** “Ghi nguồn khi dùng”.
- **Trạng thái:** P1-D03 source sample đã xác minh; full import/K04 reconciliation chưa triển khai. Text áp dụng lưu ý tại K01.
- **Thiếu:** URL, timezone ngày gốc, cách biểu diễn ngày chưa đủ chính xác, identifier spirit.
- **Đầu ra chấp nhận:** giữ ngày gốc và độ chính xác; tránh tạo giờ bắt đầu giả khi chỉ có ngày; lịch sử không trộn prediction.
- **Tham chiếu:** [K04](04-ts-calculator.md), [Schema](../docs/DATA_SCHEMA.md).

## Xác minh P1-D03 — 2026-10-05
[Traveling Spirits](https://sky-children-of-the-light.fandom.com/wiki/Traveling_Spirits?oldid=111680)
trỏ lịch sử sang [Spirit Visits](https://sky-children-of-the-light.fandom.com/wiki/Spirit_Visits?oldid=111650).
[Evidence](evidence/k03-traveling-visits-2026-10-05.json) giữ ba request HTTP200,
revision/time/checksum, mapping và giới hạn. JSON envelope chứa wikitext.
Raw ở E:/SkyGuideAssets/research/k03-2026-10-05, không tải media.

Hai lần [Leaping Dancer](https://sky-children-of-the-light.fandom.com/wiki/Leaping_Dancer?oldid=110664)
đối chiếu bảng/infobox: TS#115 bắt đầu2024-06-06; TS#12 bắt đầu2020-06-25.
Giữ precision=date, timezone=null, endsAt=null vì mẫu chỉ có start; không thêm
giờ/ngày kết thúc từ lịch modern96h. Hai lần ghé giữ thành hai record.
Visit# có TS/SV/Error; Date có thể là season end của spirit chưa từng quay lại.
Sort value không thay mọi date/visit trong row. SV#3/2023-07-03 không nhập như TS.
Upcoming Nodding Muralist2026-10-08–11 giữ raw range riêng, không gọi historical.

Schedule dùng PST/PDT, Thursday00:00 và Sunday23:59 nhưng cũng ghi96h; không tự
giải quyết boundary. Hai lần đầu60h, cadence cũ khác. IANA/Event Engine là task
riêng, không derive historical instant từ offset. Spirit/tree ID cần crosswalk.
P1-D03 DONE về source/date mẫu/field thiếu. P2-D07 K03 staged adapter implemented
2026-10-06 in scripts/wiki/visits.mjs, with caller IDs/provenance/date cutoff;
cached111650 confirms the two sample dates and null end/timezone. It supports
only the recognized Appearances by Spirit layout and selected rows, not full
coverage or public history. K04 sheet/reconciliation remains BLOCKED403.
