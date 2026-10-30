/**
 * PlanLogic.gs — chip timing, free-transfer estimate and answer checking
 * HTCV FPL 2026-2027
 *
 * Pure logic, replayable offline. The AI chat states these conclusions; it
 * never works them out itself, because a model reading raw numbers has been
 * seen to get comparisons backwards.
 *
 * Chip advice is a rule of thumb on top of the expected-points model, not a
 * validated forecast: Triple Captain and Bench Boost pay most in a double
 * gameweek, Free Hit in a gameweek where many starters have no match, and
 * Wildcard when the squad has many weak or injured players.
 */

const CHIP_LABELS = { wildcard: "Wildcard", freehit: "Free Hit", bboost: "Bench Boost", "3xc": "Triple Captain" };
const FREE_HIT_MIN_BLANKS = 3;     // starters without a match before Free Hit is worth it

// Transfer rules of the game.
const HIT_COST = 4;                // points lost for every transfer beyond the free ones
const FREE_TRANSFER_CAP = 5;       // free transfers that can be banked
// Thresholds below come from a walk-forward backtest on three past seasons
// (tools/advisor-model/calibrate_transfers.py). The model's predicted gain of a
// swap is about twice what it really adds (slope 0.51), and a swap of a player
// who still plays adds ~4.7 points over five gameweeks whatever the predicted
// gain between 6 and 14 -- about the price of one hit, so a hit does not pay.
// When the seller will not play at all, the swap adds the buyer's own points
// (15-20 over five gameweeks, above 4 in 92% of cases), so a hit does pay.
const FREE_MIN_GAIN = 2;           // predicted gain below which a free transfer is better kept (rule of thumb)
const WORTH_GAIN = 6;              // predicted gain of a swap "worth making"; counts towards the Wildcard rule
const DEAD_EP5 = 1;                // five-gameweek points of a starter who will not play
const DEAD_BUYER_MIN = 12;         // five-gameweek points a buyer needs for a hit to be worth it
const WILDCARD_MIN_HITS = 2;       // hits a manager would pay before a Wildcard is worth considering
const PLAN_MAX_MOVES = 5;          // swaps weighed in one plan
const CHIP_SUSPECT_EXTRA = 2;      // saved transfers beyond free + this suggest a Wildcard / Free Hit is active

/** Expected points of a player in gameweek w, from today's form and fitness. */
function xpInGameweek_(pool, season, p, w) {
  let total = 0;
  for (const f of (season.fixtures[p.team] || [])) {
    if (f.gw === w) total += fixtureXp_(pool, p, f);
  }
  return total * availability_(p);
}

function matchesIn_(season, team, w) {
  return (season.fixtures[team] || []).filter(function (f) { return f.gw === w; }).length;
}

/**
 * State and advice for every chip window.
 *
 * @param {Object} pool  AdvisorLogic pool
 * @param {Object} season {fixtures: {club: [{gw, opp, home, fdr}]}, chips: [{name, start, stop}]}
 * @param {Array<{el:number, slot:number}>} squad
 * @param {number} gw the coming gameweek
 * @param {Array<{name: string, event: number}>} used chips already played
 * @param {{doubts: number, worthMoves: number, worthGain: number, freeTransfers: number}} signals for the Wildcard
 *   rule, taken from the transfer plan: injured or doubtful members, swaps worth a hit and their expected-point gain,
 *   free transfers available
 * @return {Array<Object>} one row per chip window, with a ready-made `advice` sentence
 */
function planChips_(pool, season, squad, gw, used, signals) {
  const members = squadPlayers_(pool, squad);
  const starters = members.filter(function (x) { return x.slot <= 11; });
  const bench = members.filter(function (x) { return x.slot > 11; });
  const clubs = Object.keys(season.fixtures);

  const rows = [];
  for (const rule of season.chips) {
    const label = CHIP_LABELS[rule.name] || rule.name;
    const status = chipState_(rule, used, gw);
    const row = { chip: rule.name, label: label, start: rule.start, stop: rule.stop, state: status.state };

    if (status.state === "used") {
      row.advice = label + " (GW" + rule.start + "-" + rule.stop + "): đã dùng ở GW" + status.usedAt + ", KHÔNG còn dùng được trong lượt này.";
    } else if (status.state === "expired") {
      row.advice = label + " (GW" + rule.start + "-" + rule.stop + "): đã hết hạn mà chưa dùng.";
    } else if (status.state === "later") {
      row.advice = label + " lượt sau: mở từ GW" + rule.start + " đến GW" + rule.stop + ".";
    } else {
      row.advice = adviseChip_(pool, season, rule, label, gw, starters, bench, clubs, signals);
    }
    rows.push(row);
  }
  return rows;
}

/** Where one chip window stands: used (and when), expired, not open yet, or available now. */
function chipState_(rule, used, gw) {
  const usedHere = used.filter(function (u) { return u.name === rule.name && u.event >= rule.start && u.event <= rule.stop; })[0];
  if (usedHere) return { state: "used", usedAt: usedHere.event };
  if (gw > rule.stop) return { state: "expired" };
  if (rule.start > gw) return { state: "later" };
  return { state: "available" };
}

/** The chip window of this name that can be played now, or null. */
function openChip_(season, used, name, gw) {
  return season.chips.filter(function (rule) {
    return rule.name === name && chipState_(rule, used, gw).state === "available";
  })[0] || null;
}

function adviseChip_(pool, season, rule, label, gw, starters, bench, clubs, signals) {
  const window = "còn dùng được tới GW" + rule.stop;
  const gws = [];
  for (let w = gw; w <= rule.stop; w++) gws.push(w);
  const doubles = gws.filter(function (w) {
    return clubs.some(function (c) { return matchesIn_(season, c, w) >= 2; });
  });

  if (rule.name === "3xc") {
    const best = gws.map(function (w) {
      let top = null;
      for (const x of starters) {
        if (x.p.pos < 3) continue;
        const xp = xpInGameweek_(pool, season, x.p, w);
        if (!top || xp > top.xp) top = { w: w, name: x.p.name, xp: xp, doubled: matchesIn_(season, x.p.team, w) >= 2 };
      }
      return top;
    }).filter(Boolean).sort(function (a, b) { return b.xp - a.xp; });
    if (!best.length) return label + ": " + window + ".";
    const doubled = best.filter(function (b) { return b.doubled; })[0];
    if (doubled) {
      return label + ": " + window + ". Nên dùng ở vòng đôi GW" + doubled.w + " (" + doubled.name + " đá 2 trận, " + round1_(doubled.xp) + " điểm dự kiến).";
    }
    return label + ": " + window + ". Chưa có vòng đôi nào trước hạn này (FPL thường công bố muộn). Vòng captain mạnh nhất hiện tại là GW" +
      best[0].w + " (" + best[0].name + " " + round1_(best[0].xp) + " điểm dự kiến). Nên giữ chip chờ vòng đôi; nếu tới GW" +
      Math.max(gw, rule.stop - 2) + " vẫn chưa có thì dùng ở vòng đẹp nhất trước GW" + rule.stop + ".";
  }

  if (rule.name === "bboost") {
    const best = gws.map(function (w) {
      let sum = 0;
      for (const x of bench) sum += xpInGameweek_(pool, season, x.p, w);
      return { w: w, xp: sum, doubled: doubles.indexOf(w) !== -1 };
    }).sort(function (a, b) { return b.xp - a.xp; });
    if (!best.length) return label + ": " + window + ".";
    return label + ": " + window + ". " + (doubles.length ? "Có vòng đôi: GW" + doubles.join(", GW") + ". " : "Chưa có vòng đôi nào trước hạn này. ") +
      "Với 4 dự bị hiện tại, vòng có điểm dự bị cao nhất là GW" + best[0].w + " (" + round1_(best[0].xp) +
      " điểm dự kiến cho cả 4 người). Bench Boost đáng dùng nhất khi dự bị khoẻ và có vòng đôi.";
  }

  if (rule.name === "freehit") {
    const blanks = gws.map(function (w) {
      return { w: w, n: starters.filter(function (x) { return matchesIn_(season, x.p.team, w) === 0; }).length };
    }).filter(function (b) { return b.n >= FREE_HIT_MIN_BLANKS; }).sort(function (a, b) { return b.n - a.n; });
    if (blanks.length) {
      return label + ": " + window + ". Vòng GW" + blanks[0].w + " có " + blanks[0].n + " cầu thủ đá chính của bạn không có trận — thời điểm hợp lý cho Free Hit.";
    }
    return label + ": " + window + ". Chưa có vòng nào khiến đội bạn thiếu từ " + FREE_HIT_MIN_BLANKS +
      " người đá chính trở lên; nên giữ Free Hit cho vòng trống hoặc vòng đôi lớn.";
  }

  if (rule.name === "wildcard") {
    // A Wildcard beats free transfers only when several swaps are worth making
    // and the free transfers do not cover them (each extra one costs HIT_COST).
    const free = signals.freeTransfers;
    const worth = signals.worthMoves;
    const needed = Math.max(0, worth - free);
    const head = label + ": " + window + ". ";
    if (worth <= free) {
      return head + "Chưa cần Wildcard: có " + worth + " thay đổi đáng làm (mỗi đổi thêm từ " + WORTH_GAIN +
        " điểm dự kiến trong 5 vòng), đủ trong " + free + " lượt miễn phí (ước tính).";
    }
    if (needed < WILDCARD_MIN_HITS) {
      return head + "Chưa cần Wildcard: có " + worth + " thay đổi đáng làm, chỉ vượt " + needed + " lượt so với " + free +
        " lượt miễn phí (ước tính), chịu -" + needed * HIT_COST + " điểm là xong.";
    }
    return head + "Nên cân nhắc Wildcard ngay vòng này: có " + worth + " thay đổi đáng làm (thêm khoảng " + round1_(signals.worthGain) +
      " điểm dự kiến trong 5 vòng) nhưng chỉ có " + free + " lượt miễn phí (ước tính); đổi từng người sẽ mất -" + needed * HIT_COST +
      " điểm, Wildcard sửa tất cả không mất điểm. Đội có " + signals.doubts + " cầu thủ chấn thương hoặc nghi ngờ.";
  }

  return label + ": " + window + ".";
}

/**
 * Free transfers for the coming gameweek, rebuilt from history. The public API
 * has no such field (`my-team` needs a login), so this is an estimate. The
 * rules, checked against all 98 manager-gameweeks of GW2-8: one free transfer
 * per gameweek, at most five banked, transfers made beyond the free ones cost
 * four points, and a Wildcard or Free Hit week freezes the bank (nothing is
 * spent and no new transfer is earned that week). Adding a transfer for the
 * week after a chip, as the official text might suggest, mispredicted the hits
 * of four managers.
 *
 * Cannot see a chip already active for the coming gameweek, or a one-off
 * top-up the game may grant.
 *
 * @param {Array<{event: number, event_transfers: number, event_transfers_cost: number}>} current entry history rows
 * @param {Array<{name: string, event: number}>} chips played
 * @param {number} savedMoves transfers already made for the coming gameweek
 * @return {{free: number, available: number, hits: number}} free transfers banked, how many are left after the
 *   saved moves, and how many saved moves already cost points
 */
function estimateFreeTransfers_(current, chips, savedMoves) {
  const chipAt = {};
  for (const c of chips) chipAt[c.event] = c.name;
  const rows = current.slice().sort(function (a, b) { return a.event - b.event; });
  // The first row is the opening squad, built without limit; the next gameweek starts with one.
  let free = rows.length ? 1 : 0;
  rows.slice(1).forEach(function (row) {
    if (chipAt[row.event] === "wildcard" || chipAt[row.event] === "freehit") return;
    const paid = Math.round((row.event_transfers_cost || 0) / HIT_COST);
    const spent = Math.max(0, (row.event_transfers || 0) - paid);
    free = Math.min(FREE_TRANSFER_CAP, Math.max(0, free - spent) + 1);
  });
  return { free: free, available: Math.max(0, free - savedMoves), hits: Math.max(0, savedMoves - free) };
}

/**
 * Decide which suggested swaps are worth making this week, within the money,
 * the three-players-per-club limit and the free transfers.
 *
 * A swap's gain is the expected points over five gameweeks it adds to the XI:
 * the incoming player minus the outgoing one when a starter leaves, or minus
 * the weakest starter of that position when a bench player leaves (the better
 * buy takes the place in the XI).
 *
 * @param {Array} ideas from suggestTransfers_: {out, starter, ins[]}
 * @param {Array<{id: number, team: string, pos: number, starter: boolean, ep5: number}>} squad the 15 players
 * @param {number} free free transfers available
 * @param {number} bank money in the bank, tenths of a million
 * @return {{moves: Array, free: number, atCap: boolean, freeUsed: number, hits: number, net: number,
 *   worthMoves: number, worthGain: number, keep: number}} moves carry use: free | hold | hit | skip and dead (the
 *   seller is a starter who will not play)
 */
function planTransfers_(ideas, squad, free, bank) {
  let money = bank;
  const clubs = {};
  const xi = [];
  for (const m of squad) {
    clubs[m.team] = (clubs[m.team] || 0) + 1;
    if (m.starter) xi.push({ id: m.id, pos: m.pos, ep5: m.ep5 });
  }

  const weakestOf = function (pos) {
    let at = -1;
    xi.forEach(function (s, i) { if (s.pos === pos && (at === -1 || s.ep5 < xi[at].ep5)) at = i; });
    return at;
  };
  const gainOf = function (idea, cand) {
    if (idea.starter) return cand.ep5 - idea.out.ep5;
    const at = weakestOf(cand.pos);
    return at === -1 ? 0 : cand.ep5 - xi[at].ep5;
  };

  const order = ideas.map(function (idea) {
    return { idea: idea, best: Math.max.apply(null, idea.ins.map(function (c) { return gainOf(idea, c); })) };
  }).sort(function (a, b) { return b.best - a.best; });

  const taken = {};
  const moves = [];
  for (const entry of order) {
    const idea = entry.idea;
    const sellOut = Math.round((idea.out.sell !== undefined ? idea.out.sell : idea.out.cost) * 10);
    let pick = null;
    for (const cand of idea.ins) {
      const price = Math.round(cand.cost * 10);
      const clubAfter = (clubs[cand.team] || 0) - (cand.team === idea.out.team ? 1 : 0);
      if (taken[cand.id] || price > money + sellOut || clubAfter >= ADVISOR_MAX_PER_CLUB) continue;
      const gain = gainOf(idea, cand);
      if (!pick || gain > pick.gain) pick = { cand: cand, gain: gain, price: price };
    }
    if (!pick || pick.gain <= 0) continue;

    moves.push({ out: idea.out, in: pick.cand, starter: idea.starter, gain: round1_(pick.gain) });
    money += sellOut - pick.price;
    clubs[idea.out.team] -= 1;
    clubs[pick.cand.team] = (clubs[pick.cand.team] || 0) + 1;
    taken[pick.cand.id] = true;
    const at = idea.starter ? xi.findIndex(function (s) { return s.id === idea.out.id; }) : weakestOf(pick.cand.pos);
    if (at !== -1) xi[at] = { id: pick.cand.id, pos: pick.cand.pos, ep5: pick.cand.ep5 };
  }

  moves.sort(function (a, b) { return b.gain - a.gain; });
  const atCap = free >= FREE_TRANSFER_CAP;
  let freeUsed = 0;
  let hits = 0;
  let gained = 0;
  let worthMoves = 0;
  let worthGain = 0;
  moves.forEach(function (m, i) {
    // A starter who will not play: the swap adds the buyer's own points.
    m.dead = m.starter && m.out.ep5 <= DEAD_EP5;
    if (m.gain >= WORTH_GAIN) {
      worthMoves++;
      worthGain += m.gain;
    }
    if (i < free) {
      // A free transfer at the cap is lost if unused, so any gain is worth taking.
      m.use = m.gain >= FREE_MIN_GAIN || (atCap && m.gain > 0) ? "free" : "hold";
    } else {
      m.use = m.dead && m.gain >= DEAD_BUYER_MIN ? "hit" : "skip";
    }
    if (m.use === "free") freeUsed++;
    if (m.use === "hit") hits++;
    if (m.use === "free" || m.use === "hit") gained += m.gain;
  });
  return {
    moves: moves, free: free, atCap: atCap, freeUsed: freeUsed, hits: hits,
    net: round1_(gained - HIT_COST * hits), worthMoves: worthMoves, worthGain: round1_(worthGain), keep: free - freeUsed
  };
}

/**
 * Does an AI answer only use names and numbers from the facts it was given?
 * Small whole numbers (up to 11) pass, since they count players or rank.
 *
 * @param {string} answer
 * @param {string} facts everything the model was shown, question included
 * @param {Array<string>} playerNames every player name the pool knows
 * @return {{ok: boolean, names: Array<string>, numbers: Array<string>}} the offending tokens
 */
function checkAnswer_(answer, facts, playerNames) {
  const fact = normalizeText_(facts);
  const said = normalizeText_(answer);
  const hasWord = function (text, word) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp("(^|[^a-z0-9])" + escaped + "([^a-z0-9]|$)").test(text);
  };
  const names = [];
  for (const raw of playerNames) {
    const name = normalizeText_(raw);
    if (name.length < 4 || names.indexOf(raw) !== -1) continue;
    if (hasWord(said, name) && !hasWord(fact, name)) names.push(raw);
  }

  const numbersIn = function (text) {
    return (text.match(/\d+(?:[.,]\d+)?/g) || []).map(function (n) {
      return String(parseFloat(n.replace(",", ".")));
    });
  };
  const known = {};
  for (const n of numbersIn(facts)) known[n] = true;
  const numbers = numbersIn(answer).filter(function (n) {
    return !known[n] && !(Number(n) === Math.floor(Number(n)) && Number(n) <= 11);
  });
  return { ok: !names.length && !numbers.length, names: names, numbers: numbers };
}
