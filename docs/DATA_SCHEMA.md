# Data schema chi tiết — đề xuất v1

Đây là **contract nội bộ**, không phải upstream response đã xác minh. Baseline [brief](PROJECT_BRIEF.md) + quyết định maintainer 2026-10-04, nguồn qua [KB](../knowledge/README.md). **Q01 historical, SUPERSEDED / EVOLVED bởi Q20 về canonical ownership:** central PostgreSQL-compatible relational DB đã APPROVED/DESIGNED, chưa provisioned; JSON giữ projection/export/cacheable snapshot/rollback/fixture và public/private/provenance/FK/alias gates. K15 Item Lookup import thật đã có, không đồng nghĩa full generic pipeline hoặc source contracts DONE.

## Central relational / media / event contract evolution — 2026-10-04

P9-D01–P9-D03/P9-I01 review domain mapping/API/AssetRegistry/migration trước
provider/provisioning P9-I02. Đây là contract direction, chưa SQL migrations hay
runtime schema mới. Reuse ID hiện có (kể cả `tsa-cosmetic-N`), source crosswalk/FK,
revision/schema version, soft deletion/tombstone/alias; không provider-specific
tables hoặc client direct DB. Canonical metadata gồm Item/Spirit/Season/Event/
EventRule/EventOverride/Location/Cosmetic/Music/Emote/Honk-Call/Media-provenance.
Existing validators/public envelopes giữ compatibility cho tới migration review.

| Contract bổ sung | Fields / invariants cần review/validate | Task |
|---|---|---|
| Media/AssetRegistry | stable ID, storageKey, URL khi cần, role, sourceUrl/sourceType/sourceRole, provenance, rightsStatus, revision, fetchedAt/timestamps, itemId + optional seasonId/spiritId; hash/dedupe/credit/evidence public allowlist | P9-D03/P9-D05 |
| Item media projection | `itemImage: MediaRef hoặc null` tối đa 1; `referenceImages: MediaRef[]` 0..N; sau dedupe itemImage không lặp references; role từ field/label source, không geometry/DOM order | P9-D05/P9-D06/P9-V02 |
| Event | stable ID/type/source relations, fixed/recurring/calculated/temporary; unknown date precision và source confidence giữ nguyên | P9-D08 |
| EventRule | eventId, revision, timezone=`America/Los_Angeles`, anchor/offset/interval/effectiveFrom/effectiveUntil, calculation method/input version nếu có; IANA/DST, không UTC-7/UTC-8/VN canonical | P9-D09 |
| EventOverride | eventId/ruleId, priority, effective range, revision + verified official evidence/reviewer reference private; expiry trở về base, không mutate permanent rule | P9-D08/P9-D09 |
| EventOccurrence | stable occurrence ID, event/rule/override revisions, UTC startsAt/endsAt, schedule version, canonical timezone, source type/confidence/provenance; resolver deterministic | P9-D09 |
| SourceSnapshot | source registry ID, retrievedAt, revision/hash, permitted private snapshot reference, normalized version/diff; raw evidence không public | P9-D04/P9-D08 |
| SourceHealth | source registry ID, healthy/delayed/stale/offline, last success/attempt, validity/LKG version, retry policy; health không cấp verification/rights | P9-D04/P9-H01 |
| InstrumentDefinition | stable `itemId → sampleSetId`; variants reuse sampleSetId, note mapping 15 notes 3×5, sample revision/storage key/provenance/rights; không duplicate Item catalogue/audio | P9-M01 |
| AnimatedPreview | Emote/Call-Honk relation IDs, poster/video/audio keys/revisions/duration/dimensions/fps/bytes/provenance/rights; Call identity giữ audio | P9-D10 |

Binary images/posters/video/call-honk audio-video/emote video/music samples **không
lưu trong PostgreSQL**, nằm R2/S3-compatible object storage. Unclear rights fail
closed; URL/media discovery không phải permission. API `/api/items`,
`/api/items/:id`, `/api/events/*`, `/api/spirits/*` chỉ public allowlist projections,
không private draft/evidence/credentials. `/api/events/live` trả server/generated
time, schedule version, active/upcoming, startsAt/endsAt, source type/confidence,
health/validity; prediction/calculated riêng nhãn, LKG khi source fail.
Long TTL item/spirit vs short live TTL theo contract/quota; frontend countdown local.
Source IDs mới chỉ đăng ký sau KB verification P9-D07, không tạo K-ID giả.

Migration contract phải có backup/export, restore test, rollback và quota audit
request/operation/egress/CPU/RAM/IOPS; monitor DB size/query latency/connections/
CPU/RAM/egress/cache hit/API latency. Larger managed PostgreSQL hoặc PostgreSQL
trên Sky Guide cloud server vẫn giữ frontend API; chưa chọn provider/provision.
Chi tiết source hierarchy, pilot Warrior of Love Hair, budgets và V1/V1.1/V1.2/V2
ở [Phase 9 roadmap](plan/IMPLEMENTATION_PLAN.md#phase-9--data-event-và-media-refresh-approveddesigned-2026-10-04).

## Public catalog contract — Q01

Kho snapshot phát hành là `data/public/<catalogVersion>/`, chỉ public projection; Q20 không dùng nó làm canonical long-term DB. Raw/draft/reviewed/quarantine/evidence ngoài repo public; API/runtime/build không expose các vùng này. Fixture kỹ thuật riêng `tests/fixtures/`, không vào real-data manifest. Contract lịch sử không tạo catalog trong P0-D01; K15 scoped manifest/import đã có từ 2026-10-03.

### Manifest và version

`manifest.json` có contract nội bộ sau (không phải response upstream):

| Field | Kiểu / ý nghĩa |
|---|---|
| `schemaVersion` | integer > 0, version contract catalog; chỉ đọc version code hỗ trợ, version lạ phải fail closed |
| `catalogVersion` | string định danh release bất biến, khớp tên thư mục; mọi thay đổi nội dung tạo version mới, không ghi đè release cũ |
| `generatedAt` | DateTime tạo public release, không phải thời gian quan sát game hoặc đồng hồ live |
| `datasets` | Map dataset ID → `{path, dataVersion, sha256}`; path JSON tương đối bên trong release, không URL tuyệt đối/`..`; checksum SHA-256 của byte file export |
| `provenance` | `{path, dataVersion, sha256}` tới dataset provenance public, dùng cùng envelope như datasets |
| `aliases` / `tombstones` | Mỗi field là `{path, dataVersion, sha256} \| null`; null nghĩa chưa có migration, không sinh dữ liệu giả |
| `assetManifestVersion` | string hoặc null; null khi chưa phát hành asset, nếu có phải trỏ version asset tương thích và đã qua rights gate |

Mỗi dataset giữ envelope `schemaVersion`, `dataVersion`, `generatedAt`, `sourceIds`, `records`, `fixture` như quy ước dưới đây; manifest và dataset phải cùng `schemaVersion`, entry `dataVersion` phải khớp file, `fixture=false`. `dataVersion` thay khi nội dung dataset đổi; `catalogVersion` ghim toàn bộ tập dataset/provenance/migration của một release. `catalogVersion` trong outfit share trỏ release này; không dùng version dataset đơn lẻ thay version catalog.

Dataset chưa xác minh/không có không có entry trong manifest; consumer coi là unavailable. `records=[]` chỉ dùng khi đã xác nhận tập dữ liệu thực sự rỗng, không dùng để che lỗi importer hoặc nguồn chưa tích hợp. Không merge dataset từ nhiều release lúc runtime. Build/deploy giữ code + catalog + asset manifest tương thích cùng nhau; rollback dùng nguyên bundle tốt trước đó. Thu hồi nội dung không được hồi sinh qua rollback: chọn bundle an toàn hoặc export release mới đã loại nội dung bị thu hồi; cập nhật cache ở P5-I01/P6-I03.

### Publication và public projection

- Candidate domain theo state `draft → reviewed → published`; `retired` không xuất. `published` là đủ điều kiện xét export, không tự bỏ qua validation/rights/moderation. Bản approved theo revision chỉ ở kho reviewed riêng tư; export đã review mới tạo public projection. Thay đổi nội dung/provenance/asset làm mất approval cũ.
- Export chọn field có định nghĩa trong schema public từng entity và nguồn public được phép công khai; field mới phải bổ sung contract/review trước. Không spread toàn bộ object vận hành vào output.
- Dữ liệu thật phải có provenance truy nguồn được. Export `SourceRecord` theo allowlist ở bảng bên dưới; `sourceRecordKey`, `sourceUrl`, attribution/notes chỉ được chứa thông tin công khai đã review, vẫn giữ cảnh báo quyền/attribution của nguồn. `pending`/`conflict` không cho xuất candidate mới; `stale` chỉ giữ bản đã được xác minh trước đó với nhãn stale, không biến dữ liệu mới thành verified. Không xuất Discord message/channel riêng tư, ticket, reviewer/contact, đường dẫn local hoặc `sourceEvidenceRefs`. Nếu chỉ có evidence riêng tư và chưa có provenance public phù hợp thì giữ candidate private/unavailable, không tự tạo URL thay thế; cách phát hành K14 vẫn gated Q02.
- Public domain có `recordStatus=published`, `fixture=false`; Article cũng áp dụng metadata chung và thêm `revision: string` để đối chiếu approval nội bộ. Leak chỉ xuất khi EditorialRecord có `state=approved`, `articleId` và `revision` khớp chính xác, reviewer/time đầy đủ, không withdrawn. `EditorialRecord` luôn private, không có dataset public cho nó; review không biến leak thành official.
- FK/provenance phải giải được trong **cùng public release**, không chỉ tồn tại trong raw/draft; không xuất record kéo theo tham chiếu private hoặc asset bị chặn. Prediction vẫn tách history và cần phương pháp được duyệt. Full asset pending/không được phép, fixture và evidence private bị chặn ở cả Preview lẫn Production. Hình học tự tạo không fixture có thể làm fallback với `self_created_placeholder`; không đổi nhãn fixture để lách gate.
- Alias contract: `{entityType, fromId, toId}`; ID nguồn không được tái sử dụng, đích phải tồn tại trong public release, không chu trình/ánh xạ mơ hồ. Tombstone: `{entityType, id, retiredAt, replacementId: ID?}`; replacement nếu có phải là ID public hợp lệ. Chỉ chứa metadata công khai, không bản sao nội dung đã gỡ hoặc evidence riêng tư.
- Parser/validation/export lỗi giữ last-known-good, trả report/quarantine riêng tư; không ghi đè public release, không gán `published` chỉ để pass. Triển khai kiểm tra các quy tắc này thuộc P2-D01–D12/P2-I01; P0-D01 không tuyên bố pipeline đã chạy.

## Quy ước kiểu và nguồn

`ID` = chuỗi ổn định do dự án cấp, không dùng tên hiển thị làm khóa. `T?` = `T | null`, key vẫn hiện diện khi export để thể hiện unknown. `T[]` = mảng; rỗng chỉ nghĩa không có phần tử đã biết, không tự chứng minh nguồn không có dữ liệu. `DateTime` = ISO 8601 có timezone/UTC; ngày nguồn thiếu giờ phải dùng `PartialTime`, không bịa giờ. Decimal tiền thật lưu chuỗi thập phân để tránh sai số float. Enum slot là ánh xạ UI theo brief, chưa khẳng định enum upstream.

Mỗi dataset: `schemaVersion: integer`, `dataVersion: string`, `generatedAt: DateTime`, `sourceIds: ID[]`, `records: T[]`, `fixture: boolean`. Public production export loại mọi dataset/bản ghi fixture. ID không tái sử dụng cho item khác; alias/tombstone dùng khi đổi nguồn hoặc xóa.

### SourceRecord / Provenance

| Field | Kiểu | Quy tắc |
|---|---|---|
| id | ID | Khóa provenance |
| sourceId | enum K01…K15 | Trỏ hồ sơ nguồn có thật; K15 là [ThatSkyApplication utility public](../knowledge/15-thatskyapplication.md), được duyệt riêng cho Item Lookup V1 |
| sourceUrl | string? | URL cụ thể đã xác minh; null nếu chưa có, chặn xuất bản dữ liệu thật chưa truy nguồn được |
| sourceRecordKey | string? | Page/revision/row/SKU/message identifier khi có |
| sourceRevision | string? | Không bịa revision cho nguồn không có |
| retrievedAt | DateTime | Thời điểm lấy/biên tập |
| observedAt | DateTime? | Thời điểm quan sát giá/trạng thái, khác retrievedAt |
| attribution | string | Tác giả/nguồn và cách credit đã biết |
| licenseNote | string | Giữ lưu ý rủi ro của Kxx; không tự suy ra quyền |
| transformNote | string | Mapping, diễn giải hoặc sửa đổi đã thực hiện |
| verificationStatus | pending / verified / conflict / stale | “verified” chỉ về chứng cứ bản ghi, không tự cấp quyền asset |

Thực thể domain dùng `provenanceIds: ID[]` không rỗng cho dữ liệu thật; `fieldProvenance: Record<field, ID[]>` khi nhiều nguồn khác nhau trong một thực thể; `updatedAt`, `recordStatus: draft|reviewed|published|retired`, `fixture: boolean`. Chỉ published được xuất public. Draft ở kho vận hành riêng như [Architecture](ARCHITECTURE.md).

### Giá trị dùng chung

- `CurrencyAmount {currency: candle|heart|other, sourceCurrencyLabel: string, amount: integer?}`: amount ≥ 0 nếu đã biết; `other` bắt buộc tên gốc; không tự đồng nhất các loại candle chưa xác minh. Giá unknown không thành 0.
- `PartialTime {value: string, precision: date|instant|unknown, timezone: string?, rawLabel: string?}`: instant bắt buộc offset; date có thể chưa xác định timezone và không được dùng để đếm ngược chính xác.
- `Availability {status: known|unknown|unavailable, note: string?}` dùng để phân biệt thiếu thông tin và không áp dụng.
- `LocalizedText {default: string, translations: Record<string,string>}` là đề xuất chứa tên hiển thị; ngôn ngữ release đầu cần chốt, không tự dịch tên riêng làm ID.

## Item / Cosmetic — K01, K02, K13

| Field | Kiểu | Nội dung/constraint |
|---|---|---|
| id | ID | Khóa item nội bộ |
| sourceKeys | Record<string,string> | ID trang/module khi đã biết, không phụ thuộc duy nhất tên |
| name | LocalizedText | Tên có nguồn |
| slot | mask / hair / cape / top / bottom / accessory / unknown | Sáu slot theo brief; unknown giữ raw slot để review |
| rawSlot | string? | Giá trị nguồn trước mapping |
| accessoryAnchor | string? | Điểm gắn phụ kiện, chưa biết thì null |
| seasonIds | ID[] | FK Season; không tự gán season khi thiếu |
| spiritIds | ID[] | FK Spirit; cho phép item không gắn spirit đã biết |
| acquisitionOptions | AcquisitionOption[] | Nhiều đường sở hữu/giá, không ép chỉ một giá |
| assetIds | ID[] | FK Asset; có thể chỉ placeholder |
| dyeRegions | DyeRegion[] | Region biết được; nếu chưa biết giữ `dyeStatus=unknown` |
| dyeStatus | known / unknown / unsupported | Phân biệt chưa biết với không hỗ trợ |
| ruleIds | ID[] | FK WardrobeRule |
| compatibility | object? | Slot conflicts/item constraints chỉ khi có bằng chứng hoặc cấu hình demo gắn fixture |
| provenanceIds | ID[] | Text K01, tree K02, asset K13 độc lập |

`AcquisitionOption {id, kind: spirit_tree|iap|other|unknown, costs: CurrencyAmount[], costStatus: known|unknown|free, friendshipNodeId: ID?, iapProductId: ID?, validFrom: PartialTime?, validTo: PartialTime?, provenanceIds}`. `free` chỉ khi có bằng chứng miễn phí; thiếu costs không suy ra free. `kind=iap` chỉ tới SKU/gói đã xác minh, không nhân tiền game với một tỷ giá chung.

## Spirit và Friendship Tree — K02, K03, K04

| Thực thể | Field và kiểu | Constraint |
|---|---|---|
| Spirit | `id`, `name: LocalizedText`, `category: regular\|seasonal\|unknown`, `realmId: ID?`, `seasonIds: ID[]`, `treeIds: ID[]`, `provenanceIds` | Phân loại chỉ khi nguồn xác nhận; Traveling là lần ghé, không thay category spirit |
| FriendshipTree | `id`, `spiritId: ID`, `variant: regular\|traveling\|unknown`, `visitId: ID?`, `nodeIds: ID[]`, `provenanceIds` | Giá khác từng lần ghé được giữ thành variant/version riêng |
| FriendshipNode | `id`, `treeId: ID`, `itemId: ID?`, `label: string`, `parentNodeIds: ID[]`, `costs: CurrencyAmount[]`, `costStatus: known\|unknown\|free`, `optional: boolean?`, `provenanceIds` | Cạnh nằm cùng tree; graph không chu trình; null item cho node không phải cosmetic |

Tính tổng đường mở khóa bằng tập node duy nhất của đường đã chọn, không cộng hai lần node chung. Tổng chưa đủ chi phí phải có `complete=false`, không trình bày như giá đầy đủ.

## Season và Event — legacy projection; Q23 multi-source evolution

Bảng dưới giữ compatibility projection cũ; Event Service dùng source registry đa
nguồn verify ở P9-D07 và domain bổ sung trên. K01/K06 enrichment và K05 optional
time adapter không còn là dependency độc quyền. Date-only không suy thành instant.

| Field | Kiểu | Quy tắc |
|---|---|---|
| id / kind | ID / season hoặc event | Hai tập dữ liệu chung base fields |
| name | LocalizedText | Tên có nguồn |
| startsAt / endsAt | PartialTime? | Chưa có mốc thì null |
| timeStatus | confirmed / tentative / unknown | Chỉ confirmed + instant đủ để countdown chính xác |
| summary | string? | Tóm tắt riêng |
| spiritIds / itemIds | ID[] | FK đã validate |
| realmIds / mapIds | ID[] | Không tự suy luận mapping từ tên |
| officialArticleIds | ID[] | FK bài K06 nếu có |
| provenanceIds / fieldProvenance | ID[] / map | Mốc thời gian có nguồn riêng |

“Hiện tại” derive từ verified occurrences và server/generated time, không enum active hardcoded trong nhiều datasets. Thiếu nguồn/LKG giữ unavailable; K05 chưa verify là feed season. Calculated/prediction không mang official label.

Legacy K05 `TimeReference {sourceId: K05, sourceInstantUtc: DateTime, receivedAtDevice: DateTime, sourceTimezone: string?, validityUntil: DateTime?, originalUnit: string, verificationStatus}` giữ adapter scope nếu chọn. Q23 bổ sung live API time/schedule version theo P9-H01; runtime monotonic elapsed trong phiên, không persist qua phiên mới. TTL theo source/quota đã verify, null không nghĩa còn hạn mãi.

## Traveling Spirit — K03/K04

| Thực thể | Fields | Constraint |
|---|---|---|
| TravelingSpiritVisit | `id`, `spiritId: ID`, `startsAt: PartialTime`, `endsAt: PartialTime?`, `status: confirmed\|disputed`, `treeId: ID?`, `provenanceIds`, `fieldProvenance` | Dedupe bằng spirit + khoảng ngày đã đối chiếu; không xóa các lần ghé khác nhau |
| TravelingSpiritPrediction | `id`, `candidateSpiritIds: ID[]`, `targetWindow: {start: PartialTime?, end: PartialTime?}`, `methodDescription: string`, `generatedAt`, `inputDataVersion: string`, `confidenceLabel: string?`, `provenanceIds` | Tập riêng, nhãn dự đoán bắt buộc; không tự đặt xác suất số hoặc viết ngược vào history |

Prediction không có method được duyệt thì không xuất bản. Sửa ngày lịch sử tạo diff và ghi nguồn, không đổi ID một cách tùy tiện.

## Map / Route — K07, K08, K09

| Thực thể | Fields | Constraint |
|---|---|---|
| Realm | `id`, `name`, `provenanceIds` | Chỉ tạo realm có nguồn, không bịa danh sách game |
| Map | `id`, `name`, `realmId: ID?`, `seasonIds: ID[]`, `assetId: ID?`, `revision: string`, `coordinateSystem: normalized_top_left\|none`, `width: number?`, `height: number?`, `provenanceIds` | Không có ảnh/hệ tọa độ thì markers hiển thị text; width/height > 0 nếu có |
| MapMarker | `id`, `mapId: ID`, `mapRevision: string`, `kind: shrine\|child_of_light\|route_point`, `label`, `x: number?`, `y: number?`, `description: string?`, `provenanceIds` | x/y cùng null hoặc cùng [0,1]; ảnh đổi revision phải recalibrate, không giữ điểm cũ ngầm |
| Route | `id`, `title`, `realmIds: ID[]`, `seasonIds: ID[]`, `mapIds: ID[]`, `scope: eden\|season\|other`, `stepIds: ID[]`, `contentVersion: string`, `verifiedForVersion: string?`, `spoilerLevel: none\|spoiler`, `provenanceIds` | Scope theo nội dung, không khẳng định verifiedForVersion nếu chưa kiểm tra |
| RouteStep | `id`, `routeId: ID`, `order: integer`, `body: string`, `mapMarkerId: ID?`, `sourceTimestamp: string?`, `caution: string?`, `provenanceIds` | order duy nhất trong route; body diễn giải riêng; timestamp tham khảo không cần tải video |
| RouteProgress (local) | `routeId`, `contentVersion`, `completedStepIds: ID[]`, `updatedAt` | Route version đổi thì reconcile ID, không tự đánh dấu bước mới hoàn thành |

## IAP price mapping — K10/K11/K12

Không coi giá tiền thật và giá candle/heart là một bảng tỷ giá có sẵn. Mỗi layer dưới đây phải có chứng cứ độc lập.

| Thực thể | Fields | Constraint |
|---|---|---|
| IapProduct | `id`, `platform: ios\|android`, `storeProductId: string?`, `name`, `contents: IapContent[]`, `contentStatus: known\|partial\|unknown`, `provenanceIds` | Store ID chưa rõ không tự dựng; bundle mixed không coi toàn bộ tiền chỉ mua currency |
| IapContent | `kind: currency\|item\|unknown`, `currency: string?`, `quantity: integer?`, `itemId: ID?` | Quantity ≥ 0; unknown khác 0; currency dùng đúng loại nguồn |
| PriceObservation | `id`, `productId: ID`, `market: string`, `currencyCode: string`, `amountDecimal: string`, `observedAt: DateTime`, `validFrom: PartialTime?`, `validTo: PartialTime?`, `taxStatus: included\|excluded\|unknown`, `promotionStatus: regular\|promotion\|unknown`, `sourceId: K10\|K11\|K12`, `provenanceIds` | Giá ≥ 0, số thập phân hợp lệ; cùng SKU khác market/time là bản ghi khác |
| ItemPriceMapping | `id`, `itemId: ID`, `acquisitionOptionId: ID`, `mode: direct_iap\|currency_bundle_estimate\|unavailable`, `productIds: ID[]`, `conversionEvidenceIds: ID[]`, `assumptions: string[]`, `provenanceIds` | direct_iap cần chứng cứ SKU chứa item; ước lượng cần đúng currency và package contents |
| CostEstimate (dẫn xuất) | `itemId`, `market`, `currencyCode`, `platform`, `priceObservationIds: ID[]`, `methodVersion`, `requiredCurrency: CurrencyAmount[]`, `proportionalAmount: string?`, `checkoutAmount: string?`, `bundleCounts: Record<ID,integer>`, `leftoverCurrency: CurrencyAmount[]`, `coverage: complete\|partial\|unavailable`, `assumptions: string[]`, `computedAt` | Không persist như giá chính thức; không trộn tiền tệ/market/platform; thiếu heart mapping → partial hoặc unavailable |

Ví dụ **công thức trừu tượng, không phải số liệu game**: một gói đã xác minh chứa đúng `Q` đơn vị currency với giá `P`, item cần `C`, cùng market/platform/currency. `proportional = C/Q × P` chỉ là ước lượng tỷ lệ. Nếu chọn mua nguyên gói này và không có số dư, `checkout = ceil(C/Q) × P`, `leftover = ceil(C/Q) × Q − C`. Gói mixed, khuyến mãi, số dư, nhiều loại tiền hoặc giới hạn mua làm công thức này không áp dụng tự động. Thuật toán chọn nhiều gói là quyết định mở, không hứa “rẻ nhất” trước khi có dữ liệu/kiểm tra. Không bổ sung nguồn tỷ giá ngoại tệ ngoài brief. Heart không có quy tắc chuyển đổi đã xác nhận thì không tính bằng candle.

## Asset, Anchor và Scale — K13; icon K01/map K07

| Thực thể | Fields | Constraint |
|---|---|---|
| Asset | `id`, `kind: geometric_placeholder\|wiki_icon\|map_image\|paper_doll_layer\|model_3d`, `path: string?`, `revision: string`, `sourceId: ID?`, `provenanceIds: ID[]`, `placeholder: boolean`, `fixture: boolean`, `legalStatus: self_created_placeholder\|pending_legal_confirmation\|permission_confirmed\|not_permitted`, `rightsEvidenceRef: string?`, `credit: string`, `renderer: svg\|image_2d\|future_3d`, `capabilities: string[]` | AssetRegistry tách file khỏi item. Tự tạo hình học có thể sourceId=null/provenanceIds=[]; không gán K13 giả; fixture bị chặn export; full asset mặc định pending; evidence quyền không để lộ ticket riêng tư |
| WardrobeConfig | `id`, `revision: string`, `modelId`, `modelRevision: string`, `slotPolicies: SlotPolicy[]`, `silhouetteBindingIds: ID[]`, `fixture: boolean` | Config versioned được ghim cho phiên demo; policy duy nhất cho mỗi slot được hỗ trợ; silhouette bindings có itemId=null |
| SlotPolicy | `slot`, `maxItems: integer`, `overflow: reject` | maxItems ≥ 1; 1=single, >1=multiple; không thiếu policy/default ngầm; không chứng minh cardinality game |
| SizeEntry | `code: string`, `modelId`, `modelRevision: string`, `scaleX: number`, `scaleY: number`, `fixture: boolean`, `provenanceIds` | Key (modelId, modelRevision, code) duy nhất; scale hữu hạn > 0, chỉ áp ở group nhân vật; mã/tỷ lệ thật chưa có |
| AnchorEntry | `id`, `modelId`, `modelRevision`, `sizeCode`, `slot`, `anchorName`, `assetId`, `assetRevision`, `bindingId`, `bindingRevision`, `calibrationRevision`, `x: number`, `y: number`, `fixture: boolean`, `provenanceIds` | Key tổ hợp model/revision + size + slot/anchor + asset/revision + binding/revision duy nhất; x/y hữu hạn [0,1] canonical chưa scale; mọi revision phải khớp |
| LayerBinding | `id`, `revision: string`, `itemId: ID?`, `modelId`, `modelRevision`, `slot`, `anchorName`, `assetId`, `assetRevision`, `pivotX: number`, `pivotY: number`, `scale: number`, `rotationDeg: number`, `zIndex: integer`, `calibrationRevision`, `fixture: boolean`, `provenanceIds` | Pivot hữu hạn [0,1] theo asset viewBox; scale hữu hạn > 0, không chứa scale nhân vật; rotation hữu hạn. item có 0..N binding; null item chỉ cho silhouette; anchor tra bằng effective size, không đoán entry |
| WardrobeRule | `id`, `triggerItemIds: ID[]`, `effect: set_effective_size\|reject_combination`, `targetSizeCode: string?`, `priority: integer`, `reason: string`, `fixture: boolean`, `provenanceIds` | Trigger không rỗng/không lặp, tất cả item phải active; set_effective_size bắt buộc target có SizeEntry, reject_combination có target=null; priority lớn nhất thắng cùng target; conflict ngang priority là error |
| DyeRegion | `id`, `label`, `maskAssetId: ID?`, `allowedColors: string[]?`, `support: known\|demo\|unknown` | Color validate theo codec; null allowedColors không khẳng định game cho mọi màu |

Full 3D/wardrobe: **pending legal confirmation**. Asset không đủ rights không được lọt public export; có thể dùng `geometric_placeholder` thay thế. Placeholder Wiki vẫn giữ pending và credit, không tự chuyển thành permission_confirmed.

Implementation V1 (2026-10-03): [types/validators](../src/data/wardrobe/index.ts) dùng infrastructure P2-D01/P2-D02; màu trong phiên editor là hex RGB `#rrggbb`, label DyeRegion là LocalizedText. Legal status thiếu chỉ mặc định `pending_legal_confirmation`, không confirmed. [Package demo riêng](../src/features/wardrobe/demo/README.md) được task Wardrobe V1 cho phép deploy như nội dung demo tự tạo: giữ `fixture=true`, không nhập public catalog, không tái dùng fixture SVG Phase 0 và không thay gate export dữ liệu thật. State ghim package/config revision; OutfitSnapshot validator được dùng bởi local library và versioned demo share (P4-W09/P4-W10, 2026-10-04). Public catalog migration vẫn chưa triển khai.

### Contract Q08 — configurable project / fixture behavior (2026-10-02)

Các field khóa contract ngày 2026-10-02; trạng thái **khi chốt** chưa có runtime. Types/validators/reducer/renderer demo đã có từ 2026-10-03 theo scope DONE trong roadmap, không suy full game rule/asset completion. `slot` dùng enum nội bộ; silhouette slot chỉ định danh anchor, không item equip. Ví dụ dưới đây **tất cả fixture=true**, ID/code/revision giả cho logic, không dataset Sky:

| Tình huống fixture | Input / cấu hình | Kết quả contract |
|---|---|---|
| Single-item | policy accessory maxItems=1; equipped `[fixture-item-pin-a]`; equip `fixture-item-pin-b` | Reject overflow, giữ selection; replace tường minh mới đổi item |
| Multiple items | đổi config revision, policy accessory maxItems=2; equipped `[fixture-item-pin-a, fixture-item-pin-b]` | Hợp lệ nếu compatibility qua validate; item thứ ba bị reject; không suy accessory game cho phép 2 |
| Nhiều lớp | `fixture-item-wrap` → `fixture-binding-rear` zIndex=-1, `fixture-binding-front` zIndex=1; silhouette zIndex=0 | Rear → silhouette → front; nếu zIndex bằng nhau sort binding ID code-unit tăng dần, không dùng equip order |
| Override / tháo | base=`fixture-size-base`; rule `fixture-rule-small` priority=10, trigger `[fixture-item-resize]`, target=`fixture-size-small` | Equip → effective small, base giữ nguyên; tháo trigger khi không còn rule → effective base. “chibi override” chỉ là ví dụ hành vi |
| Priority | rule khác `fixture-rule-large` priority=20, target=`fixture-size-large`, cùng active | Effective large; tháo trigger của large → small; tháo tất cả → base |
| Conflict | hai rule có thể cùng active, priority=10, target size khác nhau | Validator error; runtime `rule_conflict` + IDs/cảnh báo. ID tie-break chỉ cho preview tạm deterministic, không là resolution hợp lệ |
| Missing anchor | model=`fixture-model-generic`, modelRevision=`fixture-r1`, effective=`fixture-size-small`, slot=cape, anchorName=`fixture-center`, asset=`fixture-asset-wrap`/`fixture-r1`, binding=`fixture-binding-rear`/`fixture-r2`; không có entry khớp toàn bộ key | `missing_anchor` hoặc `revision_mismatch` khi có calibration revision cũ; placeholder/bỏ layer có nhãn, không dùng anchor base/revision cũ |

`calibrationRevision` của anchor và binding phải khớp; ID anchor cũ không thay thế lookup key. Draft v1 trước Q08 dùng `anchorEntryId` đơn: contract mới dùng slot/anchor key + lookup theo effective size và asset/binding revisions để một binding hoạt động qua các size. Không có dữ liệu Wardrobe persisted/published trong repo cần migrate; nếu importer gặp dạng cũ sau này phải migrate tường minh bằng entry đã review hoặc reject, không tự dựng revision/anchor. `modelId` bổ sung cho SizeEntry/AnchorEntry ngăn collision giữa model có cùng revision. `fixture` bổ sung cho Asset/LayerBinding bảo vệ ranh giới demo.

Validator sau này phải kiểm tra FK, policy/capacity/duplicate equip, z-order ổn định, trigger applicability và conflict có thể cùng active; không coi stable tie-break là sửa conflict. Fixture rules/compatibility không áp lên catalog thật như game truth; dữ liệu thật phải có evidence/provenance tương ứng. Transform, scale đúng một lần và các trạng thái thiếu được khóa tại [Architecture](ARCHITECTURE.md#anchor-và-transform). Fixture SVG hiện tại chỉ minh họa lớp, không cung cấp ScaleTable/AnchorTable calibration.

## Outfit và profile — state local

`OutfitSnapshot {schemaVersion: integer, catalogVersion: string, id: ID?, name: string?, baseSizeCode: string, equippedBySlot: Record<slot, ID[]>, dyeByItemRegion: Record<ID, Record<regionId, color>>, savedAt: DateTime?}`. Q08 giữ representation mảng: cardinality theo SlotPolicy của config version được catalog/demo package ghim; fixture mặc định maxItems=1 cho cả sáu slot, multiple chỉ khi config cho phép. CatalogVersion ghim config revision cùng asset/rule/calibration ở implementation sau; config thay đổi phải validate lại hoặc migrate tường minh. Không persist effectiveSizeCode/renderLayers/appliedRuleIds; derive lại từ base và selection. Share projection loại `id/name/savedAt` nếu không cần, tuyệt đối không kèm QR/profile. Migration dùng alias/tombstone, không tự thay bằng item khác mà không báo. Fixture package version chỉ là định danh demo, không được giả làm public catalog thật.

`LocalPreferences {version, locale?, selectedMarket?, selectedPlatform?, filters, spoilerVisible, notificationsOptIn, theme?}`: đều local; field tùy chọn là đề xuất UX chứ không tự mở thêm scope tính năng. `QrProfileView` chưa khóa schema vì protocol chưa biết; chỉ quy định wrapper `{parseStatus: valid|unsupported|invalid, protocolVersion: string?, validatedDisplayData: object?}`. Không lưu payload thô theo mặc định, không dùng object chưa validate để render HTML hoặc mở link.

## News và moderation — K06/K14

`Article {id, revision: string, category: official|leak, title, summary, sourceProvenanceIds, officialEvidenceIds: ID[], factualStatus: official|unconfirmed|disputed|corrected, spoiler: boolean, publishedAt: DateTime?, updatedAt, recordStatus, fixture}` là projection public theo metadata/publication contract chung; `sourceProvenanceIds` là tham chiếu provenance của Article.

`EditorialRecord {id, articleId, state: draft|in_review|approved|rejected|withdrawn, reviewerRef: string?, reviewedAt: DateTime?, decisionNote: string?, sourceEvidenceRefs: string[], revision: string}` chỉ vận hành. Transition approved bắt buộc người duyệt + timestamp + revision nội dung; sửa nội dung làm mất approval cũ và quay review. Review leak không biến leak thành official. Chỉ projection có approval khớp revision và không withdrawn xuất public; không bundle EditorialRecord hoặc message raw.

## Validation và migration

- Kiểm tra ID duy nhất, FK tồn tại, không dangling season/spirit/item, tree acyclic và order route duy nhất.
- Giá/time/scale/coordinate kiểm tra miền giá trị; thời gian end không trước start nếu đủ precision; mixed currency không cộng thành một số.
- Chặn dữ liệu thật không provenance/source URL đã xác minh; giữ quarantine để sửa, không tự xóa record lỗi từ bản public trước.
- Chặn full asset pending, draft leak, fixture và private evidence trong production manifest.
- Migration có `fromVersion`, `toVersion`, alias mapping và báo cáo field mất; luôn giữ bản export cũ để rollback.
- Dataset public có thể thiếu module; app hiển thị unavailable thay vì lỗi toàn trang. Kiểm thử hành vi cụ thể nằm trong [Plan](plan/IMPLEMENTATION_PLAN.md).

Demo share implementation: xem [OUTFIT_SHARE](plan/OUTFIT_SHARE.md). Transport "#outfit=v1.<base64url-gzip>", payload allowlist selection + catalogVersion; tối đa 2048 ký tự fragment, 16 KiB UTF-8 sau giải nén, URL tổng tối đa 4096 ký tự. Không chứa local ID/name/savedAt, QR/profile hoặc asset URL. Mở link cần chọn áp dụng, không tự ghi thư viện. Khác revision báo không hỗ trợ; P4-W11 migration vẫn OPEN.
