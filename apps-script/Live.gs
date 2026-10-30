/**
 * Live.gs — Provisional (in-play) gameweek scoring
 * HTCV FPL 2026-2027
 *
 * Standings on the website must move while a gameweek is still running, so
 * this module computes each manager's points from live player data instead of
 * waiting for FPL to finalise the gameweek.
 *
 * Everything here is read-only with respect to the spreadsheet: the live path
 * is polled every ~90s and must never contend with the heavy refresh writes.
 */

/**
 * Squad picks for a gameweek. Picks are immutable once the deadline passes, so
 * they are fetched once and persisted; only the player scores are re-read.
 *
 * @param {number} gw
 * @param {boolean} [forceRefresh]
 * @param {boolean} [eventFinished] FPL has finalised the gameweek, so these
 *   picks are the effective lineups even when nobody needed a substitution
 * @return {Object|null} { entryId: { p: [[elementId, multiplier, slot, isVice, isCaptain, elementType], ...], c: transferCost } }
 */
function getGameweekPicks_(gw, forceRefresh, eventFinished) {
  const propKey = "picks_gw" + gw;
  const cache = CacheService.getScriptCache();

  if (!forceRefresh) {
    let stored = getStateProperty_(propKey, "");
    if (!stored) {
      // An oversized store fell back to the script cache; honour it so the
      // next poll does not refetch every manager.
      const cached = cache.get(propKey);
      if (cached) stored = cached;
    }
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // v4 rows carry the captain flag and element type the local
        // auto-substitution needs; older stores must be refetched.
        if (parsed && parsed.v === 4) return parsed;
      } catch (e) { /* corrupt value — refetch below */ }
    }
    // Squads are published a few minutes after the deadline. Without this
    // guard every poll in that window would retry all 13 managers.
    if (cache.get("picks_pending_gw" + gw)) return null;
  }

  const players = getActivePlayers();
  const picks = { v: 4 };
  let complete = true;

  for (const player of players) {
    const data = fetchEntryPicks(player.id, gw);
    // 404 means the deadline has not passed yet for this gameweek.
    if (!data || !data.picks) {
      complete = false;
      continue;
    }
    picks[player.id] = {
      p: data.picks.map(function (pick) {
        return [pick.element, pick.multiplier, pick.position, pick.is_vice_captain ? 1 : 0,
          pick.is_captain ? 1 : 0, pick.element_type];
      }),
      c: (data.entry_history && data.entry_history.event_transfers_cost) || 0,
      chip: data.active_chip || "",
      // 1-2 hours after the gameweek's last match, FPL rewrites the picks
      // into the effective (auto-substitutions applied) lineup and reports
      // them here. The official score is entry_history.points.
      subs: (data.automatic_subs || []).map(function (sub) {
        return { in: sub.element_in, out: sub.element_out };
      }),
      hp: data.entry_history && data.entry_history.points !== undefined
        ? data.entry_history.points
        : null
    };
  }

  if (!complete || Object.keys(picks).length <= 1) {
    cache.put("picks_pending_gw" + gw, "1", 300);
    return null;
  }

  // A finalised gameweek, or any substitution in the league, means FPL has
  // published the effective lineups — they never change again, so this store
  // is final.
  picks.subsDone = !!eventFinished;
  for (const key of Object.keys(picks)) {
    if (key === "v" || key === "subsDone") continue;
    if (picks[key].subs && picks[key].subs.length) { picks.subsDone = true; break; }
  }

  const serialised = JSON.stringify(picks);
  // Script properties cap at 9KB per value; fall back to the script cache so
  // the next poll does not refetch every manager.
  if (serialised.length < 9000) {
    setStateProperty_(propKey, serialised);
    // Only the current gameweek is ever replayed, so drop the previous one to
    // keep well clear of the 500KB property store limit.
    PropertiesService.getScriptProperties().deleteProperty("picks_gw" + (gw - 1));
    PropertiesService.getScriptProperties().deleteProperty("h2hfix_gw" + (gw - 1));
  } else {
    try { cache.put(propKey, serialised, 21600); } catch (e2) { /* oversized */ }
  }
  return picks;
}

/**
 * 1-2 hours after the gameweek's last match, the picks endpoint starts serving
 * FPL's auto-substituted lineups. Until then the live scores substitute
 * locally; poll the picks (throttled) so FPL's own lineups take over as soon as
 * they are published.
 *
 * @param {number} gw
 * @param {boolean} eventFinished FPL has finalised the gameweek
 */
function refreshSubsIfComplete_(gw, eventFinished) {
  const cache = CacheService.getScriptCache();
  if (cache.get("subs_try_gw" + gw)) return;

  const stored = getStateProperty_("picks_gw" + gw, "");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.v === 4 && parsed.subsDone) return;
    } catch (e) { /* refetch below */ }
  }

  cache.put("subs_try_gw" + gw, "1", 300);
  getGameweekPicks_(gw, true, eventFinished);
}

/**
 * Head-to-head pairings for a gameweek. Also immutable once published, so they
 * are cached alongside the picks.
 *
 * @return {Array<{home: number, away: number|null}>}
 */
function getGameweekH2HFixtures_(gw) {
  const propKey = "h2hfix_gw" + gw;
  const stored = getStateProperty_(propKey, "");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) { /* refetch below */ }
  }

  const data = fetchH2HMatches(CONFIG.H2H_LEAGUE_ID, gw);
  if (!data || !data.results || !data.results.length) return [];

  const fixtures = data.results.map(function (match) {
    return { home: match.entry_1_entry, away: match.entry_2_entry };
  });
  setStateProperty_(propKey, JSON.stringify(fixtures));
  return fixtures;
}

/**
 * Compute provisional points for every manager in a gameweek.
 *
 * While matches are in play the totals match what the official FPL app shows
 * live. Once every match has finished, auto-substitutions and the vice-captain
 * switch are applied here straight away instead of waiting the 1-2 hours FPL
 * takes to publish them; FPL's own lineups replace them once available.
 *
 * Alongside the totals, each row carries the captain pick and the full squad
 * with per-player points so the website can show them on hover.
 *
 * @param {number} gw
 * @param {boolean} matchesComplete every match of the gameweek has finished
 * @return {{scores: Array, provisionalSubs: boolean}} one score row per
 *   manager, and whether the substitutions are local rather than FPL's
 */
function computeLiveGameweek_(gw, matchesComplete) {
  const none = { scores: [], provisionalSubs: false };
  const picks = getGameweekPicks_(gw);
  if (!picks) return none;

  const live = fetchEventLive(gw);
  if (!live || !live.elements || !live.elements.length) return none;

  // element id → { points, minutes, played }
  const elementStats = {};
  for (const element of live.elements) {
    const stats = element.stats || {};
    elementStats[element.id] = {
      points: stats.total_points || 0,
      minutes: stats.minutes || 0,
      // A card picked up without coming on still counts as playing.
      played: stats.minutes > 0 || stats.yellow_cards > 0 || stats.red_cards > 0
    };
  }
  const played = function (elementId) {
    return !!(elementStats[elementId] && elementStats[elementId].played);
  };

  // Every match is over but FPL has not published its substituted lineups yet.
  const provisionalSubs = !!matchesComplete && !picks.subsDone;

  const meta = getElementMeta_();

  const results = [];
  for (const player of getActivePlayers()) {
    const entry = picks[player.id];
    if (!entry) continue;

    let livePoints = 0;
    let playersPlayed = 0;
    let playersRemaining = 0;
    let captain = null;
    const squad = [];

    let lineup = entry.p.map(function (pick) {
      return {
        el: pick[0],
        mult: pick[1],
        slot: pick[2],
        vice: pick[3] === 1,
        cap: pick[4] === 1,
        pos: pick[5] || (meta[pick[0]] && meta[pick[0]].pos) || 0
      };
    });
    let subs = entry.subs || [];
    if (provisionalSubs) {
      const effective = applyAutoSubs_(lineup, played, entry.chip);
      lineup = effective.picks;
      subs = effective.subs;
    }
    const subbedIn = {};
    const subbedOut = {};
    for (const sub of subs) {
      subbedIn[sub.in] = true;
      subbedOut[sub.out] = true;
    }

    // Keep slot order for the squad view.
    lineup.sort(function (a, b) { return a.slot - b.slot; });

    for (const pick of lineup) {
      const elementId = pick.el;
      const multiplier = pick.mult;
      const slot = pick.slot;
      const isVice = pick.vice;
      const stats = elementStats[elementId] || { points: 0, minutes: 0 };
      const info = meta[elementId] || { name: "#" + elementId, team: "", pos: 0 };

      livePoints += stats.points * multiplier;
      if (multiplier > 0) {
        if (stats.minutes > 0) playersPlayed++;
        else playersRemaining++;
      }
      if (multiplier >= 2) {
        captain = { id: elementId, name: info.name, team: info.team, pts: stats.points, mult: multiplier };
      }

      const row = {
        id: elementId,
        name: info.name,
        team: info.team,
        pos: info.pos,
        slot: slot,
        mult: multiplier,
        pts: stats.points,
        mins: stats.minutes,
        vice: isVice
      };
      if (subbedIn[elementId]) row.sub = "in";
      else if (subbedOut[elementId]) row.sub = "out";
      squad.push(row);
    }

    results.push({
      id: player.id,
      manager: player.manager,
      team: player.team,
      livePoints: livePoints,
      netPoints: livePoints - entry.c,
      transferCost: entry.c,
      playersPlayed: playersPlayed,
      playersRemaining: playersRemaining,
      chip: entry.chip || "",
      subs: subs.length,
      captain: captain,
      squad: squad
    });
  }

  return { scores: results, provisionalSubs: provisionalSubs };
}

/**
 * Provisional head-to-head results for the gameweek, derived from live scores.
 * @return {Array} one row per fixture with the running 3/1/0 outcome
 */
function computeLiveH2H_(gw, liveScores) {
  const fixtures = getGameweekH2HFixtures_(gw);
  if (!fixtures.length) return [];

  const byId = {};
  for (const score of liveScores) byId[String(score.id)] = score;

  return fixtures.map(function (fixture) {
    const home = byId[String(fixture.home)];
    const away = byId[String(fixture.away)];
    const homePts = home ? home.netPoints : 0;
    const awayPts = away ? away.netPoints : 0;

    return {
      homeId: fixture.home,
      homeManager: getManagerName(fixture.home, "AVERAGE"),
      homePoints: homePts,
      homeH2HPoints: homePts > awayPts ? 3 : (homePts === awayPts ? 1 : 0),
      awayId: fixture.away,
      awayManager: getManagerName(fixture.away, "AVERAGE"),
      awayPoints: awayPts,
      awayH2HPoints: awayPts > homePts ? 3 : (homePts === awayPts ? 1 : 0),
      diff: Math.abs(homePts - awayPts)
    };
  });
}

/**
 * The real head-to-head schedule for the whole season — the league's actual
 * draw, straight from the FPL api — plus points for gameweeks already played.
 *
 * The website previously invented a round-robin schedule locally, which did
 * not match the official league page and leaked the previous gameweek's
 * points into future ones. Pairings are drawn once and never change, so the
 * response is cheap to cache.
 */
function getH2HSchedule() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("h2h_schedule");
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) { /* rebuild below */ }
  }

  // A gameweek counts as played once finished, or is current (in progress).
  const state = getSeasonState();
  const played = {};
  if (state) {
    for (const event of state.events) played[event.id] = event.finished || event.isCurrent;
  }

  const matches = [];
  let page = 1;
  let hasNext = true;
  while (hasNext && page <= 12) {
    const data = fetchH2HMatchesPage(CONFIG.H2H_LEAGUE_ID, page);
    if (!data || !data.results || !data.results.length) break;
    for (const m of data.results) {
      matches.push({
        gw: m.event,
        homeId: m.entry_1_entry,
        awayId: m.entry_2_entry,
        homePts: m.entry_1_points || 0,
        awayPts: m.entry_2_points || 0,
        played: !!played[m.event]
      });
    }
    hasNext = !!data.has_next;
    page++;
  }

  const payload = {
    status: "success",
    data: { matches: matches, count: matches.length, updatedAt: new Date().toISOString() }
  };
  cache.put("h2h_schedule", JSON.stringify(payload), 300);
  return payload;
}

/**
 * Live payload served to the website. Cached briefly so that every visitor
 * shares one set of upstream calls while still seeing scores move.
 *
 * @param {boolean} [forceRefresh]
 * @return {Object} status envelope with live scores and season state
 */
function getLiveData(forceRefresh) {
  const cache = CacheService.getScriptCache();
  if (!forceRefresh) {
    const cached = cache.get("live_payload");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) { /* rebuild below */ }
    }
  }

  const state = getSeasonState();
  if (!state) {
    return { status: "error", message: "Cannot reach FPL API" };
  }

  const gw = state.displayGw;
  // A gameweek can finish between scheduled rebuilds. Telling the website lets
  // the first visitor afterwards kick off the refresh instead of everyone
  // waiting for the next hourly check.
  const lastSettled = parseInt(getStateProperty_("last_settled_gw", "-1"), 10);
  const settlementPending = state.finishedGws > lastSettled;

  const empty = {
    status: "success",
    data: {
      gw: gw,
      isLive: false,
      isPreSeason: state.isPreSeason,
      finishedGws: state.finishedGws,
      inPlay: false,
      autoSubsApplied: false,
      autoSubsProvisional: false,
      settlementPending: settlementPending,
      updatedAt: new Date().toISOString(),
      scores: [],
      h2h: []
    }
  };

  // Before the season starts there is nothing provisional to show.
  if (state.isPreSeason) {
    cache.put("live_payload", JSON.stringify(empty), CONFIG.LIVE_TTL);
    return empty;
  }

  const play = getGameweekPlayState_(gw);
  const inPlay = play.started && !play.complete;
  // Matches finished: keep pulling picks until FPL publishes its substituted
  // lineups; meanwhile the scores substitute locally.
  if (play.complete) refreshSubsIfComplete_(gw, !state.isLive);
  const computed = computeLiveGameweek_(gw, play.complete);
  const scores = computed.scores;
  const payload = {
    status: "success",
    data: {
      gw: gw,
      isLive: state.isLive,
      isPreSeason: false,
      finishedGws: state.finishedGws,
      inPlay: inPlay,
      // Auto-subs apply once every match has finished — locally at first
      // (provisional), then FPL's own; the flags tell the site which it is.
      autoSubsApplied: !state.isLive || play.complete,
      autoSubsProvisional: computed.provisionalSubs,
      settlementPending: settlementPending,
      updatedAt: new Date().toISOString(),
      scores: scores,
      h2h: computeLiveH2H_(gw, scores)
    }
  };

  // Hold the payload roughly as long as the website waits before asking again:
  // one minute mid-match, a few minutes between kick-offs, longer once settled.
  const ttl = inPlay ? CONFIG.LIVE_TTL : (state.isLive ? CONFIG.LIVE_TTL * 3 : CONFIG.LIVE_TTL * 10);
  try {
    cache.put("live_payload", JSON.stringify(payload), ttl);
  } catch (e) { /* oversized payload — serve uncached */ }

  return payload;
}

/** Menu action: recompute live scores immediately, ignoring the cache. */
function refreshLiveNow() {
  const payload = getLiveData(true);
  const count = payload.data && payload.data.scores ? payload.data.scores.length : 0;
  logStatus("refreshLiveNow: gw=" + (payload.data ? payload.data.gw : "?") + ", " + count + " managers");
  return payload;
}
