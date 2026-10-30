/**
 * Advisor.gs — data and endpoints for the round assistant
 * HTCV FPL 2026-2027
 *
 * Builds the compact player/fixture pool and each manager's squad from the FPL
 * api, then hands them to the pure rules in AdvisorLogic.gs. Read-only: nothing
 * here touches the spreadsheet.
 *
 * Squads for the coming gameweek stay hidden until its deadline, so a squad is
 * the latest gameweek's picks with the transfers already saved for the coming
 * one applied on top.
 */

const ADVISOR_POOL_TTL = 1200;   // seconds — player pool is rebuilt at most every 20 min
const ADVISOR_REPLY_TTL = 600;   // seconds — one manager's advice

/**
 * Compact snapshot of every player plus the next gameweeks' fixtures, keyed by
 * club short name. Cached under the gameweek it was built for.
 *
 * @param {number} gw the gameweek being advised
 * @param {number} played gameweeks already finished, to judge how regular a starter is
 * @return {Object|null} see AdvisorLogic.gs, or null when the FPL api is down
 */
function getAdvisorPool_(gw, played) {
  const cached = CacheService.getScriptCache().get("advisor_pool2|" + gw);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) { /* rebuild below */ }
  }
  const built = buildAdvisorSnapshot_(gw, played);
  return built ? built.pool : null;
}

/**
 * The rest of the season for chip planning: every remaining fixture by club
 * and the chip windows from bootstrap. Kept apart from the pool so the pool
 * stays well under the 100 KB cache limit.
 *
 * @return {{gw: number, fixtures: Object, chips: Array<{name: string, start: number, stop: number}>}|null}
 */
function getAdvisorSeason_(gw, played) {
  const cached = CacheService.getScriptCache().get("advisor_season|" + gw);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) { /* rebuild below */ }
  }
  const built = buildAdvisorSnapshot_(gw, played);
  return built ? built.season : null;
}

function buildAdvisorSnapshot_(gw, played) {
  const cache = CacheService.getScriptCache();
  const bootstrap = fetchBootstrap();
  const fixtureList = fetchFPL("fixtures/", { silent: true });
  if (!bootstrap || !bootstrap.elements || !fixtureList) return null;

  const teamShort = {};
  for (const team of bootstrap.teams) teamShort[team.id] = team.short_name;

  const players = {};
  for (const el of bootstrap.elements) {
    players[el.id] = [
      el.web_name,
      teamShort[el.team] || "",
      el.element_type,
      el.now_cost,
      parseFloat(el.ep_next) || 0,
      parseFloat(el.form) || 0,
      el.chance_of_playing_next_round === null ? 100 : el.chance_of_playing_next_round,
      el.status,
      el.minutes || 0,
      el.news ? String(el.news).slice(0, 60) : "",
      parseFloat(el.selected_by_percent) || 0,
      parseFloat(el.points_per_game) || 0,
      el.starts || 0,
      parseFloat(el.expected_goal_involvements_per_90) || 0
    ];
  }

  const fixtures = {};
  const remaining = {};
  for (const team of bootstrap.teams) remaining[team.short_name] = [];
  for (const f of fixtureList) {
    if (!f.event || f.event < gw) continue;
    const home = teamShort[f.team_h];
    const away = teamShort[f.team_a];
    const h = { gw: f.event, opp: away, home: true, fdr: f.team_h_difficulty };
    const a = { gw: f.event, opp: home, home: false, fdr: f.team_a_difficulty };
    remaining[home].push(h);
    remaining[away].push(a);
    if (f.event < gw + ADVISOR_HORIZON) {
      (fixtures[home] = fixtures[home] || []).push(h);
      (fixtures[away] = fixtures[away] || []).push(a);
    }
  }

  const pool = { gw: gw, played: played, players: players, fixtures: fixtures };
  const season = {
    gw: gw,
    fixtures: remaining,
    chips: (bootstrap.chips || []).map(function (c) { return { name: c.name, start: c.start_event, stop: c.stop_event }; })
  };
  try {
    cache.put("advisor_pool2|" + gw, JSON.stringify(pool), ADVISOR_POOL_TTL);
    cache.put("advisor_season|" + gw, JSON.stringify(season), ADVISOR_POOL_TTL);
  } catch (e) { /* too large for the cache — rebuilt on the next request */ }
  return { pool: pool, season: season };
}

/**
 * A manager's squad as it will line up for the coming gameweek.
 *
 * @return {{squad: Array<{el:number, slot:number}>, bank: number, moves: number}|null}
 *   bank in tenths of a million; moves = saved transfers already applied
 */
function getAdvisorSquad_(entryId, state, pool) {
  const base = fetchEntryPicks(entryId, state.displayGw);
  if (!base || !base.picks) return null;

  const squad = base.picks.map(function (pick) { return { el: pick.element, slot: pick.position }; });

  const summary = fetchFPL("entry/" + entryId + "/", { silent: true, retries: 0 });
  let bank = summary && summary.last_deadline_bank ? summary.last_deadline_bank : 0;

  const history = fetchFPL("entry/" + entryId + "/transfers/", { silent: true, retries: 0 }) || [];
  const saved = history
    .filter(function (t) { return t.event === state.nextGw; })
    .sort(function (a, b) { return a.time < b.time ? -1 : 1; });

  for (const move of saved) {
    for (const pick of squad) {
      if (pick.el !== move.element_out) continue;
      pick.el = move.element_in;
      // Sale value is approximated by today's price, as in the suggestions.
      const out = pool.players[move.element_out];
      const inn = pool.players[move.element_in];
      if (out && inn) bank += out[3] - inn[3];
      break;
    }
  }

  return { squad: squad, bank: bank, moves: saved.length };
}

/** Advice for one manager's coming gameweek. */
function getAdvisorData(entryId) {
  const state = getSeasonState();
  if (!state) return { status: "error", message: "Cannot reach FPL API" };
  if (!state.nextGw) return { status: "error", message: "Mùa giải đã kết thúc, chưa có vòng tiếp theo." };

  const manager = getActivePlayers().filter(function (p) { return String(p.id) === String(entryId); })[0];
  if (!manager) return { status: "error", message: "Không tìm thấy HLV này." };

  const gw = state.nextGw;
  const cache = CacheService.getScriptCache();
  const cacheKey = "advisor2|" + manager.id + "|" + gw;
  const cached = cache.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) { /* rebuild below */ }
  }

  const pool = getAdvisorPool_(gw, state.finishedGws);
  if (!pool) return { status: "error", message: "Chưa tải được dữ liệu cầu thủ từ FPL." };

  const mine = getAdvisorSquad_(manager.id, state, pool);
  if (!mine) return { status: "error", message: "Chưa tải được đội hình của " + manager.manager + "." };

  // Head-to-head opponent for the coming gameweek (none on a bye).
  let opponent = null;
  const fixture = getGameweekH2HFixtures_(gw).filter(function (f) {
    return String(f.home) === String(manager.id) || String(f.away) === String(manager.id);
  })[0];
  const opponentId = fixture ? (String(fixture.home) === String(manager.id) ? fixture.away : fixture.home) : null;
  const theirs = opponentId ? getAdvisorSquad_(opponentId, state, pool) : null;
  if (theirs) {
    const diff = findDifferentials_(pool, mine.squad, theirs.squad, gw, 4);
    opponent = {
      id: opponentId,
      manager: getManagerName(opponentId),
      edge: diff.edge,
      threat: diff.threat,
      myProjected: projectedPoints_(pool, mine.squad, gw),
      theirProjected: projectedPoints_(pool, theirs.squad, gw)
    };
  }

  const event = state.events.filter(function (e) { return e.id === gw; })[0];
  const result = {
    status: "success",
    data: {
      gw: gw,
      deadline: event ? event.deadline : null,
      id: manager.id,
      manager: manager.manager,
      basedOnGw: state.displayGw,
      savedTransfers: mine.moves,
      squad: mine.squad,
      bank: mine.bank / 10,
      captains: rankCaptains_(pool, mine.squad, gw, 3),
      health: squadHealth_(pool, mine.squad, gw),
      opponent: opponent,
      transfers: suggestTransfers_(pool, mine.squad, gw, mine.bank, 3),
      updatedAt: new Date().toISOString()
    }
  };

  try {
    cache.put(cacheKey, JSON.stringify(result), ADVISOR_REPLY_TTL);
  } catch (e) { /* serve uncached */ }
  return result;
}

/**
 * "Tìm nhanh": best available players of a position under a price cap.
 *
 * @param {string|number} pos 1 GK, 2 DEF, 3 MID, 4 FWD
 * @param {string|number} maxCost price cap in millions, e.g. 7.5
 */
function getAdvisorHunt(pos, maxCost) {
  const position = parseInt(pos, 10);
  const cap = Math.round(parseFloat(maxCost) * 10);
  if (!(position >= 1 && position <= 4) || !(cap >= 35 && cap <= 150)) {
    return { status: "error", message: "Vị trí hoặc ngân sách không hợp lệ." };
  }

  const state = getSeasonState();
  if (!state || !state.nextGw) return { status: "error", message: "Chưa có vòng tiếp theo." };
  const pool = getAdvisorPool_(state.nextGw, state.finishedGws);
  if (!pool) return { status: "error", message: "Chưa tải được dữ liệu cầu thủ từ FPL." };

  return {
    status: "success",
    data: { gw: state.nextGw, players: huntPlayers_(pool, state.nextGw, position, cap, 8) }
  };
}
