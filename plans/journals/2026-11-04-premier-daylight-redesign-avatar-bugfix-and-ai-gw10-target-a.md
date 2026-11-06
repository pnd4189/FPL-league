---
title: "Premier Daylight Redesign, Avatar Bugfix, and AI GW10 Target Alignment"
date: 2026-11-04
summary: "Redesigned UI from deep black to Premier Daylight Studio, resolved Trong Anh/Tung avatar scaling bug in Tailwind v3, and aligned AI advisor targeting to upcoming GW10."
---

# Premier Daylight Redesign, Avatar Bugfix, and AI GW10 Target Alignment

## Context & Objective

User requested a comprehensive visual overhaul of the HTCV Open League web application (`https://htcv-fpl.vercel.app/`, local `web/`) following `/taste-skill:high-end-visual-design`, `pstack unslop`, and `opendesign` design systems. Key requirements:
- Eliminate the deep pitch-black (`#06060a`) theme in favor of a bright, modern, high-end Premier League broadcast aesthetic.
- Fix broken avatar rendering for managers Trong Anh and Tung on the primary dashboard tab.
- Correct the floating AI Assistant popup round indicator from GW9 (which already concluded) to the upcoming target GW10.
- Audit and document the current backend API and LLM model stack powering the application.
- Hold deployment to production pending user review.

## Root Cause Analysis

1. **Avatar Rendering Bug (Trong Anh & Tung)**:
   - Root Cause: Project uses Tailwind CSS `v3.4.17`. In Tailwind v3, fractional width/height classes (`w-4.5`, `h-4.5`, `w-5.5`, `h-5.5`, `w-15`, `w-22`) do not exist (introduced in Tailwind v4).
   - Impact: In `PlayerAvatar.tsx`, `size="lg"` club badges had invalid classes, causing the club badge `div` to lack bounding constraints and expanding Manchester United and Newcastle 70x70px crests directly over Trong Anh (#2) and Tung (#3 & GW9 Winner) portraits. Manager Dung (#1) used `size="xl"` with valid `sm:w-7 sm:h-7`, so was unaffected.
   - Fix: Replaced with valid Tailwind v3 dimensions (`w-5 h-5` badge, `w-14 h-14 sm:w-16 sm:h-16` avatar), added `object-top` face framing, and implemented image error reset hooks.

2. **Aesthetic Breakdown**:
   - Prior iteration used dark obsidian surfaces that looked flat and generic.
   - Replaced with **Premier Daylight Studio**: `#F3F2F8` pearl-alabaster canvas, `#FFFFFF` porcelain Double-Bezel cards, `#170B26` aubergine ink, `#38003C` Premier League royal plum, `#047857` turf emerald, and Stripe-inspired multi-layer purple ambient shadows.
   - Retained a secondary mid-tone **Royal Velvet Dusk** (`#221A36`) theme switch (avoiding pitch black).

3. **AI Assistant GW Target Mismatch**:
   - Root Cause: Google Apps Script backend correctly derives `nextGw: 10` for tactical planning, but `fetchSeasonInfo()` in `fplApi.ts` discarded `nextGw`. The UI passed `currentGW` (9) into `AdvisorChat` and `AdvisorView`.
   - Fix: Updated `SeasonInfo` interface, mapped `nextGw` in `fplApi.ts`, computed `upcomingGW` in `App.tsx` (with fallback logic), and updated `AdvisorChat`, `AdvisorView`, and `HeroBanner` kickers.

## Key Changes Made

- `web/src/components/PlayerAvatar.tsx`:
  - Normalized badge and avatar size maps to valid Tailwind v3 classes.
  - Added `object-top` on avatar images to preserve face composition on half-body portraits.
  - Added `useEffect` to reset image load error states on prop updates.
- `web/src/index.css`:
  - Overhauled CSS variables for Premier Daylight Studio and Royal Velvet Dusk.
  - Rebuilt Double-Bezel card architecture (`.bezel-shell`, `.bezel-core`, `.surface-well`).
  - Added `.btn-island` interactive styles, custom cubic-bezier timing, text-balance headings.
- `web/src/components/HeroBanner.tsx`:
  - Rebuilt layout into an Editorial Split: Left column with `Fraunces` display typography, 2 tactile island CTAs, and a 4-metric architectural strip. Right column with broadcast frame and Z-axis floating leader cards (Classic #1 and H2H #1).
  - Updated kicker to show status (`GW9 đã chốt · Sắp đá GW10`).
- `web/src/components/DashboardView.tsx`:
  - Created 3 sculpted athlete collector cards on podium with oversized `01`/`02`/`03` watermarks and live point differentials.
  - Integrated manager portraits for Weekly Winner and Monthly Honors.
  - Added proportional broadcast telemetry score bars for Top 5 Classic & H2H standings.
- `web/src/components/AdvisorChat.tsx` & `AdvisorView.tsx`:
  - Re-styled bottom-right floating launcher into a Royal Plum jewel pill with emerald spark icon.
  - Updated target gameweek label to `GW10 sắp tới` / `Tư vấn GW10`.
  - Removed hardcoded dark dropdown styles to ensure clean appearance across themes.
- `web/src/services/fplApi.ts` & `App.tsx`:
  - Added `nextGw` handling in `fetchSeasonInfo()` and wired `loadSeason()` in sync cycles.
  - Normalized default theme to `fpl` (Daylight Studio) and secondary to `dusk`.
- `web/src/components/Navbar.tsx`, `ClassicTable.tsx`, `WeeklyWinners.tsx`, `PrizePool.tsx`:
  - Applied `unslop` guidelines (sentence-case Vietnamese headings, removed crutch colons).
  - Added subtle emerald pill highlights on high GW scores (`score >= 75`).

## Architecture & Provider Audit

- **Core Data & League Stats**:
  - Official Fantasy Premier League API (`https://fantasy.premierleague.com/api/`).
  - Backend integration: Google Apps Script Web App writing to Google Sheets (Spreadsheet ID `1QgE5GaFRSf9Qhv7KuD5UOccoMsxmM_98muPurRB2UHE`).
  - Tactical xP projection model: 3-season least-squares regression model (no LLM cost).
- **LLM Chat & Tactical Advisory**:
  - Gateway: Dahl Inference (`https://inference.dahl.global/v1/chat/completions`).
  - Active Model: `MiniMaxAI/MiniMax-M2.7` (verified on free tier).
  - Fallback Models: `zai-org/GLM-5.3-Flash`, `deepseek-ai/DeepSeek-V4-Flash-0731`.
  - Quality Control: Strict code-derived fact packs in `AiFacts.gs` + post-validation with `checkAnswer_()`.

## Verification & Status

- TypeScript compile & Vite build: Passed (`npx tsc --noEmit && npm run build` exited with code 0).
- Mechanical scans: Verified zero invalid Tailwind v3 classes, zero transition-all, zero unapproved emojis.
- End-to-end visual audit via `agent-browser`:
  - Verified Desktop Daylight Studio Tab 1 (Dung, Trong Anh, Tung portraits render with proper badges).
  - Verified Desktop AI Popup opening, responsive dock, and Dusk theme toggle.
  - Verified Mobile viewport (390x844) responsive layout.
  - Verified GW10 target label on AI Assistant popup and Hero kicker.

## Next Steps

- Keep new UI in local development mode (`npm run dev` on port 3000) for user evaluation.
- Hold production deployment to Vercel (`npx vercel --prod`) until explicit user confirmation.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
