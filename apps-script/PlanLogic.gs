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
const WILDCARD_MIN_DOUBTS = 3;     // squad members injured or doubtful
const WILDCARD_MIN_GAIN = 20;      // expected points over 5 gameweeks from the top swaps

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
 * @param {{doubts: number, swapGain: number, swaps: number, freeTransfers: number}} signals for the Wildcard rule:
 *   injured or doubtful members, expected-point gain and count of the suggested swaps, free transfers
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
    const usedHere = used.filter(function (u) { return u.name === rule.name && u.event >= rule.start && u.event <= rule.stop; })[0];
    const row = { chip: rule.name, label: label, start: rule.start, stop: rule.stop };

    if (usedHere) {
      row.state = "used";
      row.advice = label + " (GW" + rule.start + "-" + rule.stop + "): đã dùng ở GW" + usedHere.event + ", KHÔNG còn dùng được trong lượt này.";
    } else if (gw > rule.stop) {
      row.state = "expired";
      row.advice = label + " (GW" + rule.start + "-" + rule.stop + "): đã hết hạn mà chưa dùng.";
    } else if (rule.start > gw) {
      row.state = "later";
      row.advice = label + " lượt sau: mở từ GW" + rule.start + " đến GW" + rule.stop + ".";
    } else {
      row.state = "available";
      row.advice = adviseChip_(pool, season, rule, label, gw, starters, bench, clubs, signals);
    }
    rows.push(row);
  }
  return rows;
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
    // A Wildcard only beats free transfers when more changes are worth making
    // than the free transfers cover (each extra one costs 4 points).
    const gain = round1_(signals.swapGain);
    const free = signals.freeTransfers;
    if (signals.swaps <= free) {
      return label + ": " + window + ". Chưa cần Wildcard: trợ lý gợi ý " + signals.swaps + " thay đổi, vừa đủ với " + free +
        " lượt chuyển miễn phí (ước tính).";
    }
    const worth = signals.doubts >= WILDCARD_MIN_DOUBTS || signals.swapGain >= WILDCARD_MIN_GAIN;
    if (worth) {
      return label + ": " + window + ". Nên cân nhắc Wildcard ngay vòng này: trợ lý gợi ý " + signals.swaps + " thay đổi nhưng chỉ có " + free +
        " lượt chuyển miễn phí (ước tính, mỗi lượt vượt trừ 4 điểm), trong khi các thay đổi đó thêm khoảng " + gain +
        " điểm dự kiến trong 5 vòng; đội có " + signals.doubts + " cầu thủ chấn thương hoặc nghi ngờ.";
    }
    return label + ": " + window + ". Chưa cần Wildcard: các thay đổi gợi ý chỉ thêm khoảng " + gain + " điểm dự kiến trong 5 vòng.";
  }

  return label + ": " + window + ".";
}

/**
 * Free transfers available for the coming gameweek, rebuilt from history.
 * Assumed rules (not published by the API, so this is an estimate): one free
 * transfer per gameweek after a team's first, at most five banked, and a
 * Wildcard or Free Hit week does not use banked transfers.
 *
 * @param {Array<{event: number, event_transfers: number, event_transfers_cost: number}>} current entry history rows
 * @param {Array<{name: string, event: number}>} chips played
 * @param {number} savedMoves transfers already made for the coming gameweek
 * @return {{available: number, hits: number}} free transfers left, and how many more would cost points
 */
function estimateFreeTransfers_(current, chips, savedMoves) {
  const chipAt = {};
  for (const c of chips) chipAt[c.event] = c.name;
  const rows = current.slice().sort(function (a, b) { return a.event - b.event; });
  let free = 0;
  rows.forEach(function (row, i) {
    if (i > 0 && chipAt[row.event] !== "wildcard" && chipAt[row.event] !== "freehit") {
      const paid = Math.round((row.event_transfers_cost || 0) / 4);
      free = Math.max(0, free - Math.max(0, (row.event_transfers || 0) - paid));
    }
    free = Math.min(5, free + 1);
  });
  return { available: Math.max(0, free - savedMoves), hits: Math.max(0, savedMoves - free) };
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
