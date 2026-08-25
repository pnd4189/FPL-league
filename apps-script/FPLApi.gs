/**
 * FPLApi.gs — FPL API interaction module
 * HTCV FPL 2026-2027
 */

// Timestamp of the previous outbound call, used to space requests without
// sleeping before the very first call of an execution.
let lastFetchAt_ = 0;

/**
 * Fetch a FPL endpoint with pacing, retries and non-fatal logging.
 * Logging is deliberately kept outside the request result path: a Sheets
 * outage must never turn a successful API response into a null.
 *
 * @param {string} endpoint path relative to CONFIG.API_BASE_URL
 * @param {{retries?: number, silent?: boolean}} [opts] silent skips sheet
 *        logging, used by the high-frequency live polling path
 * @return {Object|null} parsed JSON, or null when the call ultimately failed
 */
function fetchFPL(endpoint, opts) {
  const options = opts || {};
  const maxRetries = options.retries === undefined ? 2 : options.retries;
  const url = CONFIG.API_BASE_URL + endpoint;
  const requestOptions = {
    method: "get",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    },
    muteHttpExceptions: true
  };

  let lastStatus = "unknown";
  let payload = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Pace requests ~500ms apart, but only when a previous call was recent.
    const sinceLast = Date.now() - lastFetchAt_;
    if (lastFetchAt_ > 0 && sinceLast < 500) Utilities.sleep(500 - sinceLast);

    try {
      const response = UrlFetchApp.fetch(url, requestOptions);
      lastFetchAt_ = Date.now();
      const statusCode = response.getResponseCode();
      lastStatus = statusCode;

      if (statusCode === 200) {
        payload = JSON.parse(response.getContentText());
        break;
      }
      // 404 is a normal answer for picks before a deadline — do not retry.
      if (statusCode === 404) break;
      // Anything else is worth one more try after a short backoff.
      if (attempt < maxRetries) Utilities.sleep(1000 * (attempt + 1));
    } catch (e) {
      lastFetchAt_ = Date.now();
      lastStatus = "Exception: " + e.message;
      console.error("Exception fetching " + url + ": " + e.message);
      if (attempt < maxRetries) Utilities.sleep(1000 * (attempt + 1));
    }
  }

  if (payload === null) console.error("Failed fetching " + url + ": " + lastStatus);
  // The live path polls every ~90s; logging it would drown the audit log and
  // add needless Sheets contention on the hot path.
  if (!options.silent) logApi(endpoint, lastStatus);
  return payload;
}

function fetchBootstrap() {
  return fetchFPL("bootstrap-static/");
}

function fetchEntryHistory(entryId) {
  return fetchFPL("entry/" + entryId + "/history/");
}

function fetchClassicStandings(leagueId) {
  return fetchFPL("leagues-classic/" + leagueId + "/standings/");
}

function fetchH2HStandings(leagueId) {
  return fetchFPL("leagues-h2h/" + leagueId + "/standings/");
}

function fetchH2HMatches(leagueId, gw) {
  return fetchFPL("leagues-h2h-matches/league/" + leagueId + "/?event=" + gw);
}

/** One page of the full-season match list (pairings for every gameweek). */
function fetchH2HMatchesPage(leagueId, page) {
  return fetchFPL("leagues-h2h-matches/league/" + leagueId + "/?page=" + page);
}

/** Live player scores for a gameweek — the source of truth for provisional points. */
function fetchEventLive(gw) {
  return fetchFPL("event/" + gw + "/live/", { silent: true });
}

/** A manager's squad for a gameweek. Returns null before the deadline (404). */
function fetchEntryPicks(entryId, gw) {
  return fetchFPL("entry/" + entryId + "/event/" + gw + "/picks/", { retries: 0 });
}

/** Fixture list for a gameweek — small payload used to detect in-play windows. */
function fetchFixtures(gw) {
  return fetchFPL("fixtures/?event=" + gw, { silent: true });
}

/**
 * Season/gameweek state derived from bootstrap-static.
 *
 * bootstrap-static is ~1.4 MB, so it is fetched once and only the small
 * derived summary is cached; every caller reads the summary instead of
 * re-downloading the payload.
 *
 * @param {boolean} [forceRefresh] bypass the cache
 * @return {{currentGw: number, displayGw: number, nextGw: number|null,
 *           isPreSeason: boolean, isLive: boolean, finishedGws: number,
 *           events: Array}|null}
 */
function getSeasonState(forceRefresh) {
  const cache = CacheService.getScriptCache();
  if (!forceRefresh) {
    const cached = cache.get("season_state");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) { /* rebuild below */ }
    }
  }

  const bootstrap = fetchBootstrap();
  if (!bootstrap || !bootstrap.events || !bootstrap.events.length) return null;

  const offsetMs = CONFIG.VN_TZ_OFFSET_HOURS * 3600 * 1000;
  const events = bootstrap.events.map(function (event) {
    // Deadlines are UTC; bucket them by Vietnam local month for prize months.
    const localDeadline = new Date(new Date(event.deadline_time).getTime() + offsetMs);
    return {
      id: event.id,
      deadline: event.deadline_time,
      deadlineMonth: localDeadline.getUTCMonth() + 1,
      finished: !!event.finished,
      dataChecked: !!event.data_checked,
      isCurrent: !!event.is_current,
      isNext: !!event.is_next
    };
  });

  const current = events.filter(function (e) { return e.isCurrent; })[0] || null;
  const next = events.filter(function (e) { return e.isNext; })[0] || null;
  const finished = events.filter(function (e) { return e.finished; });
  const finishedGws = finished.length;
  const isPreSeason = !current && finishedGws === 0;

  // The gameweek users should be looking at right now: the one in progress,
  // otherwise the most recent completed one, otherwise GW1 before kickoff.
  let displayGw;
  if (current) displayGw = current.id;
  else if (finishedGws > 0) displayGw = finished[finishedGws - 1].id;
  else displayGw = 1;

  const state = {
    currentGw: current ? current.id : (next ? next.id : 38),
    displayGw: displayGw,
    nextGw: next ? next.id : null,
    isPreSeason: isPreSeason,
    // "Live" means the gameweek has started but points are still provisional.
    isLive: !!current && !current.finished,
    finishedGws: finishedGws,
    events: events
  };

  try {
    cache.put("season_state", JSON.stringify(state), CONFIG.SEASON_STATE_TTL);
  } catch (e) { /* payload too large for cache — recompute next time */ }

  return state;
}

/**
 * Compact player metadata map from the same bootstrap payload the season
 * state is built from: element id → { name, team, pos }.
 *
 * Needed to render squad details (captain, hover popup) without shipping the
 * whole 1.4 MB bootstrap to the website. Cached 6h — squads do not change
 * mid-gameweek.
 *
 * @return {Object} element id → { name: web_name, team: short_code, pos: 1-4 }
 */
function getElementMeta_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("element_map");
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) { /* rebuild below */ }
  }

  const bootstrap = fetchBootstrap();
  if (!bootstrap || !bootstrap.elements) return {};

  const teamShort = {};
  for (const team of (bootstrap.teams || [])) teamShort[team.id] = team.short_name;

  const map = {};
  for (const element of bootstrap.elements) {
    map[element.id] = {
      name: element.web_name,
      team: teamShort[element.team] || "",
      pos: element.element_type
    };
  }

  try {
    cache.put("element_map", JSON.stringify(map), 21600); // 6h
  } catch (e) { /* too large — rebuild next time */ }
  return map;
}

/**
 * Gets the gameweek whose data should currently be written/displayed.
 * @return {number|null} null only when bootstrap is unreachable
 */
function getCurrentGameweek() {
  const state = getSeasonState();
  return state ? state.displayGw : null;
}

/**
 * True when at least one fixture of the gameweek has kicked off and not all of
 * them are finished — the window where live polling is worth the API call.
 */
function isGameweekInPlay(gw) {
  const fixtures = fetchFixtures(gw);
  if (!fixtures || !fixtures.length) return false;

  let started = false;
  let allFinished = true;
  for (const fixture of fixtures) {
    if (fixture.started) started = true;
    if (!fixture.finished_provisional) allFinished = false;
  }
  return started && !allFinished;
}
