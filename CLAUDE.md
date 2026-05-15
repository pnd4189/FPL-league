# CLAUDE.md - HTCV FPL Dashboard

## Project Overview
Google Apps Script + Google Sheets dashboard cho FPL league.

## Structure
- `appscript/Code.gs` - Backend API
- `appscript/Index.html` - HTML shell
- `appscript/Styles.html` - CSS
- `appscript/Client.html` - JavaScript

## Development Rules
- Code.gs: Giữ nguyên logic refresh, chỉ thêm HTML serving + new endpoints
- HTML: Tách rõ Index (structure), Styles (CSS), Client (JS)
- Không dùng external libraries (Apps Script sandbox)
- UI language: Tiếng Việt

## API Endpoints
- `?action=status` - Refresh status
- `?action=dashboard` - All dashboard data
- `?action=monthly&month=N` - Monthly data
- `?action=pool` - Prize pool
- `?action=sheets` - Allowed sheets list
- `?action=range&sheet=X&range=Y` - Raw range

## Season Transition
1. Copy spreadsheet
2. Update FPL_Config: SEASON, LEAGUE_ID
3. Update Info sheet
4. Clear old data
5. Run setup
6. Redeploy
