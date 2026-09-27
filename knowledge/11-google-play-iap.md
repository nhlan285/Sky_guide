# K11 — Google Play listing chính thức

- **Nguồn/link:** Google Play listing chính thức của Sky; brief chưa có package ID, vùng hoặc URL.
- **Dữ liệu:** giá IAP công khai theo Android/storefront; khoảng giá tổng quát không đủ để suy ra giá mỗi SKU.
- **Format:** listing web/store chưa khảo sát; không có API đã nêu trong brief.
- **Truy xuất đề xuất:** xác minh listing và vùng; ghi price observation thủ công trước. Không suy luận giá Android từ iOS, không lấy giá range làm giá item.
- **Rủi ro/ghi chú nguyên văn:** “Dữ liệu công khai, không cần xin phép”. Đây là trạng thái được brief ghi, không xác nhận điều kiện tự động truy xuất.
- **Trạng thái:** đã sẵn sàng dùng theo brief; cần link, market và SKU.
- **Thiếu:** package/SKU, giá cụ thể, thuế, promo, package contents và ngày quan sát.
- **Đầu ra chấp nhận:** cùng item khác platform lưu quan sát riêng; source và market rõ; thiếu giá chính xác thì unavailable, không giá 0.
- **Tham chiếu:** [K10](10-app-store-iap.md), [K12](12-apppricinglab.md), [Schema](../docs/DATA_SCHEMA.md).
