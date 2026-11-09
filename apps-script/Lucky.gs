/**
 * Lucky.gs — lucky-number facts for the league chat, from XSMB results
 * HTCV FPL 2026-2027
 *
 * Only Shark Lâm (4403856) and Đại (1860254) get this. The seeds are the last
 * two digits of their latest played H2H score; the draws are the last 30 days
 * of the public XSMB (northern lottery) CSV. Any other number they ask about
 * (00-99) gets its own real statistics from the same draws, so the model never
 * has to say "no data" for a number. Lottery draws are random, so the facts
 * say so and the model must not promise a win.
 */

const LUCKY_MANAGER_IDS = [4403856, 1860254];
const XSMB_CSV_URL = "https://raw.githubusercontent.com/khiemdoan/vietnam-lottery-xsmb-analysis/refs/heads/main/data/xsmb-2-digits.csv";
const XSMB_WINDOW_DAYS = 30;
const XSMB_CACHE_TTL = 1800; // seconds
const LUCKY_MAX_ASKED = 6; // numbers looked up per question

function isoDay_(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Draws (date + 27 two-digit numbers) from the last 30 days, or null if the CSV cannot be read. */
function getXsmbRecent_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("xsmb_recent");
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) { /* refetch below */ }
  }

  const response = UrlFetchApp.fetch(XSMB_CSV_URL, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) return null;

  // Header: date,special,prize1,...; the date column is YYYY-MM-DD.
  const cutoff = isoDay_(Date.now() - XSMB_WINDOW_DAYS * 86400000);
  const rows = response.getContentText().trim().split("\n").slice(1)
    .map(function (line) { return line.trim().split(","); })
    .filter(function (cols) { return cols.length >= 28 && cols[0] >= cutoff; })
    .map(function (cols) { return { date: cols[0], digits: cols.slice(1).map(Number) }; })
    .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });

  try {
    cache.put("xsmb_recent", JSON.stringify(rows), XSMB_CACHE_TTL);
  } catch (e) { /* small payload, never expected to fail */ }
  return rows;
}

/**
 * Latest H2H result of a manager that has a real score: gameweek, own score, opponent score and name.
 * The round the H2H tab shows comes from the live payload, exactly like that tab: FPL's league endpoint
 * (the schedule) lags a running round by hours and gave a different score. The schedule only supplies
 * earlier rounds, or everything when the live payload is unavailable. A gameweek reads 0-0 from its
 * deadline until the first match, so such a round is skipped (same rule as the web card).
 */
function latestH2HScore_(managerId) {
  const live = currentH2HScore_(managerId);
  if (live && (live.mine > 0 || live.opp > 0)) {
    return { gw: live.gw, mine: live.mine, opp: live.opp, oppName: live.oppName, provisional: live.provisional };
  }

  const schedule = getH2HSchedule();
  if (!schedule || schedule.status !== "success") return null;
  const id = String(managerId);
  const mine = schedule.data.matches
    .filter(function (m) {
      return m.played && (!live || m.gw < live.gw) && (m.homePts > 0 || m.awayPts > 0) &&
        (String(m.homeId) === id || String(m.awayId) === id);
    })
    .sort(function (a, b) { return b.gw - a.gw; });
  if (!mine.length) return null;
  const m = mine[0];
  const isHome = String(m.homeId) === id;
  return {
    gw: m.gw,
    mine: isHome ? m.homePts : m.awayPts,
    opp: isHome ? m.awayPts : m.homePts,
    oppName: getManagerName(isHome ? m.awayId : m.homeId),
    provisional: false
  };
}

function countDraws_(digit, rows) {
  return rows.filter(function (r) { return r.digits.indexOf(digit) !== -1; }).length;
}

function twoDigits_(n) {
  return String(n).padStart(2, "0");
}

/**
 * True when the question names a number the way lottery talk does ("số 44", "con 07", "cặp 12-21",
 * "lô 07", "đề 44"), even without a word like "may mắn" that the keyword router needs.
 */
function luckyNumberAsked_(question) {
  return /(?<![\p{L}\p{N}])(?<!vấn\s+)(?:số|con|cặp|lô|đề|loto|bạch thủ|song thủ|đánh)\s*(?:số\s*)?\d{1,2}(?![\p{L}\p{N}])/iu.test(String(question || ""));
}

/**
 * The 1-2 digit numbers a question asks about, as 0-99 and without repeats (at most MAX). Amounts of time,
 * rounds, points or money ("7 ngày", "GW10", "50k") are not lottery numbers.
 */
function askedLuckyNumbers_(question) {
  const text = String(question || "").toLowerCase()
    .replace(/\d+[.,]\d+/g, " ")
    .replace(/\d+\s*(?:ngày|tuần|tháng|lần|vòng|kỳ|điểm|phút|năm|gw|k|tr|đ|%)(?![\p{L}])/gu, " ")
    .replace(/(?:gw|gameweek|vòng|tuần|top)\s*\d+/gu, " ");
  const found = [];
  const pattern = /(?<![\p{L}\p{N}.,])(\d{1,2})(?![\p{L}\p{N}]|[.,]\d)/gu;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const n = Number(match[1]);
    if (found.indexOf(n) === -1) found.push(n);
  }
  return found.slice(0, LUCKY_MAX_ASKED);
}

/** What the draws say about one number: how often it came up, how it ranks among the 100, when it last came. */
function luckyNumberText_(n, rows, counts) {
  let last = -1;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].digits.indexOf(n) !== -1) { last = i; break; }
  }
  const rank = 1 + counts.filter(function (c) { return c > counts[n]; }).length;
  const lastText = last === -1
    ? "không ra lần nào trong " + rows.length + " ngày quay"
    : last === rows.length - 1
      ? "có ra ở kỳ quay gần nhất (" + rows[last].date + ")"
      : "lần gần nhất ngày " + rows[last].date + ", cách " + (rows.length - 1 - last) + " kỳ quay";
  return "số " + twoDigits_(n) + ": ra " + countDraws_(n, rows.slice(-7)) + " lần trong 7 ngày quay gần nhất, " +
    countDraws_(n, rows.slice(-14)) + " lần trong 14 ngày quay gần nhất, " + counts[n] + " lần trong " + rows.length +
    " ngày quay (hạng " + rank + "/100 số ra nhiều nhất); " + lastText;
}

/**
 * Lucky-number pack for the chat: the seeds the Lucky Numbers card shows, the hottest numbers, and the real
 * statistics of every number the question names.
 */
function luckyFacts_(d, question) {
  if (LUCKY_MANAGER_IDS.indexOf(Number(d.id)) === -1) {
    return "CON SỐ MAY MẮN: tính năng này chỉ bật cho Shark Lâm và Đại.";
  }
  const score = latestH2HScore_(d.id);
  const rows = getXsmbRecent_();
  if (!rows || !rows.length) return "CON SỐ MAY MẮN: chưa đọc được dữ liệu XSMB.";

  const counts = [];
  for (let n = 0; n < 100; n++) counts.push(countDraws_(n, rows));
  const parts = [];

  const asked = askedLuckyNumbers_(question);
  if (asked.length) {
    parts.push("SỐ ĐƯỢC HỎI (thống kê thật từ XSMB " + rows[0].date + " đến " + rows[rows.length - 1].date +
      "; số 1 chữ số tính là 0 + số đó): " + asked.map(function (n) { return luckyNumberText_(n, rows, counts); }).join("; ") + ".");
  }

  if (score) {
    const seeds = [score.mine % 100, score.opp % 100];
    parts.push("Cặp số lấy từ tỉ số H2H GW" + score.gw + (score.provisional ? " (đang đá, tạm tính)" : "") + " của " + d.manager + " " +
      score.mine + " – " + score.opp + " " + score.oppName + " là " + twoDigits_(seeds[0]) + " và " + twoDigits_(seeds[1]) + ": " +
      seeds.map(function (n) { return luckyNumberText_(n, rows, counts); }).join("; ") + ".");
  } else if (!asked.length) {
    return "CON SỐ MAY MẮN: chưa đọc được kết quả H2H.";
  }

  const hot = counts.map(function (c, n) { return { n: n, c: c }; })
    .sort(function (a, b) { return b.c - a.c || a.n - b.n; });
  parts.push("5 số ra nhiều nhất trong " + rows.length + " ngày quay: " +
    hot.slice(0, 5).map(function (h) { return twoDigits_(h.n) + " (" + h.c + " lần)"; }).join(", ") + ".");

  return "CON SỐ MAY MẮN (mỗi kỳ quay có 27 số, chỉ lấy 2 chữ số cuối; \"ra N lần\" là số kỳ quay có số đó xuất hiện). " +
    parts.join(" ") +
    " LƯU Ý: XSMB là xổ số quay ngẫu nhiên, số ra nhiều trước đây không báo trước kết quả; không hứa trúng.";
}
