/**
 * AdvisorLogic.gs — scoring rules behind the round assistant
 * HTCV FPL 2026-2027
 *
 * Pure logic with no FPL or spreadsheet access, so it can be replayed against
 * saved data. Everything ranks on FPL's own expected points (`ep_next`), which
 * already prices in opponent strength and minutes, then nudges by form and by
 * the fixture run.
 *
 * A pool is the compact snapshot built by Advisor.gs:
 *   { gw, players: {id: [name, team, pos, cost, ep, form, chance, status,
 *                        minutes, news, sel]}, fixtures: {teamId: [{gw, opp,
 *                        home, fdr}, ...]} }
 * and a squad is [{el, slot}] with slots 1-11 starting and 12-15 on the bench.
 */

const ADVISOR_HORIZON = 5;      // gameweeks of fixtures considered for transfers
const ADVISOR_DOUBT_BELOW = 75; // chance of playing (%) under which a player is a doubt

/** @return {Object|null} the pool record of an element as a named object */
function advisorPlayer_(pool, id) {
  const r = pool.players[id];
  if (!r) return null;
  return {
    id: Number(id), name: r[0], team: r[1], pos: r[2], cost: r[3], ep: r[4], form: r[5],
    chance: r[6], status: r[7], minutes: r[8], news: r[9], sel: r[10]
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

/**
 * How much a player is worth keeping or buying: expected points, plus a small
 * credit for form and for an easy fixture run (3 is neutral). Doubts rank last.
 */
function playerValue_(pool, p, gw) {
  const run = fixtureDifficulty_(pool, p.team, gw, ADVISOR_HORIZON);
  const value = p.ep + 0.1 * p.form + 0.5 * (3 - run);
  return isDoubtful_(p) ? value - 100 : value;
}

function describePlayer_(pool, p, gw) {
  return {
    id: p.id, name: p.name, team: p.team, pos: p.pos, cost: p.cost / 10,
    ep: p.ep, form: p.form, chance: p.chance, news: p.news, sel: p.sel,
    fixtures: fixturesIn_(pool, p.team, gw)
  };
}

/** Resolve a squad to pool players, dropping elements the pool does not know. */
function squadPlayers_(pool, squad) {
  const out = [];
  for (const pick of squad) {
    const p = advisorPlayer_(pool, pick.el);
    if (p) out.push({ slot: pick.slot, p: p });
  }
  return out;
}

/**
 * Top captain options among the starters, best first. Doubts and goalkeepers
 * are left out: a keeper's expected points are high but nobody armbands one.
 */
function rankCaptains_(pool, squad, gw, limit) {
  return squadPlayers_(pool, squad)
    .filter(function (x) {
      return x.slot <= 11 && x.p.pos !== 1 && !isDoubtful_(x.p) && fixturesIn_(pool, x.p.team, gw).length > 0;
    })
    .sort(function (a, b) { return b.p.ep - a.p.ep || b.p.form - a.p.form; })
    .slice(0, limit)
    .map(function (x) { return describePlayer_(pool, x.p, gw); });
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
    const ep = playing ? x.p.ep : 0;
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
      .sort(function (a, b) { return b.p.ep - a.p.ep; })
      .slice(0, limit)
      .map(function (x) { return describePlayer_(pool, x.p, gw); });
  };
  return { edge: pick(mine, theirIds), threat: pick(theirs, myIds) };
}

/**
 * Replacement ideas for the weakest squad members, doubts first. Candidates
 * keep the position, fit the budget (sale value is approximated by the current
 * price, so the real bank can differ a little) and must clearly beat the player
 * they replace.
 *
 * @param {number} bank money in the bank, in tenths of a million
 */
function suggestTransfers_(pool, squad, gw, bank, limit) {
  const members = squadPlayers_(pool, squad);
  const owned = {};
  for (const x of members) owned[x.p.id] = true;

  const weakest = members
    .map(function (x) { return { p: x.p, value: playerValue_(pool, x.p, gw) }; })
    .sort(function (a, b) { return a.value - b.value; })
    .slice(0, limit);

  const ideas = [];
  for (const weak of weakest) {
    const budget = weak.p.cost + bank;
    const candidates = [];
    for (const id of Object.keys(pool.players)) {
      const c = advisorPlayer_(pool, id);
      if (c.pos !== weak.p.pos || owned[c.id] || c.cost > budget) continue;
      if (c.status !== "a" || isDoubtful_(c) || c.minutes <= 0) continue;
      const value = playerValue_(pool, c, gw);
      if (value >= weak.value + 0.5) candidates.push({ c: c, value: value });
    }
    candidates.sort(function (a, b) { return b.value - a.value; });
    if (!candidates.length) continue;

    ideas.push({
      out: describePlayer_(pool, weak.p, gw),
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

/** "Tìm nhanh": best available players of a position within a price cap. */
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
