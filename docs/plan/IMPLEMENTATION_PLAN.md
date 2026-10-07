# Implementation Plan — task breakdown

Baseline sản phẩm: [PROJECT_BRIEF](../PROJECT_BRIEF.md), cùng các quyết định maintainer đã duyệt ngày **2026-10-04** (Q20–Q23 bên dưới). Phần đề xuất/OPEN không phải implementation hoặc nguồn game đã xác minh. Đọc kèm [PRD](../PRD.md), [Architecture](../ARCHITECTURE.md), [Schema](../DATA_SCHEMA.md), [UX](../UX_GUIDELINES.md), [Legal](../LEGAL_STATUS.md) và [Knowledge Base](../../knowledge/README.md).

Real Hub Feature V1 (2026-10-03): user duyệt riêng [K15 ThatSkyApplication](../../knowledge/15-thatskyapplication.md). Source verification + mapping + adapter K15 đã triển khai, ghim revision và MIT notice; không đánh dấu các task nguồn Wiki K01–K12 hoặc P1-D13 toàn bộ DONE. Catalogue Item Lookup có 1.808 records và route `/items`, `/items/:id`. P2-H01 đã có manifest/normalized loader cho Item Lookup; task tổng thể và P2-D12 vẫn OPEN (chưa có loader/pipeline đầy đủ cho các module khác). Giới hạn giữ nguyên Wardrobe áp dụng cho scope K15 lịch sử; master run 2026-10-04 tiếp tục các task demo độc lập đủ dependency.

## Cách dùng task list

Scoped infrastructure repair (2026-10-04): [R2 runtime debugging](R2_RUNTIME_DEBUG.md).
This task preserves the asset corpus, catalog, UI and storage architecture; it does
not change completion status of unrelated product phases. See [current handoff](../CURRENT_STATE.md).

Completed scoped follow-up (2026-10-04): [item image sizing and source verification](ITEM_IMAGES_PRICE_SOURCES.md), merged as **PR #10**, `origin/main` **c0c0ee0**. Research prepares future reconciliation; it does not publish new catalog prices or complete all source coverage.

Current checkpoint: **R1 — data/storage contracts IN PROGRESS**, [active task plan](DATA_FOUNDATION.md). R0 baseline `8b371de` is committed and pushed; R1 contracts and local sync checks are implemented, awaiting maintainer/provider review, not live DB completion. Independent P2-U01 local storage is DONE; P2-D03 schemas are DONE; P4-W09 local outfit persistence is DONE; P4-W10 share codec and P4-H01 navigation continuity are DONE. The additive Phase 9 track is the next execution order; Phase 0–8 IDs and historical dependencies remain traceable. Living Sky / responsive atlas and Hub shell are production; K15 Item Lookup has ~1.808 records on `/items` and `/items/:id`. Wardrobe is an interactive self-created/fixture demo. R2 runtime routing and Item/Wardrobe CSS collision are fixed on main. These scoped results do not satisfy every Phase 7 release flow or K01–K12/full generic pipeline DoD.

Mỗi hàng là một task độc lập để copy: **ID + module + việc/đầu ra + nghiệm thu + phụ thuộc + độ phức tạp + gate**. Không có ước lượng thời gian. Task chưa có trạng thái nghiệm thu cụ thể vẫn là **chưa làm**; các hàng DONE ghi ngày và phạm vi bằng chứng. Không đánh dấu API, calibration, asset, UI hoặc deploy đã sẵn sàng chỉ vì có tài liệu.

- **Thấp / Trung bình / Cao:** mức phức tạp tương đối, không phải thời lượng.
- **Gate `—`:** có thể thực hiện sau phụ thuộc thông thường.
- **Gate `Qnn`:** cần quyết định nêu trong Decisions & open questions; chỉ các Q còn mở mới được giữ làm gate. Q đã chốt phải được gỡ khỏi cột Gate/phụ thuộc.
- **Gate `DATA Kxx`:** thiếu URL/contract/dữ liệu thật; có thể dùng fixture tự tạo gắn nhãn để phát triển, nhưng không gọi integration là hoàn thành.
- **Gate `TGC`:** **pending legal confirmation**, phụ thuộc phản hồi TGC đúng phạm vi; phương án tạm nêu riêng. Không tự bỏ gate.
- **Gate `RIGHTS`:** cần xác minh quyền asset bên thứ ba (ví dụ map), không mặc định TGC có thể cho phép thay tác giả.
- **DONE:** đã nghiệm thu đúng phạm vi/bằng chứng; **OPEN:** chưa đạt DoD; **APPROVED/DESIGNED:** đã duyệt hướng/contract, chưa implemented; **BLOCKED:** không thể hoàn thành slice vì dependency cụ thể. **DATA-gated / RIGHTS-gated / TGC-gated** chỉ rõ phần bị chặn; fixture có thể tiếp tục nhưng không được gọi integration/publishing DONE. Task không ghi DONE mặc định OPEN.

Phụ thuộc phase là điều kiện nền; cột phụ thuộc bổ sung quan hệ task cụ thể. `P0`/`P1`… trong cột này nghĩa DoD của phase tương ứng. Nhánh DATA/TGC chưa xong không ngăn scaffold, fixture test, UI placeholder hoặc module có dữ liệu khác tiến lên. Để phát hành một module có dữ liệu thật, các task nguồn/contract của chính module đó phải đạt DoD. Không dùng “defer” để tuyên bố toàn bộ sản phẩm hoàn tất.

## Phase 0 — chốt phạm vi và chuẩn bị dự án

**Mục tiêu:** thống nhất các quyết định làm thay đổi schema/UI trước khi viết code; chuẩn bị Vercel workflow và khung app.

**Phụ thuộc:** bộ tài liệu scaffold hiện tại; không phụ thuộc TGC.

**DoD:** stack và phạm vi release được ghi; các câu hỏi ảnh hưởng Phase 1–2 có owner/trạng thái; app rỗng build được trên preview; chưa cần dữ liệu/asset game thật. Những câu hỏi thuộc nhánh sau có task/gate cụ thể, không giả là đã quyết định. Nhánh xin quyền TGC có owner, phạm vi cần xin và gói yêu cầu sẵn sàng để gửi mà không chặn Hub/Wardrobe placeholder.

### Infra

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P0-I01 | **DONE 2026-10-04 — existing implementation/evidence verified:** Ghi quyết định React/TypeScript/Vite, router, package manager và phiên bản hỗ trợ vào Architecture | Có lựa chọn/phiên bản được kiểm tra lúc code, lý do và build command; không cài framework thứ hai không cần thiết | — | Thấp | — |
| P0-I02 | **DONE 2026-10-04 — existing implementation/evidence verified:** Khởi tạo manifest dependency, TypeScript và entry app rỗng trong khung `src` | Install/build chạy tái lập với lockfile; không chứa demo dữ liệu thật giả | P0-I01 | Thấp | — |
| P0-I03 | **DONE 2026-10-04 — existing implementation/evidence verified:** Tạo quy tắc lint/typecheck và script build | Lệnh được mô tả, lỗi type thực sự làm build gate fail | P0-I02 | Thấp | — |
| P0-I04 | **DONE scaffold 2026-10-01; reconciled2026-10-06:** existing project/preview/output/fallback + rollback README | Historical authenticated root/about render accepted; current Git preview588bb31 READY verified. Protected-content fetch403, fresh render not claimed; [audit](PREVIEW_AUDIT.md) | P0-I03 | Trung bình | Fresh smoke requires protected access |

### Data pipeline

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P0-D01 | **DONE 2026-10-01** — Chốt kho JSON versioned và ranh giới public/raw/draft (Q01, historical) | Contract projection/manifest/provenance/FK/alias và private boundaries giữ nguyên; canonical ownership evolved sang Q20 ngày 2026-10-04, không reopen nghiệm thu lịch sử; central DB chưa provisioned | — | Trung bình | — |
| P0-D02 | **DONE 2026-10-01** — Lập bảng owner kiểm tra từng K01–K14 và thông tin đang thiếu | Ma trận 14/14 nguồn trong Knowledge Base có role owner, trạng thái hiện tại, thông tin thiếu cần xác minh, việc tiếp theo bám roadmap Phase 1 và gate/phụ thuộc; không điền URL/endpoint phỏng đoán | P0-D01 | Thấp | — |
| P0-D03 | **DONE 2026-10-02** — Chốt owner/evidence handling (Q16 CLOSED) | [Legal contract](../TGC_FOLLOW_UP.md#ownership-và-evidence-boundary--q16): Maintainer / repository owner, nơi logic Sky Guide private workspace → Legal → TGC ngoài repo, trách nhiệm update và public allowlist; chưa provisioning storage/nhận raw evidence; full asset gate pending | — | Thấp | — |

### Legal / TGC permission track

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P0-L01 | **DONE 2026-10-02** — Chốt scope cần clarification sau phản hồi Support | [Scope](../TGC_FOLLOW_UP.md#permission-scope--p0-l01): full TGC, Wiki/media, community, generic self-created và 3D lookalike/reference riêng; model/rig/texture/dye/calibration, interactive/repo/distribution/restrictions/revocation/access; chưa có permission | P0-D03, P1-W02 có thể cập nhật sau | Thấp | — |
| P0-L02 | **DONE 2026-10-02** — Soạn follow-up clarification package | [Draft](../TGC_FOLLOW_UP.md#follow-up-clarification-package--p0-l02) tgc-follow-up-draft-v1 ready-to-send, **chưa gửi**; ghi nhận Ray đã phản hồi, hỏi explicit rights/interactive/open-source/lookalike/credit/revocation/source/contact; không mod/rip, private source nếu restricted, fallback generic | P0-L01 | Trung bình | — |
| P0-L03 | **DONE 2026-10-02** — Chốt private evidence location và ledger template | [Template](../TGC_FOLLOW_UP.md#private-evidence-ledger-template--p0-l03) có evidenceRef/channel/private ticket/time, request/response revision/scope, finite rights/status, interactive/open-source/lookalike, credit/restrictions/revocation/coverage/follow-up/decision/reviewer/public summary; current pending_clarification, không raw evidence trong repo | P0-D03 | Thấp | — |

### Wardrobe

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P0-W01 | **DONE 2026-10-02** — Chốt SVG paper-doll 2D và silhouette/layer self-created | Contract tọa độ/transform trong Architecture; [fixture tĩnh](../../tests/fixtures/wardrobe/README.md) có silhouette + rear/front hình học, fixture=true, không game/Wiki download; chưa triển khai renderer Phase 4 | — | Trung bình | — |
| P0-W02 | **DONE 2026-10-02** — Chốt cardinality, anchor/revision và conflict/override (Q08 CLOSED) | Architecture/DATA_SCHEMA khóa config maxItems, mảng equip, multi-binding/z-order, anchor key, priority/conflict error, base/effective size và ví dụ ID/code fixture; không claim behavior game | P0-W01 | Trung bình | — |

### Hub

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P0-H01 | **OPEN tổng thể; market choice đã duyệt PR #10:** IAP USD/US + VND/VN riêng iOS/Android | Giữ market quyết định cũ; finish proportional/checkout/mixed/heart mapping theo Q10 và DATA coverage; không FX tự động, missing khác free | Q10 phần mapping còn mở | Trung bình | Q10 phần mapping |
| P0-H02 | Chốt owner/reviewer/tool cho leak và trạng thái chuyển duyệt | Có người duyệt, điều kiện approve/reject/withdraw; không auto-publish | Q02 | Trung bình | Q02 |
| P0-H03 | Ghi tiêu chí chấp nhận phương pháp dự đoán TS | Nhãn, dữ liệu đầu vào, phạm vi suy luận và trường hợp không đủ dữ liệu rõ | Q09 | Trung bình | Q09 |

### UX

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P0-U01 | **DONE 2026-10-02** — Chốt wireframe Hub desktop/mobile theo Q05 | [UX contract](../UX_GUIDELINES.md#trang-chủ-hub--wireframe-contract-p0-u01-2026-10-02): sơ đồ hai layout, thứ tự mobile, nav/search/Wardrobe/footer, MVP vs secondary compact và normal/loading/empty/unavailable/stale/placeholder/error; chưa triển khai UI | — | Trung bình | — |
| P0-U02 | **DONE 2026-10-02** — Chốt notification UX theo Q07 | [Notification contract](../UX_GUIDELINES.md#notification-contract-p0-u02--q07-2026-10-02): copy Việt bật nhắc/quyền/active/unsupported/denied/unavailable; permission qua thao tác rõ, chỉ app mở, không bảo đảm delivery; Web Push research, chưa implement | — | Thấp | — |
| P0-U03 | **DONE 2026-10-02** — Chốt ngôn ngữ/status vocabulary theo Q17 | [Glossary](../UX_GUIDELINES.md#ngôn-ngữ-và-glossary-p0-u03--q17-2026-10-02): UI Việt, tên riêng English từ nguồn, ID độc lập label, LocalizedText mở rộng; official/leak/prediction và fixture/unavailable/stale/source-not-verified phân biệt bằng chữ, có copy trạng thái | — | Thấp | — |

## Phase 1 — xác minh nguồn và contract truy xuất

**Mục tiêu:** biến những điều chưa biết trong KB thành bằng chứng mẫu và mapping có kiểm chứng. Đây là giai đoạn cần tra nguồn thật khi được triển khai; lần scaffold không tự điền kết quả.

**Phụ thuộc:** P0-D01/D02; các task nguồn độc lập có thể chạy trước khi xong wireframe.

**DoD:** mỗi nguồn có URL/contract và fixture hợp lệ hoặc báo cáo thiếu với fallback cụ thể. Module được bật với dữ liệu thật chỉ khi nguồn của nó đã kiểm chứng; nguồn chưa truy cập được vẫn DATA-blocked, không tính integration hoàn thành. Risk text gốc không bị nới lỏng. Track TGC phải có bằng chứng đã gửi qua kênh chính thức hoặc trạng thái chưa gửi có lý do/owner; mọi phản hồi chỉ mở gate theo đúng phạm vi được ghi nhận, không suy diễn từ support referral.

### Data pipeline

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P1-D01 | **DONE 2026-10-05** — K01 endpoint/Lua modules/revision và mẫu field có provenance | Ghi endpoint thật, action/format thực, field có/không; không giả module là JSON | P0-D02 | Trung bình | DATA K01 |
| P1-D02 | **DONE 2026-10-05** — K02 endpoint/revision và tree10 nodes/9 cạnh được review | Mẫu Pointing Candlemaker, cost explicit/default tách provenance; root unknown, totals partial; [evidence](../../knowledge/evidence/k02-regular-spirit-tree-2026-10-05.json) | P0-D02 | Trung bình | DATA K02 cho adapter/coverage |
| P1-D03 | **DONE 2026-10-05** — K03 URL/format/history date sample | Hai lần Leaping Dancer giữ date-only, end/timezone unknown, TS/SV/upcoming tách; revision/provenance có [evidence](../../knowledge/evidence/k03-traveling-visits-2026-10-05.json) | P0-D02 | Trung bình | DATA K03 cho full import |
| P1-D04 | **BLOCKED 2026-10-06** — link/tác giả ln.cookie đã tìm, OneDrive embed403 | Chưa đọc tab/cột/export; cần public sample/export truy cập được, không đoán route | P0-D02 | Trung bình | DATA K04/access |
| P1-D05 | **DONE 2026-10-06** — ThatSkyAPI /skytime GET/source sample | Epoch milliseconds/LA fields khớp; HTTP CORS*, time-only sample; quota/TTL/license unknown và notice hạn chế call ghi rõ | P0-D02 | Cao | DATA K05 cho integration |
| P1-D06 | **DONE 2026-10-06** — K06 section/article Hotfix34.4 verified | Title/release-date-only/version/platform/link; relative updatedAt unknown, summary riêng; không dựng API/RSS | P0-D02 | Thấp | DATA K06 cho feed |
| P1-D07 | **DONE 2026-10-06** — K07 source/text +2 map metadata samples | Page/file/image revisions/dimensions; Ray credit/Self vs Fairuse tách; coordinates unknown, không tải binary; coverage/import chưa làm | P0-D02 | Trung bình | DATA K07, RIGHTS vẫn giữ |
| P1-D08 | **DONE 2026-10-06** — AppUnwrapper2019 Eden guide source review | Link/date/scope; glitch obsolete, map creator unknown/current mechanics unverified; không copy walkthrough | P0-D02 | Thấp | DATA K08 cho route QA |
| P1-D09 | **DONE 2026-10-06** — Wiki TS playlist + Eden original video metadata | Wiki revision/link/credit và oEmbed creator verified; footage/timestamps/coverage chưa xem, không tải media | P0-D02 | Thấp | DATA K09 cho route QA |
| P1-D10 | **DONE 2026-10-06** — K10 dated listing/market/coverage acceptance | Reuse verified2026-10-04 iOS US/USD samples; SKU/contents/VND unknown, không gọi current price | P0-H01 | Trung bình | DATA K10 cho SKU import |
| P1-D11 | **DONE 2026-10-06** — K11 dated package/listing coverage acceptance | Reuse2026-10-04 US/VN HTTP200; per-SKU price unknown, app/range/iOS không thay Android IAP | P0-H01 | Trung bình | DATA K11 cho SKU import |
| P1-D12 | **DONE 2026-10-06** — K12 actual Sky records/manual capability | iOS10 items/one2026-03-29 snapshot; Android price absent, SKU/market/contents unknown; terms cấm bulk, API/export chưa verify | P0-H01 | Trung bình | DATA K12 cho import |
| P1-D13 | **PARTIAL 2026-10-06** — [mapping](../../knowledge/SOURCE_FIELD_MAPPING.md) K01–K03/K05–K12 DONE theo source samples | Transformed/raw/unknown/provenance tách; K04 columns BLOCKED, không gọi toàn bộ mapping DONE | P1-D01–P1-D12 theo nguồn | Trung bình | DATA K04/field coverage |

### Wardrobe

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P1-W01 | **DONE 2026-10-03** — Package demo hình học mới và metadata quyền | [Demo riêng](../../src/features/wardrobe/demo/README.md), 12 item / 6 slot, assets self_created_placeholder + fixture; không tái dùng SVG Phase 0 hoặc nhập public catalog thật | P0-W01 | Thấp | — |
| P1-W02 | **DONE 2026-10-04 — existing implementation/evidence verified:** Liệt kê riêng dữ liệu cần TGC: model/layer/rig/dye/calibration | K13 và Legal có danh sách thiếu; toàn bộ full asset giữ pending legal confirmation | P0-D03 | Thấp | — |

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
| P1-H01 | **OPEN — evolved Q23:** xác định chứng cứ season/event qua source registry đa nguồn | Giữ nhánh Wiki/official cũ; P9-D07 verify từng source/field/schedule, không gán ThatSkyAPI là feed hoặc K15 item approval là event verification | P0-D02, P1-D01/P1-D06 cho nhánh cũ; P9-D07 cho Event Service | Trung bình | DATA theo source/module |
| P1-H02 | Ghi quy tắc nhập tin Discord và thông tin nguồn được phép dẫn | Chưa có channel/source thì để inactive; không thu thập tự động | P0-H02 | Trung bình | Q02, DATA K14 |
| P1-H03 | Xác minh protocol QR profile và phạm vi dữ liệu có thể hiển thị | Có mẫu an toàn/đã cho phép, field schema và cách decode; không suy payload thành danh tính thật | Q11 | Cao | Q11 |

### UX và Infra

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P1-U01 | **PARTIAL 2026-10-06** — draft attribution cho text/sheet/route/asset | [Templates](../ATTRIBUTION_TEMPLATES.md), [review plan](ATTRIBUTION_TEMPLATE_REVIEW.md); provenance/link/creator/actual changes và rights riêng; chưa chốt license version/Q12 hay publication | P1-D13 PARTIAL; K04 columns blocked | Thấp | Q12, RIGHTS nếu media |
| P1-I01 | **DONE 2026-10-06** — [source fetch/recovery contract](../SOURCE_FETCH_CONTRACTS.md) cho verified samples và missing fallback | Không dựng quota/TTL; manual/inactive K04/K12, K05 notice; owner maintainer, retain accepted/LKG; chưa automation/runtime | P1-D13 theo source có map; missing sources inactive | Trung bình | DATA cho runtime integration |

## Phase 2 — schema, storage và pipeline an toàn

**Mục tiêu:** tạo contract có thể validate, importer có diff/review và nền state local.

**Phụ thuộc:** Phase 0; kết quả Phase 1 cho adapter nguồn thật. Có thể xây validator/fixture độc lập trong lúc đợi nguồn.

**DoD:** normalized fixture qua validation; import nguồn đã xác minh lặp lại không tạo bản ghi trùng; bản lỗi bị quarantine; public export không chứa draft/fixture/asset chưa đủ quyền; state local có migration/fallback.

### Data pipeline

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P2-D01 | **DONE 2026-10-02** — Core types/validators provenance, money và PartialTime | [src/data/core](../../src/data/core/README.md): nullable unknown giữ nguyên, amount thiếu không thành 0, source enum + supplied registry/reference/duplicate checks, instant bắt buộc offset và calendar validation; errors có path/code, 17 behavioral tests qua node:test (`pnpm test`), lint/typecheck/build PASS; chưa adapter/export gate | P0-D01 | Trung bình | — |
| P2-D02 | **DONE 2026-10-02** — Item/Spirit, FriendshipTree/Node, Season/Event và TS schemas | [src/data/catalog](../../src/data/catalog/README.md): explicit FK context, membership + acyclic graph validation, unknown/free và date precision giữ nguyên, TS Visit/Prediction tách type/collection; 21 behavioral tests mới (38 tổng) qua node:test, lint/typecheck/test/build PASS; chưa adapter, Dye/Wardrobe schema hoặc export gate | P2-D01 | Trung bình | — |
| P2-D03 | **DONE 2026-10-04:** [schema phase](GUIDE_PRICE_SCHEMAS.md), 9 focused/209 total tests + lint/typecheck/build; Viết schema Map/Marker/Route và price mapping | Chặn coordinate ngoài [0,1], map revision lệch, giá âm/mixed market | P2-D01 | Trung bình | — |
| P2-D04 | **DONE 2026-10-03** — Asset/Config/Policy/Anchor/Size/Binding/Rule/Dye/Outfit validators | [src/data/wardrobe](../../src/data/wardrobe/index.ts): FK/revision/duplicates/scale/color/missing-anchor/coactive conflict; full asset default pending, confirmed cần evidence; chưa export gate/persistence/share | P2-D01, P0-W02 | Trung bình | — |
| P2-D05 | **DONE 2026-10-06 — staged adapter:** literal Cosmetics/data + supplied crosswalk/provenance; [plan](WIKI_ITEM_ADAPTER.md) | Nine behavior tests/full244 PASS; E: revision100805 duplicate keys quarantined with null candidates; no accepted-catalog write or K15 switch | P1-D01, P1-D13 per-source K01, P2-D02 | Cao | Live crosswalk/publication DATA/RIGHTS |
| P2-D06 | **DONE 2026-10-06** — versioned manual spirit-tree draft input + unique-path calculator | [Plan](SPIRIT_TREE_INPUT.md),9 focused/235 full tests, lint/typecheck/catalog/build PASS; unknown/free/zero và currencies tách, overflow fail; chưa live parser/UI/export | P1-D02, P2-D02 | Trung bình | DATA K02 cho live crosswalk/import |
| P2-D07 | **PARTIAL 2026-10-06 — K03 staged adapter DONE; K04 BLOCKED403:** [plan](WIKI_VISIT_ADAPTER.md) | Repeated visits separate/date-only/no inferred end; seven behavior tests and actual111650 two-date dry-run PASS. Sheet adapter/reconciliation not implemented without real columns/export | P1-D03, P1-D04 for K04, P2-D02 | Trung bình | DATA K04 access; reviewed canonical crosswalk/publication |
| P2-D08 | **PARTIAL2026-10-06 — manual official-news draft file DONE:** [plan](MANUAL_OFFICIAL_NEWS.md) | Bounded JSON/registered IDs/K06 source/evidence, date-only null instant, atomic quarantine and274 full checks PASS; no publication/UI. Season/map/route and live canonical/editorial integration remain OPEN | P2-D02, P2-D03, P1-D06 for scoped news; P1-H01 for season/event | Trung bình | DATA/source mapping and canonical/editorial gates |
| P2-D09 | Tạo importer price observations K10/K11/K12 | Mỗi quan sát có platform/market/currency/time; thiếu SKU không tự ghép | P1-D10–P1-D12, P2-D03 | Cao | DATA K10/K11/K12 |
| P2-D10 | **OPEN — scope generic:** snapshot/normalize/diff/quarantine pipeline | K15 scoped import giữ nguyên; pipeline đa nguồn P9-D04 cần snapshot/hash/diff/retry/source health/LKG, lỗi không xóa bản public tốt | P2-D05–P2-D09 theo adapter bật; P9-D01/P9-D02 cho central sink | Cao | DATA theo adapter |
| P2-D11 | Tạo public export projection và asset rights gate | Fixture, draft, private evidence, pending full asset không xuất; negative fixture chứng minh gate chặn đúng | P2-D04, P2-D10 | Cao | — |
| P2-D12 | **OPEN — scope generic:** version manifest, alias/tombstone và rollback projection | K15 manifest scoped đã có; central DB revision/export và restore được kiểm chứng thêm ở P9-I01/P9-V01; không hồi sinh nội dung bị thu hồi | P2-D11; P9-I01 cho central migration | Trung bình | — |

### Infra

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P2-I01 | Gắn schema/export check vào build preview | Record invalid làm build fail có thông báo ID/field; không dump nội dung private | P0-I04, P2-D11 | Trung bình | — |
| P2-I02 | Tạo command import/dry-run và tài liệu chạy cho maintainer | Dry-run chỉ tạo báo cáo, không publish; mô tả cadence thủ công và retry theo P1-I01 | P2-D10, P1-I01 | Thấp | — |

### UX / Wardrobe / Hub

| ID | Module | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|---|
| P2-U01 | UX | **DONE 2026-10-04:** [local-state plan](LOCAL_STATE_FOUNDATION.md), 7 focused tests + 200 total, lint/typecheck/build PASS; Tạo storage wrapper có parse/version/migration/memory fallback | Reload round-trip; corrupted/quota-denied vẫn mở app; thông báo không lưu được rõ | P0-I02 | Trung bình | — |
| P2-W01 | Wardrobe | **DONE 2026-10-03** — Reducer thuần và state dẫn xuất | Equip/replace/unequip/reset/size/dye/random được validate; base không đổi do rule, tháo trigger derive về base; ID/revision sai giữ selection; behavioral tests | P2-D04 | Trung bình | — |
| P2-H01 | Hub | **OPEN tổng thể; K15 loader đã có** — data access cho public projection | Giữ loader Item Lookup; evolve qua P9-D02 API abstraction, JSON là snapshot/fallback/export; frontend không gọi provider DB; không fetch raw/draft | P2-D12; P9-D02 cho API evolution | Trung bình | — |

## Phase 3 — Hub nền tảng và UI dùng chung

**Mục tiêu:** Hub đọc được với catalog, TS history, season/event và official news, cùng bố cục compact.

**Phụ thuộc:** Phase 2 cho data access/export và P0-U01. Nguồn thật của từng module cần Phase 1 đạt DoD; fixture chỉ dùng preview demo.

**DoD:** các luồng đọc chính chạy trên preview responsive; mọi thông tin thật có nguồn/độ mới; lịch sử, dự đoán và tin chính thức không trộn; không phụ thuộc full asset TGC.

### UX

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P3-U01 | **DONE 2026-10-02** — CSS tokens và primitive badge/button/input/section | [UI foundation](../../src/app/README.md): typography/spacing/surfaces/focus/status tokens, labeled controls và status chữ; contrast kiểm tra bằng mã, không thêm dependency; lint/typecheck/test (38/38)/build PASS | P0-U01, P0-U03 | Trung bình | — |
| P3-U02 | **DONE 2026-10-02** — Header/navigation và responsive Hub shell | Desktop cột chính/phụ + news toàn hàng, mobile một cột theo DOM; Season/TS/news/lookup/Wardrobe và secondary compact, menu/focus/footer anchors; chưa dữ liệu/search/editor; MANUAL VISUAL CHECK REQUIRED, không browser automation | P3-U01 | Trung bình | — |
| P3-U03 | **DONE 2026-10-02** — Shared loading/empty/error/unavailable/stale/offline UI | ContentState có nhãn/message và action callback tùy chọn khi thao tác thật đã có; Hub dùng unavailable kèm lý do, không retry/refresh hoặc cache giả; lint/typecheck/test/build PASS | P3-U01 | Thấp | — |
| P3-U04 | **PARTIAL 2026-10-06 — lookup filters DONE:** [plan](LOOKUP_PREFERENCES.md) | Bare list restores validated device choices; explicit URLs win; scoped clear/retry/future/quota tests,269 full checks and local smoke PASS. Market/spoiler consumers remain gated by their modules/data | P2-U01, P0-H01 | Trung bình | Market/spoiler modules/data |

### Hub

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P3-H01 | **DONE 2026-10-03** — Catalog list/filter tên/slot/season/spirit, category/acquisition, pagination và empty trên `/items` | Filter phối hợp cho kết quả đúng, empty rõ, liên kết item ổn định; nguồn K15 được user duyệt thay cho K01/K02 trong slice này | Item Lookup loader K15, P3-U02 | Trung bình | K15 verified; không đóng DATA K01/K02 |
| P3-H02 | **DONE 2026-10-03** — `/items/:id` có acquisition breakdown và nguồn ghim | Tách loại tiền, unknown/free/0, seasonal/current/pass/bundle; season/spirit và glyph tự tạo có nhãn; không khẳng định giá live | P3-H01 | Trung bình | — |
| P3-H03 | Xây spirit/tree view và tổng đường unlock | Node keyboard reachable; tổng incomplete nếu thiếu cost; không cộng trùng node | P2-D06, P3-H02 | Cao | DATA K02 |
| P3-H04 | Xây TS history table/timeline và filter | Nhiều lần ghé cùng spirit được giữ; disputed được gắn nhãn | P2-D07, P3-U02 | Trung bình | DATA K03/K04 |
| P3-H05 | Tạo prediction view với methodology và empty state | Không có method/input đáng tin thì không có dự đoán giả; chưa xác nhận không hiện như lịch chắc chắn | P0-H03, P3-H04 | Trung bình | Q09 |
| P3-H06 | **OPEN — evolved Q23:** season/event card/detail liên kết item/spirit | Qua live schedule P9-H01 và UI P9-U01; official/community/calculated có nhãn, missing/stale/unavailable rõ | P1-H01, P3-U02, P9-H01; P2-D08 cho nội dung biên tập | Trung bình | DATA source schedule đã verify |
| P3-H07 | Xây official news feed/detail | Có link nguồn, ngày/version khi biết, tóm tắt riêng; không trộn leak | P1-D06, P2-D08 | Trung bình | DATA K06 |
| P3-H08 | Ghép widget trang chủ theo thứ tự UX | Season, TS, official feed, quick links và lookup có đường đến detail; không card trống lớn | P3-H01, P3-H04, P3-H06, P3-H07 | Trung bình | — |

### Data pipeline / Infra / Wardrobe

| ID | Module | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|---|
| P3-D01 | Data pipeline | **OPEN — evolved Q23:** TimeReference từ server/generated time của live API; K05 optional adapter | EventRule đã verify được resolve theo IANA timezone, không dựng lịch từ offset; K05 cần P1-D05 nếu dùng; lỗi giữ LKG/last-sync/stale | P2-D01, P9-H01; P1-D05 nếu bật K05 | Cao | DATA theo time source được chọn |
| P3-D02 | Data pipeline | **OPEN:** countdown local bằng mốc EventOccurrence và elapsed time | Qua sleep/wake/background/DST; không poll backend mỗi giây; hết validity báo stale; prediction không như official | P3-D01, P3-H06, P9-V03 | Cao | DATA schedule đã verify |
| P3-I01 | Infra | **DONE conditional decision2026-10-06 — no proxy needed from current evidence:** [audit](PREVIEW_AUDIT.md) | K05 anonymous simple GET HTTP200/CORS* sample; no proxy added, unknown TTL/quota retained. Actual schedule/time consumer browser integration still OPEN | P1-D05, P0-I04 | Trung bình | Q04 |
| P3-W01 | Wardrobe | **DONE 2026-10-04** — Hub demo widget mở editor; P4-W09 khôi phục outfit local gần nhất | Không cần full asset; trước khi editor sẵn sàng có trạng thái demo rõ | P2-U01, P3-U02 | Thấp | — |

## Phase 4 — Wardrobe 2D placeholder đủ hành vi

**Mục tiêu:** hoàn thành W01–W05 trên hình học/layer demo để kiểm tra engine/UI độc lập quyền full asset.

**Phụ thuộc:** P2-D04/P2-W01/P2-U01 và primitive P3-U01; không cần chờ toàn bộ Phase 3 hoặc TGC.

**DoD:** mặc/tháo từng slot, size, override, dye, lưu/reload/share đều kiểm chứng; missing asset/rule/ID không crash; mọi demo gắn placeholder. Full wardrobe vẫn **pending legal confirmation**.

### Wardrobe

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P4-W01 | **DONE 2026-10-03** — Model/anchor/scale demo versioned | normalized_top_left, model/calibration revisions, 4 fixture-demo presets; scale đúng một lần, không claim số liệu game | P0-W02, P1-W01, P2-D04 | Trung bình | — |
| P4-W02 | **DONE 2026-10-03** — SVG renderer với bindings cấu hình | Sáu slot, cape rear/front; sort zIndex rồi binding ID code-unit; pure model/transform tests, thiếu anchor/revision có warning | P4-W01 | Cao | — |
| P4-W03 | **DONE 2026-10-03** — Picker/equip/replace/unequip/reset + random demo | Capacity/fixture reject-combination được validate, giữ dye item khác; buttons có label/current state; random seeded qua reducer | P2-W01, P4-W02 | Trung bình | — |
| P4-W04 | **DONE 2026-10-06 — demo scale contract:** native selector/effective size/anchors | Actual four-preset repeat-change tests and existing exact-once transform tests PASS; missing size has specific warning; viewport uses unchanged normalized SVG; visual check remains P4-U01 | P4-W02 | Cao | Real calibration DATA/TGC |
| P4-W05 | **DONE 2026-10-06 — visible fixture rule:** priority/reason + bounded old-demo continuity | Tile-mask small preset; changing base never overwrites it; remove/replace/reset restores base; exact r1 library/share revalidated into r2. [Plan](WARDROBE_SIZE_RULES.md) | P4-W03, P4-W04 | Cao | Real game rule DATA |
| P4-W06 | **DONE 2026-10-06 — validation/recovery contract:** specific conflict/calibration warnings | Same-priority conflict rejected, accepted outfit preserved; deterministic IDs/reasons exposed; missing size/anchor/asset/revision skips explicitly | P4-W05 | Trung bình | Visual QA remains P4-U01 |
| P4-W07 | **DONE 2026-10-03** — Fabric/panel dye palette và reset | Chỉ path/region + mask khai báo đổi màu; thiếu mask giữ fill gốc, item unsupported có nhãn; reset region/item, behavioral tests | P4-W02, P4-W03 | Cao | — |
| P4-W08 | Nối AssetRegistry với fallback theo từng layer | Thiếu file/quyền thì hình học placeholder có nhãn; không fetch URL tùy ý từ outfit link | P2-D11, P4-W02 | Trung bình | — |
| P4-W09 | **DONE 2026-10-04** — Lưu/đổi tên/xóa demo outfit local và restore khi reload | Selection/dye/base size round-trip; quota lỗi vẫn giữ phiên hiện tại; xóa không ảnh hưởng outfit khác | P2-U01, P4-W07 | Trung bình | — |
| P4-W10 | **DONE 2026-10-04** — Codec gzip/base64url versioned và copy/open link demo | Mở ở phiên trống khôi phục đúng; payload quá lớn/sai version/ID bị xử lý an toàn | P4-W09 | Cao | — |
| P4-W11 | Thêm migration item alias/tombstone khi mở outfit cũ | Báo item thiếu, không thay bằng món khác âm thầm; phần hợp lệ vẫn mở | P2-D12, P4-W10 | Trung bình | — |
| P4-W12 | **PARTIAL 2026-10-06 — demo workflow subset DONE:** [sequence QA](WARDROBE_SEQUENCE_QA.md) | Four-size action/render/gzip/save/fresh-store reload and unsaved-edit/continued-edit regressions PASS; generic alias/assets/offline dependencies remain OPEN, no full W12 completion | P4-W05–P4-W11 | Cao | Generic P4-W11/P2-D12 |

### UX / Data pipeline / Hub / Infra

| ID | Module | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|---|
| P4-U01 | UX | **PARTIAL 2026-10-06 — local desktop/mobile demo QA:** [evidence](PWA_WARDROBE_QA.md) | Layout, native size keyboard, override/remove, dye/share/save/reload, backup import/cancel/reset, theme/locale/long text scoped PASS. Save/delete-cancel focus loss fixed and actual keyboard rename/delete/reset verified. Download/target devices/reduced motion/full accessibility OPEN | P4-W03, P4-W07, P3-U01 | Trung bình | — |
| P4-D01 | Data pipeline | Kiểm tra liên kết item → asset/binding/dye/rule | Fixture và pending full asset không lọt production; demo package được nhận diện riêng | P4-W08, P2-D11 | Trung bình | — |
| P4-H01 | Hub | **DONE 2026-10-05** — Catalog → demo explanation và giữ draft khi chuyển trang | Item chưa render được mở placeholder có giải thích; nav không reset outfit đang sửa | P3-H02, P3-W01, P4-W09 | Thấp | — |
| P4-I01 | Infra | **BLOCKED2026-10-06 protected content:** current Git Preview588bb31 READY; [audit](PREVIEW_AUDIT.md) | Connector metadata allowed but protected fetch403; remote deep-link/share/render not verified. Local demo QA separate; do not disable protection | P0-I04, P4-W10, P4-U01 | Trung bình | Vercel project/team content access |

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

**Phụ thuộc:** shell/UI Phase 3, version/export Phase 2; notification cần P0-U02 và schedule/time contract đã verify qua Event Service. K05 chỉ cần nếu adapter đó được chọn, không là dependency bắt buộc của mọi event.

**DoD:** manifest/service worker được kiểm tra trên môi trường mục tiêu; update không làm mất state; cache không chứa draft/QR; giới hạn thông báo app đóng được nói rõ. Web Push nền không thuộc DoD mặc định.

### Infra

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P6-I01 | **PARTIAL 2026-10-06 — existing manifest/icons audited:** [evidence](PWA_WARDROBE_QA.md) | Manifest/start/scope/name + PNG dimensions verified; icon provenance and actual target install NOT VERIFIED, preserve branding until evidence | P3-U02 | Trung bình | Icon rights/install evidence |
| P6-I02 | Tạo service worker cache shell và catalog public versioned | Offline mở shell + bản catalog đã có; request draft/QR không có trong cache | P2-D12, P6-I01 | Cao | — |
| P6-I03 | Viết lifecycle update/cache cleanup có version tương thích | Không trộn code mới với data cũ không tương thích; cache hỏng có fallback rõ | P6-I02 | Cao | — |
| P6-I04 | Kiểm tra quota/storage eviction và restore online | Cache bị xóa không crash; online tải lại; không hứa local data sống vĩnh viễn | P6-I03, P2-U01 | Trung bình | — |

### UX

| ID | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|
| P6-U01 | Tạo banner offline/last-sync và update prompt | Không ép reload làm mất outfit đang chỉnh; user chọn apply update | P6-I03, P4-W09 | Trung bình | — |
| P6-U02 | Tạo notification settings/capability/permission flow | Prompt chỉ sau click, denied/unsupported có hướng dẫn; opt-in lưu local | P0-U02, P2-U01 | Trung bình | — |
| P6-U03 | **DONE 2026-10-06 — scoped outfit library:** backup JSON/preview-confirm import/confirmed reset; [plan](OUTFIT_BACKUP.md) | Six behavior tests/full264 PASS; projected/bounded/versioned data, no QR/secrets; explicit replacement/reset preserves current draft and other keys. Browser/file-picker QA remains P4-U01/P7-U01 | P2-U01, P4-W09 | Trung bình | Other data kinds require separate explicit scope |

### Hub / Data pipeline / Wardrobe

| ID | Module | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|---|
| P6-H01 | Hub | Tạo reminder in-app từ mốc verified và lựa chọn local | Không tự tạo lịch, không nhắc trùng trong phiên/khung sự kiện đã đánh dấu | P3-D02, P6-U02 | Trung bình | DATA schedule/time source |
| P6-H02 | Hub | Thêm notification khi app đang hoạt động nếu browser hỗ trợ | Denied/unsupported quay về in-app; thông báo không claim delivery khi app đóng | P6-H01 | Trung bình | — |
| P6-D01 | Data pipeline | Thêm policy fresh/stale cho time/content/cache theo contract | Item/spirit TTL dài, live schedule TTL ngắn qua P9-D02/P9-H01; offline không gắn live; expired time dừng khẳng định chính xác | P1-I01, P3-D01, P6-I02, P9-D02 | Trung bình | DATA theo module |
| P6-W01 | Wardrobe | Kiểm tra editor/offline/share với catalog đang cache | Item mới chưa cache báo thiếu, outfit đang sửa không mất khi service worker cập nhật | P4-W11, P6-I03 | Trung bình | — |

### Research tách biệt, không tự đưa vào release

| ID | Module | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|---|
| P6-R01 | Infra | **DONE 2026-10-06 — research only:** [Web Push assessment](WEB_PUSH_NATIVE_RESEARCH.md) | Primary MDN/WebKit evidence, private subscription/sender/retention/consent/cost boundaries; no service or $0 quota claim; Q07 foreground V1 unchanged | P0-U02 | Trung bình | Scope/provider/quota approval before implementation |
| P6-R02 | UX | **DONE 2026-10-06 — future native criteria** in same research | Measured web capability gaps/install/offline/audio/accessibility, scope/budget/maintenance and shared ID/API conditions; no native project/stack selected | P6-R01 | Thấp | Separate approved project scope |

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
| P7-U01 | UX | **PARTIAL2026-10-06 — local demo checks + disclosure contrast fix:** [evidence](PWA_WARDROBE_QA.md) | Theme/locale/state,320px/80-char name, native size keyboard PASS; primary text token fixes measured small disclosure contrast. Full contrast/focus/reduced-motion runtime/target devices remain OPEN | P3-U01, P4-U01 | Cao | Target-device/accessibility acceptance |
| P7-U02 | UX | Kiểm tra QR/camera/notifications theo capability thực tế | Không upload ngoài ý muốn; denied/unsupported rõ; không hứa background delivery | P5-U03 nếu bật, P6-U02 | Trung bình | Q11 nếu bật QR |
| P7-D01 | Data pipeline | Audit source/attribution/revision/rights của release manifest | Mọi record thật truy nguồn; risk không tự nới; icon/map pending được thay hình học | P2-D11, P1-U01 | Trung bình | Q12, RIGHTS nếu dùng |
| P7-I02 | Infra | Đo bundle/load/render trên tập thiết bị đã chốt và sửa bottleneck | Ghi số đo thật và tiêu chí budget đã chốt; không tải toàn ảnh/map ngay trên Hub | P7-I01 | Trung bình | — |
| P7-I03 | Infra | Chuẩn bị production deployment Vercel và runbook rollback | Preview tương ứng commit/data manifest, deep links/cache/assets đạt smoke; không phát sinh dịch vụ trả phí ngoài phạm vi | P7-I01–P7-I02, P7-W01, P7-H01, P7-U01, P7-D01 | Trung bình | — |
| P7-I04 | Infra | Thực hiện release khi đến bước triển khai và xác minh URL production | Các route chính phục vụ đúng version; rollback bundle đã thử ở môi trường phù hợp; ghi URL/version thực | P7-I03 và các gate module bật | Trung bình | — |
| P7-D02 | Data pipeline | Bàn giao lịch cập nhật thủ công, xử lý nguồn lỗi và quyền bị thu hồi | Có người phụ trách, dry-run, diff/review, rollback và danh sách task còn blocked | P2-I02, P7-I04, P0-D03 | Thấp | — |

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

## Phase 9 — data, event và media refresh (APPROVED/DESIGNED 2026-10-04)

Đây là track bổ sung sau current Item Lookup/source research, **không** đòi toàn bộ Phase 8/full Wardrobe xong trước. R0–R6 là checkpoint execution; task IDs dùng namespace P9 chưa dùng, không renumber/reuse P0–P8. Q20–Q23 chốt direction, mọi implementation bên dưới vẫn **OPEN** trừ R0 docs. Không chọn provider hoặc provision service trong R0.

| Checkpoint | Scope / dependency để bắt đầu | Definition of Done / trạng thái |
|---|---|---|
| R0 — Roadmap reconciliation | main c0c0ee0 / PR #10; docs-only | P9-R01: docs nhất quán, kiểm tra IDs/links/status, commit và dừng |
| R1 — Data/storage contracts | R0; giữ ID/projection/rights contracts cũ | P9-D01–P9-D03, P9-I01 contracts/schema/API/migration được review trước provisioning; P9-D04/P9-I02/P9-V01 triển khai foundation có scope/quota approved trước production consumers |
| R2 — Item media reconciliation pilot | R1 foundation đã validate; P9-D05 role/crosswalk | P9-D06/P9-V02: Warrior of Love Hair + một season, coverage/manual-review report và gate quyền; chưa mass crawl |
| R3 — Event sources + Event Engine | R1 foundation; R2 checkpoint đã review | P9-D07–P9-D09, P9-H01/P9-U01/P9-V03/P9-V04; source verified theo field, resolver/override/live API/UI đạt nghiệm thu |
| R4 — Animated preview pipeline | R1 asset registry/object-storage contract, R3 checkpoint | P9-D10/P9-H02/P9-H03/P9-V05; Emote/Call/Honk bằng media đủ quyền hoặc fixture ghi nhãn, binary/object storage đúng gate |
| R5 — Music Playground V1 | R1 foundation, R4 reusable pipeline checkpoint; sample rights | P9-M01–P9-M03/P9-V06: playable instruments, item ID/deep-link, chỉ tải active instrument; không account/Sheets/Compose vào V1 |
| R6 — Expansion | R5 V1 DoD; gate từng nhánh | P9-M04/P9-M05/P9-U02/P9-R02/P9-V07; Sheets V1.1, Compose local V1.2; V2 community/cloud/login là scope riêng |

Chi tiết phase sau được refine khi bắt đầu dựa trên state thật; bảng này là roadmap/dependency, không phê duyệt bulk acquisition hoặc provisioning. Nếu một season chưa đủ rights, R2 ghi BLOCKED/RIGHTS-gated cho publication; fixture validation không được giả thành pilot production DONE. Maintainer review checkpoint trước mở rộng scope.

### R0 — tài liệu hiện tại

| ID | Module | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|---|
| P9-R01 | Docs | **DONE 2026-10-04 — docs-only:** reconcile roadmap + direct contracts/handoff | [Phase plan](ROADMAP_RECONCILIATION.md), Q01 historical/Q15 evolved, Q20–Q23, R1–R6, coverage matrix; table/ID/reference/link/status checks và docs-only diff pass; không feature/provision/crawl | PR #10 merged main c0c0ee0 | Trung bình | — |

### R1 — central data/storage foundation

**Canonical ownership:** maintainer quản lý canonical domain metadata/relationships và approvals trong relational DB PostgreSQL-compatible, sau normalization/review; upstream là nguồn evidence, không được ghi thẳng vào canonical. Frontend chỉ đọc public projection qua data/API abstraction. User outfit/preferences/Compose V1.2 vẫn local; central domain DB không mở account/cloud save V1.

DB cover **Item, Spirit, Season, Event, EventRule, EventOverride, Location, Cosmetic metadata, Music metadata, Emote metadata, Honk/Call metadata và Media/provenance records**. Stable IDs hiện có được reuse, source-scoped IDs qua crosswalk; không dùng provider-specific schema. JSON versioned giữ vai trò public projection/export/static snapshot/rollback/fixture, không canonical long-term source of truth.

Binary **images, posters, video, honk/call audio-video, emote video, music samples** nằm object storage; preferred direction **Cloudflare R2 / S3-compatible**. DB giữ stable ID, storage key, URL khi cần, role/source/provenance/rights status/revision/timestamps/relation IDs. URL signed/temporary không là identity. Vercel giữ frontend SPA/PWA delivery, functions/API facade khi cần, CDN/cache-facing layer; repository JSON/deployment storage không là database. Existing R2 runtime routing tiếp tục dùng, central DB chưa provisioned.

| ID | Module | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|---|
| P9-D01 | Data | **LOCAL CONTRACT APPROVED; SQL PARTIAL 2026-10-07** — identity/retirement/K15 payload/release metadata | [R1 findings](R1_CONTRACT_REMEDIATION.md); scoped keys, every K15 payload/manifest/envelope field and canonical bytes round-trip PASS; deferred modules retained. Immutable projection/live adapter/restore OPEN | P9-R01, P2-D01, P2-D02, P2-D04 | Cao | Review approved; full live foundation OPEN |
| P9-D02 | API | **LOCAL CONTRACT APPROVED 2026-10-06** — unmounted snapshot/API contracts | Item/spirit pagination/filter/unknown/error/version/K15 parity PASS; event503 retained. Provider-neutral materialized/versioned read model expectation, no speculative SQL pagination; no live DB/API/TTL claim | P9-D01; P9-I02 trước live DB adapter | Cao | Review approved; DATA theo module |
| P9-D03 | Storage | **LOCAL CONTRACT APPROVED 2026-10-06** — binary/media binding contracts | Explicit role-owner/MIME/evidence/primary-reference cardinality; stable IDs/hash/keys, legacy R2 paths and revocation PASS; signed expiry/purge/provider acceptance remains gated | P9-D01, P2-D04 | Trung bình | Review approved; RIGHTS theo asset |
| P9-I01 | Infra | **LOCAL CONTRACT APPROVED; REHEARSAL PARTIAL** — migration/scaling/quota/rollback runbook | Dev provider cost/quota preflight + SQL up/rollback-only fixtures PASS; full down/backup restore/scaling thresholds after actual measurement still OPEN | P9-D01, P9-D03 | Trung bình | Review approved; full restore/measurements OPEN |
| P9-I02 | Infra | **PARTIAL 2026-10-07 — Supabase Free dev; typed K15/projection, SQL metadata CAS/audit, immutable graph and portable full SyncStore/typed canonical and public/archive SQL PASS:** [provider phase](POSTGRES_PROVIDER_SELECTION.md); connected runtime/real concurrency/restore OPEN | Dyland's Org/$0 dev;79 private tables. Full K15 content-review parity; exact historical manifest order and independently ordered payload/public evidence subset.Portable Store five-phase/866 query-result checks/two whole publication rollbacks;13 payload evidence/141 graph/11 read metadata native negatives plus prior evidence. Global CAS/LKG/source isolation/reconfirmation native sequence PASS;350 tests/lint/typecheck/build. One revision0 control baseline, no real import/production/paid resource | P9-D01, P9-D03, P9-I01, review contracts | Cao | Connected driver/runtime-role/review auth, fact payload history, actual race/restore; Q15 selected dev |
| P9-D04 | Sync | Generic source sync → reviewed canonical + projection | Snapshot/hash/diff/normalization/quarantine, idempotent stable IDs, retry/backoff/source health, transactional promotion và Last Known Good (LKG); upstream fail không empty-overwrite. Reuse requirements P2-D10/P1-I01, không đợi mọi legacy adapter; foundation nghiệm thu synthetic trước, integration từng adapter sau verify. Scheduler/worker/cron chỉ sau task/quota approval; manual dry-run fallback | P9-D02, P9-D03, P9-I02 | Cao | DATA từng real adapter; task/quota nếu scheduler |
| P9-V01 | Validation | Foundation/API/storage/migration contract checks và restore rehearsal | Synthetic FK/alias/tombstone/duplicate/revision/private export tests; API provider-swap parity và cache invalidation; schema up/down/backup restore rehearsal, revoked asset không hồi sinh từ rollback; không gọi live DB DONE chỉ bằng fixture | P9-D04, P9-I01, P9-I02 | Cao | Review; môi trường/quota approved |

**R1 status:** LOCAL CONTRACT APPROVED by user2026-10-06; re-review gate CLOSED, [findings/evidence](R1_CONTRACT_REMEDIATION.md). Supabase Free/Dyland's Org isolated dev created after $0 preflight. [P9-I02](POSTGRES_PROVIDER_SELECTION.md) typed K15/release/projection/metadata CAS/immutable graph and SyncState read composition parity PASS; portable full atomic SyncStore/SQL parity and bounded private read transport PASS; runtime-role/review-auth/uncertain-commit contract prepared. Connected runtime/actual race and backup/restore OPEN.357 full tests/lint/typecheck/build PASS; no R2–R6 completion. Independent W12 sequence/focus QA retained, full W12 PARTIAL. Next: explicit runtime privilege manifest/lifecycle tests and scoped live integration, then actual races/restore. Do not request R1/provider/org approval again.

### R2 — dataset/item media reconciliation pilot

Contract **`itemImage`** tối đa một canonical image (`null` nếu chưa đủ evidence); **`referenceImages[]`** 0..N; sau dedupe itemImage không xuất hiện lại trong referenceImages. Role mapping ưu tiên **Sky Wiki structured role metadata** có field/label icon/item image, front/back, real, interior/exterior, reference/gallery. Không suy role từ kích thước, aspect ratio, DOM order hoặc ảnh đầu tiên. Kích thước chỉ validate chất lượng, không xác định role.

Fallback: **official Sky/TGC → official social posts → community/player screenshots có provenance rõ**. Source priority không bỏ rights gate: unclear rights fail closed, giữ discovery riêng khỏi publish eligibility. Existing corpus/current media là input audit; không batch swap mù. Flow: collect current media → collect verified source media → map source role → dedupe → reconcile → validate → manual review ambiguous → mirror **asset hợp lệ** sang object storage. Local working data giữ E: và capacity guards theo [asset docs](../ITEM_ASSETS.md).

Media metadata tối thiểu: `storageKey/url`, `role`, `sourceUrl`, `sourceType`, `sourceRole`, `rightsStatus`, `fetchedAt`, stable `itemId`, optional `seasonId`/`spiritId`; thêm hash/revision/attribution/evidence khi có. Reconciliation giữ source crosswalk, không nối TSA numeric ID với Planner numeric ID. Phân biệt verified metadata và rights; không rewrite giá/offer khi chỉ sửa ảnh.

| ID | Module | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|---|
| P9-D05 | Media | Role contract/crosswalk/dedupe và bounded source evidence mapping | Audit current primary/gallery vs itemImage/referenceImages; source field/label evidence ghim revision, ambiguous quarantine/manual review; exact hash và reviewed visual duplicates không mất provenance; không auto role theo geometry/order | P9-D03, P9-V01, PR #10 dossier | Cao | DATA role evidence; RIGHTS |
| P9-D06 | Media | Pilot một season + reconcile/mirror đủ rights | Maintainer chọn season từ coverage/evidence; Warrior of Love Hair bắt buộc regression case main/reference bị đảo (cross-season fixture riêng nếu pilot khác season); report coverage + manual-review rate + unmapped/conflict/rights-blocked, diff/review/rollback trước full catalogue; no mass crawl | P9-D05 | Cao | Pilot scope + DATA/RIGHTS; TGC nếu cần |
| P9-V02 | Validation | Item dataset/media pilot acceptance | Warrior of Love Hair source role đúng, itemImage không lặp references sau dedupe, tối đa 1 primary; stable ID/FK/offer không drift, unresolved neutral fallback; rights-fail-closed và rollback/invalidation; ghi số đo pilot để quyết định full run | P9-D06 | Trung bình | DATA/RIGHTS cho public media |

### R3 — Event Service / Event Engine

Source priority: **official TGC → manually verified official override → verified structured community → cross-checked community → prediction/calculated**. Manual official override cần link/evidence official, reviewer/revision/effective range; không làm community thành official. Prediction/calculated luôn nhãn riêng, không hiển thị như official kể cả priority winner. Priority giải quyết nguồn trên field/occurrence, không tự cấp verification; ambiguous/conflict đưa review, không silently mutate history.

Candidates: **TGC announcements/patch notes, SkyGame-Data/Sky Planner structured data, ThatSkyApplication, SkyCOTL.tools, Sky Wiki enrichment, shard prediction source/logic**. K06/K15/K01 và [dossier](../../knowledge/16-image-price-sources.md) chỉ chứng minh scope đã ghi; K15 Item Lookup approval không là event adapter verification. SkyGame-Data dossier đã có bounded samples nhưng chưa event source contract/adapter approval; SkyCOTL.tools và shard source chưa có K-ID/evidence entry được xác nhận trong KB. P9-D07 phải verify/document và cấp source registry/K-ID không collision trước integration; không bịa K-ID, endpoint hoặc verified status.

Domain tối thiểu **Event, EventRule, EventOverride, EventOccurrence, SourceSnapshot, SourceHealth**. Types: **fixed date, recurring, calculated, temporary/live override**. Canonical schedule timezone **`America/Los_Angeles`**, dùng IANA resolve DST; không lưu UTC-7/UTC-8 hay giờ Việt Nam làm source of truth. Recurrence: **anchor, offset, interval, effectiveFrom, effectiveUntil**; không hard-code recurring activities vào UI. EventOverride có effective range + priority, giữ base/permanent rule nguyên khi publisher đổi tạm. Materialized occurrences giữ UTC instants + rule/source revision + canonical timezone; UI localize user timezone, ngày chưa rõ giờ giữ precision/unknown.

`GET /api/events/live` có **server/generated time, schedule version, active events, upcoming events, startsAt, endsAt, source type/confidence**, source freshness/validity/LKG khi cần; frontend tự countdown, không poll mỗi giây. Upstream fail giữ **Last Known Good schedule**, SourceHealth **healthy/delayed/stale/offline**; UI vẫn dùng nội dung có nhãn độ mới, không chết theo upstream. Không có LKG/verified dates thì unavailable; TTL live ngắn hơn item/spirit nhưng refresh theo contract/quota, wake/resume revalidate có giới hạn.

| ID | Module | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|---|
| P9-D07 | Event sources | Verify/document candidate sources, source registry và contracts | Per-source URLs/revisions/sample fields/time semantics/terms/quota/rights/cadence/coverage; nguồn mới KB entry/K-ID không collision; cross-check official/community/shard logic, known gaps giữ DATA-gated; không crawl một site duy nhất; cung cấp evidence cho P1-H01 evolved | P9-V01, P9-V02 checkpoint | Cao | DATA từng source; Q12/RIGHTS nếu media |
| P9-D08 | Event domain | Schema + adapters cho Event/Rule/Override/Occurrence/Snapshot/Health | Stable IDs/FKs/snapshot hash/field provenance/source confidence, ingestion/review/LKG theo P9-D04; nguồn thiếu contract giữ inactive; registry priority và manual verified official override có evidence | P9-D07, P9-D01, P9-D04 | Cao | DATA source đã verify |
| P9-D09 | Event engine | Resolver fixed/recurring/calculated/temporary rules + effective overrides | IANA LA DST, anchor/offset/interval/effective bounds; UTC occurrence generation deterministic theo version; overlapping priority/conflict có review; override expiry về base, không mutate permanent rule; calculated luôn nhãn | P9-D08 | Cao | Rule/logic evidence; DATA |
| P9-H01 | Event API | GET /api/events/live qua provider abstraction/cache | Response contract trên, active/upcoming boundary, generated/server time/version/validity, source type/confidence/health; LKG khi upstream fail; short TTL/retry/rate theo verified quota, không client direct source/provider | P9-D09, P9-D02 | Cao | DATA; quota trước live schedule |
| P9-U01 | Event UI | Live radar/card/detail + local countdown/localized timezone | Kết nối P3-H06/P3-D02; official/community/prediction labels; loading/empty/error/stale/offline/no LKG; sleep/wake và DST, keyboard/focus/mobile; không per-second API poll hoặc recurring logic trong UI | P9-H01, P3-U01, P9-V03 | Trung bình | DATA live; chưa implemented |
| P9-V03 | Validation | Event engine/API/source-failure verification | DST spring/fall LA, date-only/no fabricated instant, intervals/effective ranges/temporary override expiry, priority conflict, calculated label, stale/offline/LKG and quota bounded refresh; checksum/version mismatch fail closed | P9-H01 | Cao | Verified source/rule fixtures |
| P9-V04 | Validation | Event live UI/radar/countdown acceptance | Server skew/sleep/wake/user timezone, empty/no LKG, long title/mobile/a11y; request-count check không poll mỗi giây, upstream loss không crash; evidence theo candidate field, không promote prediction | P9-U01, P9-V03 | Trung bình | DATA public schedule |

### R4 — Emote / Call / Honk animated preview

Một pipeline reusable cho Emote và Call/Honk; sau này stance, spell animation và interaction preview có thể reuse. Target V1 **3–5 giây, ~480p, 24/30 fps, ~0.3–0.6 MB/clip**, planning average **0.5 MB/clip**: 500 clips ~250 MB video; poster/metadata/headroom **~350 MB**. Đây là budget planning, chưa có clips/coverage được nghiệm thu.

Poster trước → video lazy-load → chỉ play khi hover/tap/open preview; không autoplay/preload toàn gallery. Emote có thể muted; Call/Honk giữ audio nếu audio nhận diện, audio playback sau thao tác rõ và capability check. DB chỉ metadata/storage keys, binary object storage. Không cắt/re-host video bên khác khi rights chưa rõ; ưu tiên permission/license hoặc gameplay tự ghi phù hợp [legal policy](../LEGAL_STATUS.md), vẫn review scope/credit. Reduced-motion, keyboard/open preview và unavailable poster/media phải có fallback.

| ID | Module | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|---|
| P9-D10 | Preview pipeline | Poster/video/audio profile, transform/manifest/storage và rights review | Reuse P9-D03, encode/sample đo target budget thật, poster/video/audio relation + checksum/revision/provenance; bounded rights-approved pilot; reusable stance/spell/interaction không implement thêm scope | P9-V01, P9-V04 checkpoint | Cao | RIGHTS/TGC theo clip; acquisition task approval |
| P9-H02 | Emote | Emote metadata + animated preview integration | Stable item/emote relations, poster-first/lazy/hover/tap/open, muted option; không load gallery toàn bộ; thiếu data/media dùng nhãn/fallback | P9-D10 | Trung bình | DATA Emote; RIGHTS/TGC media |
| P9-H03 | Call/Honk | Call/Honk metadata + preview cùng pipeline | Audio identity giữ nguyên, audio không bật tự động khi mở gallery; gesture/tap/open và user controls, keyboard/focus; metadata/storage keys không binary DB | P9-D10 | Trung bình | DATA Call/Honk; RIGHTS/TGC media |
| P9-V05 | Validation | Animated preview rights/behavior/budget acceptance | Đo 500-clip planning estimate vs pilot bytes/posters; request counts/lazy/no gallery preload, Emote mute/Call audio/reduced motion/unavailable; rights revoked gỡ/cache invalidate, fixture không thành real assets | P9-H02, P9-H03 | Trung bình | RIGHTS/TGC public clips |

### R5 — Music Playground V1

Plan từ Notion được maintainer cung cấp/duyệt lại ngày 2026-10-04 qua task này; ghi contract trong Git, không tuyên bố đã sync/read Notion hoặc có implementation. **`/music`**, deep link **`/music?instrument=<itemId>`** reuse stable Item Lookup ID; instrument detail CTA **“Thử nhạc cụ” / “Mở trong Music Playground”**. Không tạo music catalogue độc lập drift khỏi Item Lookup.

V1 **playable instruments**: **15-note grid 3 × 5**, mouse/touch/keyboard, **Web Audio API + AudioBuffer**, no autoplay. `InstrumentDefinition: itemId → sampleSetId`; nhiều item variant reuse cùng sampleSetId, không duplicate audio vô ích. Samples ở R2/object storage, target **30–80 KB/sample**. Worst-case reference **100 sample sets × 15 notes × 80 KB ≈ 120 MB**; chỉ preload/decode active instrument, không load toàn library khi mở route. Browser audio unlock cần user gesture, loading/error/unsupported/dispose/active-instrument switch có state rõ.

| ID | Module | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|---|
| P9-M01 | Music data | InstrumentDefinition/sample set metadata và asset contract | Item FK/crosswalk stable, itemId→sampleSetId, 15 notes mapping, variants reuse, sample revision/provenance/rights/storage key, budget/format đo pilot; không clone Item Lookup | P9-D03, P9-V01, P9-V05 checkpoint | Trung bình | DATA instrument mapping; RIGHTS samples |
| P9-M02 | Music engine | Web Audio/AudioBuffer engine + active instrument lifecycle | User gesture unlock/no autoplay, active samples only preload/decode, bounded concurrent voices/touch/key release, switch/dispose không stuck notes; error/unsupported/retry giữ selection | P9-M01 | Cao | RIGHTS cho sample thật; fixture ghi nhãn |
| P9-M03 | Music UI | `/music`, 3×5 grid, picker, item CTA/deep-link | Mouse/touch/keyboard/focus/mobile, itemId URL parse/unknown/missing instrument fallback, no library-wide load; CTA instrument đúng stable ID và context navigation | P9-M02, P3-H02, P3-U01 | Trung bình | DATA/RIGHTS active instrument |
| P9-V06 | Validation | Playable Music V1 acceptance | Note mapping/variant sample reuse/invalid item deep-link, gesture/no autoplay, stuck-note cleanup, touch/keyboard/mobile, active-only request/decode counts và measured sample budget; sample rights/export/cache audit | P9-M03 | Cao | DATA/RIGHTS samples |

### R6 — expansion theo scope riêng

| ID | Module | Việc / đầu ra cụ thể | Nghiệm thu | Phụ thuộc | Độ phức tạp | Gate |
|---|---|---|---|---|---|---|
| P9-M04 | Music Sheets V1.1 | Sheets contract/UI liên kết instrument/item, không duplicate catalogue | Sheet IDs/provenance/notation/attribution và rights scope; copyrighted content RIGHTS-gated, missing/withdrawn fallback; không import thư viện bản quyền mặc định | P9-V06 | Cao | DATA sheets; RIGHTS copyrighted content |
| P9-M05 | Music Compose V1.2 | Compose/local save/export contract và UI | Local trước, versioned parse/migration/quota/memory fallback, note/timing round-trip; không cloud/login vào V1.2 | P9-V06, P2-U01 | Cao | Local compose contract review |
| P9-U02 | Event UI | Broader event/radar UI polish theo live contract | Reuse P9-U01 states/provenance, perf/a11y và mobile metrics; không thay verified base rules vì convenience UI | P9-V04, P9-V06 checkpoint | Trung bình | DATA theo event module |
| P9-R02 | V2 research | Community/cloud/login-dependent scope và quyết định riêng | Đánh giá auth/privacy/moderation/storage/quota/provider abstraction; maintainer duyệt product/security/architecture trước implementation, không mở account trong V1 | P9-V06 | Trung bình | V2 scope approval; Q15 |
| P9-V07 | Validation | Expansion acceptance theo nhánh thực sự bật | Sheets copyright/withdrawal/source validation; Compose local round-trip/error; event UI provenance/regression; V2 design không gọi implementation DONE | P9-M04/P9-M05/P9-U02 theo nhánh bật | Cao | DATA/RIGHTS theo nhánh |

## Đường phụ thuộc và xử lý blocker

- **TGC permission track:** P0-L01–P0-L03 chuẩn bị scope/request/evidence; P1-L01–P1-L05 gửi, lưu bằng chứng, review phạm vi và quyết định gate. Track này chạy song song, **không chặn** Hub hoặc Wardrobe placeholder. Chỉ Phase 8 full asset phụ thuộc kết quả approved/restricted tương ứng.

- Nền: P0 → P1 theo từng nguồn → P2 → P3/4/5 theo module → P6 → P7.
- Thứ tự hiện tại sau Item Lookup/PR #10: **R0 → R1 → R2 → R3 → R4 → R5 → R6**, với dependency task cụ thể ở Phase 9. Contract review trước DB provision; provider/quota approval trước resource; foundation validation trước consumer. Phase 8 giữ TGC/RIGHTS độc lập; không dùng thiếu full asset để reopen DONE text/demo.
- P4 không chờ dataset giá/route hoặc full asset. P5 map ảnh có thể chờ quyền trong khi route text/price tiếp tục. P8 tách nhánh, không nằm trên đường găng release placeholder.
- ThatSkyAPI chưa có contract: K05 adapter vẫn DATA-gated nếu chọn. Event Service đa nguồn không phụ thuộc riêng K05; chỉ resolve rule/mốc đã verify bằng IANA LA, giữ prediction/calculated label; lịch chưa verify vẫn unavailable, không dựng lịch hardcode để bỏ gate.
- AppPricingLab không có integration: giữ liên kết/thao tác nhập tay khi hợp lệ; K10/K11 vẫn dùng độc lập. Thiếu giá/SKU thì unavailable.
- Sheet thiếu link: Wiki history tiếp tục với attribution, đối chiếu sheet giữ task mở.
- QR protocol chưa rõ: chuẩn bị UI trạng thái unsupported, giữ decode/display thật chưa hoàn thành; không tạo profile giả.
- TGC Support phản hồi nhưng chưa rõ quyền (pending legal confirmation): chỉ hình học/placeholder; icon Wiki theo brief vẫn pending IP, public release có thể thay hình học. Map cộng đồng thiếu quyền: text guide/sơ đồ riêng.

## Ma trận bao phủ feature

| PRD / feature | Task triển khai chính | Task kiểm chứng | Gate / dependency |
|---|---|---|---|
| W01 layer | P4-W01–P4-W03, P4-W08 | P4-W12, P7-W01 | Demo giữ DONE từng task; full asset TGC |
| W02 size | P4-W04 | P4-W12 | Config/anchor; DATA calibration thật |
| W03 override | P4-W05–P4-W06 | P4-W12, P8-W03 khi đủ quyền | DATA rule thật; TGC full asset |
| W04 dye | P4-W07 | P4-W12 | Demo DONE; DATA/TGC vùng thật |
| W05 local/share | P4-W09–P4-W11 | P7-W01 | P2-U01, manifest/alias |
| H01 items/spirit | P2-D05/D06, P3-H01–P3-H03 | P7-H01 | K15 lookup DONE; DATA K01/K02 generic |
| H02 TS history/prediction | P2-D07, P3-H04/H05 | P7-H01 | DATA K03/K04, Q09 prediction |
| H03 season/countdown | P1-H01, P3-H06, P3-D01/D02, P9-H01 | P7-H01, P6-D01, P9-V03 | Event source contracts verified, R1 foundation |
| H04 official news | P3-H07 | P7-H01 | DATA K06 |
| H05 moderated leak | P5-H09/H10, P5-D01 | P7-H02 | Q02, DATA K14 |
| H06 maps/shrines | P5-H01/H02 | P7-H01 | DATA K07, RIGHTS ảnh |
| H07 routes/Eden | P5-H03–P5-H05 | P7-H01 | DATA K08/K09 |
| H08 IAP cost | P2-D09, P5-H06–P5-H08 | P5-H07, P7-H01 | DATA K10/K11/K12, Q10 còn mapping |
| U01 QR profile | P1-H03, P5-U01–P5-U03 | P7-U02 | Q11 protocol |
| U02 local state | P2-U01, P3-U04, P6-U03 | P7-W01, P6-I04 | Storage/codec contracts |
| U03 compact UX | P0-U01, P3-U01/U02, P4-U01 | P7-U01 | Shell DONE; module state acceptance |
| U04 PWA/notification | P6-I01–P6-I04, P6-U02, P6-H01/H02 | P7-U02 | Verified schedule; foreground Q07 |
| Central DB/data API — PARTIAL implementation | P9-D01–P9-D04, P9-I01/P9-I02 | P9-V01 | Supabase Free dev/typed K15/projection/sync metadata/graph history/portable writer/bounded read preparation PASS; connected runtime/races/restore OPEN |
| Item media reconciliation — OPEN | P9-D05/P9-D06 | P9-V02 | R1, source role evidence, RIGHTS/TGC; one-season pilot before full |
| Event engine — APPROVED/DESIGNED, OPEN implementation | P9-D07–P9-D09, P9-H01 | P9-V03 | R1, candidate verification/KB entry, source/rule provenance |
| Event UI/live radar — OPEN | P9-U01, P9-U02, P3-H06/P3-D02 | P9-V04, P9-V07 expansion | Live API/verified schedule; prediction labels |
| Emote preview — APPROVED/DESIGNED, OPEN implementation | P9-D10/P9-H02 | P9-V05 | R1/R4, DATA Emote + RIGHTS/TGC clips |
| Call/Honk preview — APPROVED/DESIGNED, OPEN implementation | P9-D10/P9-H03 | P9-V05 | Shared pipeline, DATA + RIGHTS/TGC/audio identity |
| Music V1 — APPROVED/DESIGNED, OPEN implementation | P9-M01–P9-M03 | P9-V06 | R1/R4, stable item IDs, DATA/RIGHTS samples |
| Music Sheets V1.1 — OPEN | P9-M04 | P9-V07 | Music V1 DoD, DATA/RIGHTS copyrighted content |
| Music Compose V1.2 — OPEN | P9-M05 | P9-V07 | Music V1 DoD, local/versioned storage; no V2 account |

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
| Q15 | **EVOLVED; DEV SELECTED 2026-10-07** — Repo **`nhlan285/Sky_guide`**, Vercel frontend/SPA/PWA/functions/API facade/CDN. Hard constraint **không tự tạo tài nguyên trả phí** giữ nguyên. User chọn Supabase Free/Dyland's Org; isolated `sky-guide-dev` Singapore đã tạo sau preflight $0/month, không production consumer. PostgreSQL typed/provider-neutral contract + R2 giữ nguyên. Scheduler/worker/cron chỉ khi task approved/quota checked; native Supabase paid branches không dùng. Trước resource mới/production kiểm tra quota/điều khoản/gói thực tế; manual backup/restore còn OPEN. | P0-I04, P7-I03; P9-I01/P9-I02 theo review/quota |
| Q17 | UI mặc định **tiếng Việt**; tên item/spirit/season giữ tên gốc tiếng Anh từ nguồn, không tự dịch tên riêng; giữ `LocalizedText` để mở rộng ngôn ngữ sau; ID nội bộ không phụ thuộc tên hiển thị. | P0-U03, P3-U01 |
| Q18 | Browser mục tiêu: Chrome/Edge desktop bản mới, Chrome Android và Safari iOS bản gần đây. Mục tiêu đo ban đầu: thiết bị tầm trung, LCP ≤ 2,5 s trên mạng di động điển hình; budget JS cụ thể chốt sau build đầu. Accessibility hướng tới WCAG 2.2 AA; không hứa PWA/notification đồng nhất giữa nền tảng. | P6-I01, P7-U01, P7-I02 |

### B. Còn mở — chốt trước Phase 1–2

| ID | Câu hỏi / quyết định cần ghi | Đề xuất hiện tại, chưa chốt | Chốt trước / vai trò |
|---|---|---|---|
| Q04 | ThatSkyAPI/apppricinglab truy xuất kiểu nào, có endpoint/export/CORS/giới hạn gì? | Verify trước; ThatSkyAPI direct khi khả thi, proxy hẹp nếu cần; AppPricingLab manual nếu không có contract | P1-D05/D12/P3-I01; data + infra |
| Q12 | Phiên bản CC-BY-SA và credit cụ thể cho text/Wiki/sheet/map là gì? | Ghi theo nguồn đã kiểm chứng; tách attribution text và quyền media, không gán license dự án thay source | P1-U01/P7-D01; maintainer |
| Q14 | **EVOLVED theo Q23:** source hierarchy/event architecture đã duyệt; verification từng source/date/rule vẫn mở | P9-D07 multi-source verification, không giới hạn K01/K06/K05; thiếu evidence giữ DATA-gated/inactive, candidate không tự verified | P1-H01/P9-D07 trước adapter; data/editor |

### C. Còn mở — chốt khi tới nhánh Phase 5–8

| ID | Câu hỏi / quyết định cần ghi | Đề xuất hiện tại, chưa chốt | Chốt trước / vai trò |
|---|---|---|---|
| Q02 | Ai duyệt leak, quy trình nào, dùng tool nào, nguồn Discord nào được phép? | Intake riêng tư + review theo revision + export public approved; không auto-publish/bot ingest mặc định | P0-H02/P1-H02; maintainer/editor |
| Q09 | Dự đoán TS bằng phương pháp nào, trình bày mức chắc chắn ra sao? | Nhãn dự đoán + method/input version; chưa có phương pháp được chốt thì để unavailable | P0-H03/P3-H05; product + data |
| Q10 | **PARTIALLY RESOLVED 2026-10-04:** USD/US và VND/VN, iOS/Android riêng đã duyệt trong PR #10; candle/heart/mixed-bundle mapping vẫn mở | Không reopen market choice; giữ proportional/checkout, heart unknown không tính, không FX tự động. Android/VND per-SKU và quantity/ownership source coverage còn thiếu | P0-H01/P5-H07; product + data |
| Q11 | QR Sky encode gì, protocol nào, dữ liệu public nào có thể đọc không tài khoản? | Xác minh với nguồn tham khảo trong brief/mẫu được phép; decode local và fail closed với payload lạ | P1-H03/P5-U01; lead + UX |
| Q19 | Sau khi đủ quyền, 2D đầy đủ có đủ không hay cần 3D/native ở scope mới? | Giữ 2D; 3D/native nghiên cứu sau, không tự mở rộng phase đầu | P8-W04; product + lead |

### D. Đã chốt bổ sung — 2026-10-01

| ID | Quyết định đã chốt | Nghiệm thu / phần còn lại |
|---|---|---|
| Q01 | **HISTORICAL CLOSED 2026-10-01; SUPERSEDED / EVOLVED 2026-10-04 bởi Q20 về canonical ownership.** Quyết định cũ: Release 1 JSON normalized versioned trong Git, không DB server. Public projection `data/public/<catalogVersion>/`, manifest/provenance/alias/tombstone/asset version và private raw/draft/review/quarantine/evidence/export allowlist/rights gates **vẫn giữ**. JSON nay projection/export/cacheable snapshot/rollback/fixture, không canonical dài hạn. [Historical contract](../ARCHITECTURE.md#kho-dữ-liệu-đã-chốt--p0-d01--q01-2026-10-01), [projection schema](../DATA_SCHEMA.md#public-catalog-contract--q01). | P0-D01 giữ DONE; P2-D01/P2-D02/P2-D04 DONE theo scoped validators, K15 loader/manifest/import có scope riêng. Generic pipeline P2-D10–P2-D12/P2-I01/P2-H01 chưa đủ DoD; Q20/Phase 9 không auto đóng DATA/Q02/Q12/TGC/RIGHTS. |

### E. Đã chốt bổ sung — 2026-10-02

| ID | Quyết định đã chốt | Nghiệm thu / phần còn lại |
|---|---|---|
| Q08 | **CLOSED** — Configurable project contract / fixture behavior, không phải verified Sky game behavior. SlotPolicy.maxItems hỗ trợ single/multiple, fixture mặc định 1 cho sáu slot; equippedBySlot giữ ID[]. Một item nhiều binding; zIndex tăng dần rồi binding ID ổn định. Anchor key ghim model/revision + effective size + slot/anchor + asset/binding revisions; missing/revision mismatch có trạng thái rõ, scale nhân vật/viewport mỗi tầng đúng một lần. Applicable rules sort priority giảm dần; cùng priority ghi khác target value là validator error, runtime ID tie-break chỉ preview tạm. Override derive từ base không mutate/persist effective state; tháo trigger derive lại. Ví dụ chỉ ID/code fixture. Chi tiết [Architecture](../ARCHITECTURE.md#contract-wardrobe-2d-đã-chốt--p0-w01--p0-w02--q08-2026-10-02) / [Schema](../DATA_SCHEMA.md#contract-q08--configurable-project--fixture-behavior-2026-10-02). | P0-W01/P0-W02 DONE; SVG Phase 0 vẫn chỉ là test evidence. Wardrobe V1 có manifest/schema/reducer/renderer/picker/dye mới; chưa visible override, save/share, full asset pipeline. Q08 không thay đổi; behavior/calibration game thật cần evidence, full assets pending legal confirmation. |
| Q16 | **CLOSED** — Maintainer / repository owner theo dõi TGC; Legal / Rights review theo KB. Evidence ở nơi logic **Sky Guide private workspace → Legal → TGC** ngoài repo; owner lưu/review đúng revision và update public allowlist status/evidenceRef/scope summary/follow-up state. Ledger template và draft chưa gửi tại [TGC follow-up contract](../TGC_FOLLOW_UP.md); chưa tạo storage hoặc lưu raw evidence. **Q16 closure does not imply asset permission.** | P0-D03/P0-L01–L03 DONE về quy trình; K13 pending_clarification / full assets pending legal confirmation, Full AssetRegistry path đóng. Phase 1 cần evidence/gửi follow-up/review thật; TGC/RIGHTS và Phase 8 giữ gate. |

### F. Đã duyệt / designed — 2026-10-04, chưa implemented

Kiểm tra toàn file: Q01–Q19 là IDs cũ; Q20–Q23 là IDs bổ sung, không collision. Các quyết định do maintainer cung cấp trong task reconciliation, không phải kết quả live source/cloud verification.

| ID | Quyết định đã duyệt | Implementation / gates còn lại |
|---|---|---|
| Q20 | **APPROVED/DESIGNED** — canonical domain metadata/relationships trong central PostgreSQL-compatible relational DB, provider-neutral: Item/Spirit/Season/Event/EventRule/EventOverride/Location/Cosmetic/Music/Emote/Honk-Call/Media-provenance. Maintainer review/promote dữ liệu; JSON versioned là public projection/export/cacheable static snapshot/rollback/fixture, không source of truth dài hạn. Binary images/posters/video/honk-call audio-video/emote video/music samples ở object storage, preferred R2/S3-compatible. DB chỉ stable ID/key/URL khi cần/role/source/provenance/rights/revision/timestamps/relation IDs. Vercel frontend/SPA/PWA/functions/API facade/CDN; deployment storage/repo JSON không DB. Q01 canonical decision superseded, projection/private/rights contracts giữ. | P9-D01–P9-D04/P9-I01/P9-I02/P9-V01 PARTIAL/OPEN; Supabase Free dev/private identity-retirement SQL PASS, typed canonical payload/adapter/restore chưa hoàn tất; không đổi React/Vite/SSR |
| Q21 | **APPROVED/DESIGNED** — itemImage tối đa 1, referenceImages 0..N, dedupe primary khỏi references. Wiki structured roles trước; official Sky/TGC → official social → provenance community fallback; không size/aspect/DOM/first-image role inference. Current/verified media audit → role/dedupe/reconcile/validate/manual ambiguous review → rights-approved mirror. Warrior of Love Hair regression và một season pilot trước full. | P9-D05/P9-D06/P9-V02 OPEN, DATA/RIGHTS/TGC theo asset; PR #10 research không là catalogue reconciliation DONE |
| Q22 | **APPROVED/DESIGNED** — shared animated preview poster/lazy/gesture pipeline cho Emote/Call-Honk, giữ Call audio identity; object storage budgets 0.5 MB/clip/~350 MB cho 500 clips. Music `/music?instrument=<itemId>` reuse item ID; 15 notes 3×5, Web Audio/AudioBuffer, active-only samples và sampleSet reuse; V1 playable, V1.1 Sheets, V1.2 Compose local, V2 community/cloud/login scope riêng. | P9-D10/P9-H02/P9-H03/P9-M01–P9-M05/P9-V05–P9-V07 OPEN; chưa có clips/samples hoặc Music implementation; RIGHTS gate không đổi |
| Q23 | **APPROVED/DESIGNED** — Event Service đa nguồn theo hierarchy official → verified official override → verified structured community → cross-checked community → prediction/calculated. Event/Rule/Override/Occurrence/Snapshot/Health; IANA America/Los_Angeles/DST; recurring anchor/offset/interval/effective range, temporary overrides không mutate base. GET /api/events/live version/time/active/upcoming/start/end/source-confidence, local countdown; LKG + healthy/delayed/stale/offline, short live TTL không per-second poll. Q14 architecture resolved, source verification vẫn mở. | P9-D07–P9-D09/P9-H01/P9-U01/P9-V03/P9-V04 OPEN; KB/source contracts chưa complete; K05 optional, không invent K-ID hoặc promote prediction |
