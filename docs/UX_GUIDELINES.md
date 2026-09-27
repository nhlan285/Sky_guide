# UX guidelines

Cơ sở: [brief mục 5](PROJECT_BRIEF.md). Nhận xét về vithai/thatskyapplication là nhận xét **của brief**, chưa phải kết quả audit UI hiện tại. Học mật độ thông tin và độ gọn, không sao chép giao diện hoặc phát sinh tích hợp ngoài phạm vi.

## Nguyên tắc

Ưu tiên thông tin cần hành động: đang diễn ra gì, còn bao lâu, item nào, tốn gì, đến đâu. Dùng nền trung tính, một màu nhấn chính và màu trạng thái có ý nghĩa; không tô mỗi module một màu. Dùng nhãn văn bản cùng icon để phân biệt official/leak/prediction/stale/placeholder.

Đề xuất khoảng cách theo bội 4 px, nhịp phổ biến 8/12/16/24 px; font body khoảng 14–16 px và line-height dễ đọc. Đây là token khởi đầu để thử, không tiêu chuẩn được brief đo sẵn. Mật độ cao nhờ bảng, nhóm liên quan và disclosure, không nhờ thu chữ đến khó đọc. Chừa khoảng thở ở nhóm hành động, tránh hero rỗng và card cao chỉ có một con số.

Responsive theo diện tích nội dung thực tế; desktop dùng nhiều cột, mobile ưu tiên một cột và thao tác chạm. Không ép bảng tràn ngang nếu có thể chuyển thành hàng có nhãn. Target chạm đủ rộng, focus thấy rõ, trạng thái không chỉ dựa màu, hỗ trợ giảm chuyển động. Không cần animation trang trí cho đồng hồ hoặc marker.

## Trang chủ Hub — bố trí widget cụ thể

| Vị trí | Desktop đề xuất | Mobile đề xuất | Nội dung/hành động |
|---|---|---|---|
| Header | Logo chữ + nav gọn + tìm kiếm | Tên app + nút tìm, nav rút gọn | Hub, Wardrobe, Items, Maps/Routes; Profile nằm trong menu công cụ |
| Hàng trạng thái | Một hàng full width thấp | Hai dòng nếu cần | Nguồn thời gian/last sync, offline/stale, thông báo chỉ khi có điều cần chú ý |
| Hàng đầu, cột chính | Season/event hiện tại | Widget đầu tiên | Tên, ngày bắt đầu/kết thúc, countdown, link chi tiết; unavailable khi thiếu nguồn |
| Hàng đầu, cột phụ | TS hiện tại/gần nhất | Ngay sau season/event | Lần ghé đã xác nhận; link lịch sử; prediction ở khối con tách biệt |
| Hàng thứ hai, cột chính | Patch notes/tin chính thức | Sau TS | 3–5 dòng tin đề xuất, title + ngày/version + link; số dòng điều chỉnh theo mật độ thực tế |
| Hàng thứ hai, cột phụ | Wardrobe quick access | Nút/card thấp | Mở outfit gần nhất local hoặc thử demo; nhãn placeholder nếu có |
| Hàng tiếp, cột chính | Items/IAP quick lookup | Sau news | Search item, filter slot, market/platform đã chọn; currency rõ; không show giá chưa biết là 0 |
| Hàng tiếp, cột phụ | Maps/Routes | Sau lookup | Chọn realm/season, lối tắt Eye of Eden, tiếp tục bước route local |
| Vùng cộng đồng | Leak đã duyệt, thu gọn | Cuối nội dung, thu gọn | Spoiler control, nhãn chưa xác nhận, link nguồn phù hợp; không trộn vào official feed |
| Footer | Dòng nguồn/credits/pháp lý/thiết lập | Các link ngắn | Attribution, trạng thái asset, quản lý local data và notification |

Số dòng, độ rộng cột là đề xuất cho wireframe. Không tạo widget “đang diễn ra” giả khi dataset chưa có. Khi module thiếu dữ liệu, giữ khối compact kèm lý do thay vì khoảng trống lớn.

## Wardrobe

Desktop: cột trái bộ lọc slot/search + item list, giữa preview, cột phải size/dye/outfit controls. Mobile: preview đầu, thanh slot ngay dưới, item drawer/grid cuộn, controls size/dye mở theo nhóm; nút lưu/share luôn dễ tìm nhưng không che item. Preview phải có diện tích ổn định để so sánh thay đồ.

Widgets: size selector (mã gốc), dòng effective size + lý do override; danh sách item đang mặc với nút tháo; dye region picker chỉ khi hỗ trợ; reset dye; lưu local; copy link; trạng thái asset. Tháo chibi trả lại base size, UI không “nhảy mất” lựa chọn. Asset chưa có thì hình học/nhãn mô tả, không khoảng preview trống. Không dùng icon Wiki như bằng chứng đã có model try-on.

## Các trang Hub

| Khu vực | Widget và bố cục | Trạng thái quan trọng |
|---|---|---|
| Item database | Filter bar sticky vừa đủ, bảng/list tên–slot–giá–season–spirit; detail panel/page có provenance và nút thử | Giá nhiều loại tiền thành nhiều nhãn; chưa có asset vẫn đọc text |
| Spirit/tree | Header tên + source, cây hoặc danh sách quan hệ; tổng đường chọn và item link | Tổng chưa đủ dữ liệu gắn incomplete, node unknown không thành free |
| TS tracker | Tab History / Prediction; timeline hoặc bảng ngày–spirit–nguồn; filter compact | Prediction có phương pháp/độ mới, không dùng countdown như lịch đã xác nhận |
| Season/event | Tóm tắt hiện tại, mốc có nguồn, item/spirit/map liên quan | Thời gian tentative khác confirmed, nguồn mất thì countdown stale |
| News/patch notes | Official feed theo ngày, version chip; detail tóm tắt và link gốc | Ngày/version không biết để nhãn rõ, không giả tin mới |
| Leak | Khu riêng có spoiler toggle; nhãn unconfirmed và ngày review | Chỉ approved public; nội dung withdrawn biến mất khỏi feed/cache sau update |
| Map | Chọn realm/season/map; canvas ảnh + toolbar zoom và layer; danh sách marker đồng bộ | Không kéo marker revision cũ sang ảnh mới; text fallback nếu chưa có ảnh |
| Route/Eden | Danh sách bước, nút trước/sau, checkbox tiến độ local, map marker và nguồn | Spoiler cảnh báo theo nội dung; version route đổi cần reconcile progress |
| IAP | Platform + market picker; giá quan sát và ngày; breakdown gói/currency/giả định | Tách “ước lượng tỷ lệ” và “tiền mua gói”; heart unknown không có số quy đổi |

## QR Profile và thiết lập local

Profile có hai entry đề xuất: chọn ảnh QR hoặc bật camera; chỉ xin camera khi người dùng bấm. Sau decode hiển thị preview các field đã validate và nguồn/protocol nếu biết; URL lạ/QR sai không tự điều hướng. Nếu protocol chưa được xác minh, hiển thị unavailable và link tham khảo đã kiểm tra sau này; không dựng thông tin tài khoản giả. Không upload QR mặc định.

Thiết lập: trạng thái lưu trên thiết bị, export/import/reset có phạm vi rõ, spoiler, market/platform, notification opt-in và thông tin capability. Reset yêu cầu xác nhận phù hợp vì xóa state local; export trước là tùy chọn. Không có màn hình đăng nhập hoặc gói trả phí.

## Empty/error/offline và thông báo

Mỗi vùng độc lập: skeleton khi tải, hướng dẫn hành động khi empty, retry khi lỗi, ngày cập nhật khi stale. Lỗi time không làm catalog biến mất. Thông báo chỉ xin quyền khi người dùng bật tính năng; mô tả mức đầu hoạt động khi app đang mở, không hứa background delivery. Không bật notification popup ngay lần vào đầu tiên.

## Checklist wireframe trước code

- Người mới tìm Wardrobe, TS và Eden từ trang chủ mà không qua menu nhiều cấp.
- Mọi card có thông tin hoặc hành động hữu ích; không khoảng trắng lớn do fixed height.
- Kiểm tra layout hẹp/rộng và nội dung tên dài; focus/keyboard và contrast theo chuẩn accessibility được chọn ở bước triển khai.
- Official/leak/prediction và stale/placeholder phân biệt được bằng chữ.
- Không expose draft, ticket, camera payload hoặc giá/size demo như dữ liệu thật.

Đầu ra wireframe và nghiệm thu từng widget nằm trong [Plan](plan/IMPLEMENTATION_PLAN.md).
