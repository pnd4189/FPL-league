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
