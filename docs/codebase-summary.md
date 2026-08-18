# HTCV FPL League — Codebase Summary

> Last updated: 2026-08-16

## Architecture Overview

```
┌───────────────────────────────────────────────┐
│              FPL API (fantasy.premierleague.com)│
│  bootstrap-static, entry/{id}/history,        │
│  leagues-classic/{id}/standings,              │
│  leagues-h2h/{id}/standings                   │
└──────────┬────────────────────────────────────┘
           │ UrlFetchApp (server-side)
           ▼
┌───────────────────────────────────────────────┐
│         Google Apps Script Backend             │
│  Config.gs → FPLApi.gs → DataProcessor.gs     │
│  Triggers.gs (auto 6h) + Menu.gs (manual)     │
│  WebApp.gs (REST doGet for frontend)          │
└──────────┬────────────────────────────────────┘
           │ Writes to
           ▼
┌───────────────────────────────────────────────┐
│         Google Sheet (26 Tabs)                 │
│  Dashboard, Info, Classic BXH, H2H BXH,      │
│  GW1-GW38 (H2H match data), Nhất Tuần,       │
│  Tháng 8-5 (10 monthly), Fantasy Cup,        │
│  Pool Giải, Đóng Phí                         │
└──────────┬────────────────────────────────────┘
           │ REST API (doGet)
           ▼
┌───────────────────────────────────────────────┐
│         React Frontend (Vite + Tailwind)       │
│  fplApi.ts → App.tsx → 13 Components          │
│  Auto-sync on load + manual sync button       │
│  Deploy target: htcv-fpl.vercel.app           │
└───────────────────────────────────────────────┘
```

## Backend Modules (apps-script/)

| File | Lines | Purpose |
|------|-------|---------|
| `Config.gs` | ~80 | Season config, 14 manager IDs, League IDs (Classic: 132688, H2H: 132702), sheet name constants |
| `FPLApi.gs` | ~60 | Wrapper around `UrlFetchApp.fetch()` for FPL API endpoints |
| `DataProcessor.gs` | ~500 | Parse API responses, write to 26 Sheet tabs, calculate standings/awards |
| `Triggers.gs` | ~30 | `setupAutoRefresh()` (6-hour trigger), `onEdit()` (manual checkbox) |
| `Menu.gs` | ~120 | Custom menu: "HTCV FPL" with refresh, setup, test options |
| `WebApp.gs` | ~400 | `doGet(e)` REST endpoint serving JSON for frontend |
| `appsscript.json` | ~10 | OAuth scopes, timezone |

## Frontend Components (web/src/)

| Component | Purpose |
|-----------|---------|
| `App.tsx` | Root layout, tab router, data loading, auto-sync on mount |
| `Navbar.tsx` | Sticky nav bar with 7 tabs + manual sync button |
| `HeroBanner.tsx` | Hero image banner with PL stars + season metrics |
| `StadiumBackground.tsx` | Animated volumetric spotlights & pitch grid |
| `FootballCursor.tsx` | Canvas-based 3D soccer ball cursor + spinning trail |
| `PlayerAvatar.tsx` | Circular avatar with rank crown + pinned club badge |
| `DashboardView.tsx` | Podium top 3, dual top 5 standings, spotlight honors |
| `ClassicTable.tsx` | Full GW1-38 matrix table with month filtering |
| `H2HArena.tsx` | H2H standings + 7-match clash cards per GW |
| `WeeklyWinners.tsx` | Live round ranking + 38 GW prize card grid |
| `MonthlyAwards.tsx` | Provisional monthly leaderboard + 10-month history |
| `FantasyCup.tsx` | Knockout bracket (activates after GW35) |
| `PrizePool.tsx` | Manager prize earnings leaderboard + prize structure |
| `ManagerModal.tsx` | Deep-dive popup with stats & chip tracker |

## Data Layer

| File | Purpose |
|------|---------|
| `initialData.ts` | Fallback data for 14 managers, fan clubs, month ranges, prize structure, fee payments |
| `fplApi.ts` | API client: 5 fetch functions + triggerLiveSync(), cache-busting timestamps |
| `types/index.ts` | TypeScript interfaces for all data models |

## Key Design Decisions

1. **3-tier data sync**: Apps Script auto-trigger (6h) + frontend auto-sync on page open + manual button
2. **Fallback-first**: Frontend always loads with `initialData.ts` first, then overlays live API data
3. **Fan club branding**: Each manager has a pinned club crest, custom glow colors, and fan nickname
4. **No external API keys**: FPL API is public, no authentication needed
5. **Simple triggers limitation**: `onEdit()` must use `getActiveSpreadsheet()` not `openById()`

## External Dependencies

### Frontend
- React 19, React DOM 19
- Vite 6, TypeScript
- Tailwind CSS 3
- Lucide React (icons)
- Canvas Confetti (celebration effects)

### Backend
- Google Apps Script (built-in)
- No external libraries
