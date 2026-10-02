# Kiến trúc đề xuất

## Quyết định Phase 0 đã chốt

Các quyết định nhóm A được duyệt ngày **2026-09-29** và là baseline triển khai, không còn là đề xuất mở:

- **Frontend:** React + TypeScript + Vite, client-side SPA, không SSR; routing dùng React Router; package manager dùng pnpm; runtime dùng Node LTS. Phiên bản cụ thể phải được kiểm tra và pin khi thực hiện P0-I01.
- **Deploy:** repo `nhlan285/Sky_guide`, Vercel preview trước, domain `*.vercel.app` ở giai đoạn đầu; không tạo cron, DB, KV hoặc tài nguyên trả phí mặc định.
- **Wardrobe renderer:** SVG paper-doll 2D với silhouette/layer tự tạo, hệ tọa độ chuẩn hóa [0,1] gốc trên-trái; dữ liệu size/rule demo phải gắn `fixture=true` và tách khỏi dữ liệu game thật.
- **Local state/share:** `localStorage` qua wrapper versioned có parse/validate và fallback in-memory; IndexedDB chỉ khi thật sự cần. Outfit share dùng URL fragment với payload versioned, nén + base64url, có `schemaVersion` và `catalogVersion`; không chứa QR/profile/dữ liệu cá nhân.
- **Notification:** mức đầu chỉ in-app reminder + notification khi app đang mở và người dùng chủ động bật. Web Push nền chỉ ở trạng thái research cho tới khi phạm vi lưu subscription server-side được thay đổi rõ ràng.
- **Ngôn ngữ/khả năng truy cập:** UI mặc định tiếng Việt; tên item/spirit/season giữ tên gốc tiếng Anh từ nguồn; ID không phụ thuộc tên hiển thị. Mục tiêu browser là Chrome/Edge desktop bản mới, Chrome Android và Safari iOS bản gần đây; accessibility hướng tới WCAG 2.2 AA.


Tài liệu là **đề xuất thiết kế**, chưa cài dependency, chưa triển khai dịch vụ. Nguồn sản phẩm: [brief](PROJECT_BRIEF.md). Contract nguồn chỉ lấy từ [K01–K14](../knowledge/README.md); endpoint/SDK/platform capability phải xác minh khi triển khai, không được coi là đã kiểm tra ở scaffold này.

## Stack và ranh giới hệ thống

- Frontend đã chốt (P0-I01): **React + TypeScript + Vite**, client-side SPA với React Router; không SSR. Đây là triển khai của Architecture v1 approved, không thay baseline.
- Toolchain khóa trong `package.json` và `pnpm-lock.yaml`: React/React DOM **19.3.0**, TypeScript **5.9.3**, Vite **8.3.2**, React Router DOM **7.18.4**, pnpm **10.30.3**. Node **24.x LTS**, bản local kiểm tra **24.11.0** (`.nvmrc`); Vercel dùng patch được platform hỗ trợ trên cùng major 24.x. Nâng version cần cập nhật lockfile và chạy lại gates; không tự chuyển major.
- Lý do: giữ stack đã duyệt, Vite build static SPA, React Router xử lý route client, pnpm + lockfile tái lập dependency. TypeScript 5.9.3 là bản ổn định tương thích lint tooling; không cần frontend framework thứ hai.
- Build contract: `pnpm install --frozen-lockfile`, `pnpm build` (typecheck rồi production Vite build), output `dist`. Lệnh độc lập và kiểm tra deployment được ghi ở README.
- Renderer đầu: 2D paper-doll, lớp ảnh/hình SVG tự tạo xếp theo cấu hình, không engine 3D giai đoạn đầu.
- Public catalog: file JSON versioned được validate và build cùng app. Không cần database server ở release đầu; schema logic vẫn có ID/quan hệ để thay kho dữ liệu khi có nhu cầu đã xác nhận.
- User state: reducer/context theo feature; localStorage cho thiết lập/outfit gọn. IndexedDB chỉ dùng khi route/cache hoặc lượng bản ghi vượt phạm vi gọn; chốt ngưỡng sau đo thực tế, không đặt hai kho làm nguồn sự thật cùng lúc.
- Deploy: Vercel static build. Vercel Function proxy time **chỉ là phương án** nếu K05 không cho gọi trực tiếp qua CORS; không biến proxy thành crawler tổng quát hoặc nơi lưu người dùng.
- PWA: manifest + service worker, shell/cache public có version; thông báo xem phần riêng. Native ngoài các phase đầu.

## Luồng dữ liệu

```mermaid
flowchart LR
  Sources["K01–K12: nguồn được brief liệt kê"] --> Intake["Xác minh / nhập thủ công / adapter"]
  Intake --> Raw["Snapshot và provenance có quyền lưu"]
  Raw --> Normalize["Chuẩn hóa + validate + diff"]
  Discord["K14: intake thủ công"] --> Review["Người duyệt nội dung"]
  Normalize --> Review
  Review --> Public["JSON public đã duyệt"]
  Public --> Build["Build Vercel"]
  Build --> Client["Browser / PWA"]
  Time["K05: time đã xác minh"] --> Client
  Client --> Local["State trên thiết bị"]
  Assets["K13: gate quyền asset"] --> Registry["Asset registry / placeholder"]
  Registry --> Build
```

### Kho dữ liệu đã chốt — P0-D01 / Q01 (2026-10-01)

Release 1 dùng **JSON normalized versioned trong Git**, không database server. Quyết định này cụ thể hóa public catalog/provenance/review gates của Architecture v1 approved; không thay baseline hoặc xác nhận nguồn thật.

| Vùng | Vị trí quy định | Ai sử dụng / ranh giới |
|---|---|---|
| Public release | `data/public/<catalogVersion>/` trong repo này | Chỉ manifest, datasets, provenance public và alias/tombstone đã duyệt; có thể công khai cả lịch sử Git |
| Raw | `<private-workspace>/raw/` ngoài checkout public | Snapshot nguồn được phép lưu; giữ nguyên input/revision, không là input trực tiếp của client/build |
| Draft / reviewed | `<private-workspace>/draft/`, `<private-workspace>/reviewed/` | Normalized candidate, EditorialRecord và approval theo revision; reviewed chưa phải published |
| Quarantine / evidence | `<private-workspace>/quarantine/`, `<private-workspace>/evidence/` | Input lỗi, diff/review report và bằng chứng riêng tư; không vào Git public, Vercel hoặc cache client |
| Fixture kỹ thuật | `tests/fixtures/` khi task kiểm thử cần | Tự tạo và gắn `fixture=true`; không phải nguồn game, không nhập vào catalog phát hành |

`<private-workspace>` là thư mục vận hành ngoài repo hoặc checkout của repo riêng tư, do maintainer quản lý; chưa tạo workspace/repo riêng tư trong task này. Q16/P0-D03 đã chốt **contract nơi logic** `Sky Guide private workspace → Legal → TGC`, owner Maintainer / repository owner và [private evidence ledger](TGC_FOLLOW_UP.md); không là path/dịch vụ storage đã provisioning hoặc xác nhận permission TGC. Không đặt workspace này bên trong `public/`, `src/` hoặc checkout triển khai. Ignore các đường `data/raw/`, `data/draft/`, `data/reviewed/`, `data/quarantine/`, `data/private/`, `private/` chỉ là phòng ngừa local, **không biến chúng thành kho được phép commit** và không bảo vệ file đã tracked.

Luồng duy nhất: raw → normalized draft → validate/diff → review đúng revision → **public projection theo allowlist field** → `data/public/<catalogVersion>/` → review Git/build Preview → phát hành. Không copy nguyên candidate/raw rồi xóa vài field. Nội dung sửa sau approval phải review lại; lỗi parse/validate/export giữ nguyên release tốt trước đó, không xuất catalog rỗng thay thế. Owner/reviewer/tool/source Discord vẫn cần chốt riêng ở Q02; Q01 không cấp quyền publish leak.

Client chỉ đọc release public được code chọn rõ; `src/data/` dành cho types/validators/read adapters, không là kho raw/draft. Build không đọc private workspace, không dùng glob toàn `data/**`, không fetch raw/draft ở runtime. `public/` của Vite được copy nguyên vào output nên chỉ chứa tài nguyên đã được phép công khai; không dùng làm vùng staging. `.vercelignore` loại vùng vận hành/fixture khỏi upload CLI; Git deployment chỉ nhận file tracked, vì vậy review Git và export gate vẫn bắt buộc.

Contract manifest/dataset, version và whitelist provenance nằm tại [DATA_SCHEMA](DATA_SCHEMA.md#public-catalog-contract--q01). Catalog build cùng code; rollback chọn deployment hoặc commit có cùng catalog/asset manifest tương thích. Raw/evidence không cần và không được mang theo deployment rollback. Không tạo manifest/catalog giả để biểu thị nguồn đã sẵn sàng: module chưa có dataset được coi là unavailable.

P0-D01 chốt **contract và ranh giới**. Types/validators (P2-D01–D04), importer (P2-D05–D10), export/rights gates (P2-D11), manifest/rollback implementation (P2-D12), build gate (P2-I01) và client data access (P2-H01) chưa triển khai. Người vận hành dùng Git hiện có; không xây auth/admin account cho sản phẩm.

## Tổ chức thư mục mã (chỉ khung)

| Đường dẫn | Trách nhiệm khi bắt đầu code |
|---|---|
| `src/app` | Bootstrap, routes, top-level providers, khôi phục state |
| `src/features/wardrobe` | Editor, reducer, resolver rule, layer renderer, outfit codec |
| `src/features/hub` | Catalog, TS, season/event, news, maps/routes, IAP |
| `src/features/profile` | QR decode/validate/display sau xác minh protocol |
| `src/shared` | Primitive UI, accessibility, error/empty/stale state, storage wrapper |
| `src/data` | Normalized types, validation, data read adapters; không chứa draft |
| `src/pwa` | Manifest integration, service worker lifecycle, notification capability |

Scripts import và JSON public sẽ được thêm ở task dữ liệu tương ứng; shell/build hiện có không tích hợp nguồn thật.

## Contract Wardrobe 2D đã chốt — P0-W01 / P0-W02 / Q08 (2026-10-02)

Phase 0 và Phase 4 dùng **SVG paper-doll 2D**, silhouette/layer hình học hoàn toàn self-created. Bộ [fixture SVG](../tests/fixtures/wardrobe/README.md) là bằng chứng trực quan P0-W01, mở độc lập để xem; không được import vào app, public catalog hoặc manifest Preview/Production. Đây là **configurable project contract / fixture behavior**, không phải verified Sky game behavior. Phase 0 chốt contract và fixture tĩnh; renderer, picker, resolver, bảng calibration versioned và manifest demo đầy đủ vẫn thuộc các task sau.

### Slot, lớp và resolver

- `WardrobeConfig` versioned ghim canonical model/revision và `SlotPolicy` cho từng slot. `maxItems` là số nguyên ≥ 1: 1 cho single-item, > 1 cho multiple items; không có default ngầm khi thiếu policy. Fixture policy chọn 1 cho sáu slot; một ví dụ cấu hình accessory=2 chỉ chứng minh capability. Không suy ra số phụ kiện game cho phép.
- `equippedBySlot: Record<slot, ID[]>` giữ mảng kể cả slot đơn, không lặp ID; mảng rỗng là đã tháo hết. Equip vượt capacity bị reject với lý do, selection trước đó giữ nguyên; thay item slot đơn là thao tác replace tường minh. Import/restore cũng validate theo config đang ghim, không tự cắt mảng. Thứ tự mảng không quyết định z-order.
- Một item có 0..N `LayerBinding`; mỗi binding trỏ asset qua `AssetRegistry`, có revision, anchor key và `zIndex` riêng. Ví dụ item giả `fixture-item-wrap` có `fixture-binding-rear`/`fixture-binding-front`; đây là capability nhiều lớp, không mô tả asset game hiện có. Render tăng dần `zIndex` (số lớn vẽ sau), bằng nhau sort `binding.id` theo thứ tự chuỗi code-unit ổn định, không theo locale/item ID trong component. Silhouette cũng có z-order trong cấu hình, không là lớp đặc biệt hardcode.
- Compatibility chỉ dùng evidence hoặc rule `fixture=true`. Thu thập mọi rule có trigger đang active (tất cả `triggerItemIds` phải được equip), sort `priority` giảm dần rồi `rule.id` tăng dần theo code-unit. Với `set_effective_size`, priority lớn nhất thắng; rule thấp hơn không ghi đè winner. `reject_combination` báo selection không tương thích, không tự tháo item hoặc mutate selection.
- Validator phải báo **error** khi hai rule có thể cùng active, cùng priority và ghi giá trị khác nhau lên cùng target; không chỉ kiểm tra outfit hiện tại. Runtime nếu gặp content này trả `rule_conflict` và cảnh báo với rule IDs; stable ID có thể chọn preview tạm deterministic nhưng không biến content thành hợp lệ hoặc cho persist/share kết quả như đã resolve. Không random winner.
- Mỗi lần equip/unequip/đổi base size đều derive lại từ selection: `effectiveSizeCode = baseSizeCode` trước khi áp winner. Override không mutate base size, không persist effective state. Tháo item override cuối cùng trả về base size; nếu còn rule active khác thì derive lại theo priority. Mã size thật/chibi mapping vẫn unknown; ví dụ resolver chỉ dùng code có tiền tố `fixture-`.

### Anchor và transform

Canonical model có `modelId` và `modelRevision`; hệ tọa độ normalized `[0,1]`, origin top-left, x tăng sang phải/y tăng xuống dưới. Asset SVG khai báo viewBox hợp lệ; pivot normalized theo asset được đổi về đơn vị canonical trước transform. Tra anchor bằng khóa đầy đủ `(modelId, modelRevision, effectiveSizeCode, slot, anchorName, assetId, assetRevision, bindingId, bindingRevision)`, không dùng anchor size/revision khác làm fallback ngầm. Binding/asset đổi revision làm calibration cũ không còn khớp; `calibrationRevision` nhận diện bộ calibration đã review.

Anchor lưu trong **canonical chưa scale**; `scaleItem` là scale cục bộ của binding, không chứa scale nhân vật. `p_model = anchorModel + scaleItem * rotate(p_asset - pivotAsset)`; sau đó một group nhân vật áp `ScaleTable` đúng một lần, rồi viewBox/viewport map tới pixel đúng một lần. Không nhân scale nhân vật vào cả anchor lẫn layer, không bake scale viewport vào bảng. `ScaleTable` lookup `(modelId, modelRevision, effectiveSizeCode)`.

Thiếu policy/size/asset/anchor hoặc lệch revision trả trạng thái rõ `missing_slot_policy`, `missing_size`, `missing_asset`, `missing_anchor`, `revision_mismatch`; layer liên quan dùng placeholder có nhãn hoặc bị bỏ cùng cảnh báo. Không đoán tọa độ/scale “đúng”; phần selection hợp lệ vẫn giữ để người dùng sửa. Giá trị số trong fixture chỉ minh họa hình học tự tạo, không là calibration thật.

## State Wardrobe và phép biến đổi

State đầu vào `WardrobeSelection`: `schemaVersion`, `baseSizeCode`, `equippedBySlot`, `dyeByItemRegion`. State dẫn xuất: `effectiveSizeCode`, `appliedRuleIds`, `renderLayers`, cảnh báo asset/anchor thiếu. Không persist state dẫn xuất để tránh lỗi khi đổi bảng/rule.

Trình tự xử lý theo contract Q08:

1. Validate ID item/slot, khả năng phối và định dạng màu.
2. Thu thập applicable rules; sắp `priority` giảm dần rồi ID ổn định, xử lý conflict theo contract trên.
3. Derive effective size từ `baseSizeCode` mà không đổi base; “chibi override” chỉ là behavioral fixture, mã size thực tế chưa được cung cấp.
4. Tra `ScaleTable` theo effective size + model revision. Thiếu entry thì hiện lỗi/placeholder rõ, không dùng ngầm một tỷ lệ “đúng”.
5. Tra `AnchorTable` theo khóa model/revision + effective size + slot/anchor + asset/binding revision ở trên; build layer order từ cấu hình.
6. Áp dye chỉ lên region/mask được khai báo; ghép các lớp và render.

Contract tọa độ/transform và thứ tự lớp được chốt ở mục Q08 trên. Cape tách trước/sau và phụ kiện có anchor riêng là capability cấu hình, **chưa phải thông tin game**.

`AssetRegistry` tách item khỏi file: cùng item có preview placeholder hoặc asset được xác nhận sau này; mỗi entry có revision, renderer kind, source, legal status và capability. 3D về sau có thể cung cấp renderer khác, nhưng không đưa pipeline 3D vào phần sẵn sàng triển khai. Toàn bộ full asset: **pending legal confirmation** ([K13](../knowledge/13-tgc-assets.md)).

## Local storage và chia sẻ

- Bọc storage với parse/validate/version migration; ghi lỗi quota/cấm storage thành trạng thái rõ và tiếp tục trong memory.
- Outfit link đề xuất chứa payload nhỏ trong URL fragment, gồm ID/version/size/dye; không chứa QR profile, dữ liệu cá nhân hay ảnh binary. Giới hạn kích thước và codec phải chốt sau thử round-trip.
- Không có short-link service hoặc database share. Link chỉ hoạt động khi data version/item ID còn ánh xạ được; tombstone/alias là phần migration.
- Import state phải kiểm tra schema, độ dài, ID và màu; link không được cung cấp tùy ý URL asset để trình duyệt fetch.
- Local state được export/reset có chọn phạm vi; không hứa bảo toàn khi trình duyệt xóa dữ liệu. Camera frame/ảnh QR là dữ liệu tạm và mặc định không persist.

## Pipeline theo nguồn

| Đầu ra | Nguồn cứng | Đường đi đề xuất và điểm dừng |
|---|---|---|
| Item/price game | [K01](../knowledge/01-wiki-items.md) | API Wiki đã xác minh → parse module thật → normalized Item; dừng nếu format chưa rõ |
| Spirit/tree | [K02](../knowledge/02-wiki-regular-spirits.md) | Wiki hoặc nhập thủ công có revision → kiểm tra graph/cost |
| TS history | [K03](../knowledge/03-wiki-traveling-spirits.md), [K04](../knowledge/04-ts-calculator.md) | Hai adapter độc lập → diff → biên tập xử lý xung đột |
| Time | [K05](../knowledge/05-thatskyapi.md) | Tích hợp trực tiếp nếu khả thi; TimeReference riêng, không build-time timestamp cố định làm đồng hồ live |
| Patch/news | [K06](../knowledge/06-official-patch-notes.md) | Tóm tắt + link thủ công → review; automation chỉ sau kiểm tra |
| Season/event | K01/K06 nếu có chứng cứ phù hợp | Không gán K05 là feed season; chưa có chứng cứ thì unavailable |
| Map/markers | [K07](../knowledge/07-wiki-map-shrines.md) | Text + tọa độ biên tập + asset riêng có quyền; không suy ra coordinate từ tên |
| Route | [K08](../knowledge/08-appunwrapper.md), [K09](../knowledge/09-wiki-video-playlists.md) | Viết lại từng bước, dẫn nguồn; không copy full text/media |
| IAP | [K10](../knowledge/10-app-store-iap.md)–[K12](../knowledge/12-apppricinglab.md) | Observation có platform/market/time → SKU mapping đã xác minh → phép tính có giả định |
| Asset | [K13](../knowledge/13-tgc-assets.md) | Registry placeholder trước; full asset chỉ sau legal gate |
| Leak | [K14](../knowledge/14-discord-editorial.md) | Intake manual → đối chiếu K06 → người duyệt → public projection |

Mỗi lần import: kiểm tra nguồn → lưu provenance/snapshot cho phép → normalize → validate quan hệ → quarantine bản ghi hỏng → diff với bản cũ → review → xuất public JSON → build preview → publish khi đạt gate. Parser lỗi không được làm danh sách rỗng ghi đè bản tốt. Upstream đổi field phải báo lỗi và giữ last-known-good có nhãn stale. Retry/backoff, cadence và TTL đặt theo đặc tính nguồn sau xác minh, không suy đoán hạn mức API.

## Countdown và thời gian

TimeReference cần thời gian nguồn, thời điểm nhận và đơn vị đã kiểm chứng. UI ước lượng thời gian trôi qua từ mốc này để render mỗi giây; đây là nội suy hiển thị, không tự xây lịch game. Mốc bắt đầu/kết thúc season/event phải có provenance riêng. Khi tab thức dậy/timer bị throttled, đồng bộ lại; nguồn hết hạn thì báo stale, khi không có mốc tin cậy thì không hiện countdown chính xác giả. DST được kiểm tra qua fixture có ý nghĩa từ contract K05. Không dùng thời gian LA hardcode thành UTC offset cố định.

## PWA và notification

Phân biệt hai mức đề xuất để không xung đột yêu cầu toàn bộ trạng thái local:

1. **Mức đầu:** in-app reminder và notification do người dùng bật khi app đang hoạt động, dùng mốc nguồn đã kiểm chứng. Capability detection, xin quyền qua thao tác trực tiếp, xử lý denied/unsupported. Không hứa hẹn báo đúng lúc khi app đóng hoặc tab bị ngủ.
2. **Web Push nền:** nghiên cứu sau khi người dùng chốt phạm vi. Cần subscription endpoint/key và hạ tầng gửi; dù không cần tài khoản, lưu subscription server-side vẫn mâu thuẫn với cách hiểu nghiêm ngặt “toàn bộ trạng thái local”. Vì vậy **không thuộc phương án mặc định**; chỉ triển khai nếu yêu cầu này được điều chỉnh rõ. Không giả định service worker tự chạy lịch nền chính xác.

Service worker đề xuất cache shell và public catalog versioned; không cache QR, draft, ticket hay dữ liệu nhạy cảm. Cache dữ liệu công khai cần ngày sync và nhãn offline. Cập nhật shell/data atomically theo manifest version; thông báo bản mới và cho người dùng chọn reload để không mất outfit đang sửa. Size/quota có fallback; offline không giả lập dữ liệu mới.

## Vercel và vận hành

Phase đầu dùng deploy preview từ repo đã chọn, rồi production sau checklist. P0-I01–I04 khóa toolchain trong `package.json`/lockfile; `vercel.json` dùng `pnpm install --frozen-lockfile`, `pnpm lint && pnpm build`, output `dist` được xác minh bằng production build. Rewrite `/(.*)` về `/index.html` để mở trực tiếp deep link; React Router có `/`, `/about` và trang not-found. Quy trình Preview/rollback và bằng chứng nghiệm thu ở README; không bật resource trả phí.

Build gate: type/lint theo tool đã chọn, schema/reference checks, cấm draft trong bundle, asset rights manifest, behavioral tests reducer/codec/IAP, rồi smoke UI. Chưa bật cron hoặc dịch vụ trả phí: lịch cập nhật ban đầu do maintainer chạy thủ công, tự động hóa chỉ sau khi biết giới hạn và chi phí. Nếu proxy cần secret, chỉ server environment; không để secret trong bundle. Rollback gồm cả code + data + asset manifest tương thích, không chỉ HTML.

## Các quyết định còn mở

React + TypeScript + Vite, React Router, pnpm, Node LTS, URL fragment cho outfit, renderer SVG 2D, notification foreground, ngôn ngữ UI đầu và browser/accessibility target đã được chốt trong nhóm A. Q01/P0-D01 đã chốt JSON normalized versioned và ranh giới public/raw/draft; schema domain sẽ được kiểm chứng khi triển khai Phase 2, mapping upstream vẫn chờ Phase 1. Moderation leak, prediction TS, QR protocol, price mapping, attribution và các nguồn dữ liệu vẫn theo trạng thái mở/gate tương ứng trong [Decisions & open questions](plan/IMPLEMENTATION_PLAN.md). Không có endpoint, dữ liệu game hoặc license mới nào được xác nhận chỉ bằng tài liệu kiến trúc này.
