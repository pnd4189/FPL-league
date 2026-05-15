---
phase: 1
title: "Backend Code.gs"
status: completed
priority: P1
effort: "2h"
dependencies: []
---

# Phase 1: Backend Code.gs

## Overview

Cập nhật `Code.gs` để phục vụ HTML dashboard, mở rộng API payload, thêm endpoint monthly, và auto-detect allowed sheets.

## Requirements

- Functional:
  - Serve HTML khi không có `action` param
  - Mở rộng `getDashboardPayload_()` với đầy đủ data
  - Thêm `?action=monthly&month=N` endpoint
  - Auto-detect `WEB_ALLOWED_SHEETS` thay vì hardcode
  - Thêm `?action=pool` cho Pool giải
- Non-functional:
  - Không phá vỡ API hiện có (backward compatible)
  - Giữ nguyên logic refresh/auto-trigger

## Architecture

```
doGet(e)
├── No action → HtmlService.createHtmlOutputFromFile('Index')
├── ?action=status → getStatusPayload_()
├── ?action=sheets → getAllowedSheets_()
├── ?action=dashboard → getDashboardPayload_() [EXPANDED]
├── ?action=monthly&month=N → getMonthlyPayload_(N) [NEW]
├── ?action=pool → getPoolPayload_() [NEW]
└── ?action=range&sheet=X&range=Y → getRangePayload_(X, Y)
```

## Related Code Files

- Modify: `appscript/Code.gs` (1104 lines hiện tại)

## Implementation Steps

### 1.1 Thêm HTML serving vào `doGet()`

```javascript
function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};
  var action = String(params.action || '').toLowerCase();

  // Serve HTML dashboard khi không có action
  if (!action) {
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('HTCV FPL Dashboard')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // ... giữ nguyên logic JSON routes
}
```

### 1.2 Tạo `getAllowedSheets_()` tự động detect

```javascript
function getAllowedSheets_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var allSheets = ss.getSheets().map(function(s) { return s.getName(); });

  var always = ['Giải Team', 'Tổng kết giải', 'FPL_Status'];
  var monthly = allSheets.filter(function(name) {
    return /^Tháng \d+$/.test(name);
  });

  return always.concat(monthly);
}
```

Thay thế `HTCV.WEB_ALLOWED_SHEETS` trong `getRangePayload_()` bằng `getAllowedSheets_()`.

### 1.3 Mở rộng `getDashboardPayload_()`

```javascript
function getDashboardPayload_() {
  return {
    ok: true,
    season: getConfigValue_('SEASON', '2025-2026'),
    status: getStatusPayload_().status,
    info: safeRangeMatrix_('Info', 'A1:F13'),
    teamH2H: safeRangeMatrix_('Giải Team', 'K1:R5'),
    teamClassic: safeRangeMatrix_('Giải Team', 'K8:O12'),
    individualClassic: safeRangeMatrix_('Tổng kết giải', 'A1:M15'),
    individualH2H: safeRangeMatrix_('Tổng kết giải', 'A16:M29'),
    weeklyPrizes: safeRangeMatrix_('Tổng kết giải', 'A30:M70'),
    h2hMatches: safeRangeMatrix_('LichThiDauLeague', 'A1:N300')
  };
}
```

### 1.4 Thêm `getMonthlyPayload_()` endpoint

```javascript
function getMonthlyPayload_(month) {
  var sheetName = 'Tháng ' + month;
  if (getAllowedSheets_().indexOf(sheetName) === -1) {
    return { ok: false, error: 'Không tìm thấy sheet: ' + sheetName };
  }
  return {
    ok: true,
    month: month,
    data: safeRangeMatrix_(sheetName, 'A1:Z20')
  };
}
```

Thêm routing trong `doGet()`:
```javascript
if (action === 'monthly') {
  return jsonOutput_(getMonthlyPayload_(params.month));
}
```

### 1.5 Thêm `getPoolPayload_()` endpoint

```javascript
function getPoolPayload_() {
  return {
    ok: true,
    pool: safeRangeMatrix_('Pool giải', 'A1:Z20')
  };
}
```

Thêm routing trong `doGet()`:
```javascript
if (action === 'pool') {
  return jsonOutput_(getPoolPayload_());
}
```

### 1.6 Cập nhật `WEB_ALLOWED_SHEETS` trong HTCV config

Không cần hardcode nữa. Xóa `HTCV.WEB_ALLOWED_SHEETS` và thay bằng `getAllowedSheets_()`.

## Success Criteria

- [ ] `doGet()` trả HTML khi không có action param
- [ ] `?action=status` vẫn hoạt động như cũ
- [ ] `?action=dashboard` trả về đầy đủ data (info, teamH2H, teamClassic, individualClassic, individualH2H, weeklyPrizes, h2hMatches)
- [ ] `?action=monthly&month=8` trả về data tháng 8
- [ ] `?action=pool` trả về Pool giải data
- [ ] `?action=sheets` trả về auto-detected sheet list
- [ ] `?action=range` vẫn hoạt động với auto-detected whitelist

## Risk Assessment

- **Risk:** `safeRangeMatrix_('LichThiDauLeague', 'A1:N300')` có thể slow nếu sheet có nhiều rows
- **Mitigation:** Giới hạn 300 rows, đủ cho 38 GW × 6 trận + buffer

## Next Steps

- Phase 2: Frontend HTML Shell
