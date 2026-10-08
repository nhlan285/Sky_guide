# K07 — Wiki: Map Shrines

- **Nguồn/link:** [Map Shrines@110075](https://sky-children-of-the-light.fandom.com/wiki/Map_Shrines?oldid=110075), đã xác minh metadata/text trong mẫu bên dưới.
- **Dữ liệu:** bản đồ độ phân giải cao, Map Shrine và vị trí Children of Light theo khu. Không có tọa độ máy đọc được đã xác minh.
- **Format:** trang wiki và ảnh; kích thước/hệ tọa độ/API metadata chưa biết.
- **Truy xuất đề xuất:** lấy text khu/vị trí có provenance; tách asset map khỏi annotation. Chỉ đặt điểm khi có map/hệ tọa độ đã chốt; dùng sơ đồ tự tạo placeholder và text guide trong thời gian chờ quyền.
- **Rủi ro/ghi chú nguyên văn:** “Một số map do cộng đồng vẽ (vd. Nastymold) — cân nhắc xin phép/tự vẽ lại”.
- **Trạng thái:** text đã sẵn sàng dùng theo brief; map cần placeholder hoặc xác minh quyền riêng của tác giả. Phản hồi TGC không mặc nhiên cấp quyền đối với tranh của cộng đồng.
- **Thiếu:** URL, tác giả/license mỗi map, hệ quy chiếu, variant theo season/realm, cách cập nhật tọa độ khi thay ảnh.
- **Đầu ra chấp nhận:** asset ghi tác giả/quyền riêng, annotation liên kết đúng revision bản đồ, không sao chép map không rõ quyền vào bundle.
- **Tham chiếu:** [K13](13-tgc-assets.md), [Schema](../docs/DATA_SCHEMA.md), [Legal](../docs/LEGAL_STATUS.md).

## P1-D07 source sample — 2026-10-06
[Evidence](evidence/k07-map-shrine-metadata-2026-10-06.json) ghim page/source file
revision, image upload timestamp, kích thước và quyền/creator từng candidate.
Ba request metadata/text HTTP200; không tải binary. Mẫu Home: shrine bên portal
Isle, source file Home-Map-Shrine.jpg; map FK/coordinates chưa biết. Wiki nói
marker Children of Light chỉ chỉ khu vực, không phải tọa độ chính xác.

| Candidate | Metadata/credit đã thấy | Rights |
| --- | --- | --- |
| Map-of-map-shrines-Ray.png | Filepage89073; artist Ray808080;1000×1000; map caption2022-10-19 | Self template, pending permission |
| Game-map-HD.png | Filepage108291;2000×2000; current screenshot2026-06-23; acknowledgment Rory/team và credit photomerge cũ | Fairuse template, pending |

Metadata extmetadata thiếu Artist/license grant. Lời cảm ơn/uploader không thành
creator/owner đã xác minh; Self/Fairuse không mở public allowlist. TGC không cấp
quyền thay tác giả map. Kích thước không định nghĩa hệ tọa độ; không chuyển vị trí
text thành x/y. Page nói65 shrine, video Nastymold2022 nói57: không thay count hiện
tại bằng guide cũ. Sơ đồ tự tạo/text giữ fallback. P1-D07 DONE về mẫu nguồn và
giới hạn; coverage/maps/annotation pipeline và RIGHTS vẫn chưa hoàn tất.
