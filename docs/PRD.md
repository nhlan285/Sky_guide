# Product Requirements Document

Nguồn: [brief gốc](PROJECT_BRIEF.md), đặc biệt mục 1–2. Tài liệu này viết lại phạm vi đầy đủ; tiêu chí nghiệm thu và cách chia release là **đề xuất**, không phải thông tin game mới. Nguồn dữ liệu: [Knowledge Base](../knowledge/README.md).

## Sản phẩm và phạm vi

Web-app miễn phí cho cộng đồng Sky: Children of the Light, gồm Wardrobe là tính năng lõi khác biệt và Hub thông tin. Không yêu cầu đăng nhập, không có tài khoản người dùng server-side, không tính năng trả phí. Deploy Vercel, ưu tiên browser/PWA có thông báo; native app chỉ nghiên cứu về sau. Không rip asset, không sửa hoặc tích hợp game client; thatskymod không tích hợp.

Không thêm marketplace, chat, social graph, cloud save hoặc hệ tài khoản. Git/review của người duy trì là vận hành nội dung, không phải tài khoản sản phẩm dành cho người dùng.

## Module Wardrobe

| ID | Yêu cầu từ brief | Hành vi/tiêu chí nghiệm thu đề xuất | Nguồn/phụ thuộc |
|---|---|---|---|
| W01 | Thử đồ theo layer: mask, tóc, cape, áo, quần, phụ kiện | Chọn/tháo riêng từng slot, xem tổ hợp; rule hiển thị trước/sau và phụ kiện nhiều vị trí phải có bảng rõ; không mất lựa chọn khi đổi tab | K01, K13; full asset **pending legal confirmation** |
| W02 | Size selector theo mã 0, 1, 2, 3… | Hiện mã từ bảng cấu hình, không tự đặt số size tối đa; preview đọc anchor/scale của size được chọn | K13; bảng chính xác chưa có |
| W03 | Auto-resize cho item đặc biệt như mask chibi | Rule xác định effective size; UI báo lý do; tháo item khôi phục size người dùng chọn, không ghi đè base size | K01, K13; rule/mapping thật cần xác minh |
| W04 | Dye trang phục khi thử | Chọn màu trên vùng hỗ trợ trong preview; reset từng item; item chưa biết vùng dye hiển thị chưa hỗ trợ; màu demo không tuyên bố tương đương game | K01, K13; dye masks đầy đủ **pending legal confirmation** |
| W05 | Lưu/chia sẻ outfit qua link không tài khoản | Lưu outfit trên máy; link versioned tái dựng tổ hợp/size/dye, xử lý item đã đổi ID hoặc thiếu asset; payload hỏng không làm app crash | Schema OutfitSnapshot; không upload profile cá nhân |

2D paper-doll là hướng triển khai đầu theo mục 8; 3D không phải cam kết release đầu. Bản demo phải ghi rõ các hình, size và vị trí chưa đại diện dữ liệu game. Full wardrobe vẫn là mục tiêu có gate pháp lý, không bị lược bỏ khỏi roadmap.

## Module Hub thông tin

| ID | Yêu cầu từ brief | Hành vi/tiêu chí nghiệm thu đề xuất | Nguồn |
|---|---|---|---|
| H01 | Database item/cosmetic: tên, giá, season, spirit sở hữu | Danh sách tìm/lọc theo slot/season/spirit; trang chi tiết hiển thị loại tiền, nguồn và độ mới; missing khác với miễn phí | K01, K02 |
| H02 | TS tracker: lịch sử + dự đoán | Timeline lịch sử dẫn nguồn; dự đoán tách phần, gắn nhãn và cách suy luận, không hiển thị như lịch chính thức; thiếu phương pháp thì chưa có dự đoán | K03, K04 |
| H03 | Season/event hiện tại + đếm ngược | Card tên/trạng thái/mốc nguồn; countdown đồng bộ ThatSkyAPI; thiếu mốc có xác nhận thì hiện chưa có thời gian, không tự đặt lịch | K05 và nội dung kiểm chứng từ K01/K06; coverage còn mở |
| H04 | Patch notes/tin chính thức | Feed có tiêu đề, version/ngày khi biết, tóm tắt riêng, link bài gốc | K06 |
| H05 | Leak Discord có duyệt thủ công | Intake → review → approved/rejected; chỉ approved xuất bản, luôn phân biệt tin chưa xác nhận; sửa/gỡ có lịch sử | K14, đối chiếu K06 |
| H06 | Map theo season/realm, Map Shrine locations | Chọn map/realm/season, bật/tắt marker shrine/Children of Light; map và tọa độ cùng revision; khi thiếu quyền ảnh dùng text/sơ đồ placeholder | K07 |
| H07 | Route/walkthrough, ưu tiên Eye of Eden | Hướng dẫn chia bước, có tiến độ local, dẫn nguồn và lưu ý phiên bản; diễn giải riêng từ blog/video | K08, K09 |
| H08 | Chi phí IAP thực tế: tiền thật → candle/heart cho item | Cho chọn platform/market; giá gắn currency/ngày; hiển thị cách tính và giả định; phân biệt ước lượng tỷ lệ với số tiền mua gói thực tế; thiếu mapping heart thì không quy đổi | K10, K11, K12 |

## UX đặc biệt và trạng thái cục bộ

| ID | Yêu cầu | Nghiệm thu đề xuất |
|---|---|---|
| U01 | Đọc QR profile Sky, hiển thị trực quan theo hướng sky-profiles | Nhận QR từ camera/ảnh nếu môi trường hỗ trợ, giải mã tại máy; preview dữ liệu hợp lệ; báo QR sai/không hỗ trợ; không tự mở URL hoặc gửi QR lên server. Protocol, field public và khả năng hiển thị thật phải xác minh trước code tích hợp |
| U02 | Toàn bộ trạng thái lưu local | Outfit, bộ lọc, tiến độ route, sở thích spoiler/notification lưu trên thiết bị; có reset/export/import đề xuất; lỗi quota/storage vẫn dùng phiên hiện tại; không hứa đồng bộ giữa máy |
| U03 | UI tối giản, mật độ cao | Tổ chức [widget cụ thể](UX_GUIDELINES.md), ưu tiên rõ ràng, ít màu; mobile và bàn phím sử dụng được |
| U04 | Web-app/PWA và thông báo | Cài đặt khi trình duyệt hỗ trợ; quyền thông báo do người dùng chủ động bật; chỉ rõ giới hạn khi app đóng/offline; chọn mô hình notification theo [Architecture](ARCHITECTURE.md) |

## Những trạng thái bắt buộc có

Mỗi module có loading, empty, unavailable/error, stale, offline khi áp dụng. Không trình bày placeholder như dữ liệu thật; không thay unknown bằng 0. Countdown hiển thị nguồn đồng bộ và độ mới. Content chính thức, dự đoán và leak có nhãn văn bản khác nhau. Asset chưa được xác nhận có metadata và nhãn trong preview.

## Thứ tự release đề xuất

1. **Foundation/Hub đọc được:** contract dữ liệu, catalog text, TS history, feed, season/event có chứng cứ, bố cục responsive; route/map/IAP triển khai theo nguồn sẵn sàng.
2. **Wardrobe 2D placeholder:** đủ luồng layer/size/override/dye/local/share để kiểm tra hành vi; không gọi là wardrobe đầy đủ.
3. **Hoàn thiện Hub + UX đặc biệt/PWA:** duyệt leak, route, IAP và QR sau khi protocol rõ; notification có giới hạn minh bạch.
4. **Full asset có điều kiện:** mở khi TGC xác nhận đúng quyền và đã nhận được asset phù hợp; không chặn release Hub/placeholder.

Đây là thứ tự công việc, không cắt bỏ yêu cầu nào. Feature chưa đủ nguồn/quyền được đánh dấu blocked/unavailable và có task theo dõi.

## Nghiệm thu toàn sản phẩm

- Dùng được không đăng nhập và không phát sinh tính năng trả phí.
- Mọi dữ liệu thật truy về hồ sơ Kxx và chứng cứ bản ghi; giữ attribution/rủi ro trong brief.
- Reload giữ local state; link outfit mở được trong phiên trống; JSON/QR không tin cậy được validate.
- Không có draft leak, bí mật vận hành hoặc profile QR trong public data bundle.
- Vercel preview được kiểm tra trên luồng chính; public release chỉ gồm asset có căn cứ hoặc hình học placeholder tự tạo.
- Các phần full wardrobe/3D hiển thị **pending legal confirmation** đến khi có phản hồi áp dụng được.
- Không tuyên bố có native app, push nền, database live hoặc parser chạy được khi chỉ mới có tài liệu/scaffold.

Open questions và task nghiệm thu chi tiết nằm trong [Implementation Plan](plan/IMPLEMENTATION_PLAN.md).
