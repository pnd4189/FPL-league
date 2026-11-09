/**
 * LiveStandings.gs — the live gameweek folded into the settled Classic and H2H tables
 * HTCV FPL 2026-2027
 *
 * Pure logic. The website shows standings that already include the gameweek in progress
 * (web/src/services/liveStandings.ts and App.tsx); the chat must quote the same numbers, so
 * this repeats those rules on the sheet rows. Change one side and the other with it: the
 * test that replays both on real payloads is what keeps them equal.
 */

/** The 14 sheet rows copied, so merging never touches the cached originals. */
function cloneRows_(rows) {
  return rows.map(function (row) {
    const copy = {};
    Object.keys(row).forEach(function (key) { copy[key] = row[key]; });
    return copy;
  });
}

/** Sort by `compare` and hand out ranks, rows equal on `sameKey` sharing a rank; ranks go to the "#" column. */
function rankRows_(rows, compare, sameKey) {
  const sorted = rows.slice().sort(compare);
  let rank = 0;
  let previous = null;
  sorted.forEach(function (row, i) {
    const key = sameKey(row);
    if (key !== previous) rank = i + 1;
    previous = key;
    row["#"] = rank;
  });
  return sorted;
}

/**
 * @param {Array<Object>} classicRows rows of the "Classic BXH" sheet (HLV, GW1..GW38, TOTAL)
 * @param {Array<Object>} h2hRows rows of the "H2H BXH" sheet (HLV, P, W, D, L, GF, GA, GD, Pts, Classic Total)
 * @param {Object|null} live the `data` of getLiveData(), or null
 * @return {{classic: Array<Object>, h2h: Array<Object>, liveGw: number|null, provisional: boolean}} the same
 *   row shapes, merged and ranked ("#" is the rank); liveGw is the merged gameweek, provisional is true while
 *   FPL has not finalised it
 */
function mergeLiveTables_(classicRows, h2hRows, live) {
  const classic = cloneRows_(classicRows);
  const h2h = cloneRows_(h2hRows);
  const usable = !!live && !live.isPreSeason && !!live.scores && live.scores.length > 0 && live.gw >= 1 && live.gw <= 38;

  if (usable) {
    const net = {};
    live.scores.forEach(function (s) { net[s.manager] = s.netPoints; });
    const cell = "GW" + live.gw;
    classic.forEach(function (row) {
      if (net[row.HLV] === undefined) return;
      const previous = row[cell] === "" || row[cell] === null || row[cell] === undefined ? null : Number(row[cell]);
      if (previous === net[row.HLV]) return;
      row[cell] = net[row.HLV];
      row.TOTAL = (Number(row.TOTAL) || 0) - (previous === null ? 0 : previous) + net[row.HLV];
    });
  }
  const rankedClassic = rankRows_(classic,
    usable ? function (a, b) { return (Number(b.TOTAL) || 0) - (Number(a.TOTAL) || 0); } : function (a, b) { return Number(a["#"]) - Number(b["#"]); },
    usable ? function (row) { return String(Number(row.TOTAL) || 0); } : function (row) { return String(row["#"]); });

  // The overall H2H table adds the running gameweek's results only while FPL has not finalised it; afterwards the
  // sheet already holds them. Its Classic column mirrors the Classic table above.
  if (live && live.isLive && live.h2h && live.h2h.length) {
    const delta = {};
    const record = function (name, own, opponent, h2hPts) {
      delta[name] = { pts: h2hPts, own: own, against: opponent };
    };
    live.h2h.forEach(function (f) {
      record(f.homeManager, f.homePoints, f.awayPoints, f.homeH2HPoints);
      record(f.awayManager, f.awayPoints, f.homePoints, f.awayH2HPoints);
    });
    h2h.forEach(function (row) {
      const d = delta[row.HLV];
      if (!d) return;
      row.P = (Number(row.P) || 0) + 1;
      row.W = (Number(row.W) || 0) + (d.pts === 3 ? 1 : 0);
      row.D = (Number(row.D) || 0) + (d.pts === 1 ? 1 : 0);
      row.L = (Number(row.L) || 0) + (d.pts === 0 ? 1 : 0);
      row.GF = (Number(row.GF) || 0) + d.own;
      row.GA = (Number(row.GA) || 0) + d.against;
      row.GD = row.GF - row.GA;
      row.Pts = (Number(row.Pts) || 0) + d.pts;
    });
  }
  const totals = {};
  rankedClassic.forEach(function (row) { totals[row.HLV] = Number(row.TOTAL) || 0; });
  h2h.forEach(function (row) {
    if (totals[row.HLV] !== undefined) row["Classic Total"] = totals[row.HLV];
  });
  // Official rule: H2H Pts, then the Classic total; equal on both shares a rank.
  const rankedH2H = rankRows_(h2h,
    function (a, b) { return (Number(b.Pts) || 0) - (Number(a.Pts) || 0) || (Number(b["Classic Total"]) || 0) - (Number(a["Classic Total"]) || 0); },
    function (row) { return (Number(row.Pts) || 0) + "|" + (Number(row["Classic Total"]) || 0); });

  return { classic: rankedClassic, h2h: rankedH2H, liveGw: usable ? live.gw : null, provisional: usable && !!live.isLive };
}
