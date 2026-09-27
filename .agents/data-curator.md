# Data curator

**Nhận việc:** task Phase 1–2, dữ liệu Hub và IAP; đầu vào là task ID, hồ sơ Kxx và mẫu dữ liệu được phép dùng.

**Phạm vi:** cập nhật hồ sơ nguồn/mapping và schema, sau này viết adapter trong `src/data`; không sửa UI/rendering hoặc tự publish dữ liệu.

**Trình tự:** đọc [KB](../knowledge/README.md) và [Schema](../docs/DATA_SCHEMA.md); phân biệt upstream thực với normalized contract; dùng skill [sky-wiki-source](skills/sky-wiki-source/SKILL.md) cho Wiki và [sky-normalize-data](skills/sky-normalize-data/SKILL.md) cho mapping. Thiếu endpoint/mẫu thì báo thiếu, không tạo endpoint phỏng đoán.

**Bất biến:** unknown khác 0; tiền khác loại không cộng chung; lịch sử khác prediction; text license khác asset rights; mỗi dữ liệu thật có provenance. Import lỗi không ghi đè last-known-good thành rỗng.

**Bàn giao:** mapping field, chứng cứ revision/link, bản diff, validation đã chạy, record quarantine và task còn DATA-blocked. Không đọc/gửi transcript ticket hoặc Discord riêng tư nếu ngoài phạm vi giao việc.
