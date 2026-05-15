---
phase: 6
title: "Deploy & Validation"
status: completed
priority: P1
effort: "1h"
dependencies: [1, 2, 3, 4, 5]
---

# Phase 6: Deploy & Validation

## Overview

Validate toàn bộ implementation, test API endpoints, và chuẩn bị deploy lên Google Apps Script.

## Requirements

- Validate tất cả API endpoints hoạt động đúng
- Test responsive trên mobile viewport
- Verify caching behavior
- Check error handling
- Confirm security (read-only, no secrets exposed)

## Implementation Steps

### 6.1 Code Review Checklist

**Code.gs:**
- [ ] `doGet()` trả HTML khi không có action
- [ ] `doGet()` trả JSON khi có action
- [ ] `getDashboardPayload_()` trả đủ data fields
- [ ] `getMonthlyPayload_()` validate month param
- [ ] `getPoolPayload_()` hoạt động
- [ ] `getAllowedSheets_()` auto-detect sheets
- [ ] Không expose OAuth tokens
- [ ] Lock service vẫn hoạt động cho refresh

**Index.html:**
- [ ] `<?!= include('Styles'); ?>` đúng vị trí
- [ ] `<?!= include('Client'); ?>` đúng vị trí
- [ ] Tab structure đúng (5 tabs)
- [ ] Status cards có đủ 4 cards
- [ ] Loading/error/empty states exist
- [ ] ARIA labels cho accessibility

**Styles.html:**
- [ ] CSS variables define
- [ ] Mobile-first responsive
- [ ] Table sticky headers
- [ ] Tab active state
- [ ] Spinner animation

**Client.html:**
- [ ] Cache module (5-min TTL)
- [ ] API module (google.script.run)
- [ ] Render functions cho mỗi tab
- [ ] Filter logic (GW, Manager)
- [ ] State management (loading/error/empty)
- [ ] App.init() chạy trên DOMContentLoaded

### 6.2 API Endpoint Tests

Test bằng cách mở URL trực tiếp trong browser:

```
# 1. Status
{URL}?action=status
→ Expect: { ok: true, status: { "Last refresh": "...", ... } }

# 2. Dashboard
{URL}?action=dashboard
→ Expect: { ok: true, season: "...", info: [...], teamH2H: [...], ... }

# 3. Monthly
{URL}?action=monthly&month=8
→ Expect: { ok: true, month: 8, data: [...] }

# 4. Pool
{URL}?action=pool
→ Expect: { ok: true, pool: [...] }

# 5. Sheets
{URL}?action=sheets
→ Expect: { ok: true, sheets: ["Giải Team", "Tổng kết giải", ...] }

# 6. Range
{URL}?action=range&sheet=Info
→ Expect: { ok: true, sheet: "Info", values: [...] }

# 7. HTML (no action)
{URL}
→ Expect: HTML page rendered
```

### 6.3 Frontend Validation

**Desktop (1920x1080):**
- [ ] Header hiển thị đúng
- [ ] 4 status cards hiển thị trên 1 hàng
- [ ] 5 tabs hiển thị ngang
- [ ] Tables có sticky header
- [ ] Data load đúng

**Tablet (768x1024):**
- [ ] Cards 2x2 grid
- [ ] Tabs scroll ngang nếu cần
- [ ] Tables horizontal scroll

**Mobile (375x667):**
- [ ] Cards 2x2 grid
- [ ] Tabs scroll ngang
- [ ] Tables horizontal scroll
- [ ] Text readable

### 6.4 Caching Validation

1. Load dashboard → check Network tab, thấy request
2. Switch tabs → không có request mới (cache hit)
3. Chờ 5+ phút → load lại → thấy request mới (cache expired)

### 6.5 Error Handling

1. Disconnect network → load dashboard → thấy error message
2. Click "Thử lại" → reload data
3. Invalid month param → error message

### 6.6 Security Check

- [ ] Không có API keys trong client code
- [ ] Không expose OAuth tokens
- [ ] `WEB_ALLOWED_SHEETS` ngăn access system sheets
- [ ] Read-only (không có write operations)

### 6.7 Deploy Steps

1. Copy code vào Apps Script editor
2. Save all files
3. Deploy → New deployment
4. Type: Web app
5. Execute as: Me
6. Who has access: Anyone
7. Click Deploy
8. Copy URL
9. Test URL trong browser
10. Embed vào Google Sites

## Success Criteria

- [ ] Tất cả API endpoints trả đúng format
- [ ] Dashboard load và render đúng trên desktop
- [ ] Dashboard responsive trên mobile
- [ ] Cache hoạt động (không fetch lại trong 5 phút)
- [ ] Error handling hoạt động
- [ ] Không có security issues
- [ ] Deploy thành công lên Apps Script
- [ ] Embed vào Google Sites hoạt động

## Risk Assessment

- **Risk:** Apps Script có thể timeout nếu data quá lớn
- **Mitigation:** Giới hạn range (300 rows cho H2H matches), cache 5 phút

- **Risk:** Google Sites embed có thể bị block bởi CSP
- **Mitigation:** Dùng `setXFrameOptionsMode(ALLOWALL)` trong Code.gs
