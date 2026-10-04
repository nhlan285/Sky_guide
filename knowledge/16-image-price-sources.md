# Ảnh và giá item — hồ sơ xác minh nguồn, 2026-10-04

Phạm vi: chuẩn bị nguồn/mapping cho crawler sau này; chưa import thêm giá hay ảnh
vào catalog. Thị trường được user chọn: **USD/US và VND/VN, tách iOS/Android**.
[Evidence JSON](evidence/image-price-sources-2026-10-04.json) chứa mẫu nhỏ, phiên
bản, trạng thái truy xuất và các giới hạn; không chứa corpus hay toàn bộ bài Wiki.
[Plan hiện tại](../docs/plan/ITEM_IMAGES_PRICE_SOURCES.md).

## Nguồn đã kiểm tra và mức sử dụng

| Nguồn | Truy xuất thực tế | Có thể cung cấp | Giới hạn / quyết định |
|---|---|---|---|
| Sky Wiki (K01/K02/K03) | MediaWiki API `query/revisions` và `imageinfo` trả 200 JSON | Trang item, cây mùa/TS, lịch sử, shop, file gốc và metadata ảnh | Nội dung revision là wikitext/Lua, không phải JSON nghiệp vụ; mẫu xác minh không chứng minh toàn bộ coverage |
| **SkyGame-Data / Sky Planner**, nguồn bổ sung ứng viên | Package `skygame-data@1.3.19`, JSON envelope `{items:[]}`, 10 tập dữ liệu đã đọc | Item/icon/preview, node/currency, tree, lần TS/special visit, IAP, shop và item-list | Chưa có adapter/approval xuất dữ liệu; ID riêng; giá USD cộng đồng thiếu platform/market/date từng SKU |
| ThatSkyApplication (K15, đang dùng) | Utility ghim commit `74007cf878ef44c764eb5a143ef01d4c80982509` | Catalogue, seasonal/current offers và 4 nhóm shop | `current` không mặc nhiên là lần TS; `money` thiếu currency/platform không tự thành USD |
| TGC patch notes (K06) | Trang Help Center 0.25.0 đọc được | Kiểm chứng shop Nesting, Challenge Board, sự kiện, IAP lịch sử | Không phải feed mọi SKU hoặc giá checkout từng thị trường |
| Apple App Store (K10) | US listing đọc được; VN cùng App ID trả 404 | Một số tên gói và giá iOS USD công khai | Danh sách giới hạn, nhãn trùng; chưa có SKU/contents đầy đủ. 404 không chứng minh game không hoạt động ở VN |
| Google Play (K11) | US/VN listing trả 200 HTML qua Node; web reader lỗi | Xác minh package/market; chỉ thấy thông tin giá tổng quát | Chưa xác minh giá từng SKU Android USD/VND; app miễn phí khác IAP miễn phí |
| AppPricingLab (K12) | Home đọc được | Ứng viên đối chiếu lịch sử giá | Chưa xác minh record Sky, API/export, độ phủ hay điều kiện dịch vụ |
| Sky Web Store (TGC/Xsolla) | FAQ chính thức xác nhận liên kết cửa hàng | Kênh mua riêng, có thể dùng để đối chiếu offer | Không gán giá web sang iOS/Android; không login/checkout. Schema hiện tại chưa có platform web |

**Chưa thể xác minh “tất cả item” bằng một nguồn.** Không có dữ liệu thì giữ unknown,
không giá 0, không tự quy đổi USD ↔ VND. Full image rights vẫn theo K13; metadata
nguồn mới không tự mở gate. Không tải ảnh mới trong lần nghiên cứu này.

## Nguồn JSON bổ sung: SkyGame-Data

Nguồn gốc: [Silverfeelin/SkyGame-Data](https://github.com/Silverfeelin/SkyGame-Data).
Commit GitHub quan sát: `2edbca149787aadbdd7665458c56ceecc5a5be07` (2026-10-03).
Package thực tế `1.3.19` có gitHead `5b9afacf02f8c6b93198aabf94a8c5d82a9d4c6b`.
**Đó là hai snapshot khác nhau**; số lượng/mẫu dưới đây thuộc package, không ghép
commit mới của GitHub vào attribution package.

URL đã kiểm tra có dạng
`https://unpkg.com/skygame-data@1.3.19/assets/<dataset>.json`:

| Dataset | Records quan sát | Quan hệ cần dùng |
|---|---:|---|
| items | 3.319 | GUID, ID nguồn, type/name, icon/preview, Wiki anchor |
| nodes | 6.103 | item/hiddenItems, chi phí, cạnh `n/ne/nw` |
| spirits | 273 | spirit → tree mùa/thường |
| spirit-trees | 578 | tree → root node |
| traveling-spirits | 175 | visit date, spirit GUID, tree GUID |
| special-visits | 17 | nhóm spirit quay lại, date/endDate |
| special-visit-spirits | 62 | record nhóm → spirit/tree |
| shops | 195 | shop → itemList hoặc tree/IAP tùy record |
| item-lists | 29 | list → từng item/quantity/cost |
| iaps | 526 | gói, contents, USD reference price |

README hiện nhắc `returning-spirits`, nhưng file package đó trả **404**; tên đã
xác minh là `special-visits` và `special-visit-spirits`. Không code theo tên đoán.
README nói GUID length 10, numeric ID phục vụ riêng Planner: không dùng numeric
ID để nối với TSA. Ví dụ Planner ID **1380** là Cape của Anxious Angler, tương ứng
TSA **1216**, không phải `tsa-cosmetic-1380`.

License data repo MIT; ghi attribution Silverfeelin và giữ notice nếu triển khai
adapter. [Planner LICENSE](https://github.com/Silverfeelin/SkyGame-Planner/blob/master/LICENSE)
loại trừ `/assets/game/*`, `/assets/external/*`, `/assets/icons/*`. Không suy ra
ảnh đó được MIT cho phép rehost. Icon/preview URL chỉ là provenance/candidate;
không đưa URL cộng đồng vào runtime thay manifest R2 được kiểm soát.

Các declaration **của chính package 1.3.19** cũng trả 200:
`dist/interfaces/cost.interface.d.ts`, `node.interface.d.ts`, `iap.interface.d.ts`.
Chúng xác nhận `c/h/sc/sh/ac/ec` tương ứng candles/hearts/seasonal candles/
seasonal hearts/ascended candles/event currency; `IIAP.price` là USD. Điều đó
xác minh currency reference, nhưng vẫn **không** xác minh platform hoặc thuế.

## Mẫu nối item → giá qua lần ghé

[Anxious Angler](https://sky-children-of-the-light.fandom.com/wiki/Anxious_Angler#Cape),
revision **110817**, 2026-09-01T19:58:22Z:

- Cape: Traveling Spirit **70 candles**; lần TS 2024-01-18; special visit 2025-08-18.
- Giá lúc mùa: phần thưởng cần Season Pass, sau nút thứ 5. **62 seasonal candles
  là tổng điều kiện mở các nút trước đó**, không phải giá riêng của Cape.
- Package: item GUID `Q0E7lpa192`, spirit `4gwH1Tn9he`; visit `8WZvXQFo6n`
  ngày `2024-01-18` → tree `NdB6VF6E1G` → node `9in0prFSJ_` → cùng item,
  `c:70`. Đã duyệt cây từ root qua `n/ne/nw`; không chỉ tìm node rời rồi đoán TS.
- Special-visit-spirit `J8STDoY-Ow` → tree `R2WmeZDMqd` cũng có Cape 70 C,
  đã nối với group `TSbUGdWmTY` ngày 2025-08-18 đến 2025-08-31; giữ riêng
  lần quay lại theo nhóm này, không gộp với TS 2024.
- Existing K15 ghi Cape current 70 candles, seasonal cần pass nhưng cost unknown.
  Đây là đối chiếu nguồn; chưa sửa seasonal cost hay gọi tất cả current là TS.

Ngày `YYYY-MM-DD` giữ precision=date và quy tắc reset America/Los_Angeles của
nguồn, không gắn giờ UTC giả. Future adapter phải lưu từng visit/tree version.
Ultimate gifts không mặc nhiên có giá TS; chỉ thêm offer khi có nguồn chứng minh.

## Shop ngoài cây spirit: Nesting

[Nesting Workshop](https://sky-children-of-the-light.fandom.com/wiki/Nesting_Workshop),
revision **111593**, 2026-09-28T14:55:01Z, và
[TGC patch 0.25.0](https://thatgamecompany.helpshift.com/hc/en/17-sky-children-of-the-light/faq/1308-patch-notes---april-10-2024---0-25-0-257483-android-huawei-256148-ios-playstation-257607-pc-255731-switch/?l=en)
xác nhận phải phân biệt display stands mùa, permanent counter/rotation và ba
Challenge Board trees. Không ép mọi offer thành spirit tree.

Mẫu package: shop `he4MHA7_uC` → itemList `AKNI67tVW-`:

| Item | Package raw | Wiki đối chiếu | Cách xử lý |
|---|---|---|---|
| Stone Small Bench (Wiki: Stone Single Bench) | `c:32, quantity:4` | Bản đầu 8 C; ba bản thêm 32 C theo mô tả trang | Giữ raw và điều kiện sở hữu; chưa diễn giải package thành đơn giá hoặc tổng toàn bộ 4 bản |
| Stone Wood-Fired Oven | `ac:35, quantity:1` | 35 AC, một bản trong bảng rotation | Đủ sample mapping AC; availability theo rotation là dữ liệu khác |
| Stone Single Bed | `h:24, quantity:1` | 24 H, một bản | Giữ heart, không đổi sang candle |
| Stone Stool | `quantity:1`, thiếu cost | Chưa đối chiếu giá mẫu này | unknown; không free |

Bench cho thấy schema future cần quantity, first/additional ownership và price
basis (unit/set/additional/cumulative/unknown). Những field chưa có trong schema
hiện tại giữ trong source evidence/quarantine, **chưa migration schema lúc này**.
Không lấy phép chia 32/4 hoặc 32/3 để tạo giá niêm yết mới.

## Ảnh: thêm nguồn và chọn đúng loại

Wiki `imageinfo` cho file
`SOAbyss-Anxious-Angler-cape-Morybel-0146.png`: page 9935, 300×300, PNG,
18.168 bytes, uploader Morybel, timestamp 2023-08-18T15:55:24Z và SHA-1 trong
evidence. `extmetadata` không trả grant/license ảnh. Lưu cả file-description URL.
SkyGame-Data có `icon`, `previewUrl` và đôi khi `dye.previewUrl`: cần phân loại
icon / ảnh mặc / mặt trước-sau / swatch màu, không coi tất cả là primary.

Icon nhỏ vẫn mờ khi phóng to. Future crawl nên ưu tiên ảnh mặc đủ độ phân giải
cho gallery, giữ icon cho nhận diện; kiểm tra kích thước, signature/hash, duplicate,
association, nguồn và quyền trước publish. Không upsample để giả ảnh chất lượng.
TGC news/press có thể thêm ảnh đối chiếu nhưng chưa xác minh feed ảnh bao phủ
catalog. Ảnh từ video/social là ứng viên tham khảo; không tự rip hoặc rehost.

## Giá tiền thật theo thị trường/nền tảng

| Platform | Market / currency | Đã xác minh | Chưa đủ |
|---|---|---|---|
| iOS | US / USD | [App Store US](https://apps.apple.com/us/app/sky-children-of-the-light/id1462117269): Starter Pack 4.99; Season Pass Regular 9.99; Season Pass Pack 19.99 | storeProductId, tất cả cosmetic SKU, contents/tax/promo/date hiệu lực |
| iOS | VN / VND | Cùng App ID URL `/vn/` trả 404 ngày kiểm tra | Giá VND; storefront/listing/SKU thực tế cần xác minh riêng |
| Android | US / USD | [Google Play US](https://play.google.com/store/apps/details?id=com.tgc.sky.android&hl=en&gl=US), package `com.tgc.sky.android`, HTTP 200 | Giá từng IAP SKU, contents, tax/promo |
| Android | VN / VND | [Google Play VN](https://play.google.com/store/apps/details?id=com.tgc.sky.android&hl=vi&gl=VN), HTTP 200; có thông tin tổng quát theo vùng | Giá từng IAP SKU; giá app 0 VND trong metadata không phải giá IAP |

`hl=vi` là ngôn ngữ; không biến storefront US thành VN. Không suy Android từ iOS.
Store page thường chỉ một phần danh sách, có related apps: extractor phải scope
đúng app ID/package, không quét mọi số tiền trên HTML rồi gắn cho Sky.

SkyGame-Data Starter Pack reference 4.99 USD với 20 candles + item GUID riêng;
trùng giá Apple không tự xác nhận cả bundle/SKU/platform. K15 `money` tiếp tục raw.
Patch 0.25.0 có các giá USD IAP Cinnamoroll thời 2024 (ví dụ Mini Companion 6.99),
chỉ là historical offer/reference, không phải giá hiện nay hay VND.

[Sky Web Store FAQ](https://thatgamecompany.helpshift.com/hc/en/17-sky-children-of-the-light/faq/1268-what-is-the-sky-web-store/)
liên kết `store.thatskygame.com`, mô tả Sky ID và các offer riêng; kênh web phải
được mô hình hóa riêng trước khi import. Không dùng để thay giá iOS/Android.
AppPricingLab mới là candidate: không hứa có API Sky hay lịch sử miễn phí.

## Mapping cho crawler sau này (đề xuất, chưa triển khai)

| Upstream | Đích hiện có / việc cần làm |
|---|---|
| item GUID / `_wiki.href` / TSA numeric ID | Crosswalk source-scoped → Item.id; ưu tiên Wiki page+anchor/spirit/season/type; tên chỉ candidate, ambiguous quarantine |
| spirit, visit, tree, nodes | Spirit/TravelingVisit/FriendshipTree/FriendshipNode + AcquisitionOption; giữ phiên bản, node prerequisites và direct cost riêng |
| `c/h/sc/sh/ac/ec` | CurrencyAmount: candle/heart cho C/H; các loại khác giữ `other` + sourceCurrencyLabel chính xác |
| shop + itemList + row GUID | AcquisitionOption kind other + provenance; proposal metadata quantity/rotation/ownership trước adapter |
| IAP item refs, c/sc/sp contents | IapProduct bundle contents, không phân bổ giá gói thành giá từng cosmetic |
| Store price + verified SKU/platform/market | PriceObservation K10/K11; decimal string, observation time, tax/promotion unknown nếu thiếu |
| Candidate community USD / official news / web price | Source evidence/reference trước; schema hiện giới hạn PriceObservation K10/K11/K12 và IapProduct ios/android, cần quyết định riêng nếu mở rộng |
| icon/preview/imageinfo | Asset candidate/provenance + loại view/kích thước/hash; legalStatus riêng, chỉ publish theo gate hiện hành |

Offer identity tối thiểu đề xuất: source + record + item + channel/tree/visit/shop
+ currency + quantity/ownership + validity/version. Giá theo thời điểm khác nhau
không bị overwrite bằng một `currentPrice`. Store observedAt khác validFrom.
Source-code MIT, Wiki text attribution và artwork permission là ba phạm vi khác.

## Thứ tự thực hiện phase crawler tiếp theo

1. Duyệt source contracts; ghim version/revision, attribution và raw evidence policy.
   Fixtures chỉ là mẫu nhỏ được đánh dấu; không sửa parser để hợp thức hóa lỗi.
2. Tạo crosswalk có confidence/review queue; audit unmapped/ambiguous theo item,
   season, spirit, shop. Không dùng số lượng source làm bằng chứng catalog đầy đủ.
3. Adapter offers: seasonal/thường, từng TS/special visit, permanent/rotating shop,
   challenge/pass/prerequisites; xác minh Bench ownership semantics trước publish.
4. Adapter ảnh dùng discovery pipeline hiện có, metadata trước; photo quality/rights
   review; download có giới hạn trên E: sau khi scope được duyệt, không thay corpus.
5. Price capture iOS-US, Android-US, iOS-VN, Android-VN độc lập; SKU chưa public
   dùng nhập quan sát được kiểm duyệt. Không crawl phiên đăng nhập/checkout.
6. Validate graph/references/currency/time/quantity, diff với nguồn độc lập, lưu
   quarantine và last-known-good; replay schema-change fixtures trước publish.
7. Coverage report per item/per channel: verified / source_only / conflict /
   missing. Các blocker hiện có: VND per-SKU, Android per-SKU, mappings đầy đủ,
   currency/ownership variants, quyền ảnh và source freshness.

Task này hoàn thành ở nghiên cứu và UI; roadmap nguồn tổng thể vẫn OPEN.
