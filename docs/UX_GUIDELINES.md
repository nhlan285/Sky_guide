# UX guidelines

## Baseline UX đã chốt cho Phase 0

- UI mặc định **tiếng Việt**; tên item, spirit và season giữ tên gốc tiếng Anh từ nguồn. ID nội bộ không phụ thuộc bản dịch hay label hiển thị.
- Browser mục tiêu: Chrome/Edge desktop bản mới, Chrome Android và Safari iOS bản gần đây. Accessibility hướng tới **WCAG 2.2 AA**, gồm focus nhìn thấy, không chỉ dựa vào màu và hỗ trợ reduced motion.
- Trang chủ giữ thứ tự: **season/event → Traveling Spirit → tin chính thức → lookup/Wardrobe → maps/routes → leak thu gọn → footer**. Trong MVP chỉ triển khai season/TS, official news, tìm item và lối vào Wardrobe; module chưa làm dùng trạng thái compact “sắp có/chưa triển khai”, không chiếm card rỗng lớn.
- Notification giai đoạn đầu chỉ hoạt động khi app đang mở và người dùng chủ động bật; không hứa background delivery.


Cơ sở: [brief mục 5](PROJECT_BRIEF.md). Nhận xét về vithai/thatskyapplication là nhận xét **của brief**, chưa phải kết quả audit UI hiện tại. Học mật độ thông tin và độ gọn, không sao chép giao diện hoặc phát sinh tích hợp ngoài phạm vi.

## Nguyên tắc

Ưu tiên thông tin cần hành động: đang diễn ra gì, còn bao lâu, item nào, tốn gì, đến đâu. Dùng nền trung tính, một màu nhấn chính và màu trạng thái có ý nghĩa; không tô mỗi module một màu. Dùng nhãn văn bản cùng icon để phân biệt official/leak/prediction/stale/placeholder.

Đề xuất khoảng cách theo bội 4 px, nhịp phổ biến 8/12/16/24 px; font body khoảng 14–16 px và line-height dễ đọc. Đây là token khởi đầu để thử, không tiêu chuẩn được brief đo sẵn. Mật độ cao nhờ bảng, nhóm liên quan và disclosure, không nhờ thu chữ đến khó đọc. Chừa khoảng thở ở nhóm hành động, tránh hero rỗng và card cao chỉ có một con số.

Responsive theo diện tích nội dung thực tế; desktop dùng nhiều cột, mobile ưu tiên một cột và thao tác chạm. Không ép bảng tràn ngang nếu có thể chuyển thành hàng có nhãn. Target chạm đủ rộng, focus thấy rõ, trạng thái không chỉ dựa màu, hỗ trợ giảm chuyển động. Không cần animation trang trí cho đồng hồ hoặc marker.

## Trang chủ Hub — wireframe contract P0-U01 (2026-10-02)

Contract Phase 0 theo Q05; các sơ đồ chỉ dùng nhãn vùng, không chứa dữ liệu game. **Release 1 MVP surface:** season/event, Traveling Spirit (TS) đã xác minh, tin chính thức, lookup item và lối vào Wardrobe. Maps/routes, leak cộng đồng đã duyệt, prediction, IAP và QR dành cho các task sau hoặc gate tương ứng; giữ chỗ gọn, không coi là chức năng MVP đã có. Q02/Q09/Q10/Q14 và các gate nguồn vẫn mở. Shell hiện tại chỉ có `/`, `/about` và not-found; contract này chưa thêm route, component hoặc tính năng.

### Desktop — ưu tiên theo hàng

```text
[Tên app | Trang chủ | Tra cứu item | Wardrobe | Tìm kiếm]
[Trạng thái nguồn / lần cập nhật / offline khi có liên quan]
[Season / event — cột chính          | Traveling Spirit — cột phụ]
[Tin chính thức — danh sách gọn, toàn hàng                       ]
[Tra cứu item — cột chính            | Lối vào Wardrobe — cột phụ]
[Bản đồ / hướng dẫn — hàng compact, triển khai sau              ]
[> Tin cộng đồng chưa xác nhận — thu gọn, triển khai sau         ]
[Nguồn / ghi công | Pháp lý | Thiết lập trên thiết bị            ]
```

Season/event là vùng ưu tiên đầu, TS ở cùng hàng; news nằm trước lookup/Wardrobe trong thứ tự đọc và tab. Cột chính rộng hơn cột phụ khi nội dung cho phép; không khóa pixel/breakpoint ở Phase 0. Card cao theo nội dung, không kéo hàng thiếu dữ liệu thành panel trống. Chuyển sang một cột khi tên dài/controls không còn vừa, theo thứ tự mobile dưới đây. Không dùng CSS reorder làm thứ tự nhìn khác thứ tự DOM/focus.

### Mobile — thứ tự stack bắt buộc

```text
1. Tên app + nút Tìm kiếm + menu điều hướng gọn
2. Dòng trạng thái liên quan (nguồn / cập nhật / offline)
3. Season / event
4. Traveling Spirit
5. Tin chính thức
6. Tra cứu item (ô tìm + bộ lọc mở theo nhóm)
7. Lối vào Wardrobe (hàng/nút gọn)
8. Bản đồ / hướng dẫn (compact, triển khai sau)
9. Tin cộng đồng chưa xác nhận (thu gọn mặc định)
10. Footer: nguồn / ghi công, pháp lý, thiết lập trên thiết bị
```

Mobile là stack theo ưu tiên, không thu nhỏ hai cột desktop. Header không chiếm hero; menu dùng nút có tên và trạng thái mở, đóng trả focus về nút gọi. Nút Tìm kiếm đưa tới ô lookup trong cùng Hub và đặt focus vào input; desktop dùng cùng đích. Submit tìm trong catalog public đã validate, kết quả hiển thị dưới ô tìm, chọn kết quả mở detail khi module sẵn sàng. Clear query/bộ lọc không reset outfit. Không autocomplete bằng dữ liệu giả hoặc tự mở URL từ query. Khi catalog chưa có, hiển thị lý do unavailable và không cho thao tác tìm như thể dữ liệu đã sẵn sàng.

Controls phụ như lọc slot mở theo nhóm trên mobile; thông tin season/TS/news vẫn ở trên kết quả lookup. Lối vào Wardrobe luôn sau lookup và cũng có trong nav chính để truy cập nhanh; khi editor chưa triển khai, nhãn “Wardrobe — chưa triển khai”, không có CTA giả “Thử ngay”. Khi có editor demo, CTA “Mở Wardrobe demo” kèm nhãn hình tự tạo; “Tiếp tục outfit trên thiết bị” chỉ hiện khi restore hợp lệ đã được implement. Giữ contract SVG paper-doll 2D placeholder, base/effective size, cardinality theo config và cảnh báo conflict/missing asset của Q08; fixture không đại diện behavior game đã xác minh.

### Vùng nội dung và navigation

| Vị trí | Desktop contract | Mobile contract | Nội dung/hành động khi đã triển khai |
|---|---|---|---|
| Header | Logo chữ + nav gọn + tìm kiếm | Tên app + nút tìm, nav rút gọn | Trang chủ, Tra cứu item, Wardrobe là entry MVP; maps/routes và Profile chỉ active khi module sẵn sàng, còn lại nhãn triển khai sau |
| Hàng trạng thái | Một hàng full width thấp | Hai dòng nếu cần | Nguồn thời gian/last sync, offline/stale, thông báo chỉ khi có điều cần chú ý |
| Hàng đầu, cột chính | Season/event hiện tại | Widget đầu tiên | Tên, ngày bắt đầu/kết thúc, countdown, link chi tiết; unavailable khi thiếu nguồn |
| Hàng đầu, cột phụ | TS hiện tại/gần nhất có evidence | Ngay sau season/event | Lần ghé đã xác nhận; lịch sử khi sẵn sàng; prediction ở phần riêng triển khai sau, gated Q09 |
| Hàng thứ hai | Patch notes/tin chính thức toàn hàng | Sau TS | Danh sách ngắn, title + ngày/version khi biết + link nguồn thật; không trộn leak/prediction |
| Hàng thứ ba, cột chính | Tra cứu item | Sau news | Search/filter slot; giá có currency khi đã biết, unknown không là 0; calculator/market picker IAP triển khai sau |
| Hàng thứ ba, cột phụ | Lối vào Wardrobe | Ngay sau lookup | Entry theo trạng thái editor/local restore; demo có nhãn placeholder/fixture |
| Hàng tiếp | Maps/Routes compact | Sau Wardrobe | Chưa triển khai: một dòng lý do; về sau có entry realm/route/Eden khi có dữ liệu hợp lệ |
| Vùng cộng đồng | Leak đã duyệt, thu gọn | Cuối nội dung, thu gọn | Spoiler control trước nội dung; review không biến thành official; inactive khi Q02/nguồn/publication gate chưa đạt |
| Footer | Dòng nguồn/credits/pháp lý/thiết lập | Các link ngắn | Attribution, trạng thái asset, quản lý local data và notification |

Nav active có nhãn hiện tại/focus rõ; entry chưa triển khai là text trạng thái, không link tới route chưa tồn tại. Footer theo luồng trang, mobile wrap/stack các link có tên đầy đủ, không sticky che nội dung. Thiết lập local và notification đặt ở footer/menu công cụ khi đã implement, không yêu cầu đăng nhập. Link nguồn chỉ từ provenance đã validate; không tạo URL mẫu. Layout không tạo widget “đang diễn ra” khi dataset chưa có. Vùng secondary thu gọn không đưa nội dung spoiler vào preview; không fetch/publish draft để lấp chỗ. Mọi trạng thái dùng chữ cùng icon nếu có, keyboard/focus và reduced motion theo browser/accessibility baseline.

### State contract cho wireframe

Các câu trong bảng là **copy mẫu cho UI sau này**, không là dữ liệu game hiện tại. Mỗi vùng chuyển trạng thái độc lập; nhãn độ mới đi cùng nội dung cả khi normal.

| Trạng thái | Cách thể hiện ở desktop/mobile | Copy mẫu / hành động |
|---|---|---|
| Normal content | Nội dung đã validate, tên từ nguồn, link provenance và lần cập nhật; chiều cao theo nội dung | Nhãn “Tin chính thức” chỉ cho nội dung official có evidence; countdown chỉ khi mốc confirmed và time còn hợp lệ |
| Loading | Skeleton gọn trong vùng đang tải + chữ; không dựng tên/ngày/countdown giả, không khóa toàn Hub | “Đang tải thông tin…”; thông báo trạng thái cho assistive technology, không đọc lại mỗi giây |
| Empty | Tập hợp lệ thực sự rỗng hoặc search không có match; không dùng cho nguồn chưa tích hợp | Search: “Không tìm thấy item phù hợp.” + “Xóa bộ lọc”; news: “Chưa có bài viết trong danh sách này.” |
| Unavailable / source not verified | Một dòng lý do ở vị trí card/entry, không skeleton vô hạn; không CTA phụ thuộc dữ liệu chưa có | “Chưa có dữ liệu — nguồn chưa được xác minh.”; module chưa làm: “Bản đồ / hướng dẫn — chưa triển khai.” |
| Stale | Chỉ giữ last-known-good đã xác minh, kèm lần cập nhật thật và nhãn cần cập nhật; không gọi là live/current | “Dữ liệu cần cập nhật.” + “Lần cập nhật: [thời điểm từ metadata]”; refresh chỉ khi adapter có thật; time expired thì ngừng khẳng định countdown chính xác |
| Placeholder | Hình học tự tạo có nhãn ngay cạnh preview; thông tin text hợp lệ vẫn đọc được | “Hình thay thế tự tạo”; demo thêm “Demo / fixture — không phải dữ liệu game đã xác minh.”; không dùng icon Wiki làm bằng chứng try-on |
| Error | Lỗi vùng có lý do ngắn, giữ selection/query và phần dữ liệu hợp lệ khác | “Không tải được thông tin.” + “Thử lại” khi có thao tác tải thật; không ghi đè dữ liệu tốt bằng empty |
| Offline | Dòng gọn với metadata cache thật khi cache đã implement; kết hợp stale nếu hết hạn | “Đang ngoại tuyến”; “Đang xem dữ liệu đã lưu.” chỉ khi thật sự có cache; không giả cập nhật/lịch mới |

`[thời điểm từ metadata]` là vị trí chèn trong copy mẫu, không hiển thị nguyên placeholder hay bịa timestamp. Với cùng vùng, error/unavailable là trạng thái chính; nhãn stale/placeholder/offline vẫn giữ nếu nội dung đang xem có thuộc tính đó. Lỗi time không làm catalog biến mất; nội dung thiếu thời gian không được biến thành countdown 0 hoặc hẹn notification theo lịch đoán.

## Wardrobe

Desktop: cột trái bộ lọc slot/search + item list, giữa preview, cột phải size/dye/outfit controls. Mobile: preview đầu, thanh slot ngay dưới, item drawer/grid cuộn, controls size/dye mở theo nhóm; nút lưu/share luôn dễ tìm nhưng không che item. Preview phải có diện tích ổn định để so sánh thay đồ.

Widgets: size selector (mã có evidence; demo dùng mã `fixture-`), dòng effective size + lý do override; danh sách item đang mặc với nút tháo; dye region picker chỉ khi hỗ trợ; reset dye; lưu local; copy link; trạng thái asset. Theo Q08, tháo override cuối cùng trả lại base size; nếu còn rule khác thì derive lại, UI giữ lựa chọn base. “Chibi override” hiện chỉ là behavioral fixture, chưa có mapping size thật. Asset chưa có thì hình học/nhãn mô tả, không khoảng preview trống. Không dùng icon Wiki như bằng chứng đã có model try-on.

Capacity từng slot theo config dự án; equip vượt giới hạn báo lý do và giữ selection, replace là thao tác rõ. Slot multiple hiển thị từng item với nút tháo riêng. Conflict rule/missing anchor/revision phải có cảnh báo chữ; preview tạm deterministic không được hiện như outfit đã resolve hợp lệ. Demo luôn có nhãn fixture/self-created placeholder, không gọi cardinality hay calibration demo là behavior game đã xác minh.

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

### Notification contract P0-U02 — Q07 (2026-10-02)

Release 1 chỉ có **in-app reminder và notification khi app đang mở**, sau khi tính năng được triển khai và capability được kiểm tra. Không bảo đảm delivery/đúng giờ; tab ngủ, browser throttling hoặc offline có thể làm nhắc trễ/không xuất hiện. Đóng app/browser không có cam kết nhắc. Web Push/background notification vẫn research/future scope (P6-R01), không có subscription server, service worker gửi nhắc hoặc PWA background guarantee trong contract này.

Flow sau này: người dùng bật nhắc trong thiết lập → giải thích giới hạn → chủ động chọn bật notification trình duyệt → kiểm tra capability/quyền và chỉ request permission trực tiếp trong thao tác bật đó khi cần. Bật nhắc trong app riêng không tự mở prompt browser. Granted chỉ thể hiện quyền notification, không chứng minh có delivery; denied/unsupported vẫn cho dùng nhắc trong app nếu tính năng đó đã sẵn sàng. Không tự request lại sau denied; người dùng có thể đổi quyền trong thiết lập trình duyệt. Tắt nhắc ngừng nhắc tương ứng, không giả thu hồi quyền browser.

Các wording dưới đây là **spec copy**, chỉ dùng trạng thái active sau khi implementation và nguồn thời gian/mốc lịch đã xác minh. Shell hiện chưa có reminder/notification; hiện trạng dùng “Nhắc nhở — chưa triển khai”, không nút bật có vẻ hoạt động. Chưa có mốc tin cậy thì trạng thái unavailable, không tự tạo lịch từ fixture.

| Trường hợp | Wording tiếng Việt / hành động dự kiến |
|---|---|
| Bật nhắc trong app | “Bật nhắc trong ứng dụng” — “Nhắc chỉ hoạt động khi bạn đang mở ứng dụng; có thể bị trễ hoặc không xuất hiện.” |
| Trước quyền browser | “Bật thông báo trình duyệt” — “Trình duyệt sẽ hỏi quyền hiển thị thông báo. Chỉ hoạt động khi ứng dụng đang mở; không bảo đảm gửi đúng giờ. Bạn vẫn có thể dùng nhắc trong ứng dụng nếu không cấp quyền.” |
| Notification active | “Thông báo trình duyệt đang bật khi ứng dụng mở.” — “Đóng ứng dụng sẽ không được nhắc; tab ngủ hoặc mất mạng có thể làm nhắc trễ hoặc không xuất hiện.” |
| Unsupported | “Trình duyệt này chưa hỗ trợ thông báo cho ứng dụng.” — “Bạn vẫn có thể dùng nhắc trong ứng dụng khi đang mở.” chỉ khi in-app reminder đã implement |
| Denied | “Quyền thông báo chưa được cấp.” — “Bạn có thể thay đổi quyền trong thiết lập trình duyệt.”; không ép bật lại |
| Nguồn unavailable | “Chưa thể bật nhắc: chưa có mốc thời gian đã xác minh.”; giữ lựa chọn opt-in local nếu có nhưng không ghi trạng thái delivery active |

### Ngôn ngữ và glossary P0-U03 — Q17 (2026-10-02)

UI mặc định **tiếng Việt**. Tên riêng item/spirit/season giữ tên tiếng Anh gốc từ nguồn đã xác minh, kể cả kết quả tìm kiếm/detail; không dịch tên riêng hoặc tự tạo tên cho vùng thiếu dữ liệu. ID ổn định độc lập label/bản dịch. `LocalizedText` trong [DATA_SCHEMA](DATA_SCHEMA.md) là extension point cho ngôn ngữ sau; không thêm language picker hay đổi schema ở Phase 0.

| Ý nghĩa | Nhãn tiếng Việt chuẩn | Quy tắc phân biệt |
|---|---|---|
| Official | Tin chính thức | Chỉ có evidence official; không dùng cho bài cộng đồng chỉ vì đã qua review |
| Unconfirmed / community leak | Tin cộng đồng — chưa xác nhận | Khu riêng thu gọn/spoiler; chỉ public approved khi Q02/publication gate đã đạt, không trộn news official |
| Prediction | Dự đoán | Phần riêng, kèm phương pháp/độ mới khi đã duyệt; không trình bày như lịch confirmed; Q09 chưa chốt thì chưa có dự đoán |
| Placeholder | Hình thay thế tự tạo | Cho hình học self-created thay asset; dữ liệu text nếu thật vẫn cần nguồn; không hàm ý đã có quyền asset game |
| Unavailable | Chưa có dữ liệu | Kèm lý do: chưa triển khai, thiếu dữ liệu hoặc chưa xác minh; không dùng thay cho tập hợp lệ rỗng |
| Stale / needs refresh | Dữ liệu cần cập nhật | Lần cập nhật từ metadata, chỉ giữ bản từng được xác minh; không khẳng định đang diễn ra/live |
| Source not verified | Nguồn chưa được xác minh | Không thay bằng “chính thức”, không biến unknown thành 0/miễn phí |
| Fixture/demo (dev/test UI) | Demo / fixture — không phải dữ liệu game đã xác minh | Gắn rõ fixture=true ở dữ liệu kỹ thuật; nếu demo hiển thị thì nhãn cạnh nội dung/preview, không chỉ trong tooltip |

Official/leak/prediction khác nhau cả tên vùng lẫn badge chữ, không chỉ khác màu. Review nội dung và verification nguồn là hai việc khác nhau; “đã duyệt” không đồng nghĩa “đã xác nhận”. Copy error/empty/stale dùng bảng state contract trên; mọi copy active/cached/saved chỉ dùng khi có hành vi hoặc dữ liệu tương ứng. Full 3D/game assets vẫn **pending legal confirmation**; phản hồi Sky Player Support / Ray không đồng nghĩa permission granted.

## Checklist wireframe trước code

- Người mới tìm Wardrobe, TS và Eden từ trang chủ mà không qua menu nhiều cấp.
- Mọi card có thông tin hoặc hành động hữu ích; không khoảng trắng lớn do fixed height.
- Kiểm tra layout hẹp/rộng và nội dung tên dài; focus/keyboard và contrast theo chuẩn accessibility được chọn ở bước triển khai.
- Official/leak/prediction và stale/placeholder phân biệt được bằng chữ.
- Không expose draft, ticket, camera payload hoặc giá/size demo như dữ liệu thật.

Đầu ra wireframe và nghiệm thu từng widget nằm trong [Plan](plan/IMPLEMENTATION_PLAN.md).
