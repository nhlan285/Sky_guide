# Knowledge Base — sổ nguồn

Cơ sở duy nhất: [mục 3 của brief](../docs/PROJECT_BRIEF.md). Chưa gọi API, scrape, mở trang hay xác minh nguồn bên ngoài trong lần scaffold này. Đây là tham chiếu cứng cho thiết kế, không phải báo cáo thử nghiệm kết nối.

“Đã sẵn sàng dùng” bên dưới mô tả hướng triển khai text theo brief; **không** có nghĩa endpoint, schema response, giấy phép hoặc dữ liệu hiện tại đã được kiểm chứng. Mọi adapter phải qua bước xác minh ở Phase 1. Với đường dẫn không có trong brief, giữ `sourceUrl=null` cho tới khi xác minh; không bịa URL. Các link tên miền chỉ được chuẩn hóa từ tên miền ghi trong brief, chưa xác nhận đường dẫn chi tiết.

| ID | Nguồn riêng | Phạm vi | Trạng thái theo brief |
|---|---|---|---|
| K01 | [Sky Wiki item](01-wiki-items.md) | Cosmetic text, module cấu trúc | Đã sẵn sàng dùng: text; icon là placeholder |
| K02 | [Regular Spirits](02-wiki-regular-spirits.md) | Spirit, friendship tree | Đã sẵn sàng dùng |
| K03 | [Traveling Spirits Wiki](03-wiki-traveling-spirits.md) | Lịch sử TS | Đã sẵn sàng dùng, ghi nguồn |
| K04 | [Sky TS Calculator](04-ts-calculator.md) | Đối chiếu lịch sử TS | Đã sẵn sàng dùng về hướng dữ liệu; chờ link/cấu trúc |
| K05 | [ThatSkyAPI](05-thatskyapi.md) | Đồng hồ/countdown LA | Đã sẵn sàng dùng về hướng tích hợp; chờ endpoint |
| K06 | [Patch notes](06-official-patch-notes.md) | Tin chính thức | Đã sẵn sàng dùng |
| K07 | [Map Shrines](07-wiki-map-shrines.md) | Map, shrine, Children of Light | Text sẵn sàng; map cần placeholder/xác minh quyền |
| K08 | [AppUnwrapper](08-appunwrapper.md) | Walkthrough Eden/season | Đã sẵn sàng dùng: diễn giải lại |
| K09 | [Playlist dẫn trên Wiki](09-wiki-video-playlists.md) | Route/walkthrough | Đã sẵn sàng dùng: tham khảo và diễn giải |
| K10 | [App Store](10-app-store-iap.md) | Giá IAP | Đã sẵn sàng dùng; chờ listing |
| K11 | [Google Play](11-google-play-iap.md) | Giá IAP | Đã sẵn sàng dùng; chờ listing |
| K12 | [AppPricingLab](12-apppricinglab.md) | Lịch sử giá | Đã sẵn sàng dùng về nguồn; chờ cơ chế truy xuất |
| K13 | [Asset TGC](13-tgc-assets.md) | Model/icon đầy đủ | Đang chờ phản hồi TGC; cần placeholder |
| K14 | [Discord có kiểm duyệt](14-discord-editorial.md) | Tin leak | Cần cấu hình quy trình; chưa có nguồn cụ thể |

K01–K13 bao phủ từng nguồn riêng trong 9 hàng của bảng mục 3; hàng có nhiều nguồn được tách riêng. K14 là nguồn bổ sung **đã có ở mục 2.2 và 8 của brief**, không phải nguồn mới tự thêm. Season/event chưa có nguồn chuyên biệt trong bảng: không gán mặc nhiên ThatSkyAPI cung cấp nội dung season. Chỉ sử dụng thông tin kiểm chứng từ các nguồn đã liệt kê; nếu thiếu thì giữ trạng thái chưa có dữ liệu.

## Contract nguồn chung (đề xuất nội bộ)

Mỗi bản ghi import giữ `sourceId`, `sourceUrl`, `sourceRecordKey`, `sourceRevision`, `retrievedAt`, `observedAt`, `attribution`, `licenseNote`, `transformNote`, `verificationStatus`. Các trường chưa biết là `null`, không thay bằng dữ liệu giả. Snapshot raw chỉ lưu sau khi xác định được phần nội dung được phép lưu. Asset có `legalStatus` riêng; giấy phép text không áp dụng sang ảnh.

Pipeline và schema phải dẫn ID Kxx, phân biệt response upstream đã kiểm chứng với format chuẩn hóa do dự án đề xuất. Dữ liệu thử nghiệm cần `fixture=true`, không được xuất như dữ liệu game thật. Mọi thay đổi về rủi ro phải đối chiếu [LEGAL_STATUS](../docs/LEGAL_STATUS.md).
