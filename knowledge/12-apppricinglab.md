# K12 — AppPricingLab

- **Nguồn/link:** [apppricinglab.com](https://apppricinglab.com), domain có trong brief; chưa có trang Sky hoặc API.
- **Dữ liệu:** brief mô tả dịch vụ theo dõi lịch sử giá tự động. Điều này không chứng minh có API công khai, export miễn phí hay bao phủ IAP từng SKU.
- **Format:** chưa biết; không khẳng định JSON/CSV hoặc tên field.
- **Truy xuất đề xuất:** xác minh phạm vi sản phẩm/market/IAP và cách truy xuất; nhập quan sát thủ công hoặc liên kết tham khảo khi chưa có contract. Không thiết kế integration dựa trên endpoint phỏng đoán.
- **Rủi ro/ghi chú nguyên văn:** “Dữ liệu công khai, không cần xin phép”. Giữ nguyên mô tả brief; điều kiện dịch vụ/truy xuất thực tế vẫn chưa được xác minh.
- **Trạng thái:** đã sẵn sàng dùng về định hướng nguồn, cần xác minh tích hợp; không có dữ liệu thì dùng placeholder phi số liệu.
- **Thiếu:** URL sản phẩm, khả năng truy cập, API/export, giá dịch vụ, coverage SKU/market, độ trễ và timestamps lịch sử.
- **Đầu ra chấp nhận:** có mapping observation vào K10/K11 khi thực sự cùng SKU/market; giữ xung đột, không thay giá hiện tại bằng giá lịch sử.
- **Tham chiếu:** [Schema](../docs/DATA_SCHEMA.md), [Architecture](../docs/ARCHITECTURE.md).
