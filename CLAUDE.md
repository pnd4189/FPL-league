# CLAUDE.md — HTCV FPL League 2026-2027

## Project Overview

Google Apps Script (backend) + React/Vite/Tailwind (frontend) dashboard for the HTCV internal Fantasy Premier League — Season 2026-2027.

**Google Sheet ID:** `1QgE5GaFRSf9Qhv7KuD5UOccoMsxmM_98muPurRB2UHE`
**Apps Script Project ID:** `1PWY1iR5xdzuQYMCDnX62a7__I03nuBWuLL5feES6cpEb_V31kGp9JA8R`
**Web App API:** `https://script.google.com/macros/s/AKfycbwGzMZQ3uNzF41GbcSbxQe5dtoq7lDIHa7jq86JAfTNX9-ph9dnmOR4g-X3aaRKRAwm4w/exec`

## Structure

```
apps-script/        # 7 modular .gs files + manifest
  Config.gs          Season config, 14 managers, month→GW map, safe logging
  FPLApi.gs          FPL API fetch helpers + cached season state
  Live.gs            In-play (provisional) gameweek scoring
  DataProcessor.gs   Parse & write settled data to Google Sheet (26 tabs)
  Triggers.gs        Auto-refresh 6h + hourly settlement check
  Menu.gs            Custom Sheet menu
  WebApp.gs          REST API doGet/doPost endpoints
  appsscript.json    Manifest

web/                # React 19 + TypeScript + Vite 6 + Tailwind CSS
  src/components/    13 TSX components
  src/data/          initialData.ts (14 HLV, clubs, prizes)
  src/services/      fplApi.ts (API client), liveStandings.ts (live merge)
  src/types/         TypeScript interfaces
  public/assets/     Banner image
```

## Development Rules

- **Backend:** 7 separate .gs modules. Do NOT merge into one file.
- **Frontend:** React + TypeScript. No external UI libraries beyond lucide-react icons.
- **Data sync:** settled data via 6h trigger + hourly settlement check + manual button. Page open does NOT run a full refresh — it polls `?action=live` instead.
- **Live scoring:** standings must move during a gameweek. Live points come from `event/{gw}/live/` + cached squad picks; the website merges them onto the settled tables (`web/src/services/liveStandings.ts`). Never write live data to the Sheet.
- **Month→GW map:** derived from real FPL deadlines at runtime (`getMonthGwMap()`). Do NOT hardcode; the 2026-27 calendar is Aug GW1-2, Sep GW3-5, Oct GW6-9, Nov GW10-12, Dec GW13-18, Jan GW19-23, Feb GW24-27, Mar GW28-30, Apr GW31-33, May GW34-38.
- **Sheet columns owned by humans** (`Đã trả?`, `Ngày`, `Đã trả Classic/H2H?`) must be read back and preserved on every refresh.
- **Simple triggers (onEdit):** Must use `getActiveSpreadsheet()`, NOT `openById()`.
- **Language:** UI text in Vietnamese. Code/comments in English.
- **Styling:** Tailwind CSS. EPL purple `#37003C` + neon green `#00ff87` + cyan `#04f5ff` theme.

## Key Data

- 14 managers (IDs: 57214, 71922, 152158, 186794, 695284, 701064, 786718, 832249, 1189156, 1860254, 3053458, 4334607, 4403856, 5934296)
- Classic League: 132688, H2H League: 132702
- Prize pool: 7,000,000 VND (14 × 500k fee)
- Prize structure: Weekly 50k×38, Monthly Classic 100k×10, Monthly H2H 100k×10, Season Classic top3 800k/500k/200k, Season H2H top3 800k/500k/200k, Cup 100k

## API Endpoints

- `?action=dashboard` — Summary stats & last updated
- `?action=classic` — Classic BXH matrix (14 rows × 38 GWs)
- `?action=h2h` — H2H standings (14 rows)
- `?action=weekly` — Weekly winner records (38 rows)
- `?action=monthly` — Monthly awards (10 rows)
- `?action=live` — Provisional in-play scores + H2H (90s cache, polled by the website)
- `?action=season` — Current/display GW, live flag, month→GW buckets
- `?action=status` — Last refresh state and trigger status
- `?action=refresh&key=htcv-fpl-2027` — Force full refresh (3-min cooldown, script-locked)

Read responses are cached 5 min under a generation token; `refreshFPLAll()` bumps the token to invalidate everything at once.

## Current Status (2026-08-16)

### ✅ Completed
- Apps Script backend deployed and syncing with FPL API
- Google Sheet formatted (26 tabs, EPL purple theme, alternating rows)
- Frontend built: 7 tabs, hero banner, 3D soccer cursor, stadium background
- Auto-sync on page open implemented
- Live round ranking in Nhất Tuần tab
- Provisional monthly standings in Nhất Tháng tab
- Manager prize earnings leaderboard in Giải Thưởng tab
- Fan club branding and real avatar photos for all 14 managers (Shark Tú, Shark Lâm, Hải, Tân, etc.)
- Frontend live at https://htcv-fpl.vercel.app (Vercel project `htcv-fpl`, already linked via `web/.vercel`)
- Captain pick + captain points columns in Nhất Tuần (live GW only, from `?action=live`)
- Squad popup on current-GW points in every tab that shows them (Nhất Tuần, Classic League ⚡GW column, H2H live match cards, Nhất Tháng per-GW cells) — fplgames-style, `web/src/components/SquadTooltip.tsx` + `SquadPopupWrap`. Desktop: cursor tooltip on hover. Touch: tap the points for a bottom sheet (backdrop/✕/Esc/re-tap close)
- Classic tab renamed "Classic League", with a live current-GW column right before TOTAL
- Manager modal links to the official squad: `fantasy.premierleague.com/en/entry/{id}/event/{gw}`

### 🔲 Remaining
- End-of-season: Cup bracket activation after GW35

## Commands

```bash
# Dev server
cd web && npm run dev

# Production build
cd web && npm run build

# Deploy frontend (vercel CLI is not installed globally — run it through npx)
cd web && npx vercel@latest --prod

# Push Apps Script changes (gws CLI is authenticated with script.projects scope)
SID=1PWY1iR5xdzuQYMCDnX62a7__I03nuBWuLL5feES6cpEb_V31kGp9JA8R
DID=AKfycbwGzMZQ3uNzF41GbcSbxQe5dtoq7lDIHa7jq86JAfTNX9-ph9dnmOR4g-X3aaRKRAwm4w
gws script +push --script "$SID" --dir apps-script
# Pushing alone does not change the live web app — cut a version and repoint
# the deployment, then allow ~1 min for Google to propagate it.
gws script projects versions create --params "{\"scriptId\":\"$SID\"}" --json '{"description":"..."}'
gws script projects deployments update --params "{\"scriptId\":\"$SID\",\"deploymentId\":\"$DID\"}" \
  --json '{"deploymentConfig":{"scriptId":"'"$SID"'","versionNumber":N,"manifestFileName":"appsscript","description":"HTCV FPL 2026-2027 Web App API"}}'
```
