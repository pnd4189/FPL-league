/**
 * DataProcessor.gs — Process FPL data and write to sheets
 * HTCV FPL 2026-2027
 *
 * Everything written here is settled data. In-play gameweek points are served
 * separately by Live.gs and merged by the website, so a running gameweek never
 * triggers spreadsheet writes.
 */

// Column layout of "🏅 Classic BXH": rank, manager, GW1..GW38, total, avg, best
const CLASSIC_TOTAL_INDEX = 40;

// ============================================================
// 1. FANTASY DATA — Fetch all player GW histories
// ============================================================
function refreshFantasyData() {
  const sheet = getSheet("FantasyData");
  if (!sheet) return 0;

  logStatus("Starting refreshFantasyData");

  const currentGw = getCurrentGameweek();
  if (!currentGw) {
    logStatus("refreshFantasyData aborted: cannot resolve current gameweek.");
    return 0;
  }

  const players = getActivePlayers();
  const allData = [];
  const failed = [];

  for (const player of players) {
    const history = fetchEntryHistory(player.id);
    if (!history || !history.current) {
      failed.push(player.manager);
      continue;
    }

    for (const gw of history.current) {
      allData.push([
        player.id,
        gw.event,
        gw.points,
        gw.points_on_bench,
        gw.rank,
        gw.event_transfers,
        gw.event_transfers_cost,
        gw.total_points,
        gw.overall_rank,
        gw.value / 10,
        gw.active_chip || "",
        gw.points - gw.event_transfers_cost  // Net points
      ]);
    }
  }

  // Partial results used to wipe the sheet and silently drop managers whose
  // fetch failed. Only overwrite when every manager was retrieved.
  if (failed.length > 0) {
    logStatus("refreshFantasyData aborted: fetch failed for " + failed.join(", ") + " — sheet left untouched.");
    return 0;
  }

  if (allData.length > 0) {
    clearAndWrite_(sheet, allData);
  }

  logStatus("refreshFantasyData done: " + allData.length + " rows, latestGW=" + currentGw);
  return allData.length;
}

/** Replace every data row (keeping the header) with the supplied matrix. */
function clearAndWrite_(sheet, rows) {
  const lastRow = sheet.getLastRow();
  const width = rows[0].length;
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, Math.max(width, sheet.getLastColumn())).clearContent();
  }
  sheet.getRange(2, 1, rows.length, width).setValues(rows);
}

// ============================================================
// 2. H2H MATCHES — Fetch H2H match results incrementally
// ============================================================
function refreshH2HMatches() {
  const sheet = getSheet("LichThiDauLeague");
  if (!sheet) return 0;

  logStatus("Starting refreshH2HMatches");

  const state = getSeasonState();
  if (!state) return 0;
  const currentGw = state.displayGw;

  // Finished gameweeks never change, so keep the rows already stored and only
  // fetch what is new. Without this the job refetched all 38 gameweeks daily.
  const finishedGwIds = {};
  for (const event of state.events) {
    if (event.finished && event.dataChecked) finishedGwIds[event.id] = true;
  }

  const existing = sheet.getDataRange().getValues();
  const storedByGw = {};
  for (let i = 1; i < existing.length; i++) {
    const gw = existing[i][0];
    if (!gw) continue;
    if (!storedByGw[gw]) storedByGw[gw] = [];
    storedByGw[gw].push(existing[i]);
  }

  const allMatches = [];
  let fetchedGws = 0;

  for (let gw = 1; gw <= currentGw; gw++) {
    if (finishedGwIds[gw] && storedByGw[gw] && storedByGw[gw].length > 0) {
      for (const row of storedByGw[gw]) allMatches.push(row);
      continue;
    }

    const data = fetchH2HMatches(CONFIG.H2H_LEAGUE_ID, gw);
    if (!data || !data.results) {
      // Keep whatever we already had rather than losing the gameweek.
      if (storedByGw[gw]) for (const row of storedByGw[gw]) allMatches.push(row);
      continue;
    }
    fetchedGws++;

    for (const m of data.results) {
      const homeWin = m.entry_1_points > m.entry_2_points;
      const draw = m.entry_1_points === m.entry_2_points;
      const result = homeWin ? "Thắng" : (draw ? "Hòa" : "Thua");

      allMatches.push([
        gw,
        m.id,
        getManagerName(m.entry_1_entry, m.entry_1_player_name) + " (" + m.entry_1_name + ")",
        m.entry_1_points,
        homeWin ? 3 : (draw ? 1 : 0),
        getManagerName(m.entry_2_entry, m.entry_2_player_name) + " (" + m.entry_2_name + ")",
        m.entry_2_points,
        homeWin ? 0 : (draw ? 1 : 3),
        result,
        "",
        Math.abs(m.entry_1_points - m.entry_2_points),
        m.entry_1_entry,
        m.entry_2_entry,
        new Date()
      ]);
    }
  }

  if (allMatches.length > 0) {
    clearAndWrite_(sheet, allMatches);
  }

  logStatus("refreshH2HMatches done: " + allMatches.length + " rows (" + fetchedGws + " GW fetched)");
  return allMatches.length;
}

// ============================================================
// 3. CLASSIC BXH — Build full GW1-38 matrix from FantasyData
// ============================================================
function updateClassicStandings() {
  const sheet = getSheet("🏅 Classic BXH");
  if (!sheet) return;

  logStatus("Starting updateClassicStandings");

  const fdSheet = getSheet("FantasyData");
  if (!fdSheet) return;

  const fdData = fdSheet.getDataRange().getValues();
  if (fdData.length <= 1) {
    logStatus("updateClassicStandings skipped: FantasyData empty");
    return;
  }

  // Build lookup: playerId → { gw → netPoints }
  const playerScores = {};
  for (let i = 1; i < fdData.length; i++) {
    const id = String(fdData[i][0]);
    const gw = fdData[i][1];
    const netPts = fdData[i][11]; // Column L = Net Points

    if (!playerScores[id]) playerScores[id] = {};
    playerScores[id][gw] = netPts;
  }

  const rows = [];
  for (const player of getActivePlayers()) {
    const scores = playerScores[String(player.id)] || {};
    let total = 0;
    let best = 0;
    let gwCount = 0;
    const gwScores = [];

    for (let gw = 1; gw <= 38; gw++) {
      const pts = scores[gw] === undefined ? "" : scores[gw];
      gwScores.push(pts);
      if (pts !== "") {
        total += pts;
        best = Math.max(best, pts);
        gwCount++;
      }
    }

    const avg = gwCount > 0 ? Math.round(total / gwCount * 10) / 10 : 0;
    rows.push([0, player.manager].concat(gwScores, [total, avg, best]));
  }

  rows.sort(function (a, b) { return (b[CLASSIC_TOTAL_INDEX] || 0) - (a[CLASSIC_TOTAL_INDEX] || 0); });
  assignRanks_(rows, CLASSIC_TOTAL_INDEX);

  if (rows.length > 0) {
    clearAndWrite_(sheet, rows);
  }

  logStatus("updateClassicStandings done: " + rows.length + " players");
}

/**
 * Write ranks into column 0, giving managers on the same total the same rank.
 * Season prize money is paid on the top three, so ties must be visible.
 */
function assignRanks_(rows, totalIndex) {
  let rank = 0;
  let previousTotal = null;
  for (let i = 0; i < rows.length; i++) {
    const total = rows[i][totalIndex];
    if (previousTotal === null || total !== previousTotal) rank = i + 1;
    rows[i][0] = rank;
    previousTotal = total;
  }
}

// ============================================================
// 4. H2H BXH — Build league table from API standings
// ============================================================
function updateH2HStandings() {
  const sheet = getSheet("⚔️ H2H BXH");
  if (!sheet) return;

  logStatus("Starting updateH2HStandings");
  const data = fetchH2HStandings(CONFIG.H2H_LEAGUE_ID);

  if (!data || !data.standings || !data.standings.results) {
    logStatus("updateH2HStandings skipped: no standings returned");
    return;
  }

  const results = data.standings.results;
  const writeData = [];

  for (const r of results) {
    writeData.push([
      r.rank,
      // The API returns the real FPL account name ("Dung Pham"); the website
      // matches rows by league nickname, so translate it here.
      getManagerName(r.entry, r.player_name),
      r.matches_played,
      r.matches_won,
      r.matches_drawn,
      r.matches_lost,
      r.points_for,
      r.points_against,
      r.points_for - r.points_against,
      r.total,
      r.points_for  // Classic Total (approx, can be overridden)
    ]);
  }

  if (writeData.length > 0) {
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 11).clearContent();
    }
    sheet.getRange(2, 1, writeData.length, 11).setValues(writeData);
  }
  logStatus("updateH2HStandings done: " + writeData.length + " rows");
}

// ============================================================
// 5. WEEKLY WINNERS — Determine highest scorer each GW
// ============================================================
function updateWeeklyWinners() {
  const sheet = getSheet("🏆 Weekly Winners");
  if (!sheet) return;

  logStatus("Starting updateWeeklyWinners");

  const fdSheet = getSheet("FantasyData");
  if (!fdSheet) return;

  const fdData = fdSheet.getDataRange().getValues();
  if (fdData.length <= 1) {
    logStatus("updateWeeklyWinners skipped: FantasyData empty");
    return;
  }

  // Build lookup: gw → [{ manager, pts }]
  const gwScores = {};
  for (let i = 1; i < fdData.length; i++) {
    const id = String(fdData[i][0]);
    const gw = fdData[i][1];
    const netPts = fdData[i][11];

    if (!gwScores[gw]) gwScores[gw] = [];
    gwScores[gw].push({ manager: getManagerName(id, id), pts: netPts });
  }

  // Columns G/H hold manually maintained payment tracking — read them back so
  // the refresh does not wipe what the treasurer entered.
  const existing = sheet.getDataRange().getValues();
  const paidByGw = {};
  for (let i = 1; i < existing.length; i++) {
    const gw = existing[i][0];
    if (gw) paidByGw[gw] = [existing[i][6] || "", existing[i][7] || ""];
  }

  const rows = [];
  for (let gw = 1; gw <= 38; gw++) {
    const paid = paidByGw[gw] || ["", ""];

    if (!gwScores[gw] || gwScores[gw].length === 0) {
      rows.push([gw, "", "", "", "", CONFIG.FEE.WEEKLY_WINNER, paid[0], paid[1]]);
      continue;
    }

    const ranked = gwScores[gw].slice().sort(function (a, b) { return b.pts - a.pts; });
    const topScore = ranked[0].pts;
    const winners = ranked.filter(function (r) { return r.pts === topScore; });
    const runnersUp = ranked.filter(function (r) { return r.pts < topScore; });
    const secondScore = runnersUp.length ? runnersUp[0].pts : null;

    rows.push([
      gw,
      // A tie means shared prize money; list every winner instead of silently
      // picking whoever happens to sort first.
      winners.map(function (w) { return w.manager; }).join(" & "),
      topScore,
      secondScore === null ? "" : runnersUp.filter(function (r) { return r.pts === secondScore; })
        .map(function (r) { return r.manager; }).join(" & "),
      secondScore === null ? "" : secondScore,
      CONFIG.FEE.WEEKLY_WINNER,
      paid[0],
      paid[1]
    ]);
  }

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 8).clearContent();
  }
  sheet.getRange(2, 1, rows.length, 8).setValues(rows);

  logStatus("updateWeeklyWinners done");
}

// ============================================================
// 6. MONTHLY AWARDS — Best Classic + H2H player per month
// ============================================================
function updateMonthlyAwards() {
  const sheet = getSheet("📅 Monthly Awards");
  if (!sheet) return;

  logStatus("Starting updateMonthlyAwards");

  const fdSheet = getSheet("FantasyData");
  const fdData = fdSheet ? fdSheet.getDataRange().getValues() : [];

  // Build lookup: playerId → gw → netPts. Stays empty before the season
  // starts, which only blanks the winners — the month labels below still get
  // written so the sheet never shows a stale gameweek range.
  const playerGW = {};
  for (let i = 1; i < fdData.length; i++) {
    const id = String(fdData[i][0]);
    if (!playerGW[id]) playerGW[id] = {};
    playerGW[id][fdData[i][1]] = fdData[i][11];
  }

  // Build lookups: playerId → gw → h2h points (3/1/0), match points for,
  // and match points against. The latter two feed the H2H monthly
  // tiebreak (GD, then GF) mirroring the website's provisional table.
  const h2hSheet = getSheet("LichThiDauLeague");
  const h2hData = h2hSheet ? h2hSheet.getDataRange().getValues() : [];
  const playerH2H = {};
  const playerH2HGF = {};
  const playerH2HGA = {};
  for (let i = 1; i < h2hData.length; i++) {
    const gw = h2hData[i][0];
    const homeId = String(h2hData[i][11]);
    const awayId = String(h2hData[i][12]);

    if (!playerH2H[homeId]) {
      playerH2H[homeId] = {};
      playerH2HGF[homeId] = {};
      playerH2HGA[homeId] = {};
    }
    if (!playerH2H[awayId]) {
      playerH2H[awayId] = {};
      playerH2HGF[awayId] = {};
      playerH2HGA[awayId] = {};
    }
    playerH2H[homeId][gw] = (playerH2H[homeId][gw] || 0) + h2hData[i][4];
    playerH2H[awayId][gw] = (playerH2H[awayId][gw] || 0) + h2hData[i][7];
    playerH2HGF[homeId][gw] = (playerH2HGF[homeId][gw] || 0) + h2hData[i][3];
    playerH2HGA[homeId][gw] = (playerH2HGA[homeId][gw] || 0) + h2hData[i][6];
    playerH2HGF[awayId][gw] = (playerH2HGF[awayId][gw] || 0) + h2hData[i][6];
    playerH2HGA[awayId][gw] = (playerH2HGA[awayId][gw] || 0) + h2hData[i][3];
  }

  // Preserve the manually maintained payment columns I/J.
  const existing = sheet.getDataRange().getValues();
  const buckets = getMonthBuckets();
  const players = getActivePlayers();
  const rows = [];

  for (let m = 0; m < buckets.length; m++) {
    const bucket = buckets[m];
    const previous = existing[m + 1] || [];
    const classicBest = pickMonthlyBest_(players, bucket.gws, playerGW);
    const h2hBest = pickMonthlyH2HBest_(players, bucket.gws, playerH2H, playerH2HGF, playerH2HGA, playerGW);

    rows.push([
      bucket.label,
      classicBest.managers.join(" & "),
      classicBest.managers.length ? classicBest.pts : "",
      h2hBest.managers.join(" & "),
      h2hBest.managers.length ? h2hBest.pts : "",
      classicBest.managers.length ? CONFIG.FEE.MONTHLY_CLASSIC_WINNER : "",
      h2hBest.managers.length ? CONFIG.FEE.MONTHLY_H2H_WINNER : "",
      previous[8] || "",  // Paid Classic?
      previous[9] || ""   // Paid H2H?
    ]);
  }

  // Column B carries the GW range label, which moves whenever the fixture
  // calendar shifts, so it is written from the same source as the totals.
  sheet.getRange(2, 2, rows.length, 9).setValues(rows);

  logStatus("updateMonthlyAwards done for " + rows.length + " months");
}

/**
 * Highest scorer of a month across the supplied gameweeks.
 * @return {{managers: string[], pts: number}} every manager on the top score
 */
function pickMonthlyBest_(players, gws, lookup) {
  let bestPts = null;
  let managers = [];

  for (const player of players) {
    const scores = lookup[String(player.id)];
    if (!scores) continue;

    let total = 0;
    let hasData = false;
    for (const gw of gws) {
      if (scores[gw] !== undefined) {
        total += scores[gw];
        hasData = true;
      }
    }
    if (!hasData) continue;

    if (bestPts === null || total > bestPts) {
      bestPts = total;
      managers = [player.manager];
    } else if (total === bestPts) {
      managers.push(player.manager);
    }
  }

  return { managers: managers, pts: bestPts === null ? 0 : bestPts };
}

/**
 * Monthly H2H champion ranked by 1. H2H points, 2. goal difference
 * (match points for − against), 3. match points for, 4. month classic
 * total — the same rule the website's provisional H2H table shows.
 * Joint winners only when all four criteria are exactly equal.
 * @param {Object} h2hPtsLookup  playerId → gw → h2h points (3/1/0)
 * @param {Object} gfLookup      playerId → gw → match points scored
 * @param {Object} gaLookup      playerId → gw → match points conceded
 * @param {Object} classicLookup playerId → gw → net classic points
 * @return {{managers: string[], pts: number}}
 */
function pickMonthlyH2HBest_(players, gws, h2hPtsLookup, gfLookup, gaLookup, classicLookup) {
  let bestKey = null;
  let bestPts = 0;
  let managers = [];

  for (const player of players) {
    const ptsByGw = h2hPtsLookup[String(player.id)];
    if (!ptsByGw) continue;

    const gfByGw = gfLookup[String(player.id)] || {};
    const gaByGw = gaLookup[String(player.id)] || {};
    const classicByGw = classicLookup[String(player.id)] || {};

    let h2hPts = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    let classicPts = 0;
    let hasData = false;
    for (const gw of gws) {
      if (ptsByGw[gw] !== undefined) {
        h2hPts += ptsByGw[gw];
        hasData = true;
      }
      if (gfByGw[gw] !== undefined) goalsFor += gfByGw[gw];
      if (gaByGw[gw] !== undefined) goalsAgainst += gaByGw[gw];
      if (classicByGw[gw] !== undefined) classicPts += classicByGw[gw];
    }
    if (!hasData) continue;

    const key = [h2hPts, goalsFor - goalsAgainst, goalsFor, classicPts];
    let cmp = 0;
    if (bestKey === null) {
      cmp = 1;
    } else {
      for (let k = 0; k < key.length && cmp === 0; k++) cmp = key[k] - bestKey[k];
    }

    if (cmp > 0) {
      bestKey = key;
      bestPts = h2hPts;
      managers = [player.manager];
    } else if (cmp === 0) {
      managers.push(player.manager);
    }
  }

  return { managers: managers, pts: bestKey === null ? 0 : bestPts };
}

// ============================================================
// 7. DASHBOARD — Populate summary stats
// ============================================================
function updateDashboard() {
  const sheet = getSheet("📊 Dashboard");
  if (!sheet) return;

  logStatus("Starting updateDashboard");

  const state = getSeasonState();

  const classicSheet = getSheet("🏅 Classic BXH");
  const classicData = classicSheet ? classicSheet.getDataRange().getValues() : [];

  const h2hSheet = getSheet("⚔️ H2H BXH");
  const h2hData = h2hSheet ? h2hSheet.getDataRange().getValues() : [];

  const wwSheet = getSheet("🏆 Weekly Winners");
  const wwData = wwSheet ? wwSheet.getDataRange().getValues() : [];

  // Leave the previous value in place when the API is unreachable rather than
  // downgrading a live gameweek to "Pre-season".
  if (state) {
    sheet.getRange("B4").setValue(state.isPreSeason ? "Pre-season" : state.displayGw);
    sheet.getRange("B5").setValue(state.finishedGws);
  }

  // Top 5 of each table, written as two blocks instead of 20 single writes.
  writeTopFive_(sheet, classicData, 2, 1, CLASSIC_TOTAL_INDEX);
  writeTopFive_(sheet, h2hData, 5, 1, 9);

  // Latest weekly winner
  let latestWW = null;
  for (let i = wwData.length - 1; i >= 1; i--) {
    if (wwData[i][1] !== "") {
      latestWW = wwData[i];
      break;
    }
  }
  if (latestWW) {
    sheet.getRange("B17:B19").setValues([["GW" + latestWW[0]], [latestWW[1]], [latestWW[2]]]);
  }

  sheet.getRange("B27").setValue(new Date());

  logStatus("updateDashboard done");
}

/** Write the first five rows of a standings table into a dashboard block. */
function writeTopFive_(sheet, data, startColumn, nameIndex, valueIndex) {
  const block = [];
  for (let i = 0; i < 5; i++) {
    const row = data[i + 1];
    block.push(row ? [row[nameIndex] || "", row[valueIndex] === undefined ? "" : row[valueIndex]] : ["", ""]);
  }
  sheet.getRange(10, startColumn, 5, 2).setValues(block);
}

// ============================================================
// 8. MONTHLY SHEETS — Populate Tháng 8-5 with GW details
// ============================================================
function updateMonthlySheets() {
  logStatus("Starting updateMonthlySheets");

  const fdSheet = getSheet("FantasyData");
  if (!fdSheet) return;

  const fdData = fdSheet.getDataRange().getValues();

  // Headers are derived from the calendar, so they are refreshed even with no
  // scores yet; the score cells simply stay blank.
  const playerGW = {};
  for (let i = 1; i < fdData.length; i++) {
    const id = String(fdData[i][0]);
    if (!playerGW[id]) playerGW[id] = {};
    playerGW[id][fdData[i][1]] = fdData[i][11];
  }

  const players = getActivePlayers();

  for (const bucket of getMonthBuckets()) {
    const sheet = getSheet(bucket.name);
    if (!sheet) continue;

    const header = ["HLV"].concat(bucket.gws.map(function (gw) { return "GW" + gw; }), ["Total"]);

    const rows = [];
    for (const player of players) {
      const scores = playerGW[String(player.id)] || {};
      const row = [player.manager];
      let total = 0;
      for (const gw of bucket.gws) {
        const pts = scores[gw] === undefined ? "" : scores[gw];
        row.push(pts);
        if (pts !== "") total += pts;
      }
      row.push(total);
      rows.push(row);
    }

    rows.sort(function (a, b) { return (b[b.length - 1] || 0) - (a[a.length - 1] || 0); });

    // The gameweek count per month changes with the calendar, so clear any
    // columns left over from a previous, longer month before rewriting.
    const lastRow = sheet.getLastRow();
    const lastColumn = Math.max(sheet.getLastColumn(), header.length);
    if (lastRow > 0) {
      sheet.getRange(1, 1, lastRow, lastColumn).clearContent();
    }
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, header.length).setValues(rows);
    }
  }

  logStatus("updateMonthlySheets done");
}
