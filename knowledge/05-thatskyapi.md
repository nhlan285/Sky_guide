# K05 — ThatSkyAPI

- **Nguồn/link:** ThatSkyAPI; chưa có domain hoặc endpoint trong brief.
- **Dữ liệu/format đã nêu:** JSON time theo giờ LA; brief gọi đây là hạ tầng chuẩn cộng đồng. Tên field, epoch/unit, timezone metadata, reset/event schedule chưa xác minh.
- **Truy xuất đề xuất:** xác minh endpoint/time contract, lưu fixture response đã kiểm tra và thời điểm nhận; adapter xuất TimeReference. Frontend dùng mốc thời gian nguồn + thời gian trôi qua cục bộ để hiển thị countdown, tái đồng bộ khi trở lại tab. Không tự tạo lịch/reset LA thay nguồn.
- **Rủi ro/ghi chú nguyên văn:** “Nên tích hợp thẳng, không tự tính lại”. Brief không có kết luận giấy phép riêng cho dịch vụ này.
- **Trạng thái:** đã sẵn sàng dùng về định hướng; chưa thể gọi API khi chưa biết endpoint.
- **Thiếu:** URL, response/schema, semantics thời gian, CORS, giới hạn truy vấn, caching, quyền sử dụng; API có cung cấp mốc sự kiện hay không.
- **Đầu ra chấp nhận:** mapping unit rõ, kiểm thử qua thay đổi DST trên fixture đã xác minh; khi nguồn lỗi thì hiển thị mốc đồng bộ cuối/stale hoặc unavailable. Không lấy đồng hồ thiết bị làm lịch game “đã xác nhận”.
- **Tham chiếu:** [Architecture](../docs/ARCHITECTURE.md), [Schema](../docs/DATA_SCHEMA.md).
