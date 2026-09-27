# Sky: Children of the Light — Wardrobe & Community Hub

Scaffold lập kế hoạch; chưa có ứng dụng chạy được, dependency, dữ liệu đã import hay asset đã tải. Ngôn ngữ tài liệu: tiếng Việt. Mốc tài liệu: 2026-09-27; đây không phải ngày gửi ticket hoặc ngày xác nhận nguồn.

## Đọc theo thứ tự

1. [Brief gốc](docs/PROJECT_BRIEF.md) — nguồn sự thật duy nhất về sản phẩm và tình trạng pháp lý.
2. [Knowledge Base](knowledge/README.md) — nguồn, cách lấy dữ liệu, điều chưa biết và giới hạn.
3. [PRD](docs/PRD.md), [kiến trúc](docs/ARCHITECTURE.md), [schema](docs/DATA_SCHEMA.md), [UX](docs/UX_GUIDELINES.md), [pháp lý](docs/LEGAL_STATUS.md).
4. [Implementation Plan](docs/plan/IMPLEMENTATION_PLAN.md) — task có ID, đầu ra, tiêu chí nghiệm thu và phụ thuộc.

## Cấu trúc

```text
knowledge/                 Hồ sơ từng nguồn; không chứa bản sao nội dung bên ngoài
docs/                      Brief gốc và tài liệu dự án
docs/plan/                 Kế hoạch triển khai
.agents/                   Định nghĩa vai trò agent (tài liệu, chưa tự kích hoạt)
.agents/skills/            Skill theo cấu trúc repo của Codex
.commands/                 Script PowerShell và quy trình tiện ích
src/app/                   Điểm ghép app/router/state
src/features/wardrobe/     Khung module thử đồ
src/features/hub/          Khung hub
src/features/profile/      Khung đọc QR profile
src/shared/                Khung UI, kiểu và tiện ích dùng chung
src/data/                  Khung adapter và schema dữ liệu
src/pwa/                   Khung PWA
```

Không có `.skills/` song song: skill nằm trong `.agents/skills/<tên>/SKILL.md`. Agent definitions chỉ là hướng dẫn phân công, không khẳng định runtime đã đăng ký agent; command là script/quy trình, không giả định slash command tự có sẵn.

## Quy ước sử dụng

- **Đã nêu trong brief**: yêu cầu hoặc mô tả hiện trạng; không tương đương đã kiểm chứng nguồn trực tuyến.
- **Đề xuất**: quyết định kỹ thuật để có kế hoạch cụ thể; cần chốt theo open questions trước code phần liên quan.
- **Chưa xác minh**: brief thiếu endpoint, URL, format hoặc quyền sử dụng; không tự điền bằng suy đoán.
- **pending legal confirmation**: asset 3D/wardrobe đầy đủ đang chờ TGC; skeleton và placeholder vẫn triển khai độc lập.

Kiểm tra scaffold bằng `powershell -NoProfile -ExecutionPolicy Bypass -File .commands/Check-Scaffold.ps1`. Script chỉ đọc file trong repo, không truy cập mạng hoặc deploy.
