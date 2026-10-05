# K11 — Google Play listing chính thức

## Xác minh bổ sung 2026-10-04

Package `com.tgc.sky.android`; [US](https://play.google.com/store/apps/details?id=com.tgc.sky.android&hl=en&gl=US)
và [VN](https://play.google.com/store/apps/details?id=com.tgc.sky.android&hl=vi&gl=VN)
trả HTTP 200 HTML qua Node. Web reader thất bại nhưng CLI đọc được. Chưa có giá
từng IAP SKU Android USD/VND: generic range và app price 0 không được gán vào
item. `hl` là ngôn ngữ; `gl` là vùng request, chưa phải xác nhận checkout/account.
Không lấy giá iOS làm giá Android. [Evidence/mapping](16-image-price-sources.md).

## Hồ sơ scaffold gốc (trạng thái lịch sử)

P1-D11 nghiệm thu source coverage2026-10-06: tái dùng HTTP200 US/VN HTML ngày
2026-10-04, không phát sinh giá SKU. [Capability evidence](evidence/k10-k12-price-capability-2026-10-06.json)
ghi app package, request gl/hl tách checkout market; iapSkuPrices=null. App free
không nghĩa IAP free; không dùng range hoặc giá iOS để ghép item Android. Source
task DONE về listing và missing coverage, không phải per-SKU integration.

- **Nguồn/link:** Google Play listing chính thức của Sky; brief chưa có package ID, vùng hoặc URL.
- **Dữ liệu:** giá IAP công khai theo Android/storefront; khoảng giá tổng quát không đủ để suy ra giá mỗi SKU.
- **Format:** listing web/store chưa khảo sát; không có API đã nêu trong brief.
- **Truy xuất đề xuất:** xác minh listing và vùng; ghi price observation thủ công trước. Không suy luận giá Android từ iOS, không lấy giá range làm giá item.
- **Rủi ro/ghi chú nguyên văn:** “Dữ liệu công khai, không cần xin phép”. Đây là trạng thái được brief ghi, không xác nhận điều kiện tự động truy xuất.
- **Trạng thái:** đã sẵn sàng dùng theo brief; cần link, market và SKU.
- **Thiếu:** package/SKU, giá cụ thể, thuế, promo, package contents và ngày quan sát.
- **Đầu ra chấp nhận:** cùng item khác platform lưu quan sát riêng; source và market rõ; thiếu giá chính xác thì unavailable, không giá 0.
- **Tham chiếu:** [K10](10-app-store-iap.md), [K12](12-apppricinglab.md), [Schema](../docs/DATA_SCHEMA.md).
