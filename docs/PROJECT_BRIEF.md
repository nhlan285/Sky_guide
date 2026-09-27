# Sky: Children of the Light — Wardrobe & Community Hub
### Tài liệu tổng hợp (Project Brief) — dùng làm input để lập Implementation Plan

---

## 1. Mục tiêu sản phẩm

Web/app tổng hợp cho cộng đồng Sky: Children of the Light, gồm 2 trụ cột:

1. **Thử đồ (Wardrobe / Dress-up Tool)** — tính năng lõi, khác biệt hóa sản phẩm
2. **Hub thông tin cộng đồng** — season, event, Traveling Spirit, patch notes, leak (có kiểm duyệt), map/route guide, chi phí IAP thực tế

Nguyên tắc nền: **không cần đăng nhập**, **hoàn toàn miễn phí**, **không có tính năng trả phí**, deploy chi phí thấp/miễn phí.

---

## 2. Tính năng dự kiến (Feature List)

### 2.1 Wardrobe / Try-on
- Thử đồ theo lớp (layer): mask, tóc, cape, áo, quần, phụ kiện
- Size selector theo bảng mã (size 0, 1, 2, 3...)
- Auto-resize khi mang item đặc biệt (mask chibi → tự thu nhỏ nhân vật) — hệ thống rule-based override
- Tô màu (dye) trang phục khi thử
- Lưu/chia sẻ outfit qua link (không cần tài khoản)

### 2.2 Hub thông tin
- Database item/cosmetic (tên, giá, season, spirit sở hữu)
- Traveling Spirit tracker (lịch sử + dự đoán)
- Season/event hiện tại + đếm ngược
- Patch notes / tin chính thức
- Tin "leak" từ Discord — **có lớp duyệt thủ công**, không auto-publish
- Map theo season/realm, Map Shrine locations
- Route/walkthrough (đặc biệt Eye of Eden — nội dung "khó", nhiều người cần hướng dẫn)
- Chi phí IAP thực tế (quy đổi tiền thật → candle/heart cho từng item)

### 2.3 UX đặc biệt
- Đọc QR profile tài khoản Sky → hiển thị trực quan (tham khảo mô hình sky-profiles của thatskyapplication)
- Toàn bộ trạng thái lưu local (không server-side account)

---

## 3. Nguồn dữ liệu theo từng loại

| Loại data | Nguồn chính | Ghi chú |
|---|---|---|
| Item/cosmetic DB (tên, giá, slot) | Sky Wiki (Fandom) — có module dữ liệu cấu trúc, truy xuất qua MediaWiki API | Nội dung text CC-BY-SA; ảnh vẫn là IP của TGC |
| Spirit & Friendship Tree cost | Trang "Regular Spirits" trên Wiki | An toàn, dữ liệu text |
| Traveling Spirit lịch sử | Trang "Traveling Spirits" (Wiki) + spreadsheet cộng đồng "Sky TS Calculator" (tác giả ln.cookie) | Ghi nguồn khi dùng |
| Đồng bộ thời gian / countdown | **ThatSkyAPI** — JSON time theo giờ LA, hạ tầng chuẩn cộng đồng | Nên tích hợp thẳng, không tự tính lại |
| Patch notes chính thức | `thatgamecompany.helpshift.com/hc/en/17-sky-children-of-the-light/section/110-patch-notes/` | Dùng để đối chiếu chéo tin leak |
| Map / Map Shrine | Trang "Map Shrines" (Wiki) — có bản đồ độ phân giải cao + vị trí Children of Light theo khu | Một số map do cộng đồng vẽ (vd. Nastymold) — cân nhắc xin phép/tự vẽ lại |
| Route/walkthrough Eden & season | appunwrapper.com (blog walkthrough chi tiết) + video playlist dẫn trên Wiki | Diễn giải lại bằng lời văn riêng, không copy nguyên văn |
| Giá IAP thực tế | App Store/Google Play listing chính thức (public) + apppricinglab.com (theo dõi lịch sử giá tự động) | Dữ liệu công khai, không cần xin phép |
| Model/asset nhân vật & icon trang phục đầy đủ | **Đang chờ phản hồi từ TGC** (đã gửi câu hỏi qua Support trong game) | Tạm dùng icon Wiki làm placeholder, gắn nhãn rõ trong code để dễ thay thế |

---

## 4. Nền tảng/công cụ cộng đồng tham khảo (không tự làm lại)

- **thatskyapplication** (hệ sinh thái GitHub org): bot Discord **Caelus**, trang hiển thị **sky-profiles**, dịch vụ điều hướng **thatsky.link** — kiến trúc UX gọn, nên học theo, cân nhắc tích hợp/liên kết thay vì làm trùng
- **ThatSkyAPI** — hạ tầng thời gian chuẩn
- **Sky Wiki (Fandom)** — nguồn dữ liệu text chính
- `thatskymod` (mod kỹ thuật) — **chỉ tham khảo kiến trúc, KHÔNG tích hợp** (vi phạm ToS game)

---

## 5. Tham khảo UI/UX

| Sản phẩm | Nhận xét |
|---|---|
| **vithai.xyz** | Bố cục thừa nhiều khoảng trống, quá nhiều màu sắc gây rối mắt, UX chưa tối ưu |
| **thatskyapplication** (sky-profiles, thatsky.link) | UI/UX gọn, tiện dụng hơn — nên lấy làm chuẩn tham chiếu về mật độ thông tin và độ tối giản |

**Định hướng thiết kế**: tối giản, mật độ thông tin cao nhưng không rối; ưu tiên rõ ràng/tiện dụng hơn là trang trí màu mè; tránh khoảng trắng thừa kiểu vithai.

---

## 6. Nền tảng kỹ thuật

- **Deploy**: Vercel
- **Hình thái sản phẩm**: Web-app trước tiên (browser), có thể xuất dạng **PWA có thông báo** (tương tự hướng Antigravity đang làm) để tăng trải nghiệm giống app mà không cần build native ngay
- **Native app**: để nghiên cứu/triển khai sau, không phải ưu tiên giai đoạn đầu
- Ưu tiên kỹ thuật "càng native càng tốt" trong giới hạn web (PWA, responsive, offline-capable nếu khả thi)

---

## 7. Vấn đề pháp lý/quy trình đang xử lý song song

- Đã gửi câu hỏi qua **Support trong game (Helpshift ticket)** hỏi về:
  - Quyền dùng Sky Content Library cho tool tương tác
  - Xin quyền truy cập dữ liệu 3D wardrobe/cosmetics đầy đủ hơn
  - Xin được chỉ đúng team phụ trách IP/Creator Community nếu không thể hỗ trợ trực tiếp
- Trong lúc chờ phản hồi: xây phần Hub thông tin + khung UI Wardrobe trước (không bị chặn bởi việc xin phép); phần thử đồ dùng asset placeholder từ Wiki, sẵn sàng thay thế khi có asset chính thức

---

## 8. Việc chưa quyết định / cần làm rõ khi lập implementation plan

- Cấu trúc database (schema) để import dữ liệu từ Wiki API
- Cơ chế duyệt tin leak từ Discord (ai duyệt, quy trình, tool nào)
- Chi tiết kỹ thuật cho hệ anchor-point + scale table của model thử đồ (2D paper-doll ở giai đoạn đầu)
- Cách tích hợp ThatSkyAPI và apppricinglab.com vào pipeline dữ liệu
- Thiết kế cụ thể các widget/module trên trang chủ (hub) theo định hướng tối giản ở mục 5
