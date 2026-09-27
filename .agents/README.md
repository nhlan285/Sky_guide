# Agent definitions cho dự án

Đây là định nghĩa vai trò phục vụ phân công về sau, **không** tự đăng ký process hoặc yêu cầu chạy multi-agent ở mọi tác vụ. Chưa khởi chạy agent trong lần scaffold. Khi runtime hỗ trợ và người dùng giao việc phù hợp, có thể dùng các hồ sơ dưới đây làm brief giao việc; tránh hai agent sửa cùng file đồng thời.

| Vai trò | Phạm vi | Hồ sơ |
|---|---|---|
| Data curator | Nguồn, provenance, schema/import | [data-curator](data-curator.md) |
| Wardrobe engineer | Reducer, layer, anchor/scale, dye/share | [wardrobe-engineer](wardrobe-engineer.md) |
| Hub & UX engineer | Hub, local/profile, responsive và PWA UX | [hub-ux-engineer](hub-ux-engineer.md) |
| Release & rights reviewer | Kiểm tra export, attribution, legal gate, deploy readiness | [release-rights-reviewer](release-rights-reviewer.md) |

Mọi vai trò đọc [brief](../docs/PROJECT_BRIEF.md) và [plan](../docs/plan/IMPLEMENTATION_PLAN.md); nhận task ID cụ thể, báo file đổi, kiểm chứng và blocker. Chỉ source Kxx đã có trong [KB](../knowledge/README.md) được dùng để thiết kế pipeline. Không thêm nguồn, tự gỡ gate TGC hoặc coi đề xuất thiết kế là thông tin game thật.

Skill của repo đặt trong `skills/<name>/SKILL.md`; agent definitions ở đây là tài liệu vai trò, không giả định Codex tự phát hiện các file vai trò như một cấu hình runtime.
