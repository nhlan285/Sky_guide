---
name: sky-wiki-source
description: Xác minh và lập mapping nguồn Sky Wiki cho item, spirit, Traveling Spirit hoặc Map Shrines của repo Sky Guide; dùng khi chuẩn bị API/parser hoặc cập nhật hồ sơ nguồn.
---

# Sky Wiki source

Đọc hồ sơ tương ứng trong [KB](../../../knowledge/README.md): K01, K02, K03 hoặc K07 và [schema nội bộ](../../../docs/DATA_SCHEMA.md). Brief chưa cung cấp host/endpoint/tên module cụ thể; hồ sơ nguồn là nơi lưu kết quả xác minh, không phải chứng cứ API đã chạy.

1. Xác định task và nguồn được yêu cầu. Khi công việc có tra cứu mạng, xác minh link/endpoint thật trước; thiếu quyền truy cập thì ghi blocker và dùng fixture tự tạo được đánh dấu, không đoán API.
2. Thu mẫu tối thiểu được phép lưu, URL/revision/thời điểm/attribution. Kiểm tra module thực là cấu trúc gì trước khi chọn parser; không mặc định nội dung module là JSON chỉ vì API có JSON envelope.
3. Ghi mapping field upstream → normalized field và phần chưa biết. Giá thiếu khác miễn phí; loại tiền chưa biết giữ nhãn gốc; ngày thiếu giờ giữ precision=date.
4. Text Wiki có lưu ý CC-BY-SA theo K01; xác minh phiên bản/attribution khi triển khai. Ảnh vẫn là IP TGC; map có thể thuộc tác giả cộng đồng. Không dùng giấy phép text để duyệt asset.
5. Trả kết quả có mẫu, mapping, giới hạn và bước kiểm chứng parser. Format thay đổi hoặc record lỗi thì quarantine/giữ bản tốt, không xuất catalog rỗng thay bản cũ.

Chỉ sửa hồ sơ nguồn/schema/adapter thuộc task. Không tự tải bộ asset, rip game, publish hoặc gửi yêu cầu quyền sử dụng. Full asset giữ **pending legal confirmation** theo [K13](../../../knowledge/13-tgc-assets.md).
