# Legal status — theo brief, chưa xác nhận pháp lý mới

Nguồn: [brief mục 3, 4, 7](PROJECT_BRIEF.md), [sổ nguồn](../knowledge/README.md). Không có việc tra cứu pháp lý bên ngoài, gửi ticket hoặc nhận phản hồi mới trong lần scaffold này. Những câu đánh giá rủi ro bên dưới được giữ từ brief, không phải ý kiến pháp lý độc lập.

## Tình trạng liên hệ TGC

**Sky Player Support / Ray đã phản hồi qua Support trong game (Helpshift).** Tuy nhiên, phản hồi hiện tại chưa xác nhận rõ phạm vi quyền đối với việc truy cập, sử dụng, hiển thị, phân phối hoặc chỉnh sửa full 3D/game assets. Phản hồi này không được coi là explicit permission; full assets tiếp tục ở trạng thái **pending legal confirmation** và cần follow-up clarification. Repo không lưu ticket ID, ngày nhận hay transcript nhạy cảm trong public bundle.

Các nội dung đã hỏi theo brief:

1. Quyền dùng Sky Content Library cho tool tương tác.
2. Quyền truy cập dữ liệu 3D wardrobe/cosmetics đầy đủ hơn.
3. Xin chỉ đúng team IP/Creator Community nếu Support không hỗ trợ trực tiếp.

Người theo dõi ticket chưa được chỉ định. Đề xuất maintainer cập nhật sổ bên dưới khi có phản hồi; không tự gửi tin hoặc theo dõi định kỳ trong lần scaffold.

## Rủi ro giữ nguyên từ brief

| Nguồn | Ghi chú nguyên văn | Hệ quả cho thiết kế đề xuất |
|---|---|---|
| Wiki item | “Nội dung text CC-BY-SA; ảnh vẫn là IP của TGC” | Text giữ attribution/license theo phiên bản cần xác minh; asset có quyền riêng |
| Regular Spirits | “An toàn, dữ liệu text” | Dùng text có nguồn; không suy ra quyền ảnh |
| TS history + sheet | “Ghi nguồn khi dùng” | Credit Wiki và ln.cookie khi dùng sheet |
| ThatSkyAPI | “Nên tích hợp thẳng, không tự tính lại” | Chưa biết endpoint/điều kiện dùng; không tự dựng lịch |
| Patch notes | “Dùng để đối chiếu chéo tin leak” | Giữ link/tóm tắt, không biến thiếu đối chiếu thành xác nhận |
| Map | “Một số map do cộng đồng vẽ (vd. Nastymold) — cân nhắc xin phép/tự vẽ lại” | Track quyền từng map; TGC không mặc nhiên đại diện tác giả cộng đồng |
| Walkthrough | “Diễn giải lại bằng lời văn riêng, không copy nguyên văn” | Biên tập route riêng, ghi nguồn |
| IAP | “Dữ liệu công khai, không cần xin phép” | Giữ mô tả này; không khẳng định tự động scrape/API được cho phép |
| Full asset | “Tạm dùng icon Wiki làm placeholder, gắn nhãn rõ trong code để dễ thay thế” | Placeholder registry; icon vẫn IP TGC và full asset **pending legal confirmation** |

## Danh sách asset cần placeholder

**Hiện trạng repo:** chưa có asset hình ảnh/model nào được tải hoặc sử dụng. Danh sách sau là kế hoạch thay thế cần thiết, không phải inventory file đang tồn tại.

| Asset | Trạng thái | Phương án tạm | Điều kiện thay |
|---|---|---|---|
| Nhân vật nền 2D và biến thể size | pending legal confirmation cho asset game | Silhouette/hình học tự tạo, mã/scale demo gắn fixture | Quyền tương tác/phân phối phù hợp và dữ liệu calibration đã kiểm tra |
| Mask, hair, cape, top, bottom, accessory layers đầy đủ | pending legal confirmation | Hình layer tự tạo; icon Wiki chỉ placeholder có nhãn/credit khi dùng | Phản hồi TGC có phạm vi phù hợp + asset đủ metadata |
| Dye masks/region asset đầy đủ | pending legal confirmation | Vùng tô màu demo tự tạo | Quyền sửa đổi/hiển thị + mask/region được xác minh |
| Model 3D/rig/texture | pending legal confirmation | Không cần 3D ở phase đầu, dùng 2D demo | Cấp quyền cụ thể và asset được cung cấp hợp lệ; lập scope riêng sau |
| Icon trang phục Wiki | IP của TGC, chưa có xác nhận quyền trong brief | Có thể thay bằng icon hình học; nếu dùng Wiki phải giữ pending/placeholder | Xác nhận căn cứ dùng phù hợp; không đổi nhãn thành approved chỉ vì public |
| Map độ phân giải cao, map cộng đồng | Cần quyền/credit theo từng tác giả | Text guide và sơ đồ riêng placeholder | Kiểm tra tác giả và quyền tương ứng hoặc bản tự vẽ phù hợp |

## Gate có điều kiện, không chặn toàn dự án

Hub text, schema, UI, reducer, anchor/scale contract và flow try-on với hình học tự tạo được triển khai trong lúc chờ. Full wardrobe/3D hoặc thay placeholder bằng asset game đầy đủ chỉ mở khi có phản hồi áp dụng được. “Không có phản hồi”, “hỗ trợ đã nhận ticket” hoặc “link library công khai” không tự tương đương quyền sử dụng tool tương tác.

Gate cần ghi: nội dung được phép, nơi phân phối (web/PWA), tương tác/chỉnh màu/biến đổi, yêu cầu credit, hạn chế, thời hạn/thu hồi nếu có và asset cụ thể được bao phủ. Chỉ ghi các điều thực sự có trong phản hồi; không tự diễn giải khoảng trống thành quyền. Phản hồi mơ hồ giữ trạng thái pending và chuẩn bị câu hỏi tiếp theo, không tự gửi.

Không có đường triển khai rip game, can thiệp client hoặc tích hợp thatskymod. Miễn phí không tự tạo quyền sở hữu trí tuệ. Draft leak và media Discord chưa có quyền không được đưa công khai chỉ vì đã được reviewer đọc.

## Sổ theo dõi phản hồi (không chứa ticket riêng tư trong public bundle)

| Field | Giá trị hiện tại |
|---|---|
| Ticket ID / ngày gửi / người theo dõi | Chưa được cung cấp trong brief |
| Kênh | Support trong game / Helpshift |
| Trạng thái | Đã nhận phản hồi Support (Ray); permission scope chưa được giải quyết rõ; full assets pending legal confirmation, cần follow-up |
| Phản hồi và ngày nhận | Đã nhận phản hồi từ Sky Player Support / Ray (chưa xác nhận phạm vi quyền; không lưu transcript riêng tư trong public repo) |
| Quyền/phạm vi được xác nhận | Chưa có xác nhận explicit permission (các quyền access, use, display, redistribute, modify đều cần làm rõ) |
| Hạn chế, credit, thời hạn | Chưa biết |
| Bằng chứng nội bộ | Chưa được cung cấp; không yêu cầu đưa transcript nhạy cảm vào repo public |
| Asset IDs được bao phủ | Chưa có |
| Quyết định release | Hub/placeholder có thể tiếp tục; full asset pending legal confirmation |

Khi có phản hồi: maintainer cập nhật hồ sơ K13 + bảng này + rights evidence của Asset, rà map/IP bên thứ ba riêng, chạy gate export và kiểm tra credit. Nếu phạm vi bị thu hồi/không cho phép, đổi asset sang placeholder và cập nhật cache/data version để gỡ bản phát hành liên quan. Không tự tái công bố asset đã bị từ chối.

Task theo dõi nằm trong Phase 0 và Phase 8 của [Implementation Plan](plan/IMPLEMENTATION_PLAN.md); Phase 8 là nhánh có điều kiện, không phải điều kiện hoàn thành release placeholder.
