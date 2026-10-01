# Implementation Plan — task breakdown

Nguồn sự thật: [PROJECT_BRIEF](../PROJECT_BRIEF.md). Các quyết định triển khai là **đề xuất** cụ thể để chuyển thành task, không thêm nguồn dữ liệu hoặc thông tin game ngoài brief. Đọc kèm [PRD](../PRD.md), [Architecture](../ARCHITECTURE.md), [Schema](../DATA_SCHEMA.md), [UX](../UX_GUIDELINES.md), [Legal](../LEGAL_STATUS.md) và [Knowledge Base](../../knowledge/README.md).

## Cách dùng task list

Mỗi hàng là một task độc lập để copy: **ID + module + việc/đầu ra + nghiệm thu + phụ thuộc + độ phức tạp + gate**. Không có ước lượng thời gian. Task chưa có trạng thái nghiệm thu cụ thể vẫn là **chưa làm**; các hàng DONE ghi ngày và phạm vi bằng chứng. Không đánh dấu API, calibration, asset, UI hoặc deploy đã sẵn sàng chỉ vì có tài liệu.

- **Thấp / Trung bình / Cao:** mức phức tạp tương đối, không phải thời lượng.
- **Gate `—`:** có thể thực hiện sau phụ thuộc thông thường.
- **Gate `Qnn`:** cần quyết định nêu trong Decisions & open questions; chỉ các Q còn mở mới được giữ làm gate. Q đã chốt phải được gỡ khỏi cột Gate/phụ thuộc.
- **Gate `DATA Kxx`:** thiếu URL/contract/dữ liệu thật; có thể dùng fixture tự tạo gắn nhãn để phát triển, nhưng không gọi integration là hoàn thành.
- **Gate `TGC`:** **pending legal confirmation**, phụ thuộc phản hồi TGC đúng phạm vi; phương án tạm nêu riêng. Không tự bỏ gate.
- **Gate `RIGHTS`:** cần xác minh quyền asset bên thứ ba (ví dụ map), không mặc định TGC có thể cho phép thay tác giả.

Phụ thuộc phase là điều kiện nền; cột phụ thuộc bổ sung quan hệ task cụ thể. `P0`/`P1`… trong cột này nghĩa DoD của phase tương ứng. Nhánh DATA/TGC chưa xong không ngăn scaffold, fixture test, UI placeholder hoặc module có dữ liệu khác tiến lên. Để phát hành một module có dữ liệu thật, các task nguồn/contract của chính module đó phải đạt DoD. Không dùng “defer” để tuyên bố toàn bộ sản phẩm hoàn tất.

## Phase 0 — chốt phạm vi và chuẩn bị dự án

**Mục tiêu:** thống nhất các quyết định làm thay đổi schema/UI trước khi viết code; chuẩn bị Vercel workflow và khung app.

**Phụ thuộc:** bộ tài liệu scaffold hiện tại; không phụ thuộc TGC.

**DoD:** stack và phạm vi release được ghi; các câu hỏi ảnh hưởng Phase 1–2 có owner/trạng thái; app rỗng build được trên preview; chưa cần dữ liệu/asset game thật. Những câu hỏi thuộc nhánh sau có task/gate cụ thể, không giả là đã quyết định. Nhánh xin quyền TGC có owner, phạm vi cần xin và gói yêu cầu sẵn sàng để gửi mà không chặn Hub/Wardrobe placeholder.

### Infra

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P0-I01 | Ghi quyết định React/TypeScript/Vite, router, package manager và phiên bản hỗ trợ vào Architecture | Có lựa chọn/phiên bản được kiểm tra lúc code, lý do và build command; không cài framework thứ hai không cần thiết | — | Thấp | — |
| P0-I02 | Khởi tạo manifest dependency, TypeScript và entry app rỗng trong khung `src` | Install/build chạy tái lập với lockfile; không chứa demo dữ liệu thật giả | P0-I01 | Thấp | — |
| P0-I03 | Tạo quy tắc lint/typecheck và script build | Lệnh được mô tả, lỗi type thực sự làm build gate fail | P0-I02 | Thấp | — |
| P0-I04 | Thiết lập Vercel project/preview, output và routing fallback | Root và deep link mở đúng bản preview; ghi cách rollback; chưa bật tài nguyên trả phí | P0-I03 | Trung bình | — |

### Data pipeline

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P0-D01 | **DONE 2026-10-01** — Chốt kho JSON versioned và ranh giới public/raw/draft (Q01) | Contract trong Architecture/DATA_SCHEMA: `data/public/<catalogVersion>/`, manifest/version/provenance/FK/alias; raw/draft/reviewed/evidence ở workspace private ngoài repo; ignore/upload boundaries được kiểm tra; chưa implement nguồn thật/export pipeline | — | Trung bình | — |
| P0-D02 | **DONE 2026-10-01** — Lập bảng owner kiểm tra từng K01–K14 và thông tin đang thiếu | Ma trận 14/14 nguồn trong Knowledge Base có role owner, trạng thái hiện tại, thông tin thiếu cần xác minh, việc tiếp theo bám roadmap Phase 1 và gate/phụ thuộc; không điền URL/endpoint phỏng đoán | P0-D01 | Thấp | — |
| P0-D03 | Chỉ định người theo dõi TGC và vị trí lưu evidence riêng tư | Legal ledger ghi người phụ trách nếu đã chốt; chưa có phản hồi vẫn pending | Q16 | Thấp | Q16 |

### Legal / TGC permission track

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P0-L01 | Chốt **phạm vi xin quyền** cho full wardrobe/3D assets | Danh sách tách rõ model, rig, texture, dye mask/layer data, calibration/metadata; ghi mục đích hiển thị tương tác, cách phân phối và fallback placeholder | P0-D03, P1-W02 có thể cập nhật sau | Thấp | — |
| P0-L02 | Soạn **permission request package** gửi TGC | Có mô tả Sky Guide, free/non-commercial, không mod/rip client, loại asset cần dùng, cách asset được lưu/hiển thị/chia sẻ, attribution dự kiến và câu hỏi về quyền use/display/redistribute/modify | P0-L01 | Trung bình | — |
| P0-L03 | Chốt nơi lưu bằng chứng riêng tư và template legal ledger | Có trường channel/contact, ticket/email ID, ngày gửi, nội dung gửi, file đính kèm, phản hồi, phạm vi quyền, follow-up và trạng thái; không commit raw private evidence vào public repo | P0-D03 | Thấp | — |

### Wardrobe

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P0-W01 | Chốt renderer 2D và bộ silhouette/layer tự tạo để thử | Demo phân biệt khỏi full asset; không cần file game/Wiki download để bắt đầu | — | Trung bình | — |
| P0-W02 | Viết quyết định cardinality slot, anchor và quy tắc xung đột override | Có ví dụ logic dùng ID giả; chưa khẳng định mã size/chibi thật | P0-W01, Q08 | Trung bình | Q08 |

### Hub

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P0-H01 | Chốt market/platform và cách trình bày ước lượng IAP | Phân biệt giá niêm yết, proportional và checkout; chưa thêm ngoại hối | Q10 | Trung bình | Q10 |
| P0-H02 | Chốt owner/reviewer/tool cho leak và trạng thái chuyển duyệt | Có người duyệt, điều kiện approve/reject/withdraw; không auto-publish | Q02 | Trung bình | Q02 |
| P0-H03 | Ghi tiêu chí chấp nhận phương pháp dự đoán TS | Nhãn, dữ liệu đầu vào, phạm vi suy luận và trường hợp không đủ dữ liệu rõ | Q09 | Trung bình | Q09 |

### UX

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P0-U01 | Vẽ wireframe Hub desktop/mobile theo bảng widget | Season, TS, news, wardrobe, lookup, maps/routes, leak và footer đều có vị trí | — | Trung bình | — |
| P0-U02 | Chốt mức thông báo hoạt động khi app mở và wording giới hạn | Không hứa báo khi app đóng; Web Push nền ghi research nếu chưa thay yêu cầu local | — | Thấp | — |
| P0-U03 | Chốt ngôn ngữ release đầu và nhãn chính thức/leak/dự đoán | Có glossary nhỏ và ví dụ empty/stale/placeholder, không tự dịch tên làm ID | — | Thấp | — |

## Phase 1 — xác minh nguồn và contract truy xuất

**Mục tiêu:** biến những điều chưa biết trong KB thành bằng chứng mẫu và mapping có kiểm chứng. Đây là giai đoạn cần tra nguồn thật khi được triển khai; lần scaffold không tự điền kết quả.

**Phụ thuộc:** P0-D01/D02; các task nguồn độc lập có thể chạy trước khi xong wireframe.

**DoD:** mỗi nguồn có URL/contract và fixture hợp lệ hoặc báo cáo thiếu với fallback cụ thể. Module được bật với dữ liệu thật chỉ khi nguồn của nó đã kiểm chứng; nguồn chưa truy cập được vẫn DATA-blocked, không tính integration hoàn thành. Risk text gốc không bị nới lỏng. Track TGC phải có bằng chứng đã gửi qua kênh chính thức hoặc trạng thái chưa gửi có lý do/owner; mọi phản hồi chỉ mở gate theo đúng phạm vi được ghi nhận, không suy diễn từ support referral.

### Data pipeline

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P1-D01 | Xác minh host/API/module item Wiki; lưu mẫu response và revision cho K01 | Ghi endpoint thật, action/format thực, field có/không; không giả module là JSON | P0-D02 | Trung bình | DATA K01 |
| P1-D02 | Xác minh URL/format Regular Spirits và mẫu cây cho K02 | Một tree có node/cạnh/cost được đối chiếu thủ công; ghi field thiếu | P0-D02 | Trung bình | DATA K02 |
| P1-D03 | Xác minh trang Traveling Spirits, quy ước ngày và mẫu lịch sử K03 | Có khoảng ngày gốc, precision/timezone nếu biết và source revision | P0-D02 | Trung bình | DATA K03 |
| P1-D04 | Xác minh link sheet ln.cookie, tab/cột và cách lấy K04 | Ghi tác giả, cột thực, quyền truy cập/export thực tế; fallback nhập tay nếu không export | P0-D02 | Trung bình | DATA K04 |
| P1-D05 | Xác minh ThatSkyAPI endpoint, units và semantics response | Lưu mẫu time; xác định có/không event schedule, CORS, giới hạn và điều kiện dùng thực tế | P0-D02 | Cao | DATA K05 |
| P1-D06 | Kiểm tra URL patch notes và mẫu article K06 | Mapping title/date/version/link có căn cứ; không phát minh API/RSS | P0-D02 | Thấp | DATA K06 |
| P1-D07 | Xác minh trang Map Shrines và metadata từng map K07 | Text/location và tác giả/quyền ảnh được tách; không tải ảnh chưa rõ quyền vào public assets | P0-D02 | Trung bình | DATA K07, RIGHTS |
| P1-D08 | Chọn và kiểm tra bài AppUnwrapper liên quan Eden/season | Lưu link/ngày/phạm vi, ghi phần đã lỗi thời hoặc chưa đối chiếu | P0-D02 | Thấp | DATA K08 |
| P1-D09 | Xác minh playlist dẫn từ Wiki và tác giả K09 | Có link trang dẫn + link video gốc + phần tham khảo, không tự tải media | P0-D02 | Thấp | DATA K09 |
| P1-D10 | Xác minh listing App Store, market và coverage IAP K10 | Phân biệt giá item/SKU với range; ghi missing package contents | P0-H01 | Trung bình | DATA K10 |
| P1-D11 | Xác minh listing Google Play, market và coverage IAP K11 | Không suy giá từ iOS; có SKU hoặc ghi unknown, không dựng package ID | P0-H01 | Trung bình | DATA K11 |
| P1-D12 | Xác minh AppPricingLab hỗ trợ gì cho Sky/IAP/market K12 | Có kết luận API/export/manual/không khả dụng kèm chứng cứ; không giả dữ liệu app price là IAP price | P0-H01 | Trung bình | DATA K12 |
| P1-D13 | Ghi mapping field upstream → schema nội bộ từng nguồn đã xác minh | Mỗi field chỉ rõ transformed/raw/unknown và provenance; không đổi risk text | P1-D01–P1-D12 theo nguồn | Trung bình | DATA theo nguồn |

### Wardrobe

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P1-W01 | Lập asset manifest demo hình học và metadata quyền | Mỗi asset có placeholder/self-created; không khẳng định giống asset game | P0-W01 | Thấp | — |
| P1-W02 | Liệt kê riêng dữ liệu cần TGC: model/layer/rig/dye/calibration | K13 và Legal có danh sách thiếu; toàn bộ full asset giữ pending legal confirmation | P0-D03 | Thấp | — |

### Legal / TGC permission execution

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P1-L01 | Gửi permission request qua **kênh TGC chính thức đã xác minh** | Legal ledger có channel/contact thật, ngày gửi, ticket/email ID nếu có và bản nội dung đã gửi; nếu Support chuyển team thì ghi referral, chưa coi là permission | P0-L02, P0-L03, P1-W02 | Trung bình | TGC |
| P1-L02 | Lưu và đối chiếu toàn bộ phản hồi/evidence riêng tư | Có bản phản hồi nguyên gốc ở kho riêng tư, checksum/file reference nếu cần, ngày nhận và người review; public repo chỉ ghi trạng thái/phạm vi không nhạy cảm | P1-L01 | Thấp | TGC |
| P1-L03 | Phân tích **phạm vi quyền thực tế** và cập nhật K13/Legal | Ma trận tách access/use/display/redistribute/modify/derivative/attribution; trạng thái mỗi loại asset là approved/restricted/denied/pending; không dùng từ “approved” nếu câu trả lời mơ hồ | P1-L02 | Trung bình | TGC |
| P1-L04 | Follow-up khi phản hồi chỉ là referral, thiếu phạm vi hoặc chưa rõ | Gửi câu hỏi bổ sung đúng điểm còn thiếu; ledger lưu mốc follow-up và trạng thái; không spam cadence, owner tự quyết theo kênh hỗ trợ | P1-L03 khi cần | Thấp | TGC |
| P1-L05 | Quyết định mở/giữ gate AssetRegistry theo kết quả legal | Chỉ capability/asset type có evidence phù hợp mới được đánh dấu allowed; phần còn lại giữ placeholder/self-created và TGC pending | P1-L03 | Trung bình | TGC |

### Hub

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P1-H01 | Xác định nguồn chứng cứ season/event trong K01/K06 | Mỗi mốc có source; thiếu thì ghi unavailable, không lấy ThatSkyAPI làm feed nếu chưa chứng minh | P1-D01, P1-D06 | Trung bình | Q14, DATA K01/K06 |
| P1-H02 | Ghi quy tắc nhập tin Discord và thông tin nguồn được phép dẫn | Chưa có channel/source thì để inactive; không thu thập tự động | P0-H02 | Trung bình | Q02, DATA K14 |
| P1-H03 | Xác minh protocol QR profile và phạm vi dữ liệu có thể hiển thị | Có mẫu an toàn/đã cho phép, field schema và cách decode; không suy payload thành danh tính thật | Q11 | Cao | Q11 |

### UX và Infra

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P1-U01 | Soạn attribution template cho text, sheet, route và asset | Các bản mẫu phân biệt quyền text/ảnh; có chỗ link/tác giả/đánh dấu sửa đổi | P1-D13 | Thấp | Q12 |
| P1-I01 | Ghi cách fetch/cache/retry theo từng contract thực tế | Không có hạn mức/TTL phỏng đoán; unknown có fallback/manual và owner | P1-D13 | Trung bình | DATA theo nguồn |

## Phase 2 — schema, storage và pipeline an toàn

**Mục tiêu:** tạo contract có thể validate, importer có diff/review và nền state local.

**Phụ thuộc:** Phase 0; kết quả Phase 1 cho adapter nguồn thật. Có thể xây validator/fixture độc lập trong lúc đợi nguồn.

**DoD:** normalized fixture qua validation; import nguồn đã xác minh lặp lại không tạo bản ghi trùng; bản lỗi bị quarantine; public export không chứa draft/fixture/asset chưa đủ quyền; state local có migration/fallback.

### Data pipeline

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P2-D01 | Viết types/validators cho provenance, money và PartialTime | unknown khác 0; instant thiếu timezone bị từ chối; sourceId không tồn tại bị báo lỗi | P0-D01 | Trung bình | — |
| P2-D02 | Viết schema Item/Spirit/FriendshipTree/Season/Event/TS | Validate ID/FK, tree acyclic, date precision; prediction tách dataset | P2-D01 | Trung bình | — |
| P2-D03 | Viết schema Map/Marker/Route và price mapping | Chặn coordinate ngoài [0,1], map revision lệch, giá âm/mixed market | P2-D01 | Trung bình | — |
| P2-D04 | Viết schema Asset/Anchor/Size/Rule/Dye/Outfit | Chặn scale ≤ 0, màu/payload sai, anchor thiếu và rule conflict; full asset default pending | P2-D01, P0-W02 | Trung bình | — |
| P2-D05 | Tạo adapter item Wiki đúng module thực tế | Mapping đối chiếu mẫu; parser lỗi không xuất catalog rỗng ghi đè bản tốt | P1-D01, P1-D13, P2-D02 | Cao | DATA K01 |
| P2-D06 | Tạo adapter/biểu nhập spirit-tree | Node/cost giữ nguồn; total path không cộng node chung hai lần | P1-D02, P2-D02 | Trung bình | DATA K02 |
| P2-D07 | Tạo adapter TS Wiki và sheet độc lập, báo cáo đối chiếu | Không gộp hai lần ghé khác nhau; bất đồng ngày đưa vào review | P1-D03, P1-D04, P2-D02 | Trung bình | DATA K03/K04 |
| P2-D08 | Tạo form/file nhập tay news/season/map/route theo schema | Có source field và check required; không sao chép walkthrough nguyên văn | P2-D02, P2-D03, P1-H01 | Trung bình | DATA nguồn tương ứng |
| P2-D09 | Tạo importer price observations K10/K11/K12 | Mỗi quan sát có platform/market/currency/time; thiếu SKU không tự ghép | P1-D10–P1-D12, P2-D03 | Cao | DATA K10/K11/K12 |
| P2-D10 | Tạo snapshot/normalize/diff/quarantine pipeline | Import cùng input không đổi ID; báo added/changed/removed; record lỗi không xóa bản public tốt | P2-D05–P2-D09 theo adapter bật | Cao | — |
| P2-D11 | Tạo public export projection và asset rights gate | Fixture, draft, private evidence, pending full asset không xuất; negative fixture chứng minh gate chặn đúng | P2-D04, P2-D10 | Cao | — |
| P2-D12 | Tạo version manifest, alias/tombstone và rollback bundle | Code/data/asset version tương thích; restore bundle trước không mất mapping ID | P2-D11 | Trung bình | — |

### Infra

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P2-I01 | Gắn schema/export check vào build preview | Record invalid làm build fail có thông báo ID/field; không dump nội dung private | P0-I04, P2-D11 | Trung bình | — |
| P2-I02 | Tạo command import/dry-run và tài liệu chạy cho maintainer | Dry-run chỉ tạo báo cáo, không publish; mô tả cadence thủ công và retry theo P1-I01 | P2-D10, P1-I01 | Thấp | — |

### UX / Wardrobe / Hub

| ID | Module | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|---|
| P2-U01 | UX | Tạo storage wrapper có parse/version/migration/memory fallback | Reload round-trip; corrupted/quota-denied vẫn mở app; thông báo không lưu được rõ | P0-I02 | Trung bình | — |
| P2-W01 | Wardrobe | Tạo reducer selection và schema state dẫn xuất | baseSize không đổi khi rule active; reducer thuần, ID sai bị reject | P2-D04 | Trung bình | — |
| P2-H01 | Hub | Tạo data access đọc manifest/normalized JSON | Module thiếu dataset hiển thị unavailable; không fetch raw/draft từ client | P2-D12 | Trung bình | — |

## Phase 3 — Hub nền tảng và UI dùng chung

**Mục tiêu:** Hub đọc được với catalog, TS history, season/event và official news, cùng bố cục compact.

**Phụ thuộc:** Phase 2 cho data access/export và P0-U01. Nguồn thật của từng module cần Phase 1 đạt DoD; fixture chỉ dùng preview demo.

**DoD:** các luồng đọc chính chạy trên preview responsive; mọi thông tin thật có nguồn/độ mới; lịch sử, dự đoán và tin chính thức không trộn; không phụ thuộc full asset TGC.

### UX

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P3-U01 | Tạo tokens typography/spacing/color/focus và primitive badge/button/input | Đọc rõ trạng thái bằng chữ; focus bàn phím thấy được; không màu riêng cho từng module | P0-U01, P0-U03 | Trung bình | — |
| P3-U02 | Dựng header/navigation/grid Hub theo wireframe | Desktop/mobile đủ widget, không horizontal overflow khi tên dài | P3-U01 | Trung bình | — |
| P3-U03 | Tạo component loading/empty/error/stale/offline dùng chung | Mỗi trạng thái có thông điệp/hành động phù hợp; lỗi một widget không che toàn Hub | P3-U01 | Thấp | — |
| P3-U04 | Thêm local preferences cho filter/market/spoiler | Reload giữ lựa chọn; reset về default không mất outfit trừ khi người dùng chọn xóa | P2-U01, P0-H01 | Trung bình | — |

### Hub

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P3-H01 | Xây catalog list và filter tên/slot/season/spirit | Filter phối hợp cho kết quả đúng, empty rõ, liên kết item ổn định | P2-H01, P3-U02 | Trung bình | DATA K01/K02 |
| P3-H02 | Xây item detail và acquisition cost breakdown | Tách loại tiền, unknown/free; hiển thị source, season/spirit và asset placeholder | P3-H01 | Trung bình | — |
| P3-H03 | Xây spirit/tree view và tổng đường unlock | Node keyboard reachable; tổng incomplete nếu thiếu cost; không cộng trùng node | P2-D06, P3-H02 | Cao | DATA K02 |
| P3-H04 | Xây TS history table/timeline và filter | Nhiều lần ghé cùng spirit được giữ; disputed được gắn nhãn | P2-D07, P3-U02 | Trung bình | DATA K03/K04 |
| P3-H05 | Tạo prediction view với methodology và empty state | Không có method/input đáng tin thì không có dự đoán giả; chưa xác nhận không hiện như lịch chắc chắn | P0-H03, P3-H04 | Trung bình | Q09 |
| P3-H06 | Xây season/event card và detail liên kết item/spirit | Chỉ mốc confirmed mới có countdown chính xác; thiếu nguồn có unavailable | P1-H01, P2-D08, P3-U02 | Trung bình | DATA K01/K06 |
| P3-H07 | Xây official news feed/detail | Có link nguồn, ngày/version khi biết, tóm tắt riêng; không trộn leak | P1-D06, P2-D08 | Trung bình | DATA K06 |
| P3-H08 | Ghép widget trang chủ theo thứ tự UX | Season, TS, official feed, quick links và lookup có đường đến detail; không card trống lớn | P3-H01, P3-H04, P3-H06, P3-H07 | Trung bình | — |

### Data pipeline / Infra / Wardrobe

| ID | Module | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|---|
| P3-D01 | Data pipeline | Viết TimeReference adapter và đồng bộ từ K05 | Đúng unit/semantics; lỗi nguồn giữ last-sync/stale, không tự dựng reset LA | P1-D05, P2-D01 | Cao | DATA K05 |
| P3-D02 | Data pipeline | Viết countdown bằng mốc nguồn và elapsed time | Qua sleep/wake/tab background/DST fixture không lệch vì offset hardcode; mốc hết hạn báo stale | P3-D01, P3-H06 | Cao | DATA K05 |
| P3-I01 | Infra | Nếu cần, thêm proxy time hẹp trên Vercel sau kiểm tra CORS | Chỉ host/endpoint allowlisted, cache/rate theo contract; không open proxy; nếu gọi trực tiếp được thì ghi không cần | P1-D05, P0-I04 | Trung bình | Q04 |
| P3-W01 | Wardrobe | Thêm widget mở editor hoặc outfit local gần nhất | Không cần full asset; trước khi editor sẵn sàng có trạng thái demo rõ | P2-U01, P3-U02 | Thấp | — |

## Phase 4 — Wardrobe 2D placeholder đủ hành vi

**Mục tiêu:** hoàn thành W01–W05 trên hình học/layer demo để kiểm tra engine/UI độc lập quyền full asset.

**Phụ thuộc:** P2-D04/P2-W01/P2-U01 và primitive P3-U01; không cần chờ toàn bộ Phase 3 hoặc TGC.

**DoD:** mặc/tháo từng slot, size, override, dye, lưu/reload/share đều kiểm chứng; missing asset/rule/ID không crash; mọi demo gắn placeholder. Full wardrobe vẫn **pending legal confirmation**.

### Wardrobe

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P4-W01 | Tạo model canonical và bảng anchor/scale demo versioned | Có hệ tọa độ/đơn vị/gốc rõ, size code demo không giả game data | P0-W02, P1-W01, P2-D04 | Trung bình | — |
| P4-W02 | Tạo layer bindings và renderer xếp lớp cấu hình | Sáu slot thử được; cape nhiều binding khi demo cần; z-order không hardcode trong component item | P4-W01 | Cao | — |
| P4-W03 | Tạo picker item theo slot, equip/unequip/reset | Cardinality/compatibility được validate; không làm mất dye của item khác | P2-W01, P4-W02 | Trung bình | — |
| P4-W04 | Nối size selector với ScaleTable/AnchorTable | Đổi size áp scale đúng một lần; missing size báo rõ; đổi viewport không làm lệch anchor | P4-W02 | Cao | — |
| P4-W05 | Viết resolver rule override có priority và reason | Rule demo mô phỏng chibi; baseSize giữ nguyên; tháo item trả về baseSize | P4-W03, P4-W04 | Cao | — |
| P4-W06 | Xử lý rule xung đột và calibration thiếu | Xung đột cùng priority bị validator báo; runtime ổn định và hiển thị cảnh báo, không chọn ngẫu nhiên | P4-W05 | Trung bình | — |
| P4-W07 | Tạo dye region demo và bộ điều khiển màu/reset | Chỉ vùng hỗ trợ đổi màu; mask thiếu không tô toàn item sai; nhãn demo rõ | P4-W02, P4-W03 | Cao | — |
| P4-W08 | Nối AssetRegistry với fallback theo từng layer | Thiếu file/quyền thì hình học placeholder có nhãn; không fetch URL tùy ý từ outfit link | P2-D11, P4-W02 | Trung bình | — |
| P4-W09 | Tạo lưu/đổi tên/xóa outfit local và restore khi reload | Selection/dye/base size round-trip; quota lỗi vẫn giữ phiên hiện tại; xóa không ảnh hưởng outfit khác | P2-U01, P4-W07 | Trung bình | — |
| P4-W10 | Viết codec outfit share versioned và copy/open link | Mở ở phiên trống khôi phục đúng; payload quá lớn/sai version/ID bị xử lý an toàn | P4-W09 | Cao | — |
| P4-W11 | Thêm migration item alias/tombstone khi mở outfit cũ | Báo item thiếu, không thay bằng món khác âm thầm; phần hợp lệ vẫn mở | P2-D12, P4-W10 | Trung bình | — |
| P4-W12 | Kiểm thử reducer/transform/rule/codec với chuỗi thao tác | Equip → đổi base size → override → tháo → dye → share → reload giữ đúng state; test không chỉ snapshot cấu trúc code | P4-W05–P4-W11 | Cao | — |

### UX / Data pipeline / Hub / Infra

| ID | Module | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|---|
| P4-U01 | UX | Dựng editor 3 vùng desktop và drawer mobile | Preview không bị controls che; keyboard dùng được picker/size/dye/share; có label override | P4-W03, P4-W07, P3-U01 | Trung bình | — |
| P4-D01 | Data pipeline | Kiểm tra liên kết item → asset/binding/dye/rule | Fixture và pending full asset không lọt production; demo package được nhận diện riêng | P4-W08, P2-D11 | Trung bình | — |
| P4-H01 | Hub | Nối “thử item” từ catalog và mở outfit gần nhất | Item chưa render được mở placeholder có giải thích; nav không reset outfit đang sửa | P3-H02, P3-W01, P4-W09 | Thấp | — |
| P4-I01 | Infra | Smoke editor trên Vercel preview qua link trực tiếp | Refresh/deep link/share không 404, asset demo tải đúng, không cần login | P0-I04, P4-W10, P4-U01 | Trung bình | — |

## Phase 5 — Hub chuyên sâu, kiểm duyệt và QR profile

**Mục tiêu:** hoàn thiện map/route/Eden, IAP, leak workflow và QR; tất cả giữ nguồn và trạng thái local.

**Phụ thuộc:** Phase 2 + UI/data access Phase 3. Các nhánh độc lập nhau; QR/map ảnh có thể chờ contract/quyền mà không chặn route text hoặc giá.

**DoD:** H05–H08 và U01 có luồng thực đã xác minh hoặc được giữ gated với lý do/placeholder rõ. Không coi QR/price integration là hoàn thành nếu chỉ có fixture. Nội dung draft không bao giờ xuất public.

### Hub

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P5-H01 | Biên tập realm/season/map index và marker text từ K07 | Có provenance từng map/marker; ảnh chưa quyền có text/sơ đồ thay | P1-D07, P2-D03 | Trung bình | DATA K07 |
| P5-H02 | Xây map selector/viewer và toggle shrine/Children of Light | Marker đúng mapRevision; zoom/list chọn đồng bộ; placeholder không giả vị trí thật | P5-H01 | Cao | RIGHTS nếu dùng ảnh gốc |
| P5-H03 | Biên tập route Eye of Eden thành các bước riêng | Đối chiếu K08/K09, nguồn từng phần, chữ viết lại và chú thích version chưa kiểm chứng | P1-D08, P1-D09, P2-D08 | Cao | DATA K08/K09 |
| P5-H04 | Biên tập một route season theo cùng contract | Không suy diễn đường chưa có nguồn; step order và map link đã validate | P5-H03 | Trung bình | DATA K08/K09 |
| P5-H05 | Xây route player/checklist và progress local | Reload giữ bước; đổi route version reconcile ID, không tự complete bước mới | P5-H03, P2-U01 | Trung bình | — |
| P5-H06 | Xây IAP market/platform selector và observation detail | Hiện đúng currency/ngày/nguồn; không trộn giá iOS/Android hoặc giá lịch sử với hiện tại | P2-D09, P0-H01 | Trung bình | DATA K10/K11/K12 |
| P5-H07 | Viết calculator proportional và checkout theo gói đã xác minh | Có test làm tròn nguyên gói, leftover, missing heart, mixed bundle/currency, promo; không hứa tối ưu nếu chưa hỗ trợ | P5-H06, Q10 | Cao | Q10 |
| P5-H08 | Xây price breakdown gắn từng item/acquisition option | Unknown/partial không hiện số tiền chính xác giả; công thức và giả định đọc được | P5-H07, P3-H02 | Trung bình | — |
| P5-H09 | Tạo intake/review/approve/reject/withdraw cho leak bằng workflow đã chốt | Approval gắn reviewer/time/revision; sửa nội dung buộc review lại; không xây user account | P0-H02, P1-H02 | Cao | Q02, DATA K14 |
| P5-H10 | Xây public leak feed tách official và spoiler control | Chỉ approved cùng revision; unconfirmed vẫn có nhãn, withdrawn bị loại khỏi export | P5-H09, P2-D11, P3-U04 | Trung bình | — |

### UX (QR/Profile)

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P5-U01 | Tạo QR image input và camera entry theo capability | Xin camera khi bấm; denied/unsupported có fallback chọn ảnh; không upload payload | P1-H03, P3-U01 | Trung bình | Q11 |
| P5-U02 | Viết decode + validator protocol theo mẫu đã xác minh | QR không hỗ trợ/sai/URL lạ bị báo rõ, không tự mở URL hoặc render HTML từ payload | P5-U01 | Cao | Q11 |
| P5-U03 | Tạo profile view từ validated fields | Chỉ field được protocol cho phép; không suy danh tính, không persist raw QR mặc định | P5-U02 | Trung bình | Q11 |

### Data pipeline / Infra / Wardrobe

| ID | Module | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|---|
| P5-D01 | Data pipeline | Thêm gate private draft/media và preview public projection | Test draft/rejected/withdrawn/approval cũ đều không xuất; không lộ message raw hoặc ticket | P5-H09, P2-D11 | Cao | — |
| P5-I01 | Infra | Kiểm tra cập nhật/gỡ leak qua build/cache version | Public feed và cache phiên mới không giữ bản withdrawn; có runbook rollback/gỡ | P5-H10, P2-D12 | Trung bình | — |
| P5-W01 | Wardrobe | Nối IAP/item detail và route/nav trở lại editor | Không mất state outfit khi chuyển Hub ↔ Wardrobe; không biến calculator thành tính năng trả phí | P5-H08, P4-H01 | Thấp | — |

## Phase 6 — PWA, offline và notification trong giới hạn local

**Mục tiêu:** web-app cài được khi hỗ trợ, dữ liệu public offline có nhãn, thông báo opt-in đúng capability; không native giai đoạn đầu.

**Phụ thuộc:** shell/UI Phase 3, version/export Phase 2; notification cần P0-U02 và K05 thật nếu dùng mốc thời gian game.

**DoD:** manifest/service worker được kiểm tra trên môi trường mục tiêu; update không làm mất state; cache không chứa draft/QR; giới hạn thông báo app đóng được nói rõ. Web Push nền không thuộc DoD mặc định.

### Infra

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P6-I01 | Tạo manifest/name/icons tự tạo/start URL và capability install | Không dùng icon TGC chưa rõ quyền; kiểm tra khả năng cài trên browser mục tiêu thực tế | P3-U02 | Trung bình | — |
| P6-I02 | Tạo service worker cache shell và catalog public versioned | Offline mở shell + bản catalog đã có; request draft/QR không có trong cache | P2-D12, P6-I01 | Cao | — |
| P6-I03 | Viết lifecycle update/cache cleanup có version tương thích | Không trộn code mới với data cũ không tương thích; cache hỏng có fallback rõ | P6-I02 | Cao | — |
| P6-I04 | Kiểm tra quota/storage eviction và restore online | Cache bị xóa không crash; online tải lại; không hứa local data sống vĩnh viễn | P6-I03, P2-U01 | Trung bình | — |

### UX

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P6-U01 | Tạo banner offline/last-sync và update prompt | Không ép reload làm mất outfit đang chỉnh; user chọn apply update | P6-I03, P4-W09 | Trung bình | — |
| P6-U02 | Tạo notification settings/capability/permission flow | Prompt chỉ sau click, denied/unsupported có hướng dẫn; opt-in lưu local | P0-U02, P2-U01 | Trung bình | — |
| P6-U03 | Tạo export/import/reset local data theo phạm vi | Import validate trước áp; reset cần xác nhận; không xuất QR raw hay bí mật | P2-U01, P4-W09 | Trung bình | — |

### Hub / Data pipeline / Wardrobe

| ID | Module | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|---|
| P6-H01 | Hub | Tạo reminder in-app từ mốc verified và lựa chọn local | Không tự tạo lịch, không nhắc trùng trong phiên/khung sự kiện đã đánh dấu | P3-D02, P6-U02 | Trung bình | DATA K05 |
| P6-H02 | Hub | Thêm notification khi app đang hoạt động nếu browser hỗ trợ | Denied/unsupported quay về in-app; thông báo không claim delivery khi app đóng | P6-H01 | Trung bình | — |
| P6-D01 | Data pipeline | Thêm policy fresh/stale cho time/content/cache theo contract | Offline countdown không gắn nhãn live; expired time dừng khẳng định chính xác | P1-I01, P3-D01, P6-I02 | Trung bình | DATA K05 |
| P6-W01 | Wardrobe | Kiểm tra editor/offline/share với catalog đang cache | Item mới chưa cache báo thiếu, outfit đang sửa không mất khi service worker cập nhật | P4-W11, P6-I03 | Trung bình | — |

### Research tách biệt, không tự đưa vào release

| ID | Module | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|---|
| P6-R01 | Infra | Viết đánh giá Web Push nền: subscription, sender, chi phí, retention, quyền | Chỉ tài liệu; chỉ rõ lưu server subscription khác yêu cầu local; chưa triển khai nếu chưa thay scope | P0-U02 | Trung bình | — |
| P6-R02 | UX | Ghi tiêu chí nghiên cứu native về sau | Không tạo native project hoặc đưa vào đường găng; chỉ ghi nhu cầu chưa đáp ứng bằng web | P6-R01 | Thấp | — |

## Phase 7 — kiểm chứng, public release và bàn giao vận hành

**Mục tiêu:** phát hành Hub và Wardrobe placeholder có chất lượng, truy nguồn được và có rollback.

**Phụ thuộc:** DoD các module đưa vào release từ Phase 2–6. Không chờ Phase 8. Module DATA/QR blocked chỉ được phát hành dưới trạng thái unavailable/placeholder công khai và vẫn giữ task mở.

**DoD:** build checks và luồng người dùng chính qua; sources/credits rõ; không login/paywall/draft/pending full asset; Vercel production release được xác minh khi đến bước triển khai thực tế. Bàn giao nêu đủ module còn chờ thay vì gọi mọi feature đã xong.

| ID | Module | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|---|
| P7-I01 | Infra | Chạy build/type/schema/export gates trên release candidate | Output reproducible, không secret/private draft/fixture/pending full asset trong bundle | P2-I01, các phase release | Trung bình | — |
| P7-W01 | Wardrobe | Chạy flow mặc đồ → override → dye → save → link ở phiên trống | Kết quả đúng, missing ID và payload lỗi có fallback; nhãn placeholder hiện | P4-I01, P6-W01 | Trung bình | — |
| P7-H01 | Hub | Chạy flow catalog → spirit → TS → season → news → map/route → IAP | Link/FK/nguồn đúng; unknown/stale và heart mapping thiếu không tạo số giả | Phase 3, nhánh Phase 5 phát hành | Cao | DATA theo module |
| P7-H02 | Hub | Kiểm chứng moderation bằng approved/rejected/withdrawn/mutated fixtures | Chỉ approval đúng revision xuất; gỡ tin có cache invalidation; không trộn official | P5-D01, P5-I01, P6-I03 | Trung bình | — |
| P7-U01 | UX | Kiểm tra responsive, keyboard/focus, contrast, text dài và reduced motion | Luồng chính dùng được trên browser/màn hình đã chọn, ghi lỗi và sửa trước release | P3-U01, P4-U01 | Cao | — |
| P7-U02 | UX | Kiểm tra QR/camera/notifications theo capability thực tế | Không upload ngoài ý muốn; denied/unsupported rõ; không hứa background delivery | P5-U03 nếu bật, P6-U02 | Trung bình | Q11 nếu bật QR |
| P7-D01 | Data pipeline | Audit source/attribution/revision/rights của release manifest | Mọi record thật truy nguồn; risk không tự nới; icon/map pending được thay hình học | P2-D11, P1-U01 | Trung bình | Q12, RIGHTS nếu dùng |
| P7-I02 | Infra | Đo bundle/load/render trên tập thiết bị đã chốt và sửa bottleneck | Ghi số đo thật và tiêu chí budget đã chốt; không tải toàn ảnh/map ngay trên Hub | P7-I01 | Trung bình | — |
| P7-I03 | Infra | Chuẩn bị production deployment Vercel và runbook rollback | Preview tương ứng commit/data manifest, deep links/cache/assets đạt smoke; không phát sinh dịch vụ trả phí ngoài phạm vi | P7-I01–P7-I02, P7-W01, P7-H01, P7-U01, P7-D01 | Trung bình | — |
| P7-I04 | Infra | Thực hiện release khi đến bước triển khai và xác minh URL production | Các route chính phục vụ đúng version; rollback bundle đã thử ở môi trường phù hợp; ghi URL/version thực | P7-I03 và các gate module bật | Trung bình | — |
| P7-D02 | Data pipeline | Bàn giao lịch cập nhật thủ công, xử lý nguồn lỗi và quyền bị thu hồi | Có người phụ trách, dry-run, diff/review, rollback và danh sách task còn blocked | P2-I02, P7-I04 | Thấp | Q16 |

## Phase 8 — full wardrobe/asset khi đủ điều kiện

**Mục tiêu:** thay placeholder bằng asset hợp lệ; đánh giá 3D riêng nếu thực sự được cấp quyền và có nhu cầu đã chốt.

**Phụ thuộc:** Phase 4 hoàn thành; P1-L03/P1-L05 xác nhận phạm vi quyền phù hợp và dữ liệu asset đã nhận qua kênh hợp lệ. **Toàn bộ nhánh full asset pending legal confirmation** cho đến khi gate có chứng cứ. Support referral, ticket acknowledgement hoặc quyền truy cập asset không tự động đồng nghĩa quyền hiển thị/phân phối/sửa đổi.

**DoD:** từng asset được xác nhận quyền, calibration/dye/renderer được kiểm chứng, credits đúng và có rollback về placeholder. Phản hồi từ chối hoặc chưa đủ rõ thì phase vẫn blocked; release Hub/placeholder tiếp tục vận hành.

| ID | Module | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate / phương án tạm |
|---|---|---|---|---|---|---|
| P8-I01 | Infra | Xác nhận lại phản hồi TGC và ma trận quyền trước khi tích hợp full asset | Đối chiếu P1-L03 với asset/revision thực nhận; phân biệt quyền truy cập với use/display/redistribute/modify; phạm vi lệch hoặc hết hiệu lực thì giữ pending | P1-L03, P1-L05, phản hồi/evidence thật | Trung bình | TGC; tiếp tục hình học |
| P8-D01 | Data pipeline | Nhận và kiểm kê asset từ kênh được TGC cho phép | Có provenance/quyền/format/revision; không rip hoặc lấy từ game client | P8-I01 | Cao | TGC; registry placeholder |
| P8-D02 | Data pipeline | Mapping asset hợp lệ → item IDs và manifest | Không làm đổi ID outfit; thiếu asset từng item vẫn fallback | P8-D01, P2-D12 | Trung bình | TGC; layer demo |
| P8-W01 | Wardrobe | Calibrate anchor/scale theo model/size thực được cung cấp | Có mẫu đối chiếu, revision, sai số nghiệm thu đã chốt; không coi bảng demo là thật | P8-D02, P4-W04 | Cao | TGC; scale demo có nhãn |
| P8-W02 | Wardrobe | Nối layer/occlusion với asset đầy đủ và kiểm tra các slot | Bộ tổ hợp đại diện không lệch vị trí/thứ tự; missing combination được báo | P8-W01, P4-W02 | Cao | TGC; giữ paper-doll demo |
| P8-W03 | Wardrobe | Nối dye masks/regions được cấp và rule resize thật | Không tô sai vùng; tháo override trả base size; size code có căn cứ | P8-W02, P4-W07 | Cao | TGC; dye demo |
| P8-U01 | UX | Cập nhật nhãn placeholder và credits theo từng asset đã đủ quyền | Chỉ bỏ nhãn của asset có evidence, không bỏ nhãn toàn bộ catalog một lần | P8-D02, P8-W03 | Thấp | TGC; nhãn pending vẫn hiện |
| P8-H01 | Hub | Cập nhật item/map preview có quyền tương ứng | Quyền TGC và map tác giả khác được kiểm tra riêng; không tự duyệt ảnh cộng đồng | P8-I01, P1-D07 | Trung bình | TGC/RIGHTS; text/sơ đồ tự tạo |
| P8-I02 | Infra | Chạy gate quyền, regression outfit link và rollback placeholder | Old outfit mở đúng item; manifest không chứa asset ngoài phạm vi quyền; rollback gỡ asset/cache được | P8-W03, P8-U01, P8-H01 nếu bật | Cao | TGC; giữ release cũ |
| P8-W04 | Wardrobe | Viết đánh giá 3D từ format/quyền thực, rồi lập scope riêng | Chưa tự triển khai 3D nếu không có quyền/dữ liệu/quyết định; không thêm nguồn ngoài brief | P8-I01, P8-D01, Q19 | Cao | TGC, Q19; duy trì 2D |

## Đường phụ thuộc và xử lý blocker

- **TGC permission track:** P0-L01–P0-L03 chuẩn bị scope/request/evidence; P1-L01–P1-L05 gửi, lưu bằng chứng, review phạm vi và quyết định gate. Track này chạy song song, **không chặn** Hub hoặc Wardrobe placeholder. Chỉ Phase 8 full asset phụ thuộc kết quả approved/restricted tương ứng.

- Nền: P0 → P1 theo từng nguồn → P2 → P3/4/5 theo module → P6 → P7.
- P4 không chờ dataset giá/route hoặc full asset. P5 map ảnh có thể chờ quyền trong khi route text/price tiếp tục. P8 tách nhánh, không nằm trên đường găng release placeholder.
- ThatSkyAPI chưa có contract: hoàn thiện UI/adapter interface bằng fixture, disable countdown live và notification theo lịch chưa biết. Không tính lại LA từ hardcode để “bỏ chặn”.
- AppPricingLab không có integration: giữ liên kết/thao tác nhập tay khi hợp lệ; K10/K11 vẫn dùng độc lập. Thiếu giá/SKU thì unavailable.
- Sheet thiếu link: Wiki history tiếp tục với attribution, đối chiếu sheet giữ task mở.
- QR protocol chưa rõ: chuẩn bị UI trạng thái unsupported, giữ decode/display thật chưa hoàn thành; không tạo profile giả.
- TGC chưa trả lời: chỉ hình học/placeholder; icon Wiki theo brief vẫn pending IP, public release có thể thay hình học. Map cộng đồng thiếu quyền: text guide/sơ đồ riêng.

## Ma trận bao phủ feature

| PRD | Task triển khai chính | Task kiểm chứng |
|---|---|---|
| W01 layer | P4-W01–P4-W03, P4-W08 | P4-W12, P7-W01 |
| W02 size | P4-W04 | P4-W12 |
| W03 override | P4-W05–P4-W06 | P4-W12, P8-W03 khi đủ quyền |
| W04 dye | P4-W07 | P4-W12 |
| W05 local/share | P4-W09–P4-W11 | P7-W01 |
| H01 items/spirit | P2-D05/D06, P3-H01–P3-H03 | P7-H01 |
| H02 TS history/prediction | P2-D07, P3-H04/H05 | P7-H01 |
| H03 season/countdown | P1-H01, P3-H06, P3-D01/D02 | P7-H01, P6-D01 |
| H04 official news | P3-H07 | P7-H01 |
| H05 moderated leak | P5-H09/H10, P5-D01 | P7-H02 |
| H06 maps/shrines | P5-H01/H02 | P7-H01 |
| H07 routes/Eden | P5-H03–P5-H05 | P7-H01 |
| H08 IAP cost | P2-D09, P5-H06–P5-H08 | P5-H07, P7-H01 |
| U01 QR profile | P1-H03, P5-U01–P5-U03 | P7-U02 |
| U02 local state | P2-U01, P3-U04, P6-U03 | P7-W01, P6-I04 |
| U03 compact UX | P0-U01, P3-U01/U02, P4-U01 | P7-U01 |
| U04 PWA/notification | P6-I01–P6-I04, P6-U02, P6-H01/H02 | P7-U02 |

## Decisions & open questions — trạng thái quyết định

Nhóm A đã được **chốt ngày 2026-09-29** để mở khóa Phase 0. Đây là quyết định kỹ thuật của dự án, không phải thông tin game mới. Dữ liệu game thật, endpoint, quyền asset và thông tin nguồn vẫn phải qua gate DATA/TGC/RIGHTS tương ứng.

### A. Đã chốt — bắt đầu Phase 0

| ID | Quyết định đã duyệt | Mở khóa |
|---|---|---|
| Q03 | Renderer đầu là **SVG paper-doll 2D**; hệ tọa độ chuẩn hóa [0,1], gốc trên-trái; silhouette/layer tự vẽ. Bảng size demo 0–3 chỉ là fixture và phải gắn `fixture=true`; anchor/scale nằm trong JSON versioned. Giá trị size/rule/asset thật vẫn cần chứng cứ hợp lệ. | P0-W01, P4-W01–P4-W02 |
| Q05 | Trang chủ theo thứ tự: season/event → Traveling Spirit → tin chính thức → lookup/Wardrobe → maps/routes → leak thu gọn → footer. **MVP** chỉ dựng season/TS, tin chính thức, tìm item và lối vào Wardrobe; phần còn lại dùng trạng thái compact “sắp có/chưa triển khai”, không tạo khoảng trống lớn. | P0-U01, P3-U02 |
| Q06 | Stack chốt: **React + TypeScript + Vite**, **React Router**, **pnpm**, **Node LTS**, client-side và không SSR. Phiên bản cụ thể được kiểm tra/pin khi thực hiện P0-I01. | P0-I01 → P0-I02 → P0-I03 |
| Q07 | Mức đầu chỉ có **in-app reminder + notification khi app đang mở**; chỉ xin quyền sau thao tác bật của người dùng. Web Push nền chỉ là research vì cần lưu subscription phía server; không hứa delivery khi app đóng. | P0-U02, P6-U02, P6-H02, P6-R01 |
| Q13 | State local dùng `localStorage` qua wrapper versioned + parse/validate + memory fallback; IndexedDB chỉ thêm khi đo thực tế cho thấy cần. Outfit share dùng URL fragment, payload JSON gọn → nén → base64url, có `schemaVersion` + `catalogVersion`; mục tiêu ban đầu dưới khoảng 2 KB nhưng ngưỡng cuối chốt sau round-trip test. Migration dùng alias/tombstone; không chứa QR/profile/dữ liệu cá nhân. | P2-U01, P4-W10, P6-U03 |
| Q15 | Repo triển khai là **`nhlan285/Sky_guide`**. Dùng Vercel giai đoạn đầu với preview từ repo, domain `*.vercel.app`; maintainer chính là chủ repo; không tạo cron/DB/KV/tài nguyên trả phí mặc định. Trước production phải kiểm tra lại điều khoản/gói Vercel hiện hành. | P0-I04, P7-I03 |
| Q17 | UI mặc định **tiếng Việt**; tên item/spirit/season giữ tên gốc tiếng Anh từ nguồn, không tự dịch tên riêng; giữ `LocalizedText` để mở rộng ngôn ngữ sau; ID nội bộ không phụ thuộc tên hiển thị. | P0-U03, P3-U01 |
| Q18 | Browser mục tiêu: Chrome/Edge desktop bản mới, Chrome Android và Safari iOS bản gần đây. Mục tiêu đo ban đầu: thiết bị tầm trung, LCP ≤ 2,5 s trên mạng di động điển hình; budget JS cụ thể chốt sau build đầu. Accessibility hướng tới WCAG 2.2 AA; không hứa PWA/notification đồng nhất giữa nền tảng. | P6-I01, P7-U01, P7-I02 |

### B. Còn mở — chốt trước Phase 1–2

| ID | Câu hỏi / quyết định cần ghi | Đề xuất hiện tại, chưa chốt | Chốt trước / vai trò |
|---|---|---|---|
| Q04 | ThatSkyAPI/apppricinglab truy xuất kiểu nào, có endpoint/export/CORS/giới hạn gì? | Verify trước; ThatSkyAPI direct khi khả thi, proxy hẹp nếu cần; AppPricingLab manual nếu không có contract | P1-D05/D12/P3-I01; data + infra |
| Q12 | Phiên bản CC-BY-SA và credit cụ thể cho text/Wiki/sheet/map là gì? | Ghi theo nguồn đã kiểm chứng; tách attribution text và quyền media, không gán license dự án thay source | P1-U01/P7-D01; maintainer |
| Q14 | Nguồn nào trong danh sách có đủ season/event dates và cập nhật thường xuyên? | K01/K06 nếu có bằng chứng; thiếu thì inactive/unavailable; không tự thêm feed | P1-H01/P3-H06; data/editor |
| Q16 | Ai theo dõi ticket TGC và cập nhật dữ liệu, evidence nằm đâu? | Người duy trì giữ evidence riêng, repo chỉ có trạng thái/range quyền phù hợp | P0-D03/P7-D02; maintainer |

### C. Còn mở — chốt khi tới nhánh Phase 5–8

| ID | Câu hỏi / quyết định cần ghi | Đề xuất hiện tại, chưa chốt | Chốt trước / vai trò |
|---|---|---|---|
| Q02 | Ai duyệt leak, quy trình nào, dùng tool nào, nguồn Discord nào được phép? | Intake riêng tư + review theo revision + export public approved; không auto-publish/bot ingest mặc định | P0-H02/P1-H02; maintainer/editor |
| Q08 | Slot phụ kiện cho nhiều item không? Thứ tự layer và rule conflict/size thật là gì? | Cấu hình cardinality, rule priority; code demo không tự gán số size/chibi thật | P0-W02/P4; Wardrobe + data |
| Q09 | Dự đoán TS bằng phương pháp nào, trình bày mức chắc chắn ra sao? | Nhãn dự đoán + method/input version; chưa có phương pháp được chốt thì để unavailable | P0-H03/P3-H05; product + data |
| Q10 | Market/currency/platform nào trước? Quy đổi candle/heart và gói mixed theo chứng cứ nào? | Chọn thị trường sau xác nhận; tách proportional/checkout, heart thiếu mapping không tính; không tự thêm FX source | P0-H01/P5-H07; product + data |
| Q11 | QR Sky encode gì, protocol nào, dữ liệu public nào có thể đọc không tài khoản? | Xác minh với nguồn tham khảo trong brief/mẫu được phép; decode local và fail closed với payload lạ | P1-H03/P5-U01; lead + UX |
| Q19 | Sau khi đủ quyền, 2D đầy đủ có đủ không hay cần 3D/native ở scope mới? | Giữ 2D; 3D/native nghiên cứu sau, không tự mở rộng phase đầu | P8-W04; product + lead |

### D. Đã chốt bổ sung — 2026-10-01

| ID | Quyết định đã chốt | Nghiệm thu / phần còn lại |
|---|---|---|
| Q01 | **CLOSED** — Release 1 dùng JSON normalized versioned trong Git, không DB server. Public projection tại `data/public/<catalogVersion>/`; manifest ghim schema/dataset/provenance/alias/tombstone/asset version. Raw, draft, reviewed, quarantine và evidence chỉ ở workspace riêng tư ngoài repo/client/build. Export allowlist, published + non-fixture + FK public + approval đúng revision + rights gates. Contract chi tiết trong [Architecture](../ARCHITECTURE.md#kho-dữ-liệu-đã-chốt--p0-d01--q01-2026-10-01) và [DATA_SCHEMA](../DATA_SCHEMA.md#public-catalog-contract--q01). | P0-D01 DONE; P2-D01–D12/P2-I01/P2-H01 vẫn chưa triển khai. Nguồn/mapping thật vẫn DATA-gated; Q02/Q12/Q16/TGC/RIGHTS không được gỡ bởi quyết định này. |
