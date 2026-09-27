# Commands cho quy trình phát triển

Các script PowerShell chạy từ bất kỳ working directory nào vì tự xác định repo qua `$PSScriptRoot`. Không đăng ký slash command ngầm và không cần dependency ứng dụng. Không gọi mạng, sửa dữ liệu game hoặc deploy.

## Kiểm tra scaffold và liên kết

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .commands/Check-Scaffold.ps1
```

Kiểm tra file bắt buộc, từng hồ sơ nguồn, skill frontmatter, thư mục `src`, local Markdown links, task IDs và kích thước breakdown. Exit 1 nếu lỗi. Không chứng minh nội dung API/pháp lý đã xác minh hoặc app chạy được.

## Đọc task list thành đối tượng

```powershell
& ./.commands/Get-PlanTasks.ps1 | Format-Table Id, Module, Complexity, Gate
& ./.commands/Get-PlanTasks.ps1 | Export-Csv -LiteralPath ./docs/plan/tasks.csv -NoTypeInformation -Encoding UTF8
```

Script mặc định chỉ xuất object ra pipeline, không tạo file. Lệnh `Export-Csv` là tùy chọn để người dùng chuyển plan thành bảng ở bước sau; CSV giữ action, acceptance, dependencies, complexity, gate và module. Markdown plan vẫn là nguồn chính; không sửa song song CSV rồi coi tự đồng bộ.

## Quy trình tiện ích khi giao task

- **prepare-source Kxx:** đọc KB, dùng skill tương ứng nếu có, xác minh đúng thông tin thiếu của task Phase 1; bàn giao mẫu + mapping + rủi ro giữ nguyên. Không đoán endpoint.
- **review-data task-id:** dùng skill normalize, báo diff/quarantine và gate export; không tự publish.
- **review-release:** đọc role release-rights-reviewer và Phase 7; chỉ đánh dấu check đã chạy thật, liệt kê các module còn pending.

Ba nhãn trên là quy trình có thể copy thành prompt, không phải cú pháp slash command mà runtime đã hỗ trợ.
