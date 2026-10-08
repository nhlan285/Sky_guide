# K02 — Wiki: Regular Spirits

- **Nguồn/link:** [Regular Spirits](https://sky-children-of-the-light.fandom.com/wiki/Regular_Spirits?oldid=101182), mẫu [Pointing Candlemaker](https://sky-children-of-the-light.fandom.com/wiki/Pointing_Candlemaker?oldid=110293). URL/revision được xác minh qua API ngày 2026-10-05.
- **Dữ liệu:** spirit và chi phí Friendship Tree; cần xác minh bảng/node, quan hệ điều kiện mở khóa, loại tiền và item tương ứng.
- **Format:** MediaWiki `action=query`, `format=json`, `formatversion=2`, `prop=revisions`, `rvprop=ids|timestamp|content`, `rvslots=main`; JSON envelope chứa wikitext và Lua renderer/data, không phải JSON tree.
- **Truy xuất đề xuất:** xác minh trang và revision; ưu tiên đường MediaWiki đã xác minh ở K01 nếu phù hợp; nếu chưa parse được thì biên tập text có nguồn. Chuẩn hóa Spirit, FriendshipNode, CurrencyAmount, không suy luận cạnh tree bị thiếu.
- **Rủi ro/ghi chú nguyên văn:** “An toàn, dữ liệu text”.
- **Trạng thái:** P1-D02 DONE cho một mẫu được đối chiếu thủ công; chưa có adapter/runtime hoặc coverage mọi spirit. Phần text Wiki vẫn theo lưu ý CC-BY-SA tại K01; không mở rộng sang ảnh.
- **Thiếu:** canonical spirit/item/realm crosswalk, optional từng node, cost root emote không được khai báo, custom/updated/Tier2 tree chưa đối chiếu.
- **Đầu ra chấp nhận:** cây không chu trình, node có nguồn, phân biệt chi phí từng node và tổng theo đường mở khóa, chi phí unknown không thành 0.
- **Tham chiếu:** [Schema](../docs/DATA_SCHEMA.md), [K01](01-wiki-items.md).

## Mẫu đã đối chiếu — 2026-10-05

[Evidence](evidence/k02-regular-spirit-tree-2026-10-05.json) giữ endpoint,
request/revision/retrievedAt/checksum, attribution và mapping. Bốn response nhỏ
HTTP200 không warning/error; raw trên E:, không thực thi Lua hay tải ảnh.
Template Friendship Tree71718 → renderer106368; Cost88945 → renderer89344/data89343.
Spirit Item/data98798 từ K01 cung cấp default, renderer xác nhận cơ chế fallback.

| Node nguồn | Parent đã review | Cost / bằng chứng |
| --- | --- | --- |
| C1 emote | — | unknown; module không có default, không tự gán free |
| L1 emote2 | C1 | 1 C, page explicit |
| R1 hair | C1 | free, page explicit và prose |
| C2 spell1 | C1 | 1 C, default ghim revision + index prose |
| L2 heart | C2 | 3 C, default + index nói mở sau blessing1 C |
| C3 wing | C2 | 1 AC, page override; không lấy generic2 AC |
| C4 emote3 | C3 | 2 C, page explicit |
| L4 emote4 | C4 | 2 C, page explicit |
| R4 Outfit | C4 | 4 H, page explicit + prose fourth node/Wing Buff |
| C5 spell5 | C4 | 5 C, default + index prose |

Chín cạnh được review từ prose về trunk/prerequisite, mô tả page và connector
renderer original-format; không suy graph chỉ từ vị trí ảnh. Graph không chu trình.
Nguồn C/H/AC được xác nhận bằng Cost/data: Candle/Heart/Ascended Candle. AC vào
`CurrencyAmount.currency=other`, giữ `sourceCurrencyLabel=AC`; không cộng với C.
Giá thiếu khác miễn phí. Root C1 giữ unknown dù subtotal khớp bảng index.

Known subtotal toàn cây14 C +4 H +1 AC; `complete=false` do C1 unknown.
Đường Outfit gồm C1,C2,C3,C4,R4: subtotal3 C +4 H +1 AC, chưa phải full price.
Outfit + emote4 chỉ tính trunk chung một lần: subtotal5 C +4 H +1 AC,
`complete=false`. Đây là dẫn xuất của revision mẫu, không khẳng định giá game hiện tại.
Điều kiện relive memory/return tại temple được giữ riêng, không biến thành cost0.

Mapping: tên/category từ prose; realm/Spirit/item FK cần crosswalk; node key phải
scoped tree/variant/revision; `optional=null`; parent/cost có provenance riêng.
Outfit không ép vào top/bottom. Format `friendship_update`, `vert` override, nhánh
sparse/custom cần sample riêng trước adapter P2-D06. CORS/rate policy giữ unknown
cho integration; HTTP observation K01 không thay nghiệm thu browser K02.
