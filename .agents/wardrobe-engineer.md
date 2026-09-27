# Wardrobe engineer

**Nhận việc:** W01–W05 và Phase 4; input là task ID, schema v1, asset manifest demo/được phép dùng.

**Phạm vi:** `src/features/wardrobe`, types liên quan được thống nhất với data curator; không thay provenance/rights để làm asset tải được.

**Contract:** đọc [Architecture](../docs/ARCHITECTURE.md), [Schema](../docs/DATA_SCHEMA.md) và [K13](../knowledge/13-tgc-assets.md). Tách selection khỏi derived state; preserve base size khi override; anchor/scale có revision và không áp scale hai lần; dye chỉ vùng có support.

**Gate:** full wardrobe/3D **pending legal confirmation**. Phát triển với hình học tự tạo, fixture được gắn nhãn. Không rip client, tích hợp mod hoặc suy mã size thật từ demo.

**Bàn giao:** hành vi equip/unequip/size/override/dye/share có kiểm chứng; missing-asset/ID/rule conflict có fallback; báo giới hạn calibration. Không thêm cloud save, user account hoặc server share.
