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
