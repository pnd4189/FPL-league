# H2H Monthly Prize Tiebreak Fix — 2026-08-22

## Symptom

Tab "Giải Thưởng" showed 16.666đ per manager in "Nhất H2H (100k)" for Tháng 8:
the API returned six joint H2H winners ("Shark Tú & Thành & Lập & Tùng & Đại &
Cường"), and `prizeShare()` split 100k six ways via `floor(100000/6)`.

## Root cause

`updateMonthlyAwards()` in `apps-script/DataProcessor.gs` used
`pickMonthlyBest_()` (sum of a single metric, no tiebreak) for BOTH the Classic
and the H2H monthly winner. Six managers all finished GW1 on 3 H2H pts, so all
six were declared joint winners.

## Rule (league owner, final)

Monthly H2H ranking over the month's gameweeks:
1. H2H points (W3/D1/L0)
2. GD = match points scored − conceded
3. GF = match points scored
4. Month classic total

Joint winners (even split) only when all four are exactly equal. This matches
the provisional table the website already shows
(`web/src/components/MonthlyAwards.tsx`). Classic monthly prize unchanged.

## Verification with real data (leagues-h2h-matches/132702, GW1; GW2 not settled yet)

| Manager | Pts | GD | GF | GA |
|---|---|---|---|---|
| Thành (695284) | 3 | +20 | 21 | 1 |
| Cường (4334607) | 3 | +11 | 14 | 3 |
| Shark Tú (152158) | 3 | +10 | 15 | 5 |
| Lập (786718) | 3 | +9 | 18 | 9 |
| Tùng (1189156) | 3 | +5 | 11 | 6 |
| Đại (1860254) | 3 | +1 | 9 | 8 |

Correct winner: **Thành** — 3 pts, GD +20, GF 21. (Task brief said "each went
W1-L1"; actually each won GW1 and GW2 rows were not settled yet. Either way GD
separates them decisively.)

## Changes

- `apps-script/DataProcessor.gs`
  - `updateMonthlyAwards()`: also builds `playerH2HGF` / `playerH2HGA` lookups
    (match points for/against, LichThiDauLeague cols idx 3/6) alongside the
    existing H2H-points lookup.
  - New `pickMonthlyH2HBest_()`: pts → GD → GF → month classic total; joint
    winners only on full equality. `pickMonthlyBest_()` kept for Classic.
- No frontend changes: `MonthlyAwards.tsx` already implements the same rule;
  `PrizePool.tsx` renders a single winner as the full 100k. Human-owned payment
  columns (I/J) untouched.

## Deploy

- `gws script +push` → version 6 → deployment repointed (2026-08-22 02:33 UTC)
- Forced refresh: success, 34s
- No web/ files changed → no Vercel deploy

## Live API proof

Before: `"H2H Winner": "Shark Tú & Thành & Lập & Tùng & Đại & Cường", "Điểm H2H": 3`

After (`?action=monthly`, 2026-08-22 02:36 UTC):

```json
{"Tháng": "Tháng 8", "GW Range": "GW1-2", "Classic Winner": "Thành",
 "Điểm Classic": 21, "H2H Winner": "Thành", "Điểm H2H": 3,
 "Giải Classic": 100000, "Giải H2H": 100000,
 "Đã trả Classic?": "", "Đã trả H2H?": ""}
```

## Open items

- Weekly 50k split rule unchanged. Current data has no ≥3-way weekly tie (GW1:
  single winner Thành 21, GW2+ empty), so no non-round amount is displayed
  today. A future 3-way weekly tie would still show 16.666đ via
  `shareAmount(floor)` — flagged, no behavior change made.
- `versions create` ran twice (v5 unused, v6 live) — harmless duplicate.
