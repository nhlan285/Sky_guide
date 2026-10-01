# Sky: Children of the Light — Wardrobe & Community Hub

Web-app cộng đồng dành cho *Sky: Children of the Light*, được định hướng quanh hai phần chính:

- **Wardrobe / Dress-up Tool:** phối trang phục theo lớp, chọn size, áp dụng rule resize, thử màu và chia sẻ outfit bằng link.
- **Community Hub:** tra cứu cosmetic, spirit, season, Traveling Spirit, patch notes, map, route và giá IAP.

Dự án miễn phí, không yêu cầu đăng nhập và không có tính năng trả phí. Hướng triển khai là web-app/PWA trên Vercel; native app chưa nằm trong giai đoạn đầu.

> [!IMPORTANT]
> Repo có shell SPA chạy được cho Phase 0 Infra. Chưa có tính năng Hub/Wardrobe, dữ liệu đã import hoặc asset game được phân phối trong repo.

## Trạng thái dự án

| Hạng mục | Trạng thái |
|---|---|
| Product brief, PRD và architecture | Hoàn thành bản khởi tạo |
| Knowledge Base | 14 hồ sơ nguồn, chờ xác minh endpoint và dữ liệu mẫu |
| Data schema | Có contract đề xuất v1, chưa có importer |
| Implementation plan | 9 phase, 134 task |
| Source code | React + TypeScript + Vite SPA, React Router (`/`, `/about`, not-found) |
| Wardrobe 2D | Chưa triển khai; sẽ dùng hình học placeholder trước |
| Asset 3D/wardrobe đầy đủ | **Pending legal confirmation** từ TGC |
| Deploy Vercel | Cấu hình Vite SPA trong `vercel.json`; Preview theo quy trình bên dưới |

## Tài liệu chính

1. [Project Brief](docs/PROJECT_BRIEF.md) — nguồn sự thật duy nhất về phạm vi sản phẩm và tình trạng pháp lý.
2. [Knowledge Base](knowledge/README.md) — danh mục nguồn, cách truy xuất dự kiến và những điều chưa xác minh.
3. [PRD](docs/PRD.md) — yêu cầu sản phẩm theo từng module.
4. [Architecture](docs/ARCHITECTURE.md) — kiến trúc React + TypeScript + Vite được đề xuất.
5. [Data Schema](docs/DATA_SCHEMA.md) — contract cho item, spirit, season, map, route, IAP và wardrobe.
6. [UX Guidelines](docs/UX_GUIDELINES.md) — bố cục và nguyên tắc giao diện.
7. [Legal Status](docs/LEGAL_STATUS.md) — trạng thái liên hệ TGC và các asset cần placeholder.
8. [Implementation Plan](docs/plan/IMPLEMENTATION_PLAN.md) — task breakdown có dependency, độ phức tạp và gate.

## Cấu trúc repo

```text
.
├── .agents/                 Định nghĩa vai trò và skill dùng trong dự án
├── .commands/               Script kiểm tra scaffold và đọc task list
├── docs/                    PRD, architecture, schema, UX và legal status
│   └── plan/                Implementation plan
├── knowledge/               Một hồ sơ Markdown cho mỗi nguồn dữ liệu
└── src/                     Khung mã nguồn theo feature
    ├── app/                 App shell, routes và providers
    ├── data/                Schema, adapter và normalized data
    ├── features/
    │   ├── hub/             Community Hub
    │   ├── profile/         QR profile
    │   └── wardrobe/        Dress-up tool
    ├── pwa/                 Manifest, service worker và notification
    └── shared/              UI, storage, types và utilities dùng chung
```

## Bắt đầu làm việc

Yêu cầu Node 24.x LTS (local kiểm tra 24.11.0, `.nvmrc`) và pnpm 10.30.3 (`packageManager`). Phiên bản dependency chính xác trong `package.json` và `pnpm-lock.yaml`; xem [build contract](docs/ARCHITECTURE.md#stack-và-ranh-giới-hệ-thống).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Quality gates trước khi push/deploy:

```sh
pnpm lint
pnpm typecheck
pnpm build
pnpm preview
```

Lint dùng ESLint + typescript-eslint, không chấp nhận warning. `typecheck` chạy TypeScript strict độc lập; `build` chạy typecheck trước Vite production build và dừng khi lỗi type. Output là `dist`; `preview` phục vụ build local. Vite xử lý TSX qua `react-jsx`, chưa cần plugin React/Fast Refresh cho shell này.

### Vercel Preview và rollback

`vercel.json` áp dụng cho Preview/Production: install frozen lockfile, build `pnpm lint && pnpm build`, output `dist` đã xác minh bằng build thật. SPA rewrite `/(.*)` → `/index.html` theo [Vercel Vite docs](https://vercel.com/docs/frameworks/frontend/vite); React Router xử lý `/about` và route không tồn tại. Không cấu hình database/KV/cron hoặc resource trả phí.

CLI dùng ngoài dependency app:

```sh
pnpm dlx vercel@62.1.0 whoami
pnpm dlx vercel@62.1.0 link --project sky-guide
pnpm dlx vercel@62.1.0 deploy --target preview
```

Chọn đúng tài khoản/project Hobby và Node 24.x. Lưu ý CLI có thể tự gán deployment đầu của project mới thành Production kể cả không dùng `--prod`; luôn kiểm tra target và tạo Preview rõ ràng để nghiệm thu. Kiểm tra `/`, mở trực tiếp `/about`, reload và thử điều hướng client. Nếu Preview được bảo vệ, đăng nhập Vercel hoặc dùng `vercel curl /about --deployment <preview-url>`; không tắt protection. `.vercel/` chỉ lưu local và được gitignore.

Rollback: trong Vercel Deployments chọn deployment Production tốt trước đó → **Instant Rollback**; giữ cùng code/data/asset manifest của deployment đó. Nếu tài khoản không hỗ trợ thao tác rollback, checkout commit tốt trong worktree riêng, frozen install + lint/typecheck/build, tạo Preview và nghiệm thu trước khi redeploy production bằng workflow maintainer. Preview lỗi không ảnh hưởng Production: quay lại URL Preview tốt trước đó hoặc deploy commit tốt. Không force push/rewrite history; chưa có Production thì chưa có bản để rollback.

Nghiệm thu P0-I01–I04 ngày 2026-10-01:

- `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm build`: pass; lockfile frozen install cũng pass. Output thật: `dist/index.html` và JS/CSS trong `dist/assets`.
- Probe type sai tạm thời làm `typecheck` và `build` cùng exit 2 (TS2322); probe đã xóa. Browser local render root, direct `/about` và điều hướng client; không có lỗi JavaScript.
- Project `dyland1/sky-guide`, Hobby, Node 24.x; Preview READY: [sky-guide-4o3qoagki-dyland1.vercel.app](https://sky-guide-4o3qoagki-dyland1.vercel.app). CLI xác thực kiểm tra root và direct `/about`: HTTP 200; browser kiểm tra render/reload trên cùng Preview.
- CLI tự gán deployment đầu thành Production: [sky-guide-six.vercel.app](https://sky-guide-six.vercel.app); deployment nghiệm thu phía trên là Preview riêng. Không cấu hình resource trả phí.
- GitHub auto-connect chưa thành công; Preview hiện deploy qua CLI. Đây không chặn P0-I04. Muốn auto-deploy khi push, maintainer cần cấp GitHub repository access cho Vercel rồi kết nối repo trong Project Settings → Git.

Kiểm tra cấu trúc tài liệu và liên kết nội bộ:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .commands/Check-Scaffold.ps1
```

Đọc task plan thành PowerShell objects:

```powershell
& ./.commands/Get-PlanTasks.ps1 | Format-Table Id, Module, Complexity, Gate
```

Xem [CONTRIBUTING.md](CONTRIBUTING.md) trước khi thay đổi schema, dữ liệu hoặc asset.

## Nguyên tắc dữ liệu và pháp lý

- Chỉ sử dụng nguồn đã đăng ký trong `knowledge/`; nguồn mới cần được bổ sung hồ sơ trước khi đi vào pipeline.
- Không rip file game, can thiệp game client hoặc tích hợp mod.
- Text, ảnh, map và model có trạng thái quyền sử dụng riêng; giấy phép text không tự áp dụng cho asset.
- Icon Wiki chỉ là placeholder và vẫn là IP của TGC theo brief.
- Asset 3D và wardrobe đầy đủ luôn giữ nhãn **pending legal confirmation** cho đến khi có phản hồi phù hợp từ TGC.
- Tin leak phải qua duyệt thủ công; draft và nội dung bị từ chối không được đưa vào public bundle.
- Trạng thái người dùng được lưu trên thiết bị; không có tài khoản server-side.

## Quy ước trạng thái tài liệu

- **Đã nêu trong brief:** yêu cầu hoặc hiện trạng có trong tài liệu đầu vào, chưa đồng nghĩa đã kiểm chứng trực tuyến.
- **Đề xuất:** quyết định kỹ thuật cần được chốt trước khi triển khai phần liên quan.
- **Chưa xác minh:** thiếu endpoint, URL, response mẫu, quyền sử dụng hoặc dữ liệu thực.
- **Pending legal confirmation:** chưa được phép coi asset là sẵn sàng phát hành.

## Giấy phép

Repo chưa chọn giấy phép mã nguồn. Nội dung và asset từ bên thứ ba vẫn thuộc các chủ sở hữu tương ứng; xem [Legal Status](docs/LEGAL_STATUS.md) trước khi tái sử dụng hoặc phân phối.
