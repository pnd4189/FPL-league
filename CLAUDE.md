# CLAUDE.md — HTCV FPL League 2026-2027

## Project Overview

Google Apps Script (backend) + React/Vite/Tailwind (frontend) dashboard for the HTCV internal Fantasy Premier League — Season 2026-2027.

**Google Sheet ID:** `1QgE5GaFRSf9Qhv7KuD5UOccoMsxmM_98muPurRB2UHE`
**Apps Script Project ID:** `1PWY1iR5xdzuQYMCDnX62a7__I03nuBWuLL5feES6cpEb_V31kGp9JA8R`
**Web App API:** `https://script.google.com/macros/s/AKfycbwGzMZQ3uNzF41GbcSbxQe5dtoq7lDIHa7jq86JAfTNX9-ph9dnmOR4g-X3aaRKRAwm4w/exec`

## Structure

```
apps-script/        # 14 modular .gs files + manifest
  Config.gs          Season config, 14 managers, month→GW map, safe logging
  FPLApi.gs          FPL API fetch helpers + cached season state
  Live.gs            In-play (provisional) gameweek scoring
  AutoSubs.gs        FPL auto-sub + vice-captain rules (pure logic, replayable)
  AdvisorLogic.gs    Round-assistant scoring rules (pure logic, replayable)
  Advisor.gs         Round-assistant data: player/fixture pool, squads, endpoints
  Ai.gs              Dahl Inference client (OpenAI-compatible), model fallback, <think> stripping
  AiFacts.gs         Question routing (keywords → topics) + fact packs (captain, H2H, transfers, health, chips, league, players)
  PlanLogic.gs       Chip timing, free-transfer estimate, AI answer checking (pure logic)
  AiAdvisor.gs       AI comment per manager per GW (hourly trigger) + league chat, memory, 30-day log
  DataProcessor.gs   Parse & write settled data to Google Sheet (26 tabs)
  Triggers.gs        Auto-refresh 6h + hourly settlement check
  Menu.gs            Custom Sheet menu
  WebApp.gs          REST API doGet/doPost endpoints
  appsscript.json    Manifest

web/                # React 19 + TypeScript + Vite 6 + Tailwind CSS
  src/components/    15 TSX components
  src/data/          initialData.ts (14 HLV, clubs, prizes)
  src/services/      fplApi.ts (API client), liveStandings.ts (live merge)
  src/types/         TypeScript interfaces
  public/assets/     Banner image
```

## Development Rules

- **Backend:** 14 separate .gs modules. Do NOT merge into one file.
- **Frontend:** React + TypeScript. No external UI libraries beyond lucide-react icons.
- **Data sync:** settled data via 6h trigger + hourly settlement check + manual button. Page open does NOT run a full refresh — it polls `?action=live` instead.
- **Live scoring:** standings must move during a gameweek. Live points come from `event/{gw}/live/` + cached squad picks; the website merges them onto the settled tables (`web/src/services/liveStandings.ts`). Never write live data to the Sheet.
- **Auto-substitutions:** FPL only rewrites `entry/{id}/event/{gw}/picks/` into the effective (subs applied, captain→vice) lineup 1-2h after the GW's last match. The moment every fixture is `finished_provisional`, `applyAutoSubs_()` (AutoSubs.gs) applies the same rules locally — bench order 1-2-3, ≥3 DEF and ≥1 FWD, GK only for GK, a card from the bench counts as played, captain→vice, no subs under Bench Boost — and `?action=live` flags `autoSubsProvisional`. Picks keep being refetched (5-min throttle) until FPL publishes (`subsDone`: any sub in the league, or the event is finished); from then on FPL's lineup is used as-is. Player points come straight from `event/{gw}/live/` — bonus is already included in-match this season, never estimate it from BPS. Replayed against GW1-8: 112/112 manager-GWs match FPL's points and sub order.
- **H2H GA:** the standings api never returns `points_against` — derive GA from the stored match rows. The display GW's matches are always refetched (points go provisional→final); older settled GWs reuse stored rows. Every "⚔️ H2H BXH" column (P/W/D/L/GF/GA/GD/Pts) must come from the SAME settled-GW row set (`finished && dataChecked`) — summing provisional display-GW rows while GF/Pts count finished GWs only produced garbage GD (fixed 2026-08-31).
- **H2H Classic Total:** column K mirrors the Classic tab's TOTAL — the manager's net-points sum over every FantasyData row (live GW included), same as `updateClassicStandings()`. It is NOT the H2H match-point sum: that only covers settled GWs, so the two tabs would drift apart as the season runs (fixed 2026-08-31).
- **H2H ranking — two distinct rules:** overall H2H League table ranks by official FPL rule (H2H Pts → Classic Total). Monthly H2H (Nhất tháng) ranks by H2H Pts → GD → GF → month classic total. Never copy one rule onto the other tab.
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
- `?action=h2h_schedule` — Real league fixtures for all 38 GWs from the FPL api (pairings + played points), 5-min cache
- `?action=advisor&id=ENTRY_ID` — Round assistant for one manager (captain top 3, H2H edge/threat vs the coming opponent, transfer ideas, squad health), 10-min cache; read-only. Expected points are OUR model, never FPL's `ep_next` (this season `ep_next` == `form` == last-3-GW points / 3 for 89% of players and ignores the opponent): per-position least squares on ppg, form, xGI/90, minutes share, FDR, venue, price (`ADVISOR_XP_COEF` in AdvisorLogic.gs; refit with `tools/advisor-model/`). Captains = MID/FWD starters by next-GW xP; transfers/hunt rank by 5-GW xP; squads = latest GW picks + saved transfers for the coming GW
- `?action=chat&id=ENTRY_ID&code=LEAGUE_CODE&q=QUESTION[&fresh=1]` — League chat (GET only: Apps Script answers no CORS preflight). Needs Script Properties `DAHL_API_KEY` + `LEAGUE_CHAT_CODE` (user-set, never in code or chat). 10 questions/manager/day (Vietnam time, refunded when the AI fails), 300-char questions, 30 wrong codes/hour locks the chat. Keywords route the question (`routeQuestion_`, chip names matched first; English terms of 5+ letters forgive one typo, two for 8+, a letter swap counts as one — "nên wilcard vòng nào" once fell through and got "no chip data"; single accented syllables like bán/mua/giữ never matched without accents; a question with no topic gets the default packs plus a one-line chip summary) to small fact packs (`buildAiFacts_`) — never dump everything: a 3,000-token prompt took 30-43s on MiniMax, ~500 tokens ~6s, and one Apps Script fetch dies at 60s. Every conclusion is computed in code (H2H verdict, chip state/timing incl. a TRẢ LỜI TRỰC TIẾP line for a named chip, a Wildcard verdict from suggested swaps vs free transfers, free-transfer estimate) because MiniMax read 40.8 vs 42.7 backwards and said a used Triple Captain was still available. `checkAnswer_` rejects answers naming players or numbers not in the facts → one rewrite (only if the first call took <18s) → else the raw facts are returned (`source: facts`). Last 2 turns kept 30 min in CacheService (`fresh=1` resets); a follow-up naming a player gets only that player's facts. Each answered question is logged anonymously (no manager id, no code, no answer) to the `AI_Chat_Log` sheet, pruned hourly to 30 days / 3,000 rows. Web waits 90s (backend worst case ~80s). Real-AI check 2026-10-30: 14/14 eval answers factually right, median ~6s
- `?action=advisor` also returns `aiReview` once the hourly trigger has written it (36h before the deadline, a few managers per run, kept in Script Properties `ai_review|GW|ID`)
- `?action=advisor_hunt&pos=1-4&max=PRICE` — Best available players of a position under a price cap
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
- H2H fixtures everywhere come from the real league draw (`?action=h2h_schedule`) — never a locally generated schedule; unplayed GWs show "-" points
- Manager modal links to the official squad: `fantasy.premierleague.com/en/entry/{id}/event/{gw}`
- Hall of Fame tab: past champions with their FPL season total (`web/src/components/HallOfFame.tsx`, totals recorded from `entry/{id}/history/`)
- "Trợ Lý Vòng Đấu" tab (`web/src/components/AdvisorView.tsx`): no AI, no API cost — pure rules over FPL data. AI comment + chat sit on top of it and are optional: Dahl free tier (100M tokens once) can run out (HTTP 402) or hit `model_concurrency` 429 — only MiniMax-M2.7 is verified to answer, GLM/DeepSeek are tried as fallbacks
- Early auto-substitutions at the GW's final whistle (see Development Rules); squad popup marks subs ▲ in / ▼ out

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
