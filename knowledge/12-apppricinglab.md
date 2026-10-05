# K12 — AppPricingLab

## Xác minh bổ sung 2026-10-04

Home đọc được và giới thiệu theo dõi IAP Apple/Google. Chưa xác minh record Sky,
API/export, coverage SKU/market hay lịch sử truy xuất được. Giữ candidate, chưa
thiết kế adapter theo lời giới thiệu. [Nguồn đối chiếu mới/evidence](16-image-price-sources.md).

## P1-D12 capability review — 2026-10-06
Form public thực dùng GET `/search`, input `q`; tìm Sky trả link
[iOS record](https://apppricinglab.com/app/apple/1462117269) và
[Android record](https://apppricinglab.com/app/google_play/com.tgc.sky.android).
[IAP page](https://apppricinglab.com/iap/apple/1462117269) có10 mục iOS nhưng
checked2026-03-29 và chỉ một crawl snapshot; không suy dữ liệu Sky mới từ ngày
update homepage. Android không thấy giá từng SKU. $ giữ raw, chưa khẳng định
market/currencyCode, không có storeProductId/contents. Regular Candles lặp nhãn
không được tự ghép SKU. [Evidence](evidence/k10-k12-price-capability-2026-10-06.json)
giữ retrieval/hash/field missing và sample giới hạn.

[Terms2026-03-25](https://apppricinglab.com/terms) cho tham khảo research/link với
backlink rõ tới page gốc, cấm scrape/bulk download/redistribute competing dataset.
Không thấy API SKU/export trong các page đã kiểm tra; stats badge không phải
price feed. Kết luận manual partial source, P1-D12 DONE về capability review;
không có importer tự động hoặc promise free full history. Risk text scaffold
giữ nguyên nhưng điều kiện thực tế này chi phối cách dùng.

## Hồ sơ scaffold gốc (trạng thái lịch sử)

- **Nguồn/link:** [apppricinglab.com](https://apppricinglab.com), domain có trong brief; chưa có trang Sky hoặc API.
- **Dữ liệu:** brief mô tả dịch vụ theo dõi lịch sử giá tự động. Điều này không chứng minh có API công khai, export miễn phí hay bao phủ IAP từng SKU.
- **Format:** chưa biết; không khẳng định JSON/CSV hoặc tên field.
- **Truy xuất đề xuất:** xác minh phạm vi sản phẩm/market/IAP và cách truy xuất; nhập quan sát thủ công hoặc liên kết tham khảo khi chưa có contract. Không thiết kế integration dựa trên endpoint phỏng đoán.
- **Rủi ro/ghi chú nguyên văn:** “Dữ liệu công khai, không cần xin phép”. Giữ nguyên mô tả brief; điều kiện dịch vụ/truy xuất thực tế vẫn chưa được xác minh.
- **Trạng thái:** đã sẵn sàng dùng về định hướng nguồn, cần xác minh tích hợp; không có dữ liệu thì dùng placeholder phi số liệu.
- **Thiếu:** URL sản phẩm, khả năng truy cập, API/export, giá dịch vụ, coverage SKU/market, độ trễ và timestamps lịch sử.
- **Đầu ra chấp nhận:** có mapping observation vào K10/K11 khi thực sự cùng SKU/market; giữ xung đột, không thay giá hiện tại bằng giá lịch sử.
- **Tham chiếu:** [Schema](../docs/DATA_SCHEMA.md), [Architecture](../docs/ARCHITECTURE.md).
