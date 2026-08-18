# HTCV FPL League 2026-2027

Dashboard web app cho giải Fantasy Premier League nội bộ HTCV — Mùa giải 2026-2027.

## Kiến Trúc

```
FPL-league/
├── apps-script/          # Google Apps Script backend (6 modules)
│   ├── Config.gs         # Cấu hình mùa giải, League IDs, 14 HLV
│   ├── FPLApi.gs         # Fetch FPL API endpoints
│   ├── DataProcessor.gs  # Xử lý & ghi data vào Google Sheet
│   ├── Triggers.gs       # Auto-refresh 6h + onEdit trigger
│   ├── Menu.gs           # Custom menu trên Sheet
│   ├── WebApp.gs         # REST API cho frontend (doGet)
│   └── appsscript.json   # Manifest
├── web/                  # React 19 + Vite + Tailwind frontend
│   ├── src/
│   │   ├── components/   # 13 React components
│   │   ├── data/         # initialData.ts (14 HLV, fan CLB, quỹ giải)
│   │   ├── services/     # fplApi.ts (API client)
│   │   └── types/        # TypeScript interfaces
│   ├── public/assets/    # Banner PL Stars 2026-2027
│   └── package.json
└── README.md
```

## Tính Năng

### Backend (Apps Script + Google Sheet)
- 26 sheets tự động: Dashboard, BXH Classic, BXH H2H, Nhất Tuần, Nhất Tháng (×10), Fantasy Cup, Pool Giải, Đóng Phí, Info
- Auto-refresh data từ FPL API mỗi 6 tiếng
- Manual refresh via checkbox trên Dashboard sheet
- REST API Web App (doGet) phục vụ frontend

### Frontend (React + Vite + Tailwind)
- 🏟️ Stadium Night Dark Theme đậm chất Premier League
- 🖼️ Hero Banner 8K cinematic (11 ngôi sao PL, Haaland & Rice trung tâm, Cúp PL chính giữa)
- ⚽ Con trỏ chuột bóng đá 3D xoay + vệt bóng xoáy mini trailing
- 📊 7 Tab: Dashboard, Classic BXH, H2H League, Nhất Tuần (50k), Nhất Tháng, Fantasy Cup, Giải Thưởng
- 🛡️ 14 HLV với avatar viền LED + Logo CLB fan ruột (MU, Arsenal, City, Chelsea, Liverpool...)
- ⚡ 3 tầng sync: Auto 6h + Auto khi mở web + Manual trigger
- 📱 Fully responsive (mobile, tablet, desktop)
- 🏆 Bảng xếp hạng tiền thưởng thực nhận theo thời gian thực

## Cấu Hình Mùa Giải

| Mục | Giá trị |
|-----|---------|
| Mùa giải | 2026-2027 |
| Classic League ID | 132688 |
| H2H League ID | 132702 |
| Số HLV | 14 (13 thật + 1 placeholder) |
| Lệ phí | 500.000đ / HLV |
| Tổng quỹ | 7.000.000đ |

## API Endpoints (Web App)

| Action | URL Param | Mô tả |
|--------|-----------|-------|
| `dashboard` | `?action=dashboard` | Dashboard summary |
| `classic` | `?action=classic` | Classic BXH matrix |
| `h2h` | `?action=h2h` | H2H standings |
| `weekly` | `?action=weekly` | Nhất tuần 38 GW |
| `monthly` | `?action=monthly` | Nhất tháng 10 tháng |
| `refresh` | `?action=refresh&key=htcv-fpl-2027` | Force refresh (3min rate limit) |

## Deploy

### Frontend → Vercel
```bash
cd web
npm run build
npx vercel --prod  # Target: htcv-fpl.vercel.app
```

### Backend → Apps Script
- Script Project ID: `1PWY1iR5xdzuQYMCDnX62a7__I03nuBWuLL5feES6cpEb_V31kGp9JA8R`
- Web App URL: `https://script.google.com/macros/s/AKfycbw.../exec`
- Google Sheet: `1QgE5GaFRSf9Qhv7KuD5UOccoMsxmM_98muPurRB2UHE`

## Development

```bash
cd web
npm install
npm run dev  # http://localhost:3000
```

## License

Internal use only — HTCV Fantasy Premier League.
