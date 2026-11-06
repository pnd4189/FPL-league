/**
 * Lucky.gs — lucky-number facts for the league chat, from XSMB results
 * HTCV FPL 2026-2027
 *
 * Only Shark Lâm (4403856) and Đại (1860254) get this. The seeds are the last
 * two digits of their latest played H2H score; the draws are the last 30 days
 * of the public XSMB (northern lottery) CSV. Lottery draws are random, so the
 * facts say so and the model must not promise a win.
 */

const LUCKY_MANAGER_IDS = [4403856, 1860254];
const XSMB_CSV_URL = "https://raw.githubusercontent.com/khiemdoan/vietnam-lottery-xsmb-analysis/refs/heads/main/data/xsmb-2-digits.csv";
const XSMB_WINDOW_DAYS = 30;
const XSMB_CACHE_TTL = 1800; // seconds

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

/** Latest played H2H match of a manager: gameweek, own score, opponent score and id. */
function latestH2HScore_(managerId) {
  const schedule = getH2HSchedule();
  if (!schedule || schedule.status !== "success") return null;
  const id = String(managerId);
  const mine = schedule.data.matches
    .filter(function (m) { return m.played && (String(m.homeId) === id || String(m.awayId) === id); })
    .sort(function (a, b) { return b.gw - a.gw; });
  if (!mine.length) return null;
  const m = mine[0];
  const isHome = String(m.homeId) === id;
  return {
    gw: m.gw,
    mine: isHome ? m.homePts : m.awayPts,
    opp: isHome ? m.awayPts : m.homePts,
    oppId: isHome ? m.awayId : m.homeId
  };
}

function countDraws_(digit, rows) {
  return rows.filter(function (r) { return r.digits.indexOf(digit) !== -1; }).length;
}

function twoDigits_(n) {
  return String(n).padStart(2, "0");
}

/** Lucky-number pack for the chat; the same seeds the Lucky Numbers card shows. */
function luckyFacts_(d) {
  if (LUCKY_MANAGER_IDS.indexOf(Number(d.id)) === -1) {
    return "CON SỐ MAY MẮN: tính năng này chỉ bật cho Shark Lâm và Đại.";
  }
  const score = latestH2HScore_(d.id);
  const rows = getXsmbRecent_();
  if (!score || !rows || !rows.length) return "CON SỐ MAY MẮN: chưa đọc được kết quả H2H hoặc dữ liệu XSMB.";

  const recent = rows.slice(-7);
  const seeds = [score.mine % 100, score.opp % 100];
  const seedText = seeds.map(function (s) {
    return "số " + twoDigits_(s) + ": ra " + countDraws_(s, recent) + " lần trong 7 ngày quay gần nhất, " +
      countDraws_(s, rows) + " lần trong " + rows.length + " ngày quay";
  }).join("; ");

  const hot = [];
  for (let n = 0; n < 100; n++) hot.push({ n: n, c: countDraws_(n, rows) });
  hot.sort(function (a, b) { return b.c - a.c || a.n - b.n; });
  const hotText = hot.slice(0, 5).map(function (h) { return twoDigits_(h.n) + " (" + h.c + " lần)"; }).join(", ");

  return "CON SỐ MAY MẮN, lấy từ tỉ số H2H GW" + score.gw + " của " + d.manager + " " + score.mine + " – " + score.opp +
    " " + getManagerName(score.oppId) + " (cặp số " + twoDigits_(seeds[0]) + " và " + twoDigits_(seeds[1]) + "). " +
    "Dữ liệu XSMB " + rows[0].date + " đến " + rows[rows.length - 1].date + ": " + seedText + ". " +
    "5 số ra nhiều nhất trong " + rows.length + " ngày quay: " + hotText + ". " +
    "LƯU Ý: XSMB là xổ số quay ngẫu nhiên, số ra nhiều trước đây không báo trước kết quả; không hứa trúng.";
}
