---
name: sky-normalize-data
description: Chuẩn hóa dữ liệu Sky từ nguồn đã có trong Knowledge Base sang schema nội bộ, kiểm tra provenance, quan hệ, giá, thời gian và public export; dùng cho import hoặc review data diff.
---

# Normalize Sky data

Đọc [DATA_SCHEMA](../../../docs/DATA_SCHEMA.md) và hồ sơ Kxx trong [Knowledge Base](../../../knowledge/README.md) cho nguồn đầu vào. Các trường schema là thiết kế nội bộ; không ghi ngược như mô tả API upstream.

- Gán ID ổn định, source/revision/retrievedAt/attribution; không lấy tên dịch làm khóa. Nguồn thiếu URL hoặc mẫu không được tạo dữ liệu thật giả; fixture cần nhãn riêng.
- Giữ unknown là null/status rõ. Giá 0 chỉ khi nguồn xác nhận; giữ loại currency/market/platform/time. Không tự quy đổi heart sang candle, FX hoặc gán giá range cho SKU.
- Validate ID/FK, graph tree không chu trình, ngày đúng precision, marker đúng map revision, anchor/scale đúng model revision. Prediction và history là tập khác nhau.
- Diff theo ID trước xuất: thêm/sửa/xóa, đổi provenance, migration alias/tombstone. Input lỗi không được xóa last-known-good; trả quarantine report với record/field cụ thể.
- Public export chỉ chứa record published, leak approved đúng revision và asset đủ căn cứ quyền. Loại fixture, raw message, private ticket và draft; hình học placeholder tự tạo được nhận diện riêng. Full asset pending không thể được duyệt bởi importer.

Kết quả: normalized records hoặc báo cáo quarantine, provenance mapping, diff và validation đã chạy. Nếu schema chưa biểu đạt dữ liệu thật, đề xuất thay schema có ví dụ chứng cứ; không ép trường sai để pass check. Tham chiếu [Legal](../../../docs/LEGAL_STATUS.md) khi thay asset status. Không tự publish/deploy hoặc liên hệ nguồn khi nhiệm vụ chỉ là normalize/review.
