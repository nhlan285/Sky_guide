import type { Category, Acquisition } from '../../data/itemLookup/model.ts'
import type { Locale } from '../../shared/i18n/translations.ts'

interface ItemCopy {
  title: string; subtitle: string; search: string; placeholder: string; filters: string; category: string; slot: string; season: string; spirit: string; acquisition: string; all: string; clear: string
  results: string; empty: string; emptyHint: string; previous: string; next: string; page: string; open: string; back: string; notFound: string; unknown: string; unknownCost: string; free: string
  identity: string; origin: string; dataQuality: string; sources: string; sourceBadge: string; upstreamId: string; identifier: string; revision: string; snapshot: string; imported: string; credit: string; license: string; caveat: string; imageNote: string
  offers: string; noOffers: string; pass: string; bundle: string; money: string; priceNote: string; qualityNote: string; unavailable: string; browse: string; total: string
  categories: Record<Category, string>; acquisitions: Record<Acquisition, string>; slots: Record<string, string>; currencies: Record<string, string>
}
export const itemCopy: Record<Locale, ItemCopy> = {
  vi: {
    title: 'Tra cứu vật phẩm', subtitle: 'Tìm một cái tên, khám phá mùa và spirit phía sau. Danh mục cộng đồng, được ghim theo nguồn.',
    search: 'Tìm trong danh mục', placeholder: 'Tên tiếng Anh hoặc ID nguồn…', filters: 'Bộ lọc', category: 'Loại vật phẩm', slot: 'Slot đã xác minh', season: 'Mùa', spirit: 'Spirit', acquisition: 'Cách nhận', all: 'Tất cả', clear: 'Xóa bộ lọc',
    results: 'kết quả', empty: 'Không tìm thấy vật phẩm phù hợp', emptyHint: 'Thử tên tiếng Anh, ID nguồn hoặc bớt bộ lọc.', previous: 'Trang trước', next: 'Trang sau', page: 'Trang', open: 'Xem chi tiết', back: 'Về danh mục', notFound: 'Không tìm thấy vật phẩm',
    unknown: 'Chưa xác minh', unknownCost: 'Chưa xác minh giá', free: 'Miễn phí', identity: 'Thông tin vật phẩm', origin: 'Nguồn gốc', dataQuality: 'Độ đầy đủ dữ liệu', sources: 'Nguồn và ghi công', sourceBadge: 'TSA · cộng đồng', upstreamId: 'ID ThatSkyApplication', identifier: 'Định danh gốc', revision: 'Revision nguồn',
    snapshot: 'Bản dữ liệu đã ghim · không phải dữ liệu live', imported: 'Nhập ngày', credit: 'Dữ liệu được chuyển đổi từ gói utility công khai của ThatSkyApplication, một dự án cộng đồng độc lập.', license: 'Giấy phép MIT và ghi công',
    caveat: 'Phạm vi V1: định danh/tên, cây spirit, mùa và bốn danh mục shop. Giá/sự kiện chưa được nhập đầy đủ; các mục khác hiện chưa có dữ liệu live.', imageNote: 'Biểu tượng loại tự tạo; không phải hình vật phẩm.',
    offers: 'Cách nhận và giá trong nguồn', noOffers: 'Chưa nhập được thông tin cách nhận hoặc giá cho vật phẩm này.', pass: 'Cần Season Pass theo nguồn', bundle: 'Giá của cả gói, không phải giá riêng vật phẩm', money: 'Giá trị money trong nguồn; chưa xác minh đơn vị tiền/thị trường',
    priceNote: 'Các biến thể dưới đây thuộc bản nguồn đã ghim; không khẳng định đang bán hoặc tổng chi phí mở khóa. Giá thiếu không có nghĩa là miễn phí.', qualityNote: 'Unknown được giữ nguyên. Loại/slot chỉ được gán khi có bằng chứng rõ; outfit và giày không bị ép vào top/bottom.',
    unavailable: 'Danh mục chưa sẵn sàng. Dữ liệu đã ghim không vượt qua kiểm tra; thử tải lại hoặc quay về Hub.', browse: 'Mở toàn bộ danh mục', total: 'vật phẩm trong danh mục',
    categories: { hair: 'Tóc', mask: 'Mặt nạ', 'face-accessory': 'Phụ kiện mặt', cape: 'Áo choàng', outfit: 'Trang phục', shoes: 'Giày', 'head-accessory': 'Phụ kiện đầu', 'neck-accessory': 'Phụ kiện cổ', prop: 'Đạo cụ / nhạc cụ', 'music-sheet': 'Bản nhạc', expression: 'Biểu cảm / tiếng gọi', other: 'Khác', unknown: 'Chưa phân loại' },
    acquisitions: { 'spirit-current': 'Cây spirit · current', 'spirit-seasonal': 'Cây spirit · trong mùa', 'season-items': 'Vật phẩm theo mùa', shop: 'Shop / gói', default: 'Có sẵn ban đầu', unknown: 'Chưa xác minh' },
    slots: { hair: 'Tóc', mask: 'Mặt nạ', cape: 'Áo choàng', accessory: 'Phụ kiện', top: 'Áo', bottom: 'Quần', unknown: 'Chưa xác minh' },
    currencies: { candles: 'Nến', hearts: 'Tim', ascendedCandles: 'Nến thăng hoa', seasonalCandles: 'Nến mùa', seasonalHearts: 'Tim mùa', eventTickets: 'Vé sự kiện' },
  },
  en: {
    title: 'Item lookup', subtitle: 'Find a name. Discover its season and spirit. A community catalogue with pinned sources.', search: 'Search the catalogue', placeholder: 'English name or source ID…', filters: 'Filters', category: 'Category', slot: 'Verified slot', season: 'Season', spirit: 'Spirit', acquisition: 'Acquisition', all: 'All', clear: 'Clear filters',
    results: 'results', empty: 'No matching items', emptyHint: 'Try an English name, source ID or fewer filters.', previous: 'Previous', next: 'Next', page: 'Page', open: 'View details', back: 'Back to catalogue', notFound: 'Item not found', unknown: 'Not verified', unknownCost: 'Cost not verified', free: 'Free',
    identity: 'Item identity', origin: 'Origin', dataQuality: 'Data completeness', sources: 'Sources and credits', sourceBadge: 'TSA · community', upstreamId: 'ThatSkyApplication ID', identifier: 'Original identifier', revision: 'Source revision', snapshot: 'Pinned dataset · not live data', imported: 'Imported on',
    credit: 'Catalogue data adapted from the public ThatSkyApplication utility package, an independent community project.', license: 'MIT license and attribution', caveat: 'V1 scope: identities/names, spirit trees, seasons and four shop catalogues. Prices/events are incomplete; other sections have no live data yet.', imageNote: 'Self-created category glyph; not item artwork.',
    offers: 'Source acquisition and costs', noOffers: 'Acquisition and costs for this item have not been imported.', pass: 'Season Pass required according to source', bundle: 'Price covers the entire bundle, not this individual item', money: 'Source money value; currency/market not verified', priceNote: 'These variants belong to the pinned source. They do not confirm current availability or total unlock costs. Missing prices do not mean free.', qualityNote: 'Unknowns are preserved. Category/slot require clear evidence; outfits and shoes are not forced into top/bottom.',
    unavailable: 'Catalogue unavailable. The pinned dataset failed validation; reload or return to the Hub.', browse: 'Browse the full catalogue', total: 'catalogue items',
    categories: { hair: 'Hair', mask: 'Mask', 'face-accessory': 'Face accessory', cape: 'Cape', outfit: 'Outfit', shoes: 'Shoes', 'head-accessory': 'Head accessory', 'neck-accessory': 'Neck accessory', prop: 'Prop / instrument', 'music-sheet': 'Music sheet', expression: 'Expression / call', other: 'Other', unknown: 'Unclassified' },
    acquisitions: { 'spirit-current': 'Spirit tree · current', 'spirit-seasonal': 'Spirit tree · seasonal', 'season-items': 'Season items', shop: 'Shop / pack', default: 'Unlocked by default', unknown: 'Not verified' },
    slots: { hair: 'Hair', mask: 'Mask', cape: 'Cape', accessory: 'Accessory', top: 'Top', bottom: 'Bottom', unknown: 'Not verified' },
    currencies: { candles: 'Candles', hearts: 'Hearts', ascendedCandles: 'Ascended candles', seasonalCandles: 'Seasonal candles', seasonalHearts: 'Seasonal hearts', eventTickets: 'Event tickets' },
  },
}
