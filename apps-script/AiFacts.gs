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

// Topics and the words that select them. Single Vietnamese syllables are
// matched with their accents only: without accents "bán" (sell) reads as
// "bạn" (you) and "mua" (buy) as "mùa" (season).
const AI_TOPICS = {
  chips: { any: ["wildcard", "wild card", "wc", "free hit", "freehit", "fh", "bench boost", "bb", "triple captain", "triple", "tc", "chip", "chips", "3xc", "x3", "nhân 3", "nhân ba", "bật chip"] },
  captain: { any: ["captain", "cap", "vc", "đội trưởng", "đội phó", "đeo băng"] },
  h2h: { any: ["h2h", "vs", "đối thủ", "đối đầu"], accented: ["kèo"] },
  transfers: { any: ["transfer", "transfers", "hit", "ft", "bank", "chuyển nhượng", "thay người", "đổi người", "lượt chuyển", "ngân sách"], accented: ["bán", "mua", "giữ", "tiền"] },
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

function transferFacts_(d, history) {
  const lines = ["CHUYỂN NHƯỢNG gợi ý (xếp theo điểm dự kiến 5 vòng): " + (d.transfers.length ? d.transfers.map(function (t) {
    return "bán " + aiShortText_(t.out) + " (5 vòng " + t.out.ep5 + "đ)" + (t.out.news ? " [" + t.out.news + "]" : "") + " -> mua " +
      t.ins.slice(0, 2).map(function (p) { return aiShortText_(p) + ", 5 vòng " + p.ep5 + "đ, £" + p.cost + "m"; }).join(" hoặc ");
  }).join(" | ") : "chưa thấy ai đáng thay")];
  if (history) {
    const ft = estimateFreeTransfers_(history.current, history.chips, d.savedTransfers);
    lines.push("Lượt chuyển miễn phí cho GW" + d.gw + " (ước tính theo luật 1 lượt/vòng, tích tối đa 5): còn " + ft.available +
      (d.savedTransfers ? ", đã lưu " + d.savedTransfers + " chuyển nhượng cho vòng này" : "") +
      (ft.hits ? ", đang vượt " + ft.hits + " lượt (mỗi lượt vượt trừ 4 điểm)" : "") + ". Mỗi lượt chuyển vượt mức bị trừ 4 điểm.");
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
  const rows = planChips_(pool, season, d.squad, d.gw, history.chips, { doubts: 0, swapGain: 0, swaps: 0, freeTransfers: 0 });
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

function chipFacts_(d, pool, season, history, question) {
  if (!season || !history) return "CHIP: chưa tải được dữ liệu chip.";
  const doubts = d.health.filter(function (h) { return h.why !== "Không có trận vòng này"; }).length;
  const swapGain = d.transfers.reduce(function (sum, t) { return sum + Math.max(0, (t.ins[0] ? t.ins[0].ep5 : 0) - t.out.ep5); }, 0);
  const free = estimateFreeTransfers_(history.current, history.chips, d.savedTransfers).available;
  const rows = planChips_(pool, season, d.squad, d.gw, history.chips,
    { doubts: doubts, swapGain: swapGain, swaps: d.transfers.length, freeTransfers: free });
  const lines = [];
  // The model once read "Triple Captain: used in GW3" and still said one was
  // left, so a question about a named chip gets its answer stated up front.
  const asked = chipsAskedAbout_(question);
  if (asked.length) {
    lines.push("TRẢ LỜI TRỰC TIẾP (dùng đúng ý này): " + rows.filter(function (r) { return asked.indexOf(r.chip) !== -1; })
      .map(function (r) { return r.advice; }).join(" "));
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
  const needsHistory = topics.indexOf("chips") !== -1 || topics.indexOf("chipsBrief") !== -1 || topics.indexOf("transfers") !== -1;
  const history = needsHistory ? getEntryHistory_(d.id, d.gw) : null;

  const parts = ["HLV " + d.manager + ", vòng sắp tới GW" + d.gw + ", tiền trong túi ước tính £" + d.bank +
    "m. (đ = điểm dự kiến của trợ lý, độ khó 1 dễ - 5 khó)"];
  if (topics.indexOf("captain") !== -1) parts.push(captainFacts_(d));
  if (topics.indexOf("h2h") !== -1) parts.push(h2hFacts_(d));
  if (topics.indexOf("transfers") !== -1) parts.push(transferFacts_(d, history));
  if (topics.indexOf("health") !== -1) parts.push(healthFacts_(d));
  if (topics.indexOf("chips") !== -1 && pool) parts.push(chipFacts_(d, pool, season, history, question));
  else if (topics.indexOf("chipsBrief") !== -1 && pool) parts.push(chipBriefFacts_(d, pool, season, history));
  if (topics.indexOf("league") !== -1 && state) parts.push(leagueFacts_(d.manager, state));
  if (mentioned.length && pool) {
    parts.push("CẦU THỦ ĐƯỢC HỎI:\n" + mentioned.map(function (id) {
      return aiPlayerText_(describePlayer_(pool, advisorPlayer_(pool, id), d.gw), season, d.gw);
    }).join("\n"));
  }
  return parts.join("\n");
}
