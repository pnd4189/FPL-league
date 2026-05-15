/*****************************************************
 * HTCV FPL Dashboard - Google Apps Script Backend
 * Read-only web dashboard for FPL league data
 *****************************************************/

// ========== WEB APP ==========

function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};
  var action = String(params.action || '').toLowerCase();

  // Serve HTML dashboard when no action param
  if (!action) {
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('HTCV FPL Dashboard')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // JSON API routes
  if (action === 'status') {
    return jsonOutput_(getStatusPayload_());
  }
  if (action === 'sheets') {
    return jsonOutput_({ ok: true, sheets: getAllowedSheets_() });
  }
  if (action === 'dashboard') {
    return jsonOutput_(getDashboardPayload_());
  }
  if (action === 'monthly') {
    return jsonOutput_(getMonthlyPayload_(params.month));
  }
  if (action === 'pool') {
    return jsonOutput_(getPoolPayload_());
  }
  if (action === 'range') {
    return jsonOutput_(getRangePayload_(params.sheet, params.range));
  }

  return jsonOutput_({ ok: false, error: 'Unknown action: ' + action });
}

// ========== HTML INCLUDE HELPER ==========

var INCLUDE_WHITELIST_ = ['Index', 'Styles', 'Client'];

function include(filename) {
  if (INCLUDE_WHITELIST_.indexOf(filename) === -1) {
    return '<!-- blocked -->';
  }
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ========== RESPONSE HELPERS ==========

function jsonOutput_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ========== CONFIG & UTILITY ==========

function getConfigValue_(key, defaultVal) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('FPL_Config');
    if (!sheet) return defaultVal;

    var data = sheet.getDataRange().getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() === key) {
        return data[i][1] != null ? String(data[i][1]) : defaultVal;
      }
    }
  } catch (e) {
    console.error('getConfigValue_ error:', e);
  }
  return defaultVal;
}

function safeRangeMatrix_(sheetName, a1Notation) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];

    var range = sheet.getRange(a1Notation);
    return range.getValues();
  } catch (e) {
    console.error('safeRangeMatrix_ error:', sheetName, a1Notation, e);
    return [];
  }
}

// ========== ALLOWED SHEETS (AUTO-DETECT) ==========

var allowedSheetsCache_ = null;

function getAllowedSheets_() {
  if (allowedSheetsCache_) return allowedSheetsCache_;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var allSheets = ss.getSheets().map(function(s) { return s.getName(); });

  var always = ['Giải Team', 'Tổng kết giải', 'FPL_Status'];
  var monthly = allSheets.filter(function(name) {
    return /^Tháng \d+$/.test(name);
  });

  allowedSheetsCache_ = always.concat(monthly);
  return allowedSheetsCache_;
}

// ========== PAYLOAD BUILDERS ==========

function getStatusPayload_() {
  var statusData = safeRangeMatrix_('FPL_Status', 'A1:B10');
  var status = {};

  for (var i = 0; i < statusData.length; i++) {
    var key = String(statusData[i][0] || '').trim();
    var val = statusData[i][1];
    if (key) {
      status[key] = val;
    }
  }

  return { ok: true, status: status };
}

function getDashboardPayload_() {
  var sheets = getAllowedSheets_();
  var months = sheets
    .filter(function(name) { return /^Tháng \d+$/.test(name); })
    .map(function(name) { return parseInt(name.replace('Tháng ', ''), 10); })
    .sort(function(a, b) { return a - b; });

  return {
    ok: true,
    season: getConfigValue_('SEASON', '2025-2026'),
    status: getStatusPayload_().status,
    info: safeRangeMatrix_('Info', 'A1:F13'),
    teamH2H: safeRangeMatrix_('Giải Team', 'K1:R5'),
    teamClassic: safeRangeMatrix_('Giải Team', 'K8:O12'),
    individualClassic: safeRangeMatrix_('Tổng kết giải', 'A1:M15'),
    individualH2H: safeRangeMatrix_('Tổng kết giải', 'A16:M29'),
    weeklyPrizes: safeRangeMatrix_('Tổng kết giải', 'A30:M70'),
    h2hMatches: safeRangeMatrix_('LichThiDauLeague', 'A1:N300'),
    months: months
  };
}

function getMonthlyPayload_(month) {
  var sheetName = 'Tháng ' + month;
  if (getAllowedSheets_().indexOf(sheetName) === -1) {
    return { ok: false, error: 'Không tìm thấy sheet: ' + sheetName };
  }
  return {
    ok: true,
    month: month,
    data: safeRangeMatrix_(sheetName, 'A1:Z20')
  };
}

function getPoolPayload_() {
  return {
    ok: true,
    pool: safeRangeMatrix_('Pool giải', 'A1:Z20')
  };
}

function getRangePayload_(sheetName, range) {
  if (!sheetName || !range) {
    return { ok: false, error: 'Missing sheet or range param' };
  }

  // Strict A1 notation validation
  var a1Pattern = /^[A-Z]{1,3}\d{1,5}:[A-Z]{1,3}\d{1,5}$/;
  if (!a1Pattern.test(range)) {
    return { ok: false, error: 'Invalid range format' };
  }

  var allowed = getAllowedSheets_();
  if (allowed.indexOf(sheetName) === -1) {
    return { ok: false, error: 'Sheet not allowed' };
  }

  // Validate cell count (max 5000)
  var cellCount = estimateCellCount_(range);
  if (cellCount > 5000) {
    return { ok: false, error: 'Range too large' };
  }

  var values = safeRangeMatrix_(sheetName, range);
  return { ok: true, sheet: sheetName, values: values };
}

function estimateCellCount_(a1Notation) {
  // Parse A1 notation like "A1:Z100" or "A1:F13"
  var match = String(a1Notation).match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
  if (!match) return 0;
  var colStart = columnToIndex_(match[1]);
  var colEnd = columnToIndex_(match[3]);
  var rowStart = parseInt(match[2], 10);
  var rowEnd = parseInt(match[4], 10);
  var cols = Math.abs(colEnd - colStart) + 1;
  var rows = Math.abs(rowEnd - rowStart) + 1;
  return cols * rows;
}

function columnToIndex_(col) {
  var index = 0;
  for (var i = 0; i < col.length; i++) {
    index = index * 26 + (col.charCodeAt(i) - 64);
  }
  return index;
}

// ========== REFRESH & AUTO-TRIGGER ==========
// (Existing refresh logic preserved - add your trigger/refresh functions below)
