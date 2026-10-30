/**
 * AdvisorLogic.gs — scoring rules behind the round assistant
 * HTCV FPL 2026-2027
 *
 * Pure logic with no FPL or spreadsheet access, so it can be replayed against
 * saved data.
 *
 * Expected points come from our own model, not FPL's `ep_next`: this season
 * `ep_next` equals `form` (the last three gameweeks / 3) for 89% of players and
 * ignores the opponent. The model is a least-squares fit, one per position, of
 * a player's next-gameweek points on season points per appearance, form,
 * xG + xA per 90, share of minutes played, fixture difficulty, venue and price.
 * Fitted on 2023-24 and 2024-25 and checked out of sample on three seasons
 * (corr 0.24 for form alone vs 0.31) and on 2026-27 GW5-8 (0.14 vs 0.22).
 *
 * A pool is the compact snapshot built by Advisor.gs:
 *   { gw, players: {id: [name, team, pos, cost, ep_next (unused), form, chance,
 *                        status, minutes, news, sel, ppg, starts, xgi90, startCost]},
 *     played, fixtures: {club: [{gw, opp, home, fdr}, ...]} }
 * and a squad is [{el, slot, sell}] with slots 1-11 starting and 12-15 on the bench;
 * `sell` is the selling price in tenths of a million (half the price rise is kept).
 */

const ADVISOR_HORIZON = 5;      // gameweeks of fixtures considered for transfers
const ADVISOR_DOUBT_BELOW = 75; // chance of playing (%) under which a player is a doubt
const ADVISOR_MAX_PER_CLUB = 3; // players of one club a squad may hold

// Coefficients per position (1 GK, 2 DEF, 3 MID, 4 FWD) for the features
// [1, ppg, form, xgi90, minShare, a, home, ppg*a, ppg*home, price, price*a]
// where a = 3 - fixture difficulty and price is in millions.
const ADVISOR_XP_COEF = {
  1: [-0.30897, -0.08262, 0.32098, 0.52714, 1.81827, -0.32885, 0.5717, -0.00287, -0.18857, 0.1684, 0.12642],
  2: [-1.13039, -0.06361, 0.30311, 0.42625, 1.42807, 0.0412, 0.13321, 0.04686, -0.0179, 0.32408, 0.0334],
  3: [-0.87967, -0.00649, 0.31352, 0.25346, 1.60633, -0.06981, -0.15535, 0.0682, 0.11844, 0.23919, 0.01971],
  4: [-0.28389, -0.10369, 0.29504, 0.26023, 2.56132, -0.13825, -0.05212, 0.10554, 0.07994, 0.12355, 0.0147]
};

/** @return {Object|null} the pool record of an element as a named object */
function advisorPlayer_(pool, id) {
  const r = pool.players[id];
  if (!r) return null;
  return {
    id: Number(id), name: r[0], team: r[1], pos: r[2], cost: r[3], ep: r[4], form: r[5],
    chance: r[6], status: r[7], minutes: r[8], news: r[9], sel: r[10],
    ppg: r[11], starts: r[12], xgi: r[13], start: r[14]
  };
}

/** A player FPL expects to miss, or to be at real risk of missing, the round. */
function isDoubtful_(p) {
  return p.chance < ADVISOR_DOUBT_BELOW || p.status === "i" || p.status === "s" ||
    p.status === "u" || p.status === "n";
}

/** Fixtures of a club in one gameweek; empty on a blank gameweek. */
function fixturesIn_(pool, teamShort, gw) {
  return (pool.fixtures[teamShort] || []).filter(function (f) { return f.gw === gw; });
}

/** Average fixture difficulty (1 easiest - 5 hardest) over the next gameweeks; 3 if none. */
function fixtureDifficulty_(pool, teamShort, gw, horizon) {
  const run = (pool.fixtures[teamShort] || []).filter(function (f) {
    return f.gw >= gw && f.gw < gw + horizon;
  });
  if (!run.length) return 3;
  return run.reduce(function (sum, f) { return sum + f.fdr; }, 0) / run.length;
}

/** Model estimate of a player's points in one fixture. */
function fixtureXp_(pool, p, f) {
  // Shares of possible minutes, and a threat rate that is only trusted once the
  // player has a few full matches behind it.
  const share = pool.played > 0 ? Math.min(1, p.minutes / (90 * pool.played)) : 1;
  const xgi = p.minutes >= 180 ? Math.min(p.xgi, 1.5) : 0;
  const a = 3 - f.fdr;
  const home = f.home ? 1 : 0;
  const price = p.cost / 10;
  const x = [1, p.ppg, p.form, xgi, share, a, home, p.ppg * a, p.ppg * home, price, price * a];
  const c = ADVISOR_XP_COEF[p.pos];
  let total = 0;
  for (let i = 0; i < x.length; i++) total += c[i] * x[i];
  return Math.max(0, total);
}

/** Chance (0-1) that FPL's news lets a player take the field at all. */
function availability_(p) {
  return p.status === "i" || p.status === "s" || p.status === "u" || p.status === "n" ? 0 : p.chance / 100;
}

/** Expected points in one gameweek (a blank gameweek is 0, a double sums both). */
function expectedPoints_(pool, p, gw) {
  let total = 0;
  for (const f of fixturesIn_(pool, p.team, gw)) total += fixtureXp_(pool, p, f);
  return total * availability_(p);
}

/**
 * Expected points over the next gameweeks. The model is fitted one gameweek
 * ahead, so later gameweeks reuse today's form: a rough guide to fixture runs.
 */
function horizonPoints_(pool, p, gw) {
  let total = 0;
  for (const f of (pool.fixtures[p.team] || [])) {
    if (f.gw >= gw && f.gw < gw + ADVISOR_HORIZON) total += fixtureXp_(pool, p, f);
  }
  return total * availability_(p);
}

/** How much a player is worth keeping or buying: expected points over the run. Doubts rank last. */
function playerValue_(pool, p, gw) {
  const value = horizonPoints_(pool, p, gw);
  return isDoubtful_(p) ? value - 100 : value;
}

function round1_(x) {
  return Math.round(x * 10) / 10;
}

function describePlayer_(pool, p, gw) {
  return {
    id: p.id, name: p.name, team: p.team, pos: p.pos, cost: p.cost / 10,
    ep: round1_(expectedPoints_(pool, p, gw)), ep5: round1_(horizonPoints_(pool, p, gw)),
    form: p.form, ppg: p.ppg, xgi: p.xgi, chance: p.chance, news: p.news, sel: p.sel,
    fixtures: fixturesIn_(pool, p.team, gw)
  };
}

/** Resolve a squad to pool players, dropping elements the pool does not know. */
function squadPlayers_(pool, squad) {
  const out = [];
  for (const pick of squad) {
    const p = advisorPlayer_(pool, pick.el);
    if (p) out.push({ slot: pick.slot, p: p, sell: pick.sell });
  }
  return out;
}

/** Plain-language reasons a player makes the captain list. */
function captainReasons_(pool, p, gw) {
  const reasons = [];
  if (p.cost / 10 >= 9) reasons.push("Cầu thủ giá cao (£" + (p.cost / 10).toFixed(1) + "m)");
  if (p.ppg >= 5.5) reasons.push("Trung bình mùa " + p.ppg.toFixed(1) + " điểm/trận");
  if (p.xgi >= 0.6) reasons.push("Nguy hiểm: " + p.xgi.toFixed(2) + " xG+xA/90 phút");
  const first = fixturesIn_(pool, p.team, gw)[0];
  if (first && first.fdr <= 2) reasons.push("Lịch dễ: " + first.opp + (first.home ? " (sân nhà)" : " (sân khách)"));
  else if (first && first.home && first.fdr === 3) reasons.push("Đá sân nhà với " + first.opp);
  if (p.form >= 6) reasons.push("Phong độ tốt (" + p.form.toFixed(1) + ")");
  return reasons.slice(0, 4);
}

/**
 * Top captain options among the starters, best expected points first. Only
 * midfielders and forwards are considered — defenders and goalkeepers have a
 * low ceiling and nobody armbands them — and doubts or players without a match
 * are left out.
 */
function rankCaptains_(pool, squad, gw, limit) {
  return squadPlayers_(pool, squad)
    .filter(function (x) {
      return x.slot <= 11 && x.p.pos >= 3 && !isDoubtful_(x.p) && fixturesIn_(pool, x.p.team, gw).length > 0;
    })
    .map(function (x) { return { p: x.p, score: expectedPoints_(pool, x.p, gw) }; })
    .sort(function (a, b) { return b.score - a.score; })
    .slice(0, limit)
    .map(function (x) {
      const row = describePlayer_(pool, x.p, gw);
      row.reasons = captainReasons_(pool, x.p, gw);
      return row;
    });
}

/** Squad members who may not play: injured, doubtful, or without a match. */
function squadHealth_(pool, squad, gw) {
  const issues = [];
  for (const x of squadPlayers_(pool, squad)) {
    let why = null;
    if (isDoubtful_(x.p)) {
      why = x.p.status === "i" || x.p.status === "s" || x.p.status === "u" || x.p.chance === 0
        ? "Khó ra sân" : "Nghi ngờ (" + x.p.chance + "%)";
    } else if (!fixturesIn_(pool, x.p.team, gw).length) {
      why = "Không có trận vòng này";
    }
    if (why) {
      issues.push({ name: x.p.name, team: x.p.team, starter: x.slot <= 11, why: why, news: x.p.news });
    }
  }
  return issues;
}

/**
 * Expected points of the starting eleven, with the best captain doubled.
 * Only an estimate: it ignores substitutions and bonus swings.
 */
function projectedPoints_(pool, squad, gw) {
  const starters = squadPlayers_(pool, squad).filter(function (x) { return x.slot <= 11; });
  let total = 0;
  let best = 0;
  for (const x of starters) {
    const playing = !isDoubtful_(x.p) && fixturesIn_(pool, x.p.team, gw).length > 0;
    const ep = playing ? expectedPoints_(pool, x.p, gw) : 0;
    total += ep;
    if (ep > best) best = ep;
  }
  return Math.round((total + best) * 10) / 10;
}

/**
 * Who the manager has that the opponent lacks (the edge) and the other way
 * round (the threat). Shared players cancel out, so they are left out.
 */
function findDifferentials_(pool, mine, theirs, gw, limit) {
  const owned = function (squad) {
    const ids = {};
    for (const pick of squad) ids[pick.el] = true;
    return ids;
  };
  const myIds = owned(mine);
  const theirIds = owned(theirs);
  const pick = function (squad, otherIds) {
    return squadPlayers_(pool, squad)
      .filter(function (x) { return x.slot <= 11 && !otherIds[x.p.id]; })
      .sort(function (a, b) { return expectedPoints_(pool, b.p, gw) - expectedPoints_(pool, a.p, gw); })
      .slice(0, limit)
      .map(function (x) { return describePlayer_(pool, x.p, gw); });
  };
  return { edge: pick(mine, theirIds), threat: pick(theirs, myIds) };
}

/**
 * Replacement ideas for the weakest squad members, doubts first. Candidates
 * keep the position, fit the budget (the outgoing player's selling price plus
 * the bank), keep the squad at three players per club or fewer, and must
 * clearly beat the player they replace.
 *
 * @param {number} bank money in the bank, in tenths of a million
 */
function suggestTransfers_(pool, squad, gw, bank, limit) {
  const members = squadPlayers_(pool, squad);
  const owned = {};
  const perClub = {};
  for (const x of members) {
    owned[x.p.id] = true;
    perClub[x.p.team] = (perClub[x.p.team] || 0) + 1;
  }

  const weakest = members
    .map(function (x) {
      return { p: x.p, slot: x.slot, sell: x.sell === undefined ? x.p.cost : x.sell, value: playerValue_(pool, x.p, gw) };
    })
    .sort(function (a, b) { return a.value - b.value; })
    .slice(0, limit);

  const ideas = [];
  for (const weak of weakest) {
    const budget = weak.sell + bank;
    const candidates = [];
    for (const id of Object.keys(pool.players)) {
      const c = advisorPlayer_(pool, id);
      if (c.pos !== weak.p.pos || owned[c.id] || c.cost > budget) continue;
      if ((perClub[c.team] || 0) - (c.team === weak.p.team ? 1 : 0) >= ADVISOR_MAX_PER_CLUB) continue;
      if (c.status !== "a" || isDoubtful_(c) || c.minutes <= 0) continue;
      const value = playerValue_(pool, c, gw);
      // A swap must gain at least a point over the next gameweeks to be worth a transfer.
      if (value >= weak.value + 1) candidates.push({ c: c, value: value });
    }
    candidates.sort(function (a, b) { return b.value - a.value; });
    if (!candidates.length) continue;

    const out = describePlayer_(pool, weak.p, gw);
    out.sell = weak.sell / 10;
    ideas.push({
      out: out,
      starter: weak.slot <= 11,
      outDifficulty: Math.round(fixtureDifficulty_(pool, weak.p.team, gw, ADVISOR_HORIZON) * 10) / 10,
      ins: candidates.slice(0, 3).map(function (x) {
        const row = describePlayer_(pool, x.c, gw);
        row.difficulty = Math.round(fixtureDifficulty_(pool, x.c.team, gw, ADVISOR_HORIZON) * 10) / 10;
        return row;
      })
    });
  }
  return ideas;
}

/** "Tìm nhanh": players of a position within a price cap with the most expected points over the next gameweeks. */
function huntPlayers_(pool, gw, pos, maxCost, limit) {
  const found = [];
  for (const id of Object.keys(pool.players)) {
    const p = advisorPlayer_(pool, id);
    if (p.pos !== pos || p.cost > maxCost || p.status !== "a" || isDoubtful_(p) || p.minutes <= 0) continue;
    found.push({ p: p, value: playerValue_(pool, p, gw) });
  }
  return found
    .sort(function (a, b) { return b.value - a.value; })
    .slice(0, limit)
    .map(function (x) {
      const row = describePlayer_(pool, x.p, gw);
      row.difficulty = Math.round(fixtureDifficulty_(pool, x.p.team, gw, ADVISOR_HORIZON) * 10) / 10;
      return row;
    });
}
