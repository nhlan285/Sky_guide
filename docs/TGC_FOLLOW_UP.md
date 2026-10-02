# TGC follow-up clarification — Phase 0 process contract

Chốt ngày **2026-10-02**, phục vụ P0-D03 / P0-L01–L03 / Q16. Đây là tài liệu quy trình công khai và draft chưa gửi, không là private evidence hoặc kết luận pháp lý. Baseline: Sky Player Support / Ray đã phản hồi; phản hồi không phải explicit permission. K13 vẫn `pending_clarification / pending legal confirmation`, Full AssetRegistry path đóng, fallback là hình học generic tự tạo. Không rip/extract game client, không mod hoặc tải asset trong task này.

## Ownership và evidence boundary — Q16

- **Accountable owner:** Maintainer / repository owner theo Q15; chịu trách nhiệm theo dõi, chọn thời điểm follow-up, lưu request/response đúng revision, review và cập nhật trạng thái. Legal / Rights là vai trò review nguồn/quyền trong KB, không thay hoặc nhân đôi owner ticket. Không bịa tên/email người đảm nhiệm.
- **Một nơi lưu logic:** `Sky Guide private workspace → Legal → TGC`, ngoài checkout public/client/build/deploy. Đây chỉ là documentation identifier cho vùng evidence private trong contract Q01; chưa tạo storage/folder, chưa chọn dịch vụ/URL/path thật, chưa nhận/lưu raw evidence trong task này. Maintainer chọn nơi lưu vật lý riêng tư trước khi nhập evidence; không đặt bản raw trong repo kể cả folder ignored.
- **Private record:** lưu thư/support transcript, private attachments, ticket/email identifier, địa chỉ/contact cá nhân, timestamp nhạy cảm, request/response revision và evidence nội bộ ở nơi logic trên. Không đưa lên Git, Vercel, cache client hoặc public artifact.
- **Public projection allowlist:** status, `evidenceRef` không chứa ticket/contact/path (hoặc null nếu chưa có record), summary phạm vi quyền không nhạy cảm và follow-up state. Không copy record private rồi chỉ xóa vài field. Nội dung ngoài allowlist giữ private; ticket chỉ có thể công khai nếu được chủ evidence chủ động duyệt riêng, task này không cấp approval đó.
- Maintainer cấp `evidenceRef` opaque khi record private thật tồn tại, không dùng ticket ID/hash của contact làm reference. `evidenceRef` không phải link tải evidence và không chứng minh quyền. Hiện chưa có reference, không tạo một ID giả cho phản hồi Ray.
- Mỗi phản hồi/thay đổi scope: lưu evidence → review đúng revision và asset coverage → cập nhật public summary, K13, Legal/Asset rights tương ứng. Silence/referral/acknowledgement không nâng permission. Permission mơ hồ giữ pending; scope bị rút thì đóng capability liên quan và thay placeholder. Không liên hệ tự động.

**Q16 CLOSED** resolves ownership/evidence handling only. **Q16 closure does not imply asset permission.** P0 hoàn thành contract; việc nhập evidence thật, gửi follow-up và review quyền vẫn ở Phase 1, full assets ở Phase 8 có gate.

## Permission scope — P0-L01

Phạm vi cần làm rõ sau phản hồi Support, không là danh sách quyền đã có:

| Nhóm asset | Scope/câu hỏi riêng | Trạng thái hiện tại / fallback |
|---|---|---|
| Official/full TGC game assets | Character/wardrobe model/mesh, rig/skeleton nếu áp dụng, texture/material, dye masks/layer data, anchor/scale/calibration metadata; quyền access/use/display/modify/redistribute theo asset/revision | pending legal confirmation; generic 2D placeholder, không có nguồn tải được duyệt |
| Wiki/media assets | Quyền media/ảnh riêng, khác text attribution/license; public Wiki không chứng minh được dùng interactive preview hoặc redistributable | Chưa có căn cứ quyền mới; không download, giữ placeholder generic |
| Community-created assets | Tác giả/quyền/credit theo asset, ví dụ map; TGC không mặc nhiên đại diện tác giả khác | RIGHTS gate riêng, text/sơ đồ generic có nhãn khi phù hợp |
| Project self-created geometric placeholders | Silhouette/layer generic không mô phỏng chính xác Sky; fixture=true, không provenance K13 giả | Fallback hiện có self_created_placeholder; không suy ra quyền game assets |
| Project self-created 3D lookalike/reference model | Có được tạo/hiển thị/chỉnh sửa/phân phối model tự dựng nhưng giống nhân vật Sky không? Phạm vi reference/derivative và repository cụ thể nào? | pending_clarification; không tự cho phép vì self-created, không triển khai 3D |

Mọi scope cần ghi nơi phân phối web/PWA, interactive wardrobe preview, biến đổi/render/dye, redistribute file hay chỉ output hiển thị, repository/open-source implications, credit, commercial/non-commercial restrictions, expiry/withdrawal/revocation. Hỏi approved asset/source delivery/access mechanism **nếu** có permission; không hứa TGC cung cấp file hoặc coi Content Library là delivery mechanism đã được duyệt. Hỏi đầu mối IP / Creator Community có thẩm quyền nếu Support không thể quyết định; không suy ra thẩm quyền của Ray.

## Follow-up clarification package — P0-L02

**Revision:** `tgc-follow-up-draft-v1`. **State:** ready-to-send draft, **not sent**. Không có sentAt, ticket mới, contact URL hay response revision được tạo trong task này. Maintainer review kênh/contact thật trước khi gửi trong task được phép gửi; draft dưới đây có thể dùng trong thread Support hiện có, không cần chèn thông tin riêng tư vào repo.

### Draft message (English)

Subject: Sky Guide — follow-up clarification on interactive asset use

Hello Sky Player Support,

Thank you for the response from Ray. We would like to clarify the remaining permission scope; we are not treating that response as explicit permission to use full game assets.

Sky Guide is a free, non-commercial community guide with a planned interactive wardrobe preview. V1 requires no user login. We intend to make the project code available in an open-source repository. We will not modify the game or rip/extract assets from the game client, and will not distribute private or unapproved game assets. Until the scope is clear, we will use self-created generic geometric placeholders.

Could you please provide explicit answers, including any asset-specific limits, to the following questions?

1. For official character/wardrobe assets (model/mesh, rig/skeleton where applicable, texture/material, dye masks/layer data and anchor/scale/calibration metadata), what access and use, if any, may be authorized?
2. May covered assets be displayed in an interactive browser/web preview, including a PWA? Are placement, scaling, rotation, layering, recoloring/dye or other modifications/transforms allowed, and within what limits?
3. What redistribution is allowed, if any: source files, transformed files, data/metadata or rendered outputs? A browser preview may deliver asset data to users; what constraints apply to this delivery?
4. What repository/open-source implications apply to the project code and any assets/metadata? We can keep restricted source assets private and separate from the public repository, and will not include them without explicit permission covering the intended distribution. What restrictions must the browser build also meet?
5. Separately from official files and generic placeholders, may we create and use a self-created 3D lookalike/reference model resembling a Sky character? What limits apply to creating, displaying, modifying and redistributing that model or its outputs? We do not assume that making it ourselves grants permission.
6. What attribution/credit wording and placement are required? What commercial/non-commercial, platform, territory, duration or other restrictions apply?
7. What expiry, withdrawal/revocation terms apply, and what removal obligations would the project have?
8. If permission is available, which source/access or delivery method is approved? We do not assume that any public library is authorized for this use or that files will be supplied.
9. For Wiki/media or community-created assets, does any answer cover those specific assets, or must rights be obtained separately from their owners? We will not treat a TGC response as permission from third-party creators.
10. If Player Support cannot authorize this scope, could you direct us to the appropriate IP / Creator Community team or authorized contact?

If permission is unavailable or incomplete, we will keep using generic placeholders and leave the full-asset/3D path closed. Thank you for helping us distinguish what is permitted from what still needs clarification.

## Private evidence ledger template — P0-L03

Đây là **field template**, không có raw evidence/record thật trong repo. Maintainer tạo record riêng tư ở nơi logic đã chốt, giữ unknown/null khi chưa biết, không suy diễn ngày/ticket/quyền từ draft. `permissionStatus` chỉ thuộc vocabulary hữu hạn: `pending_clarification`, `permission_confirmed`, `partially_confirmed`, `not_permitted`, `withdrawn`. Các trạng thái này là schema, **current K13 = pending_clarification**, không phải permission_confirmed.

| Field | Kiểu/quy tắc trong private ledger |
|---|---|
| evidenceRef | Opaque reference ổn định, chỉ cấp khi record thật tồn tại; projection public có thể dùng ID này, không record contents |
| channel | Kênh đã biết hoặc null; baseline Support trong game / Helpshift, không bịa URL |
| contactTeamRole | Vai trò/team nếu response nói rõ, hoặc null; không tự gán thẩm quyền; personal contact luôn private |
| ticketEmailIdentifier | string hoặc null, private only; không lấy draft revision làm ticket |
| sentAt / receivedAt | Thời điểm thực có nguồn hoặc null; private, đặc biệt khi nhạy cảm; ngày doc không là ngày correspondence |
| requestRevision / responseRevision | Revision bản request/response đã lưu hoặc null; draft revision không chứng minh đã gửi/đã nhận |
| requestScope / responseScope | Phạm vi yêu cầu và phạm vi thực được trả lời riêng; không gộp khoảng trống thành permission |
| permissionStatus | Một trong năm trạng thái hữu hạn trên, theo evidence đúng revision |
| explicitRights | Map access/use/display/modify/redistribute; mỗi quyền có status theo vocabulary trên, scope/conditions và private evidence reference; unknown dùng pending_clarification |
| interactivePreviewStatus | Status + scope/conditions; không suy ra từ quyền download/access |
| openSourceStatus | Status + scope/conditions cho code/assets/repo/build; không tự thêm license |
| lookalikeReferenceModelStatus | Status + scope/conditions riêng cho self-created 3D lookalike/reference, không thừa hưởng quyền generic placeholder |
| attributionCreditRequirements | Yêu cầu credit được trả lời hoặc null; không invent attribution/license terms |
| restrictions | Điều kiện đã trả lời hoặc null; null là unknown, không nghĩa không hạn chế |
| expiryRevocationTerms | Thời hạn/thu hồi/removal obligations có nguồn hoặc null |
| assetSourceCoverage | Asset/type/revision/source thật được bao phủ hoặc unknown; không tạo asset IDs/delivery URL giả |
| followUpRequired / followUpState | boolean; state draft/not_sent/sent/awaiting_response/answered/no_further_action theo hành động thật, không tự gửi |
| decision | keep_gate_closed/allow_scoped_use/deny_use/withdraw_scoped_use; kèm lý do, scope và revision đã review |
| reviewerMaintainer | Vai trò/người review thực ở private ledger; accountable owner Maintainer / repository owner, chưa bịa danh tính |
| publicSummary | Chỉ status/evidenceRef/scope summary/follow-up state không nhạy cảm qua allowlist |
| privateEvidenceRefs | Reference tới request/response/attachments trong vùng private, không serialize ra public |

Current baseline: `permissionStatus=pending_clarification`, các explicit rights/interactive/open-source/lookalike status đều pending_clarification, `decision=keep_gate_closed`, `followUpRequired=true`, `followUpState=draft` (draft not_sent), `evidenceRef=null` trong public summary. Raw evidence, ngày/ticket và response revision chưa được cung cấp; không tạo filled ledger giả.

`permission_confirmed` chỉ khi evidence explicit bao phủ đúng quyền/asset/use; `partially_confirmed` không mở toàn bộ gate: chỉ scope đã được review, phần thiếu vẫn pending. `not_permitted`/`withdrawn` chặn scope tương ứng; scope bị rút không hồi sinh bằng rollback. Trạng thái ledger không tự đổi `Asset.legalStatus`: maintainer phải đối chiếu AssetRegistry/rights evidence và review gate Phase 1/8. Không thực hiện chuyển gate trong task Phase 0 này.
