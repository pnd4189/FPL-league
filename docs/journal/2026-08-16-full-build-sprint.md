# Journal: HTCV FPL League 2026-2027 — Full Build Sprint

> **Date:** 2026-08-14 to 2026-08-16
> **Author:** Antigravity AI + Dũng
> **Scope:** Complete rebuild from mùa cũ 2025-2026 lên mùa mới 2026-2027

---

## Session 1 — 2026-08-14: Backend Foundation

### What happened
- Analyzed existing Google Sheet structure and FPL API endpoints
- Researched FPL API: `bootstrap-static`, `entry/{id}/history`, `leagues-classic/{id}/standings`, `leagues-h2h/{id}/standings`
- Created 6 modular Apps Script files (replacing the old monolithic `Code.gs`)
- Deployed bound Apps Script with Web App API
- Configured 14 managers with FPL entry IDs
- Set up auto-refresh trigger (6 hours) and manual refresh via checkbox

### Key decisions
- **Modular backend**: Split old 1766-line `Code.gs` into 6 focused modules for maintainability
- **Rate limiting**: 3-minute cooldown between manual refresh calls to prevent FPL API abuse
- **Simple trigger fix**: `onEdit()` cannot call `openById()` — must use `getActiveSpreadsheet()`

---

## Session 2 — 2026-08-15 AM: Google Sheet Formatting

### What happened
- Formatted all 26 Google Sheet tabs using parallel subagents
- Applied consistent EPL purple (`#37003C`) + navy (`#1B3A4B`) theme
- Set alternating row colors, currency format (`#,##0`), frozen headers
- Fixed column widths for readability across Dashboard, BXH, Nhất Tuần, Nhất Tháng, etc.

### Key decisions
- Used Google Sheets API `batchUpdate` instead of Apps Script formatting (faster, no auth issues)
- Each sheet formatted in a separate API call to avoid payload size limits

---

## Session 3 — 2026-08-15 PM: Frontend Premium Build

### What happened
- Initialized React 19 + Vite 6 + Tailwind CSS project
- Read taste-skill and ui-ux-pro-max guidelines for anti-slop design
- Generated 8K cinematic banner with 11 Premier League stars (3 iterations to get positioning right)
- Built 13 React components:
  - **FootballCursor**: Canvas 60fps engine drawing truncated icosahedron 3D ball + spinning mini-football trail
  - **StadiumBackground**: Volumetric spotlight cones + tactical pitch grid
  - **PlayerAvatar**: Circular avatar with rank-based LED rings + pinned club crest badge
  - **DashboardView**: Top 3 podium, dual top 5, spotlight honors
  - **ClassicTable**: Full GW1-38 matrix with frozen columns and month filtering
  - **H2HArena**: Standings table + 7-match clash cards
  - **WeeklyWinners**: 38 GW prize cards (later upgraded with live round ranking)
  - **MonthlyAwards**: 10-month history (later upgraded with provisional monthly BXH)
  - **FantasyCup**: Interactive knockout bracket
  - **PrizePool**: Prize structure table (later upgraded with earnings leaderboard)

### Key decisions
- **3D cursor**: Used pure Canvas 2D to draw fake 3D soccer ball with pentagon panels, radial gradient shading, and gloss reflection — no WebGL needed
- **Fan club branding**: Mapped all 14 managers to specific PL clubs per user's explicit instructions
- **Fallback-first data**: Frontend always loads cached `initialData.ts` first, then overlays live API

---

## Session 4 — 2026-08-15 Evening: Feature Refinements

### What happened (per user feedback)
1. **Banner v3**: Moved PL trophy to exact center between Haaland and Rice
2. **Cursor size**: Reduced from 12px to 7.5px radius — more subtle and harmonious
3. **Auto-sync on open**: Added `useEffect` in App.tsx that calls `triggerLiveSync()` + `loadData()` on mount
4. **Tab renames**: "Vua Tuần" → "Nhất Tuần", "Quỹ Giải" → "Giải Thưởng"
5. **Fantasy Cup note**: Removed "Top 8" label, changed to "Vô địch"
6. **Live round ranking**: WeeklyWinners now calculates and displays real-time GW leaderboard for 14 managers
7. **Provisional monthly BXH**: MonthlyAwards now computes monthly totals from GW scores
8. **Prize earnings leaderboard**: PrizePool now aggregates all prize sources and ranks 14 managers by total earnings

---

## Session 5 — 2026-08-16: Project Consolidation

### What happened
- Discovered old project at `/home/dung/VIBE_CODING/1. OTHERS/FPL-league` (mùa 2025-2026, 12 managers, monolithic Code.gs)
- **Merged** entire new project into `FPL-league` directory, overwriting old code
- Updated README.md, CLAUDE.md, created docs/ with codebase-summary and project-roadmap
- Verified build passes (0 errors, 1.53s)

---

## Metrics

| Metric | Value |
|--------|-------|
| Backend modules | 6 .gs files |
| Frontend components | 13 .tsx files |
| Google Sheet tabs | 26 |
| Bundle JS (gzip) | 88.63 KB |
| Bundle CSS (gzip) | 7.24 KB |
| Build time | 1.53s |
| Build errors | 0 |

---

## What's Next

1. **Deploy to Vercel** (`htcv-fpl.vercel.app`) — ready to ship
2. **Real avatar photos** — waiting for user to provide
3. **Season activation** — when GW1 kicks off, verify auto-sync cycle
