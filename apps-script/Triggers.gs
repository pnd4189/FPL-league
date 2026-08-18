/**
 * Triggers.gs — Scheduled refresh management
 * HTCV FPL 2026-2027
 *
 * Two schedules:
 *   - scheduledFullRefresh  every 6h, full rebuild of settled data
 *   - hourlySettlementCheck hourly, cheap probe that only runs a full refresh
 *                          once a gameweek has actually been finalised
 * In-play scoring is not scheduled: the website pulls it from Live.gs.
 */

const TRIGGER_HANDLERS = ["scheduledFullRefresh", "hourlySettlementCheck"];

function installTrigger() {
  removeTriggers();

  ScriptApp.newTrigger("scheduledFullRefresh")
    .timeBased()
    .everyHours(6)
    .create();

  ScriptApp.newTrigger("hourlySettlementCheck")
    .timeBased()
    .everyHours(1)
    .create();

  setStateProperty_("triggers_installed_at", new Date().toISOString());
  logStatus("Triggers installed: full refresh every 6h + hourly settlement check.");
}

function removeTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;
  for (const trigger of triggers) {
    if (TRIGGER_HANDLERS.indexOf(trigger.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  }
  setStateProperty_("triggers_installed_at", "");
  logStatus("Triggers removed: " + removed);
}

/** Whether the scheduled refresh is currently installed. */
function areTriggersInstalled() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === "scheduledFullRefresh") return true;
  }
  return false;
}

/**
 * Install the schedule if it is missing, checked at most once every six hours.
 *
 * The trigger had never actually been installed on this project, which left
 * the sheet dependent on somebody opening the website. Checking from the web
 * app costs one call to getProjectTriggers() twice a day.
 */
function ensureTriggersInstalled_() {
  const cache = CacheService.getScriptCache();
  if (cache.get("triggers_checked")) return;
  cache.put("triggers_checked", "1", 21600); // 6h

  try {
    if (!areTriggersInstalled()) {
      installTrigger();
      logStatus("Triggers were missing and have been installed automatically.");
    }
  } catch (err) {
    logStatus("Auto trigger install failed: " + err.message);
  }
}

/** Scheduled 6h rebuild. Wrapped so it can never overlap another refresh. */
function scheduledFullRefresh() {
  runRefreshWithLock_("6h trigger");
}

/**
 * Full rebuild of all settled data. Each step is isolated so one failing
 * module cannot stop the remaining seven from running.
 * @return {{ok: string[], failed: string[]}}
 */
function refreshFPLAll() {
  logStatus(">>> MASTER REFRESH STARTED");

  const steps = [
    ["fantasy", refreshFantasyData],
    ["h2h_matches", refreshH2HMatches],
    ["classic", updateClassicStandings],
    ["h2h", updateH2HStandings],
    ["weekly", updateWeeklyWinners],
    ["monthly", updateMonthlyAwards],
    ["dashboard", updateDashboard],
    ["monthly_sheets", updateMonthlySheets]
  ];

  const ok = [];
  const failed = [];

  for (const step of steps) {
    try {
      step[1]();
      ok.push(step[0]);
    } catch (err) {
      failed.push(step[0] + ": " + err.message);
      logStatus("Step failed — " + step[0] + ": " + err.message);
    }
  }

  const state = getSeasonState();
  setStateProperty_("last_refresh_at", new Date().toISOString());
  setStateProperty_("last_refresh_status", failed.length ? "partial (" + failed.length + " failed)" : "success");
  setStateProperty_("last_refresh_gw", state ? String(state.displayGw) : "");
  if (state) setStateProperty_("last_settled_gw", String(state.finishedGws));

  // Any cached web response is now stale; bump the generation so readers miss.
  bumpCacheGeneration_();

  logStatus(">>> MASTER REFRESH COMPLETED — ok: " + ok.length + ", failed: " + failed.length);
  return { ok: ok, failed: failed };
}

/**
 * Run a full refresh only if no other refresh holds the script lock.
 * Triggers and the sheet checkbox go through here; the web endpoint takes the
 * same lock itself so the two can never rebuild the sheets at once.
 * @return {{ok: string[], failed: string[]}|null} null when skipped
 */
function runRefreshWithLock_(source) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    logStatus("Refresh skipped (" + source + "): another refresh is already running.");
    return null;
  }
  try {
    return refreshFPLAll();
  } finally {
    lock.releaseLock();
  }
}

/**
 * Cheap hourly probe. A gameweek only settles once, and waiting up to six
 * hours to publish the final table is too slow, so this reacts within the hour
 * while costing a single cached bootstrap call the rest of the time.
 */
function hourlySettlementCheck() {
  const state = getSeasonState(true); // force: we are specifically looking for change
  if (!state) return;

  const lastSettled = parseInt(getStateProperty_("last_settled_gw", "-1"), 10);
  if (state.finishedGws > lastSettled) {
    logStatus("Settlement detected: " + lastSettled + " -> " + state.finishedGws + " finished GWs. Running full refresh.");
    runRefreshWithLock_("hourly settlement check");
    return;
  }

  // Squad picks are immutable after a deadline; warm them so the first visitor
  // after kickoff does not pay for 13 sequential fetches.
  if (state.isLive) {
    try {
      getGameweekPicks_(state.displayGw);
    } catch (err) {
      logStatus("Pick warmup failed: " + err.message);
    }
  }
}
