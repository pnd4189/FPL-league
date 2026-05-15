---
title: "HTCV FPL Web Dashboard - Google Apps Script"
description: "Triển khai read-only web dashboard cho HTCV FPL league (12 managers, 4 teams) sử dụng Google Apps Script + Google Sheets. Giao diện tiếng Việt, mobile-first, light theme, 5 tabs, embed trong Google Sites."
status: completed
priority: P2
branch: "main"
tags: ["apps-script", "google-sheets", "dashboard", "fpl"]
blockedBy: []
blocks: []
created: "2026-05-15T09:20:38.705Z"
createdBy: "ck:plan"
source: skill
---

# HTCV FPL Web Dashboard - Google Apps Script

## Overview

Triển khai Google Sheet FPL league (12 managers, 4 teams) thành read-only web dashboard, embed trong Google Sites, phục vụ 12-15 người xem kết quả. Giao diện tiếng Việt, mobile-first, cache client-side 5 phút.

**Source:** [Brainstorm Report](./reports/brainstorm-2026-05-15-fpl-dashboard.md)

## Phases

| Phase | Name | Status | Priority | Effort |
|-------|------|--------|----------|--------|
| 1 | [Backend Code.gs](./phase-01-backend-code-gs.md) | Completed | P1 | 2h |
| 2 | [Frontend HTML Shell](./phase-02-frontend-html-shell.md) | Completed | P1 | 1h |
| 3 | [Styles CSS](./phase-03-styles-css.md) | Completed | P2 | 1.5h |
| 4 | [Client JavaScript](./phase-04-client-javascript.md) | Completed | P1 | 3h |
| 5 | [Documentation](./phase-05-documentation.md) | Completed | P2 | 1h |
| 6 | [Deploy & Validation](./phase-06-deploy-validation.md) | Completed | P1 | 1h |

## Key Decisions

- **Theme:** Light (clean), mobile-first
- **Tabs:** H2H, Classic, Tháng, Tổng kết, Pool giải
- **H2H data:** Fetch all ~228 rows at once (no pagination)
- **Season management:** Auto-detect sheets, manual config update (~7 min/season)
- **Security:** Execute as ME, public access, read-only API

## Dependencies

- Phase 1 → Phase 2 (HTML needs API endpoints)
- Phase 2 → Phase 3 (CSS needs HTML structure)
- Phase 2 → Phase 4 (JS needs HTML structure)
- Phase 1-4 → Phase 5 (Docs after implementation)
- Phase 1-5 → Phase 6 (Validation after all)
