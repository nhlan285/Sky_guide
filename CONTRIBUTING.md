# Contributing

Dự án đang ở giai đoạn lập kế hoạch. Mỗi thay đổi nên gắn với một task ID trong [Implementation Plan](docs/plan/IMPLEMENTATION_PLAN.md) hoặc giải thích rõ vì sao cần bổ sung task mới.

## Trước khi thay đổi

1. Đọc [Project Brief](docs/PROJECT_BRIEF.md); đây là nguồn sự thật về phạm vi sản phẩm.
2. Kiểm tra hồ sơ Kxx tương ứng trong [Knowledge Base](knowledge/README.md).
3. Xác định gate `DATA`, `RIGHTS`, `TGC` hoặc open question liên quan.
4. Không biến fixture, placeholder hay đề xuất kiến trúc thành dữ liệu game đã xác nhận.

## Quy ước thay đổi

- Giữ task nhỏ và tập trung vào một module hoặc một nguồn dữ liệu.
- Dữ liệu thật cần URL, revision hoặc thời điểm quan sát và attribution.
- Giá chưa biết không được ghi thành `0`; ngày thiếu giờ không được tự thêm giờ.
- Draft leak, ticket riêng tư, raw QR và bằng chứng pháp lý không được commit vào public bundle.
- Asset cần metadata nguồn, trạng thái quyền và fallback. Full wardrobe/3D mặc định là `pending_legal_confirmation`.
- Không rip game, can thiệp game client hoặc tích hợp mod.

## Commit message

Repo dùng Conventional Commits ở mức đơn giản:

```text
<type>(<scope>): <mô tả ngắn>
```

Các type thường dùng:

- `feat`: thêm hành vi người dùng hoặc module mới.
- `fix`: sửa lỗi hành vi.
- `docs`: chỉ thay đổi tài liệu.
- `data`: thêm hoặc sửa normalized data, mapping hoặc provenance.
- `refactor`: thay đổi cấu trúc mà không đổi hành vi.
- `test`: thêm hoặc sửa kiểm thử.
- `chore`: scaffold, công cụ, dependency hoặc cấu hình repo.

Ví dụ:

```text
chore: initialize project scaffold and planning docs
data(wiki): add verified item module mapping
feat(wardrobe): add versioned outfit share codec
```

## Kiểm tra trước khi commit

Ở trạng thái scaffold hiện tại, chạy:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .commands/Check-Scaffold.ps1
```

Khi application code được khởi tạo, bổ sung typecheck, lint, schema validation và behavioral tests vào checklist này thay vì ghi các lệnh chưa tồn tại.

## Pull request hoặc review

Mô tả thay đổi nên nêu task ID, hành vi trước/sau, nguồn Kxx, validation đã chạy và gate còn mở. Nếu thay asset, ghi rõ evidence hoặc lý do tiếp tục dùng placeholder. Không đánh dấu một integration đã hoàn thành khi mới chỉ chạy bằng fixture.
