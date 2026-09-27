# Source scaffold

Chưa có application code hoặc dependency. Các thư mục rỗng giữ bằng `.gitkeep`, theo stack React + TypeScript + Vite **đề xuất** trong [Architecture](../docs/ARCHITECTURE.md).

- `app/`: entry, routes và providers.
- `features/wardrobe/`: try-on layer/state/codec.
- `features/hub/`: catalog, TS, season/event, news, map/route, IAP.
- `features/profile/`: QR sau khi protocol được xác minh.
- `shared/`: UI primitives, storage và tiện ích chung.
- `data/`: normalized schema và adapter, không chứa draft/private data.
- `pwa/`: manifest/service worker/notification integration về sau.

Khởi tạo mã ở Phase 0 sau khi chốt Q06; không chạy `npm install` hoặc deploy dự án từ scaffold tài liệu này.
