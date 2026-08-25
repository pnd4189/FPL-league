/**
 * WebApp.gs — Apps Script Web App API for the Vercel frontend
 * HTCV FPL 2026-2027
 *
 * Deploy as Web App: Execute as "Me", Access "Anyone"
 * Usage:
 *   GET  {webAppUrl}?action=live                      provisional in-play scores
 *   GET  {webAppUrl}?action=dashboard
 *   GET  {webAppUrl}?action=refresh&key=YOUR_API_KEY  full rebuild
 *   POST {webAppUrl}  body: {"action":"refresh","key":"YOUR_API_KEY"}
 *
 * Set your API key in Script Properties: REFRESH_API_KEY
 */

// Responses safe to cache. Live scores are excluded because Live.gs already
// caches them on its own, shorter clock.
const CACHEABLE_ACTIONS = [
  "dashboard", "classic", "h2h", "h2h_matches", "h2h_schedule", "weekly",
  "monthly", "cup", "finance", "player", "config", "players"
];

function getRefreshApiKey_() {
  return PropertiesService.getScriptProperties().getProperty("REFRESH_API_KEY") || "htcv-fpl-2027";
}

/**
 * Cache keys are namespaced by a generation counter. Bumping the counter
 * invalidates every cached response at once, which is far more reliable than
 * trying to reconstruct and delete each individual key.
 */
function getCacheGeneration_() {
  return getStateProperty_("cache_generation", "1");
}

function bumpCacheGeneration_() {
  const next = parseInt(getCacheGeneration_(), 10) + 1;
  setStateProperty_("cache_generation", next);
  return next;
}

function buildCacheKey_(action, params) {
  return ["webapp", getCacheGeneration_(), action, params.gw || "", params.id || ""].join("|");
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = params.action || "dashboard";

  ensureTriggersInstalled_();
  const cache = CacheService.getScriptCache();
  const cacheable = CACHEABLE_ACTIONS.indexOf(action) !== -1;
  const cacheKey = buildCacheKey_(action, params);

  if (cacheable) {
    const cached = cache.get(cacheKey);
    if (cached) return createJsonResponse(cached);
  }

  let result;

  try {
    switch (action) {
      case "dashboard":
        result = getDashboardData();
        break;
      case "classic":
        result = getSheetDataAsObjects("🏅 Classic BXH");
        break;
      case "h2h":
        result = getSheetDataAsObjects("⚔️ H2H BXH");
        break;
      case "h2h_matches":
        result = getH2HMatchesData(params.gw);
        break;
      case "h2h_schedule":
        result = getH2HSchedule();
        break;
      case "weekly":
        result = getSheetDataAsObjects("🏆 Weekly Winners");
        break;
      case "monthly":
        result = getSheetDataAsObjects("📅 Monthly Awards");
        break;
      case "cup":
        result = getSheetDataAsObjects("🥊 Fantasy Cup");
        break;
      case "finance":
        result = getFinanceData();
        break;
      case "player":
        result = getPlayerData(params.id);
        break;
      case "config":
        result = getConfigData();
        break;
      case "players":
        result = getPlayersWithAvatars();
        break;
      case "live":
        result = getLiveData();
        break;
      case "season":
        result = getSeasonData();
        break;
      case "refresh":
        result = handleRefresh_(params.key);
        break;
      case "status":
        result = getRefreshStatus_();
        break;
      default:
        result = { status: "error", message: "Unknown action: " + action };
    }
  } catch (err) {
    result = { status: "error", message: err.message };
  }

  const body = JSON.stringify(result);

  // Only successful reads are cached — caching an error froze transient
  // failures in place for five minutes.
  if (cacheable && result && result.status === "success") {
    try {
      cache.put(cacheKey, body, CONFIG.WEB_CACHE_TTL);
    } catch (err) { /* payload too large for cache — serve uncached */ }
  }

  return createJsonResponse(body);
}

/** @param {string|Object} data already-serialised body, or a value to serialise */
function createJsonResponse(data) {
  const body = typeof data === "string" ? data : JSON.stringify(data);
  return ContentService.createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}

// ---- Data retrieval helpers ----

function getSheetDataAsObjects(sheetName) {
  const sheet = getSheet(sheetName);
  if (!sheet) return { status: "error", message: "Sheet not found: " + sheetName };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status: "success", data: [] };

  const headers = data[0];
  const rows = [];

  for (let i = 1; i < data.length; i++) {
    // Skip empty rows
    if (!data[i][0] && !data[i][1]) continue;
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    rows.push(row);
  }

  return { status: "success", data: rows };
}

function getDashboardData() {
  const dashSheet = getSheet("📊 Dashboard");
  if (!dashSheet) return { status: "error", message: "Dashboard sheet not found" };

  const state = getSeasonState();

  return {
    status: "success",
    data: {
      season: CONFIG.SEASON,
      // Prefer live season state over the last written cell so the header is
      // correct even between scheduled refreshes.
      currentGW: state ? (state.isPreSeason ? "Pre-season" : state.displayGw) : dashSheet.getRange("B4").getValue(),
      gwsCompleted: state ? state.finishedGws : dashSheet.getRange("B5").getValue(),
      isLive: state ? state.isLive : false,
      numPlayers: CONFIG.PLAYERS.length,
      lastUpdated: dashSheet.getRange("B27").getValue(),
      latestWeeklyWinner: {
        gw: dashSheet.getRange("B17").getValue(),
        winner: dashSheet.getRange("B18").getValue(),
        score: dashSheet.getRange("B19").getValue()
      }
    }
  };
}

/** Season/gameweek state, used by the website to auto-select the current GW. */
function getSeasonData() {
  const state = getSeasonState();
  if (!state) return { status: "error", message: "Cannot reach FPL API" };

  return {
    status: "success",
    data: {
      season: CONFIG.SEASON,
      currentGw: state.currentGw,
      displayGw: state.displayGw,
      nextGw: state.nextGw,
      isPreSeason: state.isPreSeason,
      isLive: state.isLive,
      finishedGws: state.finishedGws,
      months: getMonthBuckets()
    }
  };
}

function getConfigData() {
  return {
    status: "success",
    data: {
      season: CONFIG.SEASON,
      classicLeagueId: CONFIG.CLASSIC_LEAGUE_ID,
      h2hLeagueId: CONFIG.H2H_LEAGUE_ID,
      players: CONFIG.PLAYERS.map(function (p) {
        return { id: p.id, team: p.team, manager: p.manager };
      }),
      prizes: CONFIG.FEE,
      months: getMonthBuckets()
    }
  };
}

function getH2HMatchesData(gwFilter) {
  const sheet = getSheet("LichThiDauLeague");
  if (!sheet) return { status: "error", message: "H2H matches sheet not found" };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status: "success", data: [] };

  const headers = data[0];
  const rows = [];

  for (let i = 1; i < data.length; i++) {
    if (gwFilter && String(data[i][0]) !== String(gwFilter)) continue;
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    rows.push(row);
  }

  return { status: "success", data: rows };
}

function getFinanceData() {
  const income = CONFIG.FEE.ENTRY * CONFIG.PLAYERS.length;
  const weeklyTotal = CONFIG.FEE.WEEKLY_WINNER * 38;
  const monthlyTotal = (CONFIG.FEE.MONTHLY_CLASSIC_WINNER + CONFIG.FEE.MONTHLY_H2H_WINNER) * 10;
  const seasonClassic = CONFIG.FEE.SEASON_CLASSIC.reduce(function (a, b) { return a + b; }, 0);
  const seasonH2H = CONFIG.FEE.SEASON_H2H.reduce(function (a, b) { return a + b; }, 0);
  const cupTotal = CONFIG.FEE.CUP_CHAMPION;
  const totalExpenses = weeklyTotal + monthlyTotal + seasonClassic + seasonH2H + cupTotal;

  return {
    status: "success",
    data: {
      income: income,
      expenses: {
        weekly: weeklyTotal,
        monthly: monthlyTotal,
        seasonClassic: seasonClassic,
        seasonH2H: seasonH2H,
        cup: cupTotal,
        total: totalExpenses
      },
      balance: income - totalExpenses,
      players: CONFIG.PLAYERS.map(function (p) {
        return { manager: p.manager, fee: CONFIG.FEE.ENTRY, paid: false };
      })
    }
  };
}

function getPlayerData(entryId) {
  if (!entryId) return { status: "error", message: "Missing player id" };

  const player = CONFIG.PLAYERS.filter(function (p) { return String(p.id) === String(entryId); })[0];
  if (!player) return { status: "error", message: "Player not found" };

  const fdSheet = getSheet("FantasyData");
  const fdData = fdSheet ? fdSheet.getDataRange().getValues() : [];

  const scores = [];
  let totalPts = 0;
  let bestGW = { gw: 0, pts: 0 };

  for (let i = 1; i < fdData.length; i++) {
    if (String(fdData[i][0]) === String(entryId)) {
      const gw = fdData[i][1];
      const pts = fdData[i][11];
      scores.push({ gw: gw, pts: pts });
      totalPts += pts;
      if (pts > bestGW.pts) bestGW = { gw: gw, pts: pts };
    }
  }

  return {
    status: "success",
    data: {
      id: player.id,
      team: player.team,
      manager: player.manager,
      totalPts: totalPts,
      avgPts: scores.length > 0 ? Math.round(totalPts / scores.length * 10) / 10 : 0,
      bestGW: bestGW,
      gwCount: scores.length,
      scores: scores
    }
  };
}

function getPlayersWithAvatars() {
  const infoSheet = getSheet("Info");
  if (!infoSheet) return { status: "error", message: "Info sheet not found" };

  const data = infoSheet.getDataRange().getValues();
  const players = [];

  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    players.push({
      id: data[i][0],
      team: data[i][1],
      manager: data[i][2],
      avatarUrl: data[i][3] || ""  // Column D = Avatar URL
    });
  }

  return { status: "success", data: players };
}

// ============================================================
// MANUAL REFRESH — Via Web API (for Vercel frontend)
// ============================================================

/**
 * POST handler.
 * Note: browsers cannot reach this endpoint because Apps Script does not
 * answer CORS preflight requests; the website uses the GET form instead.
 * Body: { "action": "refresh", "key": "..." }
 *       { "action": "refresh_partial", "key": "...", "modules": ["classic"] }
 */
function doPost(e) {
  let body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return createJsonResponse({ status: "error", message: "Invalid JSON body" });
  }

  switch (body.action || "") {
    case "refresh":
      return createJsonResponse(handleRefresh_(body.key));
    case "refresh_partial":
      return createJsonResponse(handlePartialRefresh_(body.key, body.modules || []));
    default:
      return createJsonResponse({ status: "error", message: "Unknown POST action: " + (body.action || "") });
  }
}

/**
 * Full refresh with API key validation, a cooldown and an execution lock.
 * The lock matters: two visitors landing at the same moment previously started
 * two concurrent rebuilds that fought over the same ranges.
 */
function handleRefresh_(apiKey) {
  if (apiKey !== getRefreshApiKey_()) {
    return { status: "error", message: "Invalid API key. Set key via Script Properties." };
  }

  const cooldown = checkRefreshCooldown_();
  if (cooldown) return cooldown;

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    return { status: "error", message: "A refresh is already running. Try again shortly.", running: true };
  }

  try {
    markRefreshStarted_();
    const startTime = Date.now();
    const outcome = refreshFPLAll();
    const elapsed = Math.round((Date.now() - startTime) / 1000);

    return {
      status: outcome.failed.length ? "partial" : "success",
      message: outcome.failed.length
        ? "Refresh finished with " + outcome.failed.length + " failed step(s) in " + elapsed + "s"
        : "Full refresh completed in " + elapsed + "s",
      failed: outcome.failed,
      timestamp: new Date().toISOString(),
      elapsed: elapsed
    };
  } catch (err) {
    return { status: "error", message: "Refresh failed: " + err.message, timestamp: new Date().toISOString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Partial refresh — only specified modules
 * modules: ["classic", "h2h", "weekly", "monthly", "dashboard", "fantasy", "h2h_matches"]
 */
function handlePartialRefresh_(apiKey, modules) {
  if (apiKey !== getRefreshApiKey_()) {
    return { status: "error", message: "Invalid API key" };
  }

  const cooldown = checkRefreshCooldown_();
  if (cooldown) return cooldown;

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    return { status: "error", message: "A refresh is already running.", running: true };
  }

  const moduleMap = {
    "fantasy": refreshFantasyData,
    "h2h_matches": refreshH2HMatches,
    "classic": updateClassicStandings,
    "h2h": updateH2HStandings,
    "weekly": updateWeeklyWinners,
    "monthly": updateMonthlyAwards,
    "dashboard": updateDashboard,
    "monthly_sheets": updateMonthlySheets
  };

  try {
    markRefreshStarted_();
    const startTime = Date.now();
    const results = {};

    for (const mod of modules) {
      if (!moduleMap[mod]) {
        results[mod] = "unknown module";
        continue;
      }
      try {
        moduleMap[mod]();
        results[mod] = "ok";
      } catch (err) {
        results[mod] = "error: " + err.message;
      }
    }

    bumpCacheGeneration_();

    return {
      status: "success",
      message: "Partial refresh completed",
      modules: results,
      elapsed: Math.round((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString()
    };
  } finally {
    lock.releaseLock();
  }
}

/** @return {Object|null} an error envelope while the cooldown is active */
function checkRefreshCooldown_() {
  const cache = CacheService.getScriptCache();
  const lastRefresh = cache.get("last_manual_refresh");
  if (!lastRefresh) return null;

  const elapsed = Math.round((Date.now() - parseInt(lastRefresh, 10)) / 1000);
  const retryAfter = Math.max(1, CONFIG.HEAVY_REFRESH_COOLDOWN - elapsed);
  return {
    status: "cooldown",
    message: "Dữ liệu vừa được đồng bộ " + elapsed + "s trước. Thử lại sau " + retryAfter + "s.",
    retryAfter: retryAfter,
    lastRefresh: new Date(parseInt(lastRefresh, 10)).toISOString()
  };
}

function markRefreshStarted_() {
  CacheService.getScriptCache()
    .put("last_manual_refresh", String(Date.now()), CONFIG.HEAVY_REFRESH_COOLDOWN);
}

/**
 * Last refresh status. Reads persisted run state rather than fixed cells that
 * nothing ever wrote.
 */
function getRefreshStatus_() {
  const state = getSeasonState();
  return {
    status: "success",
    data: {
      lastRefresh: getStateProperty_("last_refresh_at", ""),
      lastStatus: getStateProperty_("last_refresh_status", "never run"),
      latestGW: state ? state.displayGw : getStateProperty_("last_refresh_gw", ""),
      isLive: state ? state.isLive : false,
      triggerStatus: areTriggersInstalled() ? "Installed (6h + hourly check)" : "Not installed",
      cacheGeneration: getCacheGeneration_()
    }
  };
}
