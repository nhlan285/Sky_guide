# K02 — Wiki: Regular Spirits

- **Nguồn/link:** trang “Regular Spirits” trên Sky Wiki; URL không được cung cấp trong brief.
- **Dữ liệu:** spirit và chi phí Friendship Tree; cần xác minh bảng/node, quan hệ điều kiện mở khóa, loại tiền và item tương ứng.
- **Format:** trang wiki; chưa có response API hoặc HTML mẫu. Không khẳng định dữ liệu tree có sẵn dạng JSON.
- **Truy xuất đề xuất:** xác minh trang và revision; ưu tiên đường MediaWiki đã xác minh ở K01 nếu phù hợp; nếu chưa parse được thì biên tập text có nguồn. Chuẩn hóa Spirit, FriendshipNode, CurrencyAmount, không suy luận cạnh tree bị thiếu.
- **Rủi ro/ghi chú nguyên văn:** “An toàn, dữ liệu text”.
- **Trạng thái:** đã sẵn sàng dùng theo brief; cần kiểm chứng cách lấy. Phần text Wiki vẫn theo lưu ý CC-BY-SA tại K01; không mở rộng sang ảnh.
- **Thiếu:** URL/revision, định dạng tree, node tùy chọn, tổng giá có bao gồm điều kiện mở khóa hay không.
- **Đầu ra chấp nhận:** cây không chu trình, node có nguồn, phân biệt chi phí từng node và tổng theo đường mở khóa, chi phí unknown không thành 0.
- **Tham chiếu:** [Schema](../docs/DATA_SCHEMA.md), [K01](01-wiki-items.md).
