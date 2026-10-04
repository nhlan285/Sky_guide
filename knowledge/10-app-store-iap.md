# K10 — App Store listing chính thức

## Xác minh bổ sung 2026-10-04

[US listing](https://apps.apple.com/us/app/sky-children-of-the-light/id1462117269)
đọc được, app ID `1462117269`, seller thatgamecompany. Mẫu iOS USD: Starter Pack
4.99, Season Pass Regular 9.99, Season Pass Pack 19.99. Chưa có storeProductId và
coverage đầy đủ. Cùng App ID ở storefront VN trả HTTP 404 qua Node, nên chưa có
giá VND; không kết luận về khả năng sử dụng game tại VN. Ngôn ngữ Việt trên US
listing không phải storefront VN. User chọn USD/VND, iOS/Android độc lập.
[Evidence và mapping](16-image-price-sources.md#giá-tiền-thật-theo-thị-trườngnền-tảng).

## Hồ sơ scaffold gốc (trạng thái lịch sử)

- **Nguồn/link:** App Store listing chính thức của Sky. Brief chưa có app ID, storefront hoặc URL listing.
- **Dữ liệu:** giá IAP công khai; sản phẩm, thị trường, tiền tệ và thời điểm quan sát phải được ghi riêng.
- **Format:** listing web/store chưa khảo sát; brief không nêu API hoặc bảo đảm mọi SKU đều hiện trên listing.
- **Truy xuất đề xuất:** xác minh listing chính thức và storefront được chọn; nhập price observation thủ công có nguồn trước; chỉ tự động hóa phần thực sự public sau kiểm tra. Thiếu SKU thì để unknown.
- **Rủi ro/ghi chú nguyên văn:** “Dữ liệu công khai, không cần xin phép”. Đây là trạng thái trong brief, không phải kết luận pháp lý mới hoặc bảo đảm quyền scraping.
- **Trạng thái:** đã sẵn sàng dùng theo brief; cần URL, thị trường và mapping SKU.
- **Thiếu:** SKU, giá thuế/khuyến mãi, tiền tệ, package contents, khả năng xác minh lịch sử.
- **Đầu ra chấp nhận:** giá gắn platform/storefront/currency/time; giữ giá niêm yết, không tự thêm tỷ giá hối đoái hoặc quy đổi heart chưa có cơ sở.
- **Tham chiếu:** [K11](11-google-play-iap.md), [K12](12-apppricinglab.md), [Schema](../docs/DATA_SCHEMA.md).
