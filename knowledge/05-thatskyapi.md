# K05 — ThatSkyAPI

- **Nguồn/link:** [ThatSkyAPI /skytime](https://thatskyapi.com/skytime), link/tác giả Light-a-Leo do Fan-Made Sky Tools@111722 ghi; đã gọi GET thành công trong mẫu bên dưới.
- **Dữ liệu/format đã nêu:** JSON time theo giờ LA; brief gọi đây là hạ tầng chuẩn cộng đồng. Tên field, epoch/unit, timezone metadata, reset/event schedule chưa xác minh.
- **Truy xuất đề xuất:** xác minh endpoint/time contract, lưu fixture response đã kiểm tra và thời điểm nhận; adapter xuất TimeReference. Frontend dùng mốc thời gian nguồn + thời gian trôi qua cục bộ để hiển thị countdown, tái đồng bộ khi trở lại tab. Không tự tạo lịch/reset LA thay nguồn.
- **Rủi ro/ghi chú nguyên văn:** “Nên tích hợp thẳng, không tự tính lại”. Brief không có kết luận giấy phép riêng cho dịch vụ này.
- **Trạng thái:** P1-D05 source contract/sample DONE; adapter/time integration/browser acceptance chưa chạy.
- **Thiếu:** URL, response/schema, semantics thời gian, CORS, giới hạn truy vấn, caching, quyền sử dụng; API có cung cấp mốc sự kiện hay không.
- **Đầu ra chấp nhận:** mapping unit rõ, kiểm thử qua thay đổi DST trên fixture đã xác minh; khi nguồn lỗi thì hiển thị mốc đồng bộ cuối/stale hoặc unavailable. Không lấy đồng hồ thiết bị làm lịch game “đã xác nhận”.
- **Tham chiếu:** [Architecture](../docs/ARCHITECTURE.md), [Schema](../docs/DATA_SCHEMA.md).

## Mẫu/contract — 2026-10-06
[Evidence](evidence/k04-k05-public-tools-2026-10-06.json) giữ request/time/checksum
và response fields. Một GET HTTP200/application-json, ACAO `*` quan sát qua HTTP.
`epoch=1791219666424` là milliseconds, tương ứng2026-10-05T17:01:06.424Z;
Intl tại America/Los_Angeles khớp full_date2026-10-05/full_time10:01:06 và
hour/minute/second/day_of_year. Date/time strings không có offset riêng.
Source instant chênh host receipt khoảng2s; không gọi nguồn chính xác tuyệt đối.

Response đề nghị tránh spam, một successful call mỗi instance rồi chạy clock
local. Không có numeric quota/TTL/license đã xác minh; không dựng polling budget.
Mẫu chỉ time fields, không chứng cứ event/season schedule. Khi triển khai giữ
receivedAtDevice riêng, elapsed monotonic trong phiên, stale/unavailable/LKG;
validityUntil chưa biết. CORS browser thực chưa nghiệm thu. Fixture IANA qua
spring-forward/fall-back xác minh cách đọc epoch/timezone, không giả là response
live ngày DST. K05 vẫn optional; không thay source registry/Event Rule approval.
