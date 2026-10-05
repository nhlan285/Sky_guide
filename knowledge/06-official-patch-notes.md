# K06 — Patch notes chính thức

- **Nguồn/link có trong brief:** [Helpshift — Patch notes](https://thatgamecompany.helpshift.com/hc/en/17-sky-children-of-the-light/section/110-patch-notes/). Chưa mở/kiểm chứng trang trong lần scaffold.
- **Dữ liệu:** bài patch notes/tin chính thức để đối chiếu tin leak. Tiêu đề, link bài, ngày, version và tóm tắt là các trường chuẩn hóa đề xuất.
- **Format:** trang web, chưa có HTML mẫu; brief không nêu API/RSS.
- **Truy xuất đề xuất:** biên tập thủ công link bài và tóm tắt trước; chỉ cân nhắc parser HTML sau khi kiểm tra cấu trúc và điều kiện truy xuất. Không mặc định tồn tại RSS/API.
- **Rủi ro/ghi chú nguyên văn:** “Dùng để đối chiếu chéo tin leak”. Brief không cấp quyền sao chép toàn bộ bài.
- **Trạng thái:** đã sẵn sàng dùng làm nguồn chính thức theo brief; chưa xác minh cách tự động hóa.
- **Thiếu:** link bài, thời gian/version, cách phát hiện sửa đổi; thông tin nào đủ chứng cứ để đánh dấu tin cộng đồng được xác nhận.
- **Đầu ra chấp nhận:** tóm tắt kèm link/ngày kiểm tra; không biến “chưa có trong patch notes” thành kết luận sai; ghi nhận bất đồng hoặc chưa xác nhận.
- **Tham chiếu:** [K14](14-discord-editorial.md), [PRD](../docs/PRD.md).

## P1-D06 xác minh — 2026-10-06
Section chính thức đã mở và dẫn tới
[Hotfix34.4](https://thatgamecompany.helpshift.com/hc/en/17-sky-children-of-the-light/faq/1467-hotfix-34-4---august-10-2026---playstation-ios/).
[Evidence](evidence/k06-official-note-2026-10-06.json) ghi title/date/version/link,
publisher, platform và tóm tắt riêng. Ngày2026-08-10 là release date-only,
không suy timezone/update instant. Version giữ `34.4`, không tự thêm0. hay build.
Updated label tương đối51d không được đổi thành timestamp chính xác. Notice
delay cũ bị gạch; nội dung hiện hành nói cả PlayStation/iOS đã có bản vá.
Phạm vi: lỗi startup sau34.3; không gọi article này newest hiện tại hoặc chứng
minh mọi leak. RSS/API/revision ổn định chưa thấy; manual link/article review là
fallback, không tạo scraper/full article copy. Source verification DONE, feed OPEN.
