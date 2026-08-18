# HTCV FPL League — Project Roadmap & Next Steps

> Last updated: 2026-08-16

## ✅ Đã Hoàn Thành (Phase 1-4)

### Phase 1: Google Sheet Backend Setup
- [x] Tạo cấu trúc 26 tabs trên Google Sheet
- [x] Viết 6 module Apps Script (Config, FPLApi, DataProcessor, Triggers, Menu, WebApp)
- [x] Deploy Apps Script Web App (REST API)
- [x] Setup auto-refresh trigger — 6h full refresh + hourly settlement check, tự cài qua `ensureTriggersInstalled_()` (đã xác nhận 18/08/2026 13:32)
- [x] Manual refresh checkbox trên Dashboard sheet
- [x] Format toàn bộ 26 sheet (EPL purple theme, alternating rows, currency format)

### Phase 2: Frontend Core
- [x] Khởi tạo React 19 + Vite + Tailwind project
- [x] 7 tab chính: Dashboard, Classic BXH, H2H League, Nhất Tuần, Nhất Tháng, Fantasy Cup, Giải Thưởng
- [x] API client kết nối Apps Script Web App
- [x] Fallback data layer (initialData.ts)

### Phase 3: UI/UX Premium Design
- [x] Hero Banner 8K cinematic (11 PL stars, Cúp PL chính giữa Haaland & Rice)
- [x] Stadium Night Dark Theme
- [x] 3D Soccer Ball Cursor + Spinning Mini-Football Trail (Canvas 60fps)
- [x] Volumetric spotlight background
- [x] 14 HLV avatar với viền LED rank + pinned club crest badge
- [x] Fan club mapping cho tất cả 14 HLV

### Phase 4: Advanced Features
- [x] Auto-sync data khi mở website
- [x] Live round ranking BXH vòng đang diễn ra (tab Nhất Tuần)
- [x] Provisional monthly standings (tab Nhất Tháng)
- [x] Manager prize earnings leaderboard (tab Giải Thưởng)
- [x] Manager detail modal (click vào HLV xem chi tiết)

---

## 🔲 Cần Làm Tiếp (Phase 5-7)

### Phase 5: Deploy Frontend → Vercel ⭐ ƯU TIÊN CAO
- [ ] Cài Vercel CLI: `npm i -g vercel`
- [ ] Deploy: `cd web && npx vercel --prod`
- [ ] Đặt tên project: `htcv-fpl` → URL: `htcv-fpl.vercel.app`
- [ ] Verify CORS hoạt động giữa Vercel ↔ Apps Script Web App

### Phase 6: Real Avatar Photos
- [ ] Chờ user cung cấp ảnh thật 14 HLV
- [ ] Upload ảnh vào `web/public/assets/avatars/`
- [ ] Cập nhật `initialData.ts` với URL ảnh mới
- [ ] Cập nhật Google Sheet tab `Info` cột Avatar

### Phase 7: Season Activation & Polish
- [ ] Khi mùa giải 2026-2027 chính thức bắt đầu (GW1):
  - [ ] Verify data FPL API trả về đúng cho league mới
  - [ ] Test auto-refresh cycle
  - [ ] Monitor lỗi API rate limiting
- [ ] Fantasy Cup bracket activation (sau GW35)
- [ ] End-of-season: tổng kết giải thưởng, xác nhận thanh toán

---

## 📝 Ghi Chú Kỹ Thuật

### Google Sheet
- Sheet ID: `1QgE5GaFRSf9Qhv7KuD5UOccoMsxmM_98muPurRB2UHE`
- Apps Script: bound script, @OnlyCurrentDoc

### Apps Script Limitations
- Simple trigger `onEdit()` không có quyền gọi `openById()` → dùng `getActiveSpreadsheet()`
- Web App deploy cần "Execute as me" + "Anyone" access
- Rate limit 3 phút giữa các lần manual refresh

### Frontend
- React 19 + Vite 6 + Tailwind CSS 3
- No SSR — fully client-side rendered
- Bundle size: ~88KB gzip (JS) + ~7KB gzip (CSS)
