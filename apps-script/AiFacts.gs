/**
 * AiFacts.gs — choosing and writing the facts the AI may use
 * HTCV FPL 2026-2027
 *
 * A question is routed by keywords to the fact packs it needs, so the prompt
 * stays small: on the free gateway a 3,000-token prompt took 30-43s and one
 * Apps Script fetch dies at 60s, while ~500 tokens answer in about 6s.
 * Every conclusion (who is ahead, which gameweek suits a chip) is written here
 * in code; the model only rephrases it.
 */

const AI_FACT_TTL = 600; // seconds — entry history and league table reuse

// Topics and the words that select them. A question about chips (Wildcard, Free
// Hit), the head-to-head or injuries also gets the transfer plan: those answers
// end in "so who do I sell and buy?". Single Vietnamese syllables are
// matched with their accents only: without accents "bán" (sell) reads as
// "bạn" (you) and "mua" (buy) as "mùa" (season).
const AI_TOPICS = {
  chips: { any: ["wildcard", "wild card", "wc", "free hit", "freehit", "fh", "bench boost", "bb", "triple captain", "triple", "tc", "chip", "chips", "3xc", "x3", "nhân 3", "nhân ba", "bật chip"] },
  captain: { any: ["captain", "cap", "vc", "đội trưởng", "đội phó", "đeo băng"] },
  h2h: { any: ["h2h", "vs", "đối thủ", "đối đầu"], accented: ["kèo"] },
  transfers: { any: ["transfer", "transfers", "hit", "ft", "bank", "chuyển nhượng", "thay người", "đổi người", "lượt chuyển", "ngân sách", "-4", "trừ điểm"], accented: ["bán", "mua", "giữ", "tiền", "thay", "đổi"] },
  league: { any: ["bxh", "bảng xếp hạng", "thứ hạng", "xếp thứ", "top", "nhất tháng", "nhất tuần", "giải thưởng", "dẫn đầu", "vô địch", "classic"], accented: ["hạng"] },
  health: { any: ["chấn thương", "nghi ngờ", "ra sân", "treo giò", "thẻ đỏ", "injury", "injured"], accented: ["khoẻ", "khỏe"] }
};
const AI_DEFAULT_TOPICS = ["captain", "h2h", "transfers", "health"];

function termPattern_(term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("(?<![\\p{L}\\p{N}])" + escaped + "(?![\\p{L}\\p{N}])", "gu");
}

function hasTerm_(text, term) {
  return termPattern_(term).test(text);
}

/** Typos between two words; swapping two neighbouring letters ("captian") counts as one. */
function editDistance_(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const d = [];
  for (let i = 0; i <= a.length; i++) d[i] = [i];
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/**
 * Misspelt English terms ("wilcard", "captian", "bench boots"): the words of
 * the question that are within one typo of the term (two for 8+ letters), or
 * []. Short abbreviations and Vietnamese words are never matched loosely.
 */
function fuzzyMatches_(plain, term) {
  const target = term.replace(/ /g, "");
  if (!/^[a-z ]+$/.test(term) || target.length < 5) return [];
  const allowed = target.length >= 8 ? 2 : 1;
  const words = plain.split(/[^a-z0-9]+/).filter(Boolean);
  const found = [];
  for (let i = 0; i < words.length; i++) {
    if (editDistance_(words[i], target) <= allowed) found.push(words[i]);
    else if (i + 1 < words.length && editDistance_(words[i] + words[i + 1], target) <= allowed) found.push(words[i] + " " + words[i + 1]);
  }
  return found;
}

/**
 * Topics a question is about; empty when nothing specific is asked. Chip names
 * are matched first and then removed, so "triple captain" is not also a
 * captain question and "free hit" not a points-hit (transfer) question.
 * Typos are forgiven: "nên wilcard vòng nào" once fell through to the default
 * packs and the model said it had no chip data.
 */
function routeQuestion_(question) {
  let raw = String(question || "").toLowerCase();
  let plain = normalizeText_(raw);
  const topics = [];
  const keys = ["chips"].concat(Object.keys(AI_TOPICS).filter(function (k) { return k !== "chips"; }));
  for (const key of keys) {
    const t = AI_TOPICS[key];
    const matched = [];
    for (const term of (t.any || [])) {
      if (hasTerm_(raw, term) || hasTerm_(plain, normalizeText_(term))) matched.push(normalizeText_(term));
      else Array.prototype.push.apply(matched, fuzzyMatches_(plain, term));
    }
    const accentHits = (t.accented || []).filter(function (term) { return hasTerm_(raw, term); });
    if (!matched.length && !accentHits.length) continue;
    topics.push(key);
    if (key === "chips") {
      for (const word of matched) {
        raw = raw.replace(termPattern_(word), " ");
        plain = plain.replace(termPattern_(word), " ");
      }
    }
  }
  return topics;
}

/** A manager's FPL history: chips played and per-gameweek bank, transfers and rank. */
function getEntryHistory_(entryId, gw) {
  const cache = CacheService.getScriptCache();
  const key = "entry_hist|" + entryId + "|" + gw;
  const cached = cache.get(key);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) { /* refetch below */ }
  }
  const data = fetchFPL("entry/" + entryId + "/history/", { silent: true, retries: 0 });
  if (!data || !data.current) return null;
  const history = {
    current: data.current.map(function (r) {
      return { event: r.event, points: r.points, bank: r.bank, value: r.value, event_transfers: r.event_transfers, event_transfers_cost: r.event_transfers_cost, overall_rank: r.overall_rank };
    }),
    chips: (data.chips || []).map(function (c) { return { name: c.name, event: c.event }; })
  };
  try {
    cache.put(key, JSON.stringify(history), AI_FACT_TTL);
  } catch (e) { /* small payload */ }
  return history;
}

// ---- packs ------------------------------------------------------------------

function aiFixtureText_(fixtures) {
  if (!fixtures || !fixtures.length) return "không có trận";
  return fixtures.map(function (f) {
    return "đá " + f.opp + (f.home ? " sân nhà" : " sân khách") + " (độ khó " + f.fdr + "/5)";
  }).join(" và ");
}

/** Short line for lists. */
function aiShortText_(p) {
  const f = p.fixtures[0];
  return p.name + " " + p.ep + "đ" +
    (f ? ", đá " + f.opp + (f.home ? " nhà" : " khách") + " (" + f.fdr + "/5)" : ", không có trận") +
    (p.chance < 100 ? ", ra sân " + p.chance + "%" : "");
}

/** Full line for a player the manager asked about, with the next five gameweeks. */
function aiPlayerText_(p, season, gw) {
  let text = p.name + " (" + p.team + "): " + p.ep + " điểm dự kiến vòng này, " + p.ep5 +
    " điểm dự kiến 5 vòng, trung bình mùa " + p.ppg + " điểm/trận, phong độ " + p.form +
    ", giá £" + p.cost + "m, " + aiFixtureText_(p.fixtures);
  if (p.chance < 100) text += ", khả năng ra sân " + p.chance + "%";
  if (p.news) text += ", tin: " + p.news;
  if (season) {
    const run = (season.fixtures[p.team] || []).filter(function (f) { return f.gw > gw && f.gw < gw + 5; });
    if (run.length) {
      text += ". Lịch tiếp theo: " + run.map(function (f) { return "GW" + f.gw + " " + f.opp + (f.home ? " nhà" : " khách") + " (" + f.fdr + "/5)"; }).join(", ");
    }
  }
  return text;
}

function captainFacts_(d) {
  return "CAPTAIN gợi ý (chỉ tiền vệ/tiền đạo đá chính, xếp theo điểm dự kiến): " +
    (d.captains.map(function (p, i) { return (i + 1) + ") " + aiShortText_(p); }).join("; ") || "chưa có");
}

/** Who leads the head-to-head on expected points: "hon", "kem", "ngang" or "" without an opponent. */
function h2hLead_(d) {
  if (!d.opponent) return "";
  const gap = Math.round((d.opponent.myProjected - d.opponent.theirProjected) * 10) / 10;
  return Math.abs(gap) < 0.5 ? "ngang" : (gap > 0 ? "hon" : "kem");
}

function h2hFacts_(d) {
  if (!d.opponent) return "Vòng này " + d.manager + " không có đối thủ H2H.";
  const gap = Math.abs(Math.round((d.opponent.myProjected - d.opponent.theirProjected) * 10) / 10);
  const lead = h2hLead_(d);
  const verdict = lead === "ngang"
    ? "hai bên gần như ngang nhau"
    : d.manager + (lead === "hon" ? " đang HƠN " : " đang KÉM ") + gap + " điểm dự kiến";
  return [
    "ĐỐI THỦ H2H vòng " + d.gw + ": " + d.opponent.manager + ". Điểm dự kiến cả đội: " + d.manager + " " + d.opponent.myProjected +
      ", " + d.opponent.manager + " " + d.opponent.theirProjected + ". NHẬN ĐỊNH (dùng đúng ý này): " + verdict + ".",
    "Con bài của " + d.manager + " mà đối thủ không có: " + (d.opponent.edge.map(aiShortText_).join("; ") || "không có"),
    "Mối đe doạ của " + d.opponent.manager + " mà " + d.manager + " không có: " + (d.opponent.threat.map(aiShortText_).join("; ") || "không có")
  ].join("\n");
}

/**
 * Free transfers, the suggested swaps and what to do with them, for one manager.
 * Pure data work: nothing here reaches the AI until transferFacts_ writes it.
 *
 * @return {{ft: Object, overhaul: boolean, wildcardOpen: boolean, plan: Object|null}|null} null without history
 */
function buildTransferPlan_(d, pool, season, history) {
  if (!pool || !history) return null;
  const ft = estimateFreeTransfers_(history.current, history.chips, d.savedTransfers);
  // Far more saved transfers than free ones: the squad is being rebuilt, so
  // more swaps would only be noise. This says nothing about chips: the one
  // played for the coming gameweek is not in the API until its deadline passes.
  const overhaul = d.savedTransfers > ft.free + OVERHAUL_EXTRA;
  const wildcardOpen = !!(season && openChip_(season, history.chips, "wildcard", d.gw));
  let plan = null;
  if (!overhaul) {
    const bank = Math.round(d.bank * 10);
    const squad = squadPlayers_(pool, d.squad).map(function (x) {
      return { id: x.p.id, team: x.p.team, pos: x.p.pos, starter: x.slot <= 11, ep5: round1_(horizonPoints_(pool, x.p, d.gw)) };
    });
    plan = planTransfers_(suggestTransfers_(pool, d.squad, d.gw, bank, PLAN_MAX_MOVES), squad, ft.available, bank);
  }
  return { ft: ft, overhaul: overhaul, wildcardOpen: wildcardOpen, plan: plan };
}

/**
 * What the saved transfers cost, stated as what the data shows: FPL does not
 * publish the chip of the coming gameweek before its deadline, so whether a
 * Wildcard or Free Hit is already active is unknown, and the cost is conditional.
 */
function savedMovesText_(d, ft) {
  return "Trong app FPL bạn đã thực hiện sẵn " + d.savedTransfers + " chuyển nhượng cho GW" + d.gw + " (chưa chốt đội), mà chỉ có " + ft.free +
    " lượt miễn phí, nên " + ft.hits + " chuyển nhượng còn lại bị trừ " + HIT_COST + " điểm mỗi cái, tổng -" + ft.hits * HIT_COST +
    " điểm, trừ khi bạn bật Wildcard hoặc Free Hit. FPL chỉ công bố chip của vòng sắp tới sau hạn chốt đội nên chưa biết bạn đã bật chip chưa " +
    "(chip đã dùng ở các vòng trước thì có trong dữ liệu).";
}

function transferUseText_(m) {
  if (m.use === "free") return "dùng 1 lượt miễn phí";
  if (m.use === "hold") return "chưa đáng dùng lượt miễn phí (lời quá ít), nên tích lượt";
  if (m.use === "hit") return "đáng trả -" + HIT_COST + " điểm vì người bán gần như không đá, lời gần bằng toàn bộ điểm người mua";
  if (m.dead && m.gain >= DEAD_BUYER_MIN) return "không trả thêm -" + HIT_COST + " điểm vì mỗi tuần chỉ nên ăn tối đa " + MAX_HITS + " lần -" + HIT_COST + ", để dành cho tuần sau";
  if (m.dead) return "không đáng trả -" + HIT_COST + " điểm vì người mua chưa đủ mạnh để bù";
  if (!m.starter) return "không đáng trả -" + HIT_COST + " điểm (người bán ngồi dự bị nên ít ảnh hưởng đến điểm)";
  return "không đáng trả -" + HIT_COST + " điểm (người bán chưa chắc nghỉ, lời thực tế chỉ khoảng 4-5 điểm)";
}

function transferFacts_(d, info, withRules) {
  if (!info) {
    return "CHUYỂN NHƯỢNG gợi ý (chưa biết số lượt miễn phí vì chưa tải được lịch sử chuyển nhượng): " +
      (d.transfers.length ? d.transfers.map(function (t) {
        return "bán " + aiShortText_(t.out) + " -> mua " + t.ins.slice(0, 2).map(aiShortText_).join(" hoặc ");
      }).join(" | ") : "chưa thấy ai đáng thay");
  }
  const ft = info.ft;
  if (info.overhaul) {
    return "CHUYỂN NHƯỢNG: " + savedMovesText_(d, ft) + " Chưa đề xuất thêm chuyển nhượng.";
  }
  const plan = info.plan;
  const lines = [
    "KẾ HOẠCH CHUYỂN NHƯỢNG cho GW" + d.gw + " (code đã tính sẵn, dùng đúng kết luận)." + (withRules
      ? " Quy tắc đã chạy lùi 3 mùa: đổi người vẫn đá chỉ lời thực tế khoảng 4-5 điểm/5 vòng (xấp xỉ giá 1 lần -" + HIT_COST + ") nên chỉ dùng lượt miễn phí; " +
        "chỉ trả -" + HIT_COST + " khi người bán gần như không đá và người mua từ " + DEAD_BUYER_MIN + " điểm/5 vòng, tối đa " + MAX_HITS + " lần -" + HIT_COST +
        " mỗi tuần. Điểm lời mô hình báo thường cao gấp khoảng 2 lần thực tế."
      : ""),
    "Lượt miễn phí còn lại: " + ft.available + " (ước tính từ lịch sử, tối đa " + FREE_TRANSFER_CAP + "). Mỗi chuyển nhượng vượt mức bị trừ " + HIT_COST +
      " điểm. Tiền trong túi £" + d.bank + "m (giá bán chỉ giữ một nửa phần giá tăng)."
  ];
  if (ft.hits > 0) lines.push(savedMovesText_(d, ft));
  else if (d.savedTransfers > 0) lines.push("Trong app FPL bạn đã thực hiện sẵn " + d.savedTransfers + " chuyển nhượng cho GW" + d.gw + " (chưa chốt đội), đã trừ vào số lượt miễn phí còn lại.");

  plan.moves.forEach(function (m, i) {
    lines.push((i + 1) + ") Bán " + m.out.name + " (" + m.out.team + ", " + (m.starter ? "đá chính" : "dự bị") + ", 5 vòng " + m.out.ep5 + "đ" +
      (m.out.news ? ", " + m.out.news : "") + ") -> mua " + m.in.name + " (" + m.in.team + ", 5 vòng " + m.in.ep5 + "đ, £" + m.in.cost + "m): thêm " +
      m.gain + " điểm dự kiến" + (m.starter ? "" : " (vì vào đá chính thay người yếu nhất cùng vị trí)") + " - " + transferUseText_(m));
  });

  const doCount = plan.freeUsed + plan.hits;
  if (!plan.moves.length) {
    lines.push("KẾT LUẬN: chưa có đổi nào đáng làm; nên giữ đội hình và tích lượt miễn phí (đang có " + ft.available + ").");
  } else if (!doCount) {
    lines.push("KẾT LUẬN: tuần này không có đổi nào đáng làm; nên giữ nguyên và tích lượt miễn phí (đang có " + ft.available + ").");
  } else {
    lines.push("KẾT LUẬN: nên làm " + doCount + " chuyển nhượng: " + plan.freeUsed + " bằng lượt miễn phí" +
      (plan.hits ? ", " + plan.hits + " trả -" + HIT_COST + " (tổng -" + plan.hits * HIT_COST + " điểm)" : ", không mất điểm") +
      "; lời ròng khoảng " + plan.net + " điểm dự kiến trong 5 vòng. Giữ lại " + plan.keep + " lượt miễn phí.");
  }
  if (plan.atCap && !plan.freeUsed) {
    lines.push("LƯU Ý: đang đầy " + FREE_TRANSFER_CAP + " lượt miễn phí, không dùng thì lượt mới tuần sau bị mất.");
  }
  if (info.wildcardOpen && plan.worthMoves - ft.available >= WILDCARD_MIN_HITS) {
    lines.push("LƯU Ý: có " + plan.worthMoves + " đổi đáng làm nhưng chỉ " + ft.available + " lượt miễn phí; thay vì trả nhiều lần -" + HIT_COST +
      " nên cân nhắc dùng Wildcard (xem phần CHIP).");
  }
  return lines.join("\n");
}

function healthFacts_(d) {
  return "SỨC KHOẺ ĐỘI HÌNH: " + (d.health.length ? d.health.map(function (h) {
    return h.name + " (" + (h.starter ? "đá chính" : "dự bị") + ") " + h.why;
  }).join("; ") : "mọi cầu thủ đều khoẻ và có trận");
}

// Words that name one particular chip, to answer a question about it first.
const CHIP_TERMS = {
  wildcard: ["wildcard", "wild card", "wc"],
  freehit: ["free hit", "freehit", "fh"],
  bboost: ["bench boost", "bb"],
  "3xc": ["triple captain", "triple", "tc", "3xc", "x3", "nhân 3", "nhân ba"]
};

function chipsAskedAbout_(question) {
  const raw = String(question || "").toLowerCase();
  const plain = normalizeText_(raw);
  return Object.keys(CHIP_TERMS).filter(function (chip) {
    return CHIP_TERMS[chip].some(function (term) { return hasTerm_(raw, term) || hasTerm_(plain, normalizeText_(term)); });
  });
}

/** One line of chip state, sent with questions that name no topic at all. */
function chipBriefFacts_(d, pool, season, history) {
  if (!season || !history) return "CHIP: chưa tải được dữ liệu chip.";
  const rows = planChips_(pool, season, d.squad, d.gw, history.chips, { doubts: 0, worthMoves: 0, worthGain: 0, freeTransfers: 0 });
  const now = rows.filter(function (r) { return r.state !== "later"; }).map(function (r) {
    if (r.state === "used") return r.label + " đã dùng ở GW" + usedEventOf_(history.chips, r);
    if (r.state === "expired") return r.label + " (GW" + r.start + "-" + r.stop + ") đã hết hạn";
    return r.label + " còn dùng được tới GW" + r.stop;
  });
  const later = rows.filter(function (r) { return r.state === "later"; });
  return "CHIP (tóm tắt; hỏi riêng về một chip để có gợi ý chi tiết): " + now.join("; ") +
    (later.length ? "; các chip lượt sau mở từ GW" + later[0].start : "") + ".";
}

function usedEventOf_(chips, row) {
  const hit = chips.filter(function (c) { return c.name === row.chip && c.event >= row.start && c.event <= row.stop; })[0];
  return hit ? hit.event : "?";
}

function chipFacts_(d, pool, season, history, question, info) {
  if (!season || !history) return "CHIP: chưa tải được dữ liệu chip.";
  const doubts = d.health.filter(function (h) { return h.why !== "Không có trận vòng này"; }).length;
  const plan = info && info.plan;
  // The Wildcard advice is derived from the same transfer plan the chat shows,
  // so one answer never says "use a free transfer" and "play a Wildcard" at once.
  const rows = planChips_(pool, season, d.squad, d.gw, history.chips, {
    doubts: doubts,
    worthMoves: plan ? plan.worthMoves : 0,
    worthGain: plan ? plan.worthGain : 0,
    freeTransfers: info ? info.ft.available : 0
  });
  const lines = [];
  // The model once read "Triple Captain: used in GW3" and still said one was
  // left, so a question about a named chip gets its answer stated up front.
  const asked = chipsAskedAbout_(question);
  if (asked.length) {
    lines.push("TRẢ LỜI TRỰC TIẾP (dùng đúng ý này): " + rows.filter(function (r) { return asked.indexOf(r.chip) !== -1; })
      .map(function (r) { return r.advice; }).join(" "));
  }
  if (info && info.ft.hits > 0) {
    lines.push("LƯU Ý: trong app FPL bạn đã thực hiện sẵn " + d.savedTransfers + " chuyển nhượng cho GW" + d.gw + " (chưa chốt đội), mà chỉ có " + info.ft.free +
      " lượt miễn phí, nên " + info.ft.hits + " chuyển nhượng bị trừ điểm nếu không bật chip. FPL chỉ công bố chip của vòng sắp tới sau hạn chốt đội nên chưa biết bạn đã bật Wildcard hoặc Free Hit chưa.");
  }
  lines.push("CHIP (mỗi chip có 2 lượt; mỗi vòng chỉ dùng được 1 chip; điểm dự kiến các vòng sau tính theo phong độ hiện tại):");
  rows.forEach(function (r) { lines.push("- " + r.advice); });
  return lines.join("\n");
}

/** League standing from the settled tables (the gameweek in play is not counted yet). */
function leagueFacts_(managerName, state) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("ai_league|" + state.finishedGws);
  let tables = null;
  if (cached) {
    try {
      tables = JSON.parse(cached);
    } catch (e) { /* reread */ }
  }
  if (!tables) {
    const classic = getSheetDataAsObjects("🏅 Classic BXH");
    const h2h = getSheetDataAsObjects("⚔️ H2H BXH");
    if (classic.status !== "success" || h2h.status !== "success") return "GIẢI ĐẤU: chưa đọc được bảng xếp hạng.";
    tables = { classic: classic.data, h2h: h2h.data };
    try {
      cache.put("ai_league|" + state.finishedGws, JSON.stringify(tables), AI_FACT_TTL);
    } catch (e) { /* serve uncached */ }
  }

  const lines = ["GIẢI ĐẤU (tính tới GW" + state.finishedGws + " đã chốt):"];
  const classic = tables.classic.slice().sort(function (a, b) { return Number(b.TOTAL) - Number(a.TOTAL); });
  const meIndex = classic.findIndex(function (r) { return r.HLV === managerName; });
  if (meIndex !== -1) {
    const me = classic[meIndex];
    let text = "Classic: " + managerName + " hạng " + (meIndex + 1) + "/" + classic.length + ", tổng " + me.TOTAL + " điểm";
    if (meIndex === 0) text += ", đang dẫn đầu, hơn hạng 2 (" + classic[1].HLV + ") " + (me.TOTAL - classic[1].TOTAL) + " điểm";
    else text += ", kém người dẫn đầu " + classic[0].HLV + " " + (classic[0].TOTAL - me.TOTAL) + " điểm, kém người xếp ngay trên " + classic[meIndex - 1].HLV + " " + (classic[meIndex - 1].TOTAL - me.TOTAL) + " điểm";
    lines.push(text + ".");

    const bucket = getMonthBuckets().filter(function (m) { return m.gws.indexOf(state.nextGw) !== -1; })[0];
    if (bucket) {
      const done = bucket.gws.filter(function (g) { return g <= state.finishedGws; });
      const month = classic.map(function (r) {
        return { name: r.HLV, pts: done.reduce(function (s, g) { return s + (Number(r["GW" + g]) || 0); }, 0) };
      }).sort(function (a, b) { return b.pts - a.pts; });
      const mine = month.findIndex(function (m) { return m.name === managerName; });
      lines.push("Nhất tháng (" + bucket.name + ", GW" + bucket.gws[0] + "-" + bucket.gws[bucket.gws.length - 1] + "): " +
        (done.length ? "sau " + done.length + " vòng, " + month[0].name + " dẫn đầu " + month[0].pts + " điểm; " + managerName + " " + month[mine].pts +
          " điểm, hạng " + (mine + 1) + (mine > 0 ? ", kém " + (month[0].pts - month[mine].pts) + " điểm" : "") : "chưa có vòng nào chốt") +
        "; còn " + (bucket.gws.length - done.length) + " vòng trong tháng.");
    }
  }

  const h2h = tables.h2h.slice().sort(function (a, b) { return Number(a["#"]) - Number(b["#"]); });
  const mineH = h2h.filter(function (r) { return r.HLV === managerName; })[0];
  if (mineH) {
    lines.push("H2H: " + managerName + " hạng " + mineH["#"] + ", " + mineH.Pts + " điểm H2H (thắng " + mineH.W + ", hoà " + mineH.D + ", thua " + mineH.L + ")" +
      (h2h[0].HLV === managerName ? ", đang dẫn đầu." : "; dẫn đầu là " + h2h[0].HLV + " với " + h2h[0].Pts + " điểm H2H."));
  }
  return lines.join("\n");
}

/**
 * Facts for one question: a header plus the packs its topics need.
 *
 * @param {Object} d advisor data for the manager
 * @param {Array<string>} topics from routeQuestion_
 * @param {Array<string>} mentioned player ids named in the question
 * @param {string} [question] the question itself, to answer a named chip first
 */
function buildAiFacts_(d, topics, mentioned, question) {
  const state = getSeasonState();
  const pool = state ? getAdvisorPool_(state.nextGw, state.finishedGws) : null;
  const season = state ? getAdvisorSeason_(state.nextGw, state.finishedGws) : null;
  const has = function (topic) { return topics.indexOf(topic) !== -1; };
  // Chips matter for transfers only when the question is about Wildcard / Free
  // Hit (or no chip in particular); Bench Boost and Triple Captain are not.
  const asked = chipsAskedAbout_(question);
  const chipTransfers = has("chips") && (!asked.length || asked.indexOf("wildcard") !== -1 || asked.indexOf("freehit") !== -1);
  const showPlan = has("transfers") || has("h2h") || has("health") || chipTransfers;
  const history = has("chips") || has("chipsBrief") || showPlan ? getEntryHistory_(d.id, d.gw) : null;
  const info = buildTransferPlan_(d, pool, season, history);

  const parts = ["HLV " + d.manager + ", vòng sắp tới GW" + d.gw + ", tiền trong túi ước tính £" + d.bank +
    "m. (đ = điểm dự kiến của trợ lý, độ khó 1 dễ - 5 khó)"];
  if (has("captain")) parts.push(captainFacts_(d));
  if (has("h2h")) parts.push(h2hFacts_(d));
  // The rules paragraph is only worth its tokens when the question is about transfers or chips;
  // a general question (default packs + chip summary) gets the plan without it.
  if (showPlan) parts.push(transferFacts_(d, info, !has("chipsBrief")));
  if (has("health")) parts.push(healthFacts_(d));
  if (has("chips") && pool) parts.push(chipFacts_(d, pool, season, history, question, info));
  else if (has("chipsBrief") && pool) parts.push(chipBriefFacts_(d, pool, season, history));
  if (has("league") && state) parts.push(leagueFacts_(d.manager, state));
  if (mentioned.length && pool) {
    parts.push("CẦU THỦ ĐƯỢC HỎI:\n" + mentioned.map(function (id) {
      return aiPlayerText_(describePlayer_(pool, advisorPlayer_(pool, id), d.gw), season, d.gw);
    }).join("\n"));
  }
  return parts.join("\n");
}
