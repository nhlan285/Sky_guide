import type { Locale } from '../../shared/i18n/translations'

const vi = {
  title: 'Wardrobe', subtitle: 'Một dáng hình. Nhiều cách phối.', demo: 'Demo tự tạo',
  disclosure: 'Hình và thông số hiện tại là placeholder tự tạo, không phải tài nguyên Sky và chưa được đối chiếu với game.',
  picker: 'Chọn đồ', outfit: 'Đang mặc', colors: 'Màu sắc', preview: 'Bản phối của bạn',
  previewLabel: 'Paper-doll demo tự tạo với các lớp đồ đang chọn', empty: 'Chưa chọn', equipped: 'Đang mặc', available: 'Có thể chọn',
  equip: 'Mặc', replace: 'Thay đồ', unequip: 'Tháo', resetSlot: 'Xóa nhóm này', resetOutfit: 'Xóa bản phối',
  random: 'Phối ngẫu nhiên', size: 'Tỷ lệ demo', sizeNote: 'Các tỷ lệ tự tạo; không phải cỡ nhân vật trong game.',
  effective: 'Tỷ lệ đang hiển thị', base: 'Tỷ lệ bạn chọn', noDye: 'Không hỗ trợ đổi màu', dyeHint: 'Chọn đồ ở nhóm bên cạnh để chỉnh vùng màu được hỗ trợ.',
  resetRegion: 'Màu mặc định', resetColors: 'Đặt lại màu của món này', controls: 'Chỉnh bản phối',
  error: 'Thao tác chưa hợp lệ. Bản phối trước đó được giữ lại.', renderError: 'Một số lớp thiếu hình hoặc calibration phù hợp; lớp đó đã được bỏ khỏi preview.',
  layerHint: 'Áo choàng có lớp sau và lớp vai phía trước.', session: 'Bản phối chỉ giữ trong phiên editor hiện tại.',
  slots: { mask: 'Mặt', hair: 'Tóc', cape: 'Choàng', top: 'Áo', bottom: 'Quần', accessory: 'Phụ kiện' },
  sizes: ['Nhỏ', 'Vừa', 'Tiêu chuẩn', 'Cao'], palette: ['Xanh sương', 'Cát', 'Hồng đất', 'Xanh lam', 'Lá nhạt', 'Ngà'],
}
const en: typeof vi = {
  title: 'Wardrobe', subtitle: 'One silhouette. Many possibilities.', demo: 'Self-created demo',
  disclosure: 'The shapes and measurements are self-created placeholders, not Sky assets and not calibrated against the game.',
  picker: 'Choose items', outfit: 'Current outfit', colors: 'Colors', preview: 'Your composition',
  previewLabel: 'Self-created demo paper doll wearing the selected item layers', empty: 'None selected', equipped: 'Equipped', available: 'Available',
  equip: 'Equip', replace: 'Replace item', unequip: 'Remove', resetSlot: 'Clear category', resetOutfit: 'Clear outfit',
  random: 'Random outfit', size: 'Demo scale', sizeNote: 'Self-created proportions, not in-game character sizes.',
  effective: 'Displayed scale', base: 'Your base scale', noDye: 'Color changes unsupported', dyeHint: 'Choose an item in the picker to edit supported color regions.',
  resetRegion: 'Default color', resetColors: 'Reset this item’s colors', controls: 'Edit outfit',
  error: 'This action is invalid. Your previous selection has been kept.', renderError: 'Some layers lack matching geometry or calibration and were omitted from the preview.',
  layerHint: 'Capes include a rear layer and a front shoulder layer.', session: 'This outfit stays in the current editor session only.',
  slots: { mask: 'Face', hair: 'Hair', cape: 'Cape', top: 'Top', bottom: 'Bottom', accessory: 'Accessory' },
  sizes: ['Small', 'Medium', 'Standard', 'Tall'], palette: ['Mist', 'Sand', 'Clay rose', 'Blue', 'Sage', 'Ivory'],
}
export const wardrobeCopy: Record<Locale, typeof vi> = { vi, en }
