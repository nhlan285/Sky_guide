# Legal status — theo brief, chưa xác nhận pháp lý mới

Nguồn: [brief mục 3, 4, 7](PROJECT_BRIEF.md), [sổ nguồn](../knowledge/README.md). Trạng thái hiện tại đã ghi nhận phản hồi Sky Player Support / Ray theo thông tin được cung cấp cho dự án; repo không tự truy xuất phản hồi. Task Phase 0 ngày 2026-10-02 chỉ chốt quy trình/tài liệu, không tra cứu pháp lý bên ngoài hoặc gửi follow-up. Những câu đánh giá rủi ro bên dưới được giữ từ brief, không phải ý kiến pháp lý độc lập.

## Tình trạng liên hệ TGC

**Sky Player Support / Ray đã phản hồi qua Support trong game (Helpshift).** Tuy nhiên, phản hồi hiện tại chưa xác nhận rõ phạm vi quyền đối với việc truy cập, sử dụng, hiển thị, phân phối hoặc chỉnh sửa full 3D/game assets. Phản hồi này không được coi là explicit permission; full assets tiếp tục ở trạng thái **pending legal confirmation** và cần follow-up clarification. Repo không lưu ticket ID, ngày nhận hay transcript nhạy cảm trong public bundle.

Các nội dung đã hỏi theo brief:

1. Quyền dùng Sky Content Library cho tool tương tác.
2. Quyền truy cập dữ liệu 3D wardrobe/cosmetics đầy đủ hơn.
3. Xin chỉ đúng team IP/Creator Community nếu Support không hỗ trợ trực tiếp.

**Owner theo dõi: Maintainer / repository owner** (vai trò chủ repo đã chốt ở Q15). Maintainer chịu trách nhiệm follow-up, lưu evidence, review và cập nhật public summary; Legal / Rights giữ vai trò review nguồn/quyền đã ghi trong KB, không tạo owner ticket thứ hai. [Contract Q16, scope, draft follow-up và ledger template](TGC_FOLLOW_UP.md) được chốt ngày 2026-10-02. Không tự gửi tin hoặc theo dõi định kỳ trong task này.

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

**Hiện trạng repo:** Catalogue discovery giữ [Wiki metadata/provenance lịch sử](WIKI_MEDIA.md), runtime dùng [controlled processed asset storage](ITEM_ASSETS.md) qua R2 routing đã sửa, không coi public source URL là quyền rehost. Unknown rights giữ unverified/placeholder trong public eligibility, không đổi approved. Q20–Q22/Phase 9 chỉ duyệt architecture/media plan, không mở Full AssetRegistry hoặc quyền wardrobe/3D. Item pilot/Emote/Call-Honk/music samples cần permission/license hoặc gameplay tự ghi phù hợp policy và review phạm vi; không cắt/re-host video người khác khi rights chưa rõ, Sheets copyrighted content RIGHTS-gated. P0-W01 fixture generic tự tạo không là game asset/calibration. Danh sách sau là kế hoạch wardrobe, không inventory full assets.

| Asset | Trạng thái | Phương án tạm | Điều kiện thay |
|---|---|---|---|
| Nhân vật nền 2D và biến thể size | pending legal confirmation cho asset game | Silhouette/hình học tự tạo, mã/scale demo gắn fixture | Quyền tương tác/phân phối phù hợp và dữ liệu calibration đã kiểm tra |
| Mask, hair, cape, top, bottom, accessory layers đầy đủ | pending legal confirmation | Hình layer tự tạo; icon Wiki chỉ placeholder có nhãn/credit khi dùng | Phản hồi TGC có phạm vi phù hợp + asset đủ metadata |
| Dye masks/region asset đầy đủ | pending legal confirmation | Vùng tô màu demo tự tạo | Quyền sửa đổi/hiển thị + mask/region được xác minh |
| Model 3D/rig/texture | pending legal confirmation | Không cần 3D ở phase đầu, dùng 2D demo | Cấp quyền cụ thể và asset được cung cấp hợp lệ; lập scope riêng sau |
| Model 3D lookalike/reference do dự án tự tạo, giống nhân vật Sky | pending clarification / pending legal confirmation | Không tạo/tích hợp trong scope hiện tại; dùng hình học generic | Câu hỏi riêng trong follow-up; self-created không tự đồng nghĩa được phép, không áp quyền placeholder generic sang lookalike |
| Icon trang phục Wiki | IP của TGC, chưa có xác nhận quyền trong brief | Có thể thay bằng icon hình học; nếu dùng Wiki phải giữ pending/placeholder | Xác nhận căn cứ dùng phù hợp; không đổi nhãn thành approved chỉ vì public |
| Map độ phân giải cao, map cộng đồng | Cần quyền/credit theo từng tác giả | Text guide và sơ đồ riêng placeholder | Kiểm tra tác giả và quyền tương ứng hoặc bản tự vẽ phù hợp |

## Gate có điều kiện, không chặn toàn dự án

Hub text, schema, UI, reducer, anchor/scale contract và flow try-on với hình học tự tạo được triển khai trong lúc chờ. Full wardrobe/3D hoặc thay placeholder bằng asset game đầy đủ chỉ mở khi có phản hồi áp dụng được. “Không có phản hồi”, “hỗ trợ đã nhận ticket” hoặc “link library công khai” không tự tương đương quyền sử dụng tool tương tác.

Gate cần ghi: nội dung được phép, nơi phân phối (web/PWA), tương tác/chỉnh màu/biến đổi, yêu cầu credit, hạn chế, thời hạn/thu hồi nếu có và asset cụ thể được bao phủ. Chỉ ghi các điều thực sự có trong phản hồi; không tự diễn giải khoảng trống thành quyền. Phản hồi mơ hồ giữ trạng thái pending và chuẩn bị câu hỏi tiếp theo, không tự gửi.

Không có đường triển khai rip game, can thiệp client hoặc tích hợp thatskymod. Miễn phí không tự tạo quyền sở hữu trí tuệ. Draft leak và media Discord chưa có quyền không được đưa công khai chỉ vì đã được reviewer đọc.

## Sổ theo dõi phản hồi (không chứa ticket riêng tư trong public bundle)

| Field | Giá trị hiện tại |
|---|---|
| Owner theo dõi / cập nhật | Maintainer / repository owner; Legal / Rights review phạm vi theo KB |
| Ticket ID / ngày gửi / ngày nhận | Chưa được cung cấp; chỉ lưu private khi có, không tự điền |
| Kênh | Support trong game / Helpshift |
| Trạng thái | pending_clarification — đã nhận phản hồi Support (Ray), không phải explicit permission; full assets pending legal confirmation; Full AssetRegistry path vẫn đóng |
| Phản hồi và ngày nhận | Đã nhận phản hồi từ Sky Player Support / Ray (chưa xác nhận phạm vi quyền; không lưu transcript riêng tư trong public repo) |
| Quyền/phạm vi được xác nhận | Chưa có xác nhận explicit permission (các quyền access, use, display, redistribute, modify đều cần làm rõ) |
| Hạn chế, credit, thời hạn | Chưa biết |
| Evidence location / evidenceRef | `Sky Guide private workspace → Legal → TGC` là tên logic ngoài repo; chưa provisioning storage hoặc nhận raw evidence. evidenceRef hiện null; maintainer chỉ cấp reference khi record private thật tồn tại |
| Follow-up state | Draft clarification package revision `tgc-follow-up-draft-v1` đã chuẩn bị; chưa gửi, không gán sentAt/ticket mới |
| Asset IDs được bao phủ | Chưa có |
| Quyết định release | Hub/placeholder có thể tiếp tục; full asset pending legal confirmation |

Khi có phản hồi hoặc scope/restriction thay đổi: maintainer lưu bản request/response đúng revision trong ledger private, review phạm vi, rồi chỉ cập nhật projection công khai theo allowlist ở [contract](TGC_FOLLOW_UP.md#ownership-và-evidence-boundary--q16). K13 + bảng này + rights evidence của Asset phải nhất quán; không ghi raw evidence vào Git/client/build. Rà map/IP bên thứ ba riêng, chạy gate export và kiểm tra credit. Nếu phạm vi bị thu hồi/không cho phép, đổi asset sang placeholder và cập nhật cache/data version để gỡ bản phát hành liên quan. Không tự tái công bố asset đã bị từ chối.

**Q16 CLOSED** chỉ chốt owner, nơi lưu logic, trách nhiệm cập nhật, public/private boundary và ledger template. Q16 closure does not imply asset permission. Quyền hiện tại vẫn `pending_clarification / pending legal confirmation`; draft chưa gửi, evidence private chưa được cung cấp, Phase 1/8 vẫn phải review chứng cứ thật trước mọi thay đổi gate.

Task theo dõi nằm trong Phase 0 và Phase 8 của [Implementation Plan](plan/IMPLEMENTATION_PLAN.md); Phase 8 là nhánh có điều kiện, không phải điều kiện hoàn thành release placeholder.
