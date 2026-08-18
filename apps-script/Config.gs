/**
 * Config.gs — Configuration and shared helpers
 * HTCV FPL 2026-2027
 */

const CONFIG = {
  SEASON: "2026-2027",
  CLASSIC_LEAGUE_ID: 132688,
  H2H_LEAGUE_ID: 132702,
  SPREADSHEET_ID: "1QgE5GaFRSf9Qhv7KuD5UOccoMsxmM_98muPurRB2UHE",
  // Entry id reserved for a manager who has not registered an FPL team yet
  PLACEHOLDER_ID: 9999999,
  PLAYERS: [
    { id: 57214, team: "Nerazzurri", manager: "Dũng" },
    { id: 71922, team: "Kiss The Rain", manager: "Trọng Anh" },
    { id: 152158, team: "Dream Team", manager: "Shark Tú" },
    { id: 186794, team: "lumLua", manager: "Khánh" },
    { id: 695284, team: "Bố của NHA 25/26", manager: "Thành" },
    { id: 701064, team: "Tuanhm", manager: "Tuấn" },
    { id: 786718, team: "StampingMachine20", manager: "Lập" },
    { id: 832249, team: "DaddyCool", manager: "Trường" },
    { id: 1189156, team: "Pak", manager: "Tùng" },
    { id: 1860254, team: "ĐinhBộHúp", manager: "Đại" },
    { id: 3053458, team: "vito_scaletta", manager: "Hải" },
    { id: 4334607, team: "VMC", manager: "Cường" },
    { id: 4403856, team: "dam thanh's Team", manager: "Shark Lâm" },
    { id: 9999999, team: "Tân Team", manager: "Tân" } // ID sẽ cập nhật sau
  ],
  FEE: {
    ENTRY: 500000,
    WEEKLY_WINNER: 50000,
    MONTHLY_CLASSIC_WINNER: 100000,
    MONTHLY_H2H_WINNER: 100000,
    SEASON_CLASSIC: [800000, 500000, 200000],
    SEASON_H2H: [800000, 500000, 200000],
    CUP_CHAMPION: 100000
  },
  API_BASE_URL: "https://fantasy.premierleague.com/api/",

  // --- Runtime tuning ---
  SEASON_STATE_TTL: 600,     // seconds — cached gameweek/season state
  LIVE_TTL: 90,              // seconds — cached live gameweek scores
  WEB_CACHE_TTL: 300,        // seconds — cached read-only web responses
  HEAVY_REFRESH_COOLDOWN: 180, // seconds — min gap between full refreshes
  MAX_LOG_ROWS: 500,         // rows kept per log sheet before trimming
  VN_TZ_OFFSET_HOURS: 7      // Asia/Ho_Chi_Minh, used to bucket GWs by month
};

// Vietnamese month labels in season order (August → May)
const MONTH_LABELS = [
  { key: "Aug", month: 8, name: "Tháng 8" },
  { key: "Sep", month: 9, name: "Tháng 9" },
  { key: "Oct", month: 10, name: "Tháng 10" },
  { key: "Nov", month: 11, name: "Tháng 11" },
  { key: "Dec", month: 12, name: "Tháng 12" },
  { key: "Jan", month: 1, name: "Tháng 1" },
  { key: "Feb", month: 2, name: "Tháng 2" },
  { key: "Mar", month: 3, name: "Tháng 3" },
  { key: "Apr", month: 4, name: "Tháng 4" },
  { key: "May", month: 5, name: "Tháng 5" }
];

/**
 * Fallback month → gameweek map for 2026-2027, derived from the published
 * fixture calendar. Only used when bootstrap-static is unreachable; the live
 * map is computed from event deadlines by getMonthGwMap().
 */
const MONTH_GW_FALLBACK = {
  "Aug": [1, 2],
  "Sep": [3, 4, 5],
  "Oct": [6, 7, 8, 9],
  "Nov": [10, 11, 12],
  "Dec": [13, 14, 15, 16, 17, 18],
  "Jan": [19, 20, 21, 22, 23],
  "Feb": [24, 25, 26, 27],
  "Mar": [28, 29, 30],
  "Apr": [31, 32, 33],
  "May": [34, 35, 36, 37, 38]
};

/**
 * Month → gameweek map computed from real FPL deadlines (Vietnam time).
 * Cached because every consumer needs it and it only changes when the
 * fixture list is rescheduled.
 * @return {Object} e.g. { Aug: [1, 2], Sep: [3, 4, 5], ... }
 */
function getMonthGwMap() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("month_gw_map");
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) { /* fall through and rebuild */ }
  }

  const state = getSeasonState();
  if (!state || !state.events || !state.events.length) return MONTH_GW_FALLBACK;

  const map = {};
  for (const label of MONTH_LABELS) map[label.key] = [];

  for (const event of state.events) {
    const monthNumber = event.deadlineMonth; // already converted to VN time
    const label = MONTH_LABELS.filter(function (l) { return l.month === monthNumber; })[0];
    if (label) map[label.key].push(event.id);
  }

  // A month with no gameweeks means the calendar shifted beyond recognition —
  // trust the fallback rather than publishing an empty prize month.
  for (const label of MONTH_LABELS) {
    if (map[label.key].length === 0) return MONTH_GW_FALLBACK;
  }

  cache.put("month_gw_map", JSON.stringify(map), 21600); // 6h
  return map;
}

/**
 * Month buckets in season order, ready for sheet rows and API responses.
 * @return {Array<{key: string, name: string, gws: number[], label: string}>}
 */
function getMonthBuckets() {
  const map = getMonthGwMap();
  return MONTH_LABELS.map(function (label) {
    const gws = map[label.key] || [];
    return {
      key: label.key,
      name: label.name,
      gws: gws,
      label: gws.length ? "GW" + gws[0] + "-" + gws[gws.length - 1] : ""
    };
  });
}

/** Managers with a real FPL entry id (excludes unregistered placeholders). */
function getActivePlayers() {
  return CONFIG.PLAYERS.filter(function (p) { return p.id !== CONFIG.PLACEHOLDER_ID; });
}

/** Resolve an FPL entry id to the league nickname, falling back to the given name. */
function getManagerName(entryId, fallback) {
  const match = CONFIG.PLAYERS.filter(function (p) { return String(p.id) === String(entryId); })[0];
  return match ? match.manager : (fallback || String(entryId));
}

/**
 * Helper: Get sheet by name
 * Prefers getActiveSpreadsheet() so simple triggers (onEdit) keep working;
 * falls back to openById() when there is no bound context.
 */
function getSheet(sheetName) {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  return ss.getSheetByName(sheetName);
}

/**
 * Sheets parses a leading =, +, - or @ as a formula, which turned log lines
 * such as "=== REFRESH ===" into #ERROR! cells. Prefix them with an apostrophe.
 */
function escapeForCell_(value) {
  const text = String(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

/**
 * Append one row to a log sheet, trimming old rows so the sheet cannot grow
 * without bound. Never throws: logging must not break the caller.
 */
function appendLogRow_(sheetName, values) {
  try {
    const sheet = getSheet(sheetName);
    if (!sheet) return;

    const lastRow = sheet.getLastRow();
    // Trim in batches so we are not deleting a row on every single append.
    if (lastRow > CONFIG.MAX_LOG_ROWS + 200) {
      sheet.deleteRows(2, lastRow - CONFIG.MAX_LOG_ROWS);
    }
    sheet.appendRow(values.map(escapeForCell_));
  } catch (e) {
    console.error("Log write failed for " + sheetName + ": " + e.message);
  }
}

/** Helper: Log status to FPL_Status sheet */
function logStatus(message) {
  console.log(message);
  appendLogRow_("FPL_Status", [new Date(), message]);
}

/** Helper: Log API calls to FPL_API_Log sheet */
function logApi(endpoint, status) {
  appendLogRow_("FPL_API_Log", [new Date(), endpoint, status]);
}

/** Persist small pieces of runtime state (last refresh, cache generation, picks). */
function getStateProperty_(key, fallback) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  return value === null || value === undefined ? fallback : value;
}

function setStateProperty_(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, String(value));
}
