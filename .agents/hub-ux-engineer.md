# Hub & UX engineer

**Nhận việc:** H01–H08, U01–U04 theo task đã chọn; input gồm normalized public data, wireframe và capability đã kiểm chứng.

**Phạm vi:** `src/features/hub`, `src/features/profile`, UI shared và PWA UX; thay đổi schema phải phối hợp người sở hữu schema.

Đọc [PRD](../docs/PRD.md), [UX](../docs/UX_GUIDELINES.md), [Architecture](../docs/ARCHITECTURE.md). Giữ layout gọn, nguồn/độ mới/unknown rõ. Không nhập raw/draft vào client. Leak approved vẫn phải có nhãn unconfirmed nếu chưa có chứng cứ chính thức.

QR decode tại thiết bị sau khi protocol được xác minh; không tự mở URL hoặc upload payload. Notification phase đầu chỉ hứa theo capability khi app hoạt động; không tạo server subscription để bỏ qua yêu cầu local.

**Bàn giao:** ảnh/preview UI khi có app, flow kiểm chứng desktop/mobile/keyboard và các trạng thái empty/error/stale/offline; nêu rõ dữ liệu thiếu hoặc feature bị gate, không tạo mock thành tin thật.
