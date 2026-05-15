---
phase: 5
title: "Documentation"
status: completed
priority: P2
effort: "1h"
dependencies: [1, 2, 3, 4]
---

# Phase 5: Documentation

## Overview

Tạo documentation cho project: README.md, API.md, DEPLOY_GOOGLE_SITES.md, và CLAUDE.md.

## Requirements

- Functional:
  - README.md: Tổng quan project, cấu trúc, cách deploy
  - API.md: Document tất cả API endpoints
  - DEPLOY_GOOGLE_SITES.md: Hướng dẫn deploy step-by-step
  - CLAUDE.md: Project-specific instructions cho Claude Code
- Non-functional:
  - Ngôn ngữ: tiếng Việt (chính), English (phụ)
  - Ngắn gọn, dễ follow

## Related Code Files

- Create: `README.md`
- Create: `docs/API.md`
- Create: `docs/DEPLOY_GOOGLE_SITES.md`
- Create: `CLAUDE.md`

## Implementation Steps

### 5.1 README.md

```markdown
# HTCV FPL Dashboard

Dashboard web cho giải Fantasy Premier League nội bộ HTCV.

## Cấu trúc

```
appscript/
├── Code.gs        # Backend (Apps Script API)
├── Index.html     # HTML shell
├── Styles.html    # CSS
└── Client.html    # JavaScript
docs/
├── API.md         # API documentation
└── DEPLOY_GOOGLE_SITES.md  # Deploy guide
```

## Tính năng

- Bảng xếp hạng H2H và Classic
- Lịch sử trận đấu (filter theo vòng, đội)
- Xếp hạng theo tháng
- Giải thưởng (cá nhân, team, tuần)
- Pool giải
- Auto-refresh data từ FPL API

## Deploy

Xem [DEPLOY_GOOGLE_SITES.md](docs/DEPLOY_GOOGLE_SITES.md)

## Quản lý mùa giải

Khi sang mùa mới:
1. Copy spreadsheet
2. Update FPL_Config: SEASON, LEAGUE_ID
3. Update Info sheet với team IDs mới
4. Xóa data cũ trong FantasyData, LichThiDauLeague
5. Run "Setup FPL Automation" từ menu
6. Redeploy Apps Script
7. Update URL trong Google Sites

## License

Internal use only.
```

### 5.2 docs/API.md

```markdown
# API Documentation

Base URL: `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`

## Endpoints

### GET / (no params)
Returns HTML dashboard.

### GET ?action=status
Returns refresh status.

**Response:**
```json
{
  "ok": true,
  "status": {
    "Last refresh": "2026-05-15T10:00:00",
    "Latest GW detected": "36",
    "Trigger status": "1 active trigger(s), every 12 hours"
  }
}
```

### GET ?action=dashboard
Returns all dashboard data.

**Response:**
```json
{
  "ok": true,
  "season": "2025-2026",
  "status": {...},
  "info": [["ID","Tên đội","HLV","Team","Group"], ...],
  "teamH2H": [["STT","Vòng","Tên đội","Điểm","Hiệu số","Thắng","Thua","Tổng classic"], ...],
  "teamClassic": [["STT","Vòng","Tên đội","Điểm vòng đấu","Tổng classic"], ...],
  "individualClassic": [...],
  "individualH2H": [...],
  "weeklyPrizes": [...],
  "h2hMatches": [["Gameweek","ID Trận","Đội Nhà","Điểm GW","Điểm H2H","Đội Khách","Điểm GW","Điểm H2H","Kết quả","Ngày đá","Hiệu số","ID Nhà","ID Khách","Last Updated"], ...]
}
```

### GET ?action=monthly&month={N}
Returns monthly data.

**Params:** `month` (8-12, 1-5)

**Response:**
```json
{
  "ok": true,
  "month": 8,
  "data": [["","CLASSIC","1","2","3"], ...]
}
```

### GET ?action=pool
Returns prize pool data.

### GET ?action=sheets
Returns list of allowed sheets.

### GET ?action=range&sheet={name}&range={A1}
Returns raw range data from specified sheet.

**Limits:** Max 5000 cells per request.
```

### 5.3 docs/DEPLOY_GOOGLE_SITES.md

```markdown
# Deploy Guide

## Phần 1: Deploy Apps Script Web App

### Bước 1: Mở Apps Script editor
1. Mở Google Sheet HTCV FPL
2. Extensions → Apps Script

### Bước 2: Copy code
1. Tạo các file: Code.gs, Index.html, Styles.html, Client.html
2. Copy nội dung từ repo vào từng file

### Bước 3: Deploy
1. Deploy → New deployment
2. Type: Web app
3. Execute as: Me
4. Who has access: Anyone
5. Click Deploy
6. Copy URL

### Bước 4: Test
1. Mở URL trong browser (không đăng nhập)
2. Kiểm tra dashboard load đúng
3. Test trên điện thoại

## Phần 2: Embed vào Google Sites

### Bước 1: Tạo/edit Google Site
1. sites.google.com
2. Tạo site mới hoặc edit site hiện có

### Bước 2: Embed dashboard
1. Insert → Embed → By URL
2. Paste Apps Script URL
3. Click Next → Insert

### Bước 3: Publish
1. Publish site
2. Set access: Anyone với link hoặc cụ thể

## Troubleshooting

### "Authorization required" khi xem
- Đảm bảo deploy với "Execute as: Me"
- Đảm bảo "Who has access: Anyone"

### Dashboard không load
- Check Apps Script editor → Executions xem có lỗi không
- Check browser console (F12) xem có error không

### Data không cập nhật
- Check FPL_Status sheet xem trigger có chạy không
- Run manual: HTCV FPL Tools → Refresh All Data Now
```

### 5.4 CLAUDE.md

```markdown
# CLAUDE.md - HTCV FPL Dashboard

## Project Overview
Google Apps Script + Google Sheets dashboard cho FPL league.

## Structure
- `appscript/Code.gs` - Backend API
- `appscript/Index.html` - HTML shell
- `appscript/Styles.html` - CSS
- `appscript/Client.html` - JavaScript

## Development Rules
- Code.gs: Giữ nguyên logic refresh, chỉ thêm HTML serving + new endpoints
- HTML: Tách rõ Index (structure), Styles (CSS), Client (JS)
- Không dùng external libraries (Apps Script sandbox)
- UI language: Tiếng Việt

## API Endpoints
- `?action=status` - Refresh status
- `?action=dashboard` - All dashboard data
- `?action=monthly&month=N` - Monthly data
- `?action=pool` - Prize pool
- `?action=sheets` - Allowed sheets list
- `?action=range&sheet=X&range=Y` - Raw range

## Season Transition
1. Copy spreadsheet
2. Update FPL_Config: SEASON, LEAGUE_ID
3. Update Info sheet
4. Clear old data
5. Run setup
6. Redeploy
```

## Success Criteria

- [ ] README.md có hướng dẫn tổng quan
- [ ] API.md document đầy đủ tất cả endpoints
- [ ] DEPLOY_GOOGLE_SITES.md có step-by-step guide
- [ ] CLAUDE.md có project context

## Next Steps

- Phase 6: Deploy & Validation
