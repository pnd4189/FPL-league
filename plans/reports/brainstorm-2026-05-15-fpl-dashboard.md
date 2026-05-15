# Brainstorm: HTCV FPL Web Dashboard

## Problem Statement

Triển khai Google Sheet FPL league (12 managers, 4 teams) thành read-only web dashboard, embed trong Google Sites, phục vụ 12-15 người xem kết quả. Giao diện tiếng Việt, mobile-first, cache client-side 5 phút.

## Current State Analysis

### Sheets (21 total)
| Sheet | Purpose | Key Data |
|-------|---------|----------|
| `Info` | Manager mapping | 12 rows: ID, tên đội, HLV, Team, Group |
| `FantasyData` | GW history per entry | ~456 rows: điểm, rank, chip, transfers |
| `LichThiDauLeague` | H2H matches per GW | ~200+ rows: home/away, scores, results |
| `Giải Team` | Team standings (formula-driven) | H2H standings (K1:R5), Classic standings (K8:O12), raw matches (A:I) |
| `Tổng kết giải` | Prize summary | Individual Classic (A1:M15), Individual H2H (A16:M29), Weekly (A30:M70) |
| `Tháng 8`→`Tháng 5` | Monthly breakdowns | Per-GW Classic + H2H per manager/team |
| `FPL_Config` | Season config | LEAGUE_ID, SEASON, FIRST_GW, LAST_GW_CAP |
| `FPL_Status` | Refresh status | Last refresh, trigger status, errors |

### Existing Code (`Code.gs`)
- `doGet(e)` with 4 JSON routes: `status`, `sheets`, `range`, `dashboard`
- `getDashboardPayload_()` returns: `teamH2H` (K1:R5), `teamClassic` (K8:O12), `totalSummary` (A1:AA70)
- `WEB_ALLOWED_SHEETS` hardcoded array (13 sheets)
- Auto-refresh triggers (configurable 1-12 hours)
- Lock service prevents concurrent refreshes
- API logging to `FPL_API_Log` sheet

### Gaps
- No HTML frontend (only JSON API)
- `WEB_ALLOWED_SHEETS` hardcoded → manual update for new seasons
- `totalSummary` uses fixed range `A1:AA70` → fragile if sheet structure changes
- No monthly data endpoint
- No client-side caching

## Architecture Proposal

### File Structure
```
FPL-league/
├── appscript/
│   ├── Code.gs           # Backend: routing + API
│   ├── Index.html         # HTML shell
│   ├── Styles.html        # CSS
│   └── Client.html        # JS: fetch, cache, render
├── docs/
│   ├── API.md
│   └── DEPLOY_GOOGLE_SITES.md
├── plans/
│   └── reports/
├── CLAUDE.md
└── README.md
```

### Backend Changes (`Code.gs`)

**1. Serve HTML when no `action` param:**
```javascript
function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};
  if (!params.action) {
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('HTCV FPL Dashboard')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  // ... existing JSON routes
}
```

**2. Auto-detect allowed sheets:**
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

**3. Expanded dashboard payload:**
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

**4. New monthly endpoint:**
```javascript
if (action === 'monthly') {
  var month = params.month;
  var sheetName = 'Tháng ' + month;
  if (getAllowedSheets_().indexOf(sheetName) === -1) {
    return jsonOutput_({ ok: false, error: 'Sheet not found: ' + sheetName });
  }
  return jsonOutput_({
    ok: true,
    month: month,
    data: safeRangeMatrix_(sheetName, 'A1:Z20')
  });
}
```

### Frontend Design

**Light theme, mobile-first, Vietnamese UI:**

```
┌─────────────────────────────────────┐
│  HTCV FPL 2025-2026                │  Header
├─────────────────────────────────────┤
│  [GW 36] [12h trước] [OK] [4 team]│  Status cards
├─────────────────────────────────────┤
│  [H2H] [Classic] [Tháng] [Tổng kết]│  Tabs
├─────────────────────────────────────┤
│                                     │
│  BẢNG XẾP HẠNG H2H                │
│  ┌────┬──────┬─────┬────┬────┬───┐ │
│  │ #  │ Team │ Pts │Diff│ W  │ L │ │  Sticky header
│  ├────┼──────┼─────┼────┼────┼───┤ │
│  │ 1  │TC    │ 66  │320 │ 22 │14 │ │
│  └────┴──────┴─────┴────┴────┴───┘ │
│                                     │
│  LỊCH SỬ ĐẤU                      │
│  [Vòng: ▼ 36] [Manager: ▼ All]    │  Dropdown filters
│  ┌────┬──────┬─────┬──────┬─────┐  │
│  │ GW │Home  │Score│Away  │Score│  │
│  └────┴──────┴─────┴──────┴─────┘  │
│                                     │
├─────────────────────────────────────┤
│  © HTCV FPL                        │  Footer
└─────────────────────────────────────┘
```

**Tabs (5 tabs):**
1. **H2H**: Team standings + match history (filter by GW, manager). Fetch all ~228 rows 1 lần.
2. **Classic**: Team standings
3. **Tháng**: Dropdown tháng → BXH Classic + H2H theo tháng
4. **Tổng kết**: Individual prizes (Classic + H2H), team prizes, weekly prizes
5. **Pool giải**: Prize pool breakdown (lệ phí, giải tuần, giải tháng, giải cả mùa)

**Color scheme (light):**
- Background: `#f8f9fa`
- Cards: `#ffffff` with subtle shadow
- Table header: `#e9ecef`
- Accent: `#1a73e8` (blue)
- Text: `#212529`

### Client-side Caching
```javascript
var Cache = {
  TTL: 5 * 60 * 1000,
  store: {},
  get: function(key) {
    var e = this.store[key];
    if (e && Date.now() - e.ts < this.TTL) return e.val;
    return null;
  },
  set: function(key, val) {
    this.store[key] = { val: val, ts: Date.now() };
  }
};
```

### Season Management

**What stays the same (no code changes):**
- API endpoints
- Sheet structure
- FPL API URLs

**Manual steps for new season (~7 min):**
1. Copy spreadsheet
2. Update `FPL_Config`: SEASON, LEAGUE_ID
3. Update `Info` sheet with new team IDs
4. Clear `FantasyData`, `LichThiDauLeague`
5. Run "Setup FPL Automation" from menu
6. Redeploy Apps Script
7. Update URL in Google Sites

**Auto-detect improvement:**
- `WEB_ALLOWED_SHEETS` auto-discovers "Tháng X" sheets → no code edit needed

### Security

- `doGet()` only, no `doPost()` → read-only
- `WEB_ALLOWED_SHEETS` whitelist prevents access to system sheets
- 5000 cells/rate limit per request
- Execute as ME → viewers don't need Google login
- No OAuth tokens exposed to client

### Permission Settings

**Apps Script deployment:**
- Execute as: Me
- Who has access: Anyone

**Google Sites:**
- Site must be public or shared with viewers
- Embed via Insert → Embed URL

## Open Questions

1. `LichThiDauLeague` có thể có >300 rows khi mùa giải kết thúc (38 GW × ~6 matches/GW). Cần phân trang hay lấy tất cả 1 lần?
2. Có cần hiển thị "Pool giải" (prize pool breakdown) trên dashboard không?
3. Google Sites có giới hạn embed URL nào cần lưu ý không?
