export type Locale = 'vi' | 'en';
export type TranslationKey =
  | 'nav.home' | 'nav.itemLookup' | 'nav.wardrobe' | 'nav.about'
  | 'landing.title' | 'landing.subtitle' | 'landing.enter'
  | 'landing.theme.auto' | 'landing.theme.daylight' | 'landing.theme.sunset' | 'landing.theme.night'
  | 'hub.title' | 'hub.season' | 'hub.ts' | 'hub.news' | 'hub.items' | 'hub.wardrobe' | 'hub.maps' | 'hub.community'
  | 'hub.unavailable' | 'hub.comingSoon'
  | 'feature.wardrobe' | 'feature.items' | 'feature.ts' | 'feature.seasons' | 'feature.news' | 'feature.maps'
  | 'feature.wardrobe.desc' | 'feature.items.desc' | 'feature.ts.desc' | 'feature.seasons.desc' | 'feature.news.desc' | 'feature.maps.desc'
  | 'status.building' | 'status.unavailable' | 'status.comingSoon'
  | 'a11y.skipNav' | 'a11y.mainNav'
  | 'lang.vi' | 'lang.en';

export const translations: Record<Locale, Record<TranslationKey, string>> = {
  vi: {
    'nav.home': 'Trang chủ',
    'nav.itemLookup': 'Tìm vật phẩm',
    'nav.wardrobe': 'Tủ đồ',
    'nav.about': 'Giới thiệu',
    'landing.title': 'Sky Guide',
    'landing.subtitle': 'Cẩm nang cộng đồng',
    'landing.enter': 'Khám phá',
    'landing.theme.auto': 'Tự động',
    'landing.theme.daylight': 'Ban ngày',
    'landing.theme.sunset': 'Hoàng hôn',
    'landing.theme.night': 'Ban đêm',
    'hub.title': 'Trung tâm',
    'hub.season': 'Mùa giải',
    'hub.ts': 'Tinh linh du hành',
    'hub.news': 'Tin tức',
    'hub.items': 'Vật phẩm',
    'hub.wardrobe': 'Tủ đồ',
    'hub.maps': 'Bản đồ',
    'hub.community': 'Cộng đồng',
    'hub.unavailable': 'Không khả dụng',
    'hub.comingSoon': 'Sắp ra mắt',
    'feature.wardrobe': 'Tủ đồ',
    'feature.items': 'Vật phẩm',
    'feature.ts': 'TS',
    'feature.seasons': 'Mùa giải',
    'feature.news': 'Tin tức',
    'feature.maps': 'Bản đồ',
    'feature.wardrobe.desc': 'Quản lý tủ đồ của bạn',
    'feature.items.desc': 'Tìm kiếm vật phẩm',
    'feature.ts.desc': 'Thông tin tinh linh',
    'feature.seasons.desc': 'Hướng dẫn mùa',
    'feature.news.desc': 'Cập nhật mới nhất',
    'feature.maps.desc': 'Bản đồ Sky',
    'status.building': 'Đang xây dựng',
    'status.unavailable': 'Không khả dụng',
    'status.comingSoon': 'Sắp ra mắt',
    'a11y.skipNav': 'Bỏ qua điều hướng',
    'a11y.mainNav': 'Điều hướng chính',
    'lang.vi': 'VI',
    'lang.en': 'EN'
  },
  en: {
    'nav.home': 'Home',
    'nav.itemLookup': 'Items',
    'nav.wardrobe': 'Wardrobe',
    'nav.about': 'About',
    'landing.title': 'Sky Guide',
    'landing.subtitle': 'Community Guide',
    'landing.enter': 'Enter',
    'landing.theme.auto': 'Auto',
    'landing.theme.daylight': 'Daylight',
    'landing.theme.sunset': 'Sunset',
    'landing.theme.night': 'Night',
    'hub.title': 'Hub',
    'hub.season': 'Seasons',
    'hub.ts': 'Traveling Spirits',
    'hub.news': 'News',
    'hub.items': 'Items',
    'hub.wardrobe': 'Wardrobe',
    'hub.maps': 'Maps',
    'hub.community': 'Community',
    'hub.unavailable': 'Unavailable',
    'hub.comingSoon': 'Coming Soon',
    'feature.wardrobe': 'Wardrobe',
    'feature.items': 'Items',
    'feature.ts': 'TS',
    'feature.seasons': 'Seasons',
    'feature.news': 'News',
    'feature.maps': 'Maps',
    'feature.wardrobe.desc': 'Manage wardrobe',
    'feature.items.desc': 'Search items',
    'feature.ts.desc': 'Spirit info',
    'feature.seasons.desc': 'Season guides',
    'feature.news.desc': 'Latest updates',
    'feature.maps.desc': 'Sky maps',
    'status.building': 'Building',
    'status.unavailable': 'Unavailable',
    'status.comingSoon': 'Coming Soon',
    'a11y.skipNav': 'Skip to content',
    'a11y.mainNav': 'Main navigation',
    'lang.vi': 'VI',
    'lang.en': 'EN'
  }
};
