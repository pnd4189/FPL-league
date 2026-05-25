/**
 * HTCV FPL 2025-2026 Automation
 * Sheets DB + Apps Script backend + Web Dashboard
 *
 * @OnlyCurrentDoc
 */

/** =========================
 *  GLOBAL CONFIG
 *  ========================= */

var HTCV = {
  CONFIG_SHEET: 'FPL_Config',
  STATUS_SHEET: 'FPL_Status',
  API_LOG_SHEET: 'FPL_API_Log',

  DEFAULTS: {
    LEAGUE_ID: 148110,
    SEASON: '2025-2026',
    FIRST_GW: 1,
    LAST_GW_CAP: 38,
    REFRESH_MODE: 'ALL_GW_UP_TO_LATEST',

    INFO_SHEET: 'Info',
    FANTASYDATA_SHEET: 'FantasyData',
    H2H_MATCHES_SHEET: 'LichThiDauLeague',
    TEAM_H2H_BY_GW_SHEET: 'TeamH2HByGameweek',
    STATUS_SHEET: 'FPL_Status',
    API_LOG_SHEET: 'FPL_API_Log',

    TEAM_IDS_SOURCE: 'Info!A2:A13',
    TRIGGER_INTERVAL_HOURS: 12,

    BOOTSTRAP_ENDPOINT: 'https://fantasy.premierleague.com/api/bootstrap-static/',
    FIXTURES_ENDPOINT: 'https://fantasy.premierleague.com/api/fixtures/'
  },

  WEB_ALLOWED_SHEETS: [
    'Giải Team',
    'Tổng kết giải',
    'Tháng 8',
    'Tháng 9',
    'Tháng 10',
    'Tháng 11',
    'Tháng 12',
    'Tháng 1',
    'Tháng 2',
    'Tháng 3',
    'Tháng 4',
    'Tháng 5',
    'FPL_Status'
  ]
};

var HTCV_API_LOG_BUFFER = [];


/** =========================
 *  HTML INCLUDE HELPER (NEW)
 *  ========================= */

var INCLUDE_WHITELIST_ = ['Index', 'Styles', 'Client'];

function include(filename) {
  if (INCLUDE_WHITELIST_.indexOf(filename) === -1) {
    return '<!-- blocked -->';
  }
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}


/** =========================
 *  MENU
 *  ========================= */

function onOpen() {
  var ui = SpreadsheetApp.getUi();

  ui.createMenu('HTCV FPL Tools')
    .addItem('Refresh All Data Now', 'refreshFPLAll')
    .addSeparator()
    .addItem('Setup / Reinstall Auto Refresh', 'setupFPLAutomation')
    .addSubMenu(
      ui.createMenu('Auto refresh interval')
        .addItem('Every 1 hour', 'setTriggerEvery1Hour')
        .addItem('Every 2 hours', 'setTriggerEvery2Hours')
        .addItem('Every 4 hours', 'setTriggerEvery4Hours')
        .addItem('Every 6 hours', 'setTriggerEvery6Hours')
        .addItem('Every 8 hours', 'setTriggerEvery8Hours')
        .addItem('Every 12 hours', 'setTriggerEvery12Hours')
    )
    .addItem('Stop Auto Refresh', 'removeFPLRefreshTriggers')
    .addSeparator()
    .addItem('Open Status Sheet', 'openFPLStatus')
    .addItem('Open API Log Sheet', 'openFPLApiLog')
    .addToUi();
}


/** =========================
 *  MAIN SETUP / REFRESH
 *  ========================= */

function setupFPLAutomation() {
  ensureBaseSheets_();

  var hours = Number(getConfigValue_('TRIGGER_INTERVAL_HOURS', HTCV.DEFAULTS.TRIGGER_INTERVAL_HOURS));
  hours = normalizeTriggerHours_(hours);

  installFPLRefreshTrigger_(hours);

  refreshFPLAll();

  alertSafe_(
    'Setup hoàn tất',
    'Đã cài auto refresh mỗi ' + hours + ' giờ và đã refresh dữ liệu ngay.'
  );
}

function refreshFPLAll() {
  var lock = LockService.getDocumentLock();

  if (!lock.tryLock(30000)) {
    ensureBaseSheets_();
    appendStatusLog_('refreshFPLAll', 'Skipped', '', 0, 'Another refresh is already running');
    return;
  }

  try {
    ensureBaseSheets_();
    resetApiLog_();

    var cfg = getConfig_();
    var teamIds = getTeamIds_(cfg.TEAM_IDS_SOURCE);

    if (!teamIds.length) {
      throw new Error('Không tìm thấy team IDs tại ' + cfg.TEAM_IDS_SOURCE);
    }

    var bootstrap = fetchJson_(cfg.BOOTSTRAP_ENDPOINT);
    var latestGw = getLatestGw_(bootstrap, cfg.LAST_GW_CAP);
    latestGw = Math.max(cfg.FIRST_GW, Math.min(latestGw, cfg.LAST_GW_CAP));

    logApi_(
      'Bootstrap',
      'bootstrap-static',
      200,
      bootstrap && bootstrap.events ? bootstrap.events.length : 0,
      'OK',
      'Latest GW detected: ' + latestGw
    );

    var fantasyResult = fetchFantasyData_(teamIds, cfg, latestGw);
    writeFantasyData_(fantasyResult.rows, cfg.FANTASYDATA_SHEET);

    var h2hResult = fetchH2HMatches_(
      cfg.LEAGUE_ID,
      cfg.FIRST_GW,
      latestGw,
      fantasyResult.actualMap
    );
    writeH2HMatches_(h2hResult.rows, cfg.H2H_MATCHES_SHEET);

    var teamH2HRows = buildTeamH2HByGameweek_(
      h2hResult.rows,
      fantasyResult.rows,
      cfg.INFO_SHEET
    );
    writeTeamH2HByGameweek_(teamH2HRows, cfg.TEAM_H2H_BY_GW_SHEET);
    var monthlySummaryCells = syncMonthlyTeamSummaries_(
      teamH2HRows,
      fantasyResult.rows,
      cfg.INFO_SHEET
    );

    flushApiLog_();

    updateRefreshSummary_({
      status: 'Success',
      latestGw: latestGw,
      fantasyRows: fantasyResult.rows.length,
      h2hRows: h2hResult.rows.length,
      message: 'FantasyData, H2H matches, and team summaries refreshed; monthly summary cells updated: ' + monthlySummaryCells
    });

    appendStatusLog_(
      'refreshFPLAll',
      'Success',
      latestGw,
      fantasyResult.rows.length + h2hResult.rows.length + teamH2HRows.length,
      'FantasyData, H2H matches, and team summaries refreshed; monthly summary cells updated: ' + monthlySummaryCells
    );

    SpreadsheetApp.flush();

  } catch (err) {
    logApi_('Script', 'refreshFPLAll', '', 0, 'ERROR', err.message);
    flushApiLog_();

    updateRefreshSummary_({
      status: 'Error',
      latestGw: '',
      fantasyRows: '',
      h2hRows: '',
      message: err.message
    });

    appendStatusLog_('refreshFPLAll', 'Error', '', 0, err.message);

    throw err;

  } finally {
    lock.releaseLock();
  }
}


/** =========================
 *  FANTASYDATA FETCH
 *  ========================= */

function fetchFantasyData_(teamIds, cfg, latestGw) {
  var rows = [];
  var actualMap = {};

  teamIds.forEach(function(entryId) {
    var url = 'https://fantasy.premierleague.com/api/entry/' + entryId + '/history/';
    var data = fetchJson_(url);

    var current = data.current || [];
    var chips = data.chips || [];
    var chipByEvent = {};

    chips.forEach(function(chip) {
      chipByEvent[Number(chip.event)] = chip.name || chip.chip_name || '';
    });

    var count = 0;

    current.forEach(function(gw) {
      var eventId = Number(gw.event);

      if (!eventId || eventId > latestGw) return;

      var points = numberOrZero_(gw.points);
      var transferCost = numberOrZero_(gw.event_transfers_cost);
      var actualPoints = points - transferCost;

      rows.push([
        entryId,
        eventId,
        points,
        gw.points_on_bench,
        gw.rank,
        gw.event_transfers,
        transferCost,
        gw.total_points,
        gw.overall_rank,
        gw.value !== null && gw.value !== undefined ? gw.value / 10 : '',
        chipByEvent[eventId] || '',
        actualPoints
      ]);

      actualMap[String(entryId) + '|' + String(eventId)] = actualPoints;
      count++;
    });

    logApi_('FantasyData', entryId, 200, count, 'OK', 'Entry history fetched');

    Utilities.sleep(120);
  });

  return {
    rows: rows,
    actualMap: actualMap
  };
}

function writeFantasyData_(rows, sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ensureSheet_(sheetName);

  sheet.clearContents();

  var headers = [
    'ID Đội',
    'Tên Gameweek',
    'Điểm Gameweek',
    'Điểm Dự Bị',
    'Hạng Gameweek',
    'Số Lượt Chuyển Nhượng',
    'Chi Phí Chuyển Nhượng',
    'Tổng Điểm',
    'Hạng Tổng',
    'Giá Trị Đội Hình ($M)',
    'Chip Đã Dùng',
    'Điểm Thực Tế'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBackground('#1D2330')
    .setFontColor('#FFFFFF');

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}


/** =========================
 *  H2H MATCHES FETCH
 *  ========================= */

function fetchH2HMatches_(leagueId, firstGw, latestGw, actualMap) {
  var rows = [];
  var updatedAt = new Date();

  for (var gw = firstGw; gw <= latestGw; gw++) {
    var page = 1;
    var hasMore = true;

    while (hasMore) {
      var url =
        'https://fantasy.premierleague.com/api/leagues-h2h-matches/league/' +
        leagueId +
        '/?page=' +
        page +
        '&event=' +
        gw;

      var data = fetchJson_(url);
      var results = data.results || [];

      results.forEach(function(match) {
        var entry1Id = getMatchEntryId_(match, 1);
        var entry2Id = getMatchEntryId_(match, 2);

        var score1 = getActualScoreForMatch_(actualMap, entry1Id, gw, match.entry_1_points);
        var score2 = getActualScoreForMatch_(actualMap, entry2Id, gw, match.entry_2_points);

        var h2h1 = '';
        var h2h2 = '';
        var homeResult = 'Chưa đá/Đang đá';
        var diffHome = '';

        if (isRealNumber_(score1) && isRealNumber_(score2)) {
          diffHome = score1 - score2;

          if (score1 > score2) {
            h2h1 = 3;
            h2h2 = 0;
            homeResult = 'Thắng';
          } else if (score1 < score2) {
            h2h1 = 0;
            h2h2 = 3;
            homeResult = 'Thua';
          } else {
            h2h1 = 1;
            h2h2 = 1;
            homeResult = 'Hòa';
          }
        }

        rows.push([
          gw,
          match.id || '',
          formatEntryName_(match, 1),
          score1,
          h2h1,
          formatEntryName_(match, 2),
          score2,
          h2h2,
          homeResult,
          match.kickoff_time ? new Date(match.kickoff_time) : '',
          diffHome,
          entry1Id,
          entry2Id,
          updatedAt
        ]);
      });

      logApi_(
        'H2HMatches',
        'GW ' + gw + ' page ' + page,
        200,
        results.length,
        'OK',
        ''
      );

      hasMore = Boolean(data.has_next);
      page++;

      Utilities.sleep(160);
    }
  }

  return {
    rows: rows
  };
}

function writeH2HMatches_(rows, sheetName) {
  var sheet = ensureSheet_(sheetName);

  sheet.clearContents();

  var headers = [
    'Gameweek',
    'ID Trận Đấu',
    'Đội Nhà (HLV)',
    'Điểm GW Đội Nhà',
    'Điểm H2H Đội Nhà',
    'Đội Khách (HLV)',
    'Điểm GW Đội Khách',
    'Điểm H2H Đội Khách',
    'Kết Quả Đội Nhà',
    'Ngày Đá (Dự kiến)',
    'Hiệu Số Đội Nhà',
    'ID Đội Nhà',
    'ID Đội Khách',
    'Last Updated'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBackground('#1D2330')
    .setFontColor('#FFFFFF');

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}


/** =========================
 *  TEAM-LEVEL H2H
 *  ========================= */

function buildTeamH2HByGameweek_(matchRows, fantasyRows, infoSheetName) {
  var entryTeamMap = getEntryTeamMap_(infoSheetName);
  var teamScoresByGw = buildTeamScoresByGw_(fantasyRows, entryTeamMap);
  var pairByGw = {};
  var updatedAt = new Date();

  matchRows.forEach(function(row) {
    var gw = Number(row[0]);
    var entry1Id = String(row[11] || '').trim();
    var entry2Id = String(row[12] || '').trim();
    var team1 = entryTeamMap[entry1Id];
    var team2 = entryTeamMap[entry2Id];

    if (!gw || !team1 || !team2 || team1.key === team2.key) return;

    var ordered = [team1, team2].sort(function(a, b) {
      return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    });
    var pairKey = gw + '|' + ordered[0].key + '|' + ordered[1].key;

    if (!pairByGw[pairKey]) {
      pairByGw[pairKey] = {
        gw: gw,
        teamA: ordered[0],
        teamB: ordered[1],
        kickoff: row[9] || ''
      };
    }
  });

  var rows = [];
  Object.keys(pairByGw).forEach(function(pairKey) {
    var pair = pairByGw[pairKey];
    var scoreA = getTeamGwScore_(teamScoresByGw, pair.gw, pair.teamA.key);
    var scoreB = getTeamGwScore_(teamScoresByGw, pair.gw, pair.teamB.key);

    if (!isRealNumber_(scoreA) || !isRealNumber_(scoreB)) return;

    appendTeamH2HRows_(rows, pair.gw, pair.teamA, pair.teamB, scoreA, scoreB, pair.kickoff, updatedAt);
  });

  rows.sort(function(a, b) {
    if (a[0] !== b[0]) return a[0] - b[0];
    return String(a[1]).localeCompare(String(b[1]));
  });

  return rows;
}

function appendTeamH2HRows_(rows, gw, teamA, teamB, scoreA, scoreB, kickoff, updatedAt) {
  var diffA = scoreA - scoreB;
  var h2hA = diffA > 0 ? 3 : diffA < 0 ? 0 : 1;
  var h2hB = diffA > 0 ? 0 : diffA < 0 ? 3 : 1;

  rows.push([
    gw,
    teamA.name,
    teamB.name,
    scoreA,
    scoreB,
    diffA,
    h2hA,
    getTeamH2HResult_(h2hA),
    kickoff,
    updatedAt
  ]);

  rows.push([
    gw,
    teamB.name,
    teamA.name,
    scoreB,
    scoreA,
    -diffA,
    h2hB,
    getTeamH2HResult_(h2hB),
    kickoff,
    updatedAt
  ]);
}

function getTeamH2HResult_(h2hPoints) {
  if (h2hPoints === 3) return 'Thắng';
  if (h2hPoints === 1) return 'Hòa';
  return 'Thua';
}

function buildTeamScoresByGw_(fantasyRows, entryTeamMap) {
  var scores = {};

  fantasyRows.forEach(function(row) {
    var entryId = String(row[0] || '').trim();
    var gw = Number(row[1]);
    var actualPoints = Number(row[11]);
    var team = entryTeamMap[entryId];

    if (!team || !gw || isNaN(actualPoints)) return;

    if (!scores[gw]) scores[gw] = {};
    if (!scores[gw][team.key]) scores[gw][team.key] = 0;

    scores[gw][team.key] += actualPoints;
  });

  return scores;
}

function getTeamGwScore_(teamScoresByGw, gw, teamKey) {
  if (!teamScoresByGw[gw] || !teamScoresByGw[gw].hasOwnProperty(teamKey)) {
    return '';
  }
  return teamScoresByGw[gw][teamKey];
}

function getEntryTeamMap_(infoSheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(infoSheetName);
  if (!sheet) throw new Error('Không tìm thấy sheet: ' + infoSheetName);

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) throw new Error('Sheet Info chưa có dữ liệu team');

  var headers = values[0].map(function(value) { return normalizeHeader_(value); });
  var entryIdCol = findHeaderColumn_(headers, ['id', 'id doi', 'entry id'], 0);
  var teamCol = findHeaderColumn_(headers, ['team', 'group', 'nhom'], 3);
  var map = {};

  for (var i = 1; i < values.length; i++) {
    var entryId = String(values[i][entryIdCol] || '').trim();
    var teamName = String(values[i][teamCol] || '').trim();

    if (!entryId || !teamName || isNaN(Number(entryId))) continue;

    map[entryId] = {
      key: normalizeTeamKey_(teamName),
      name: teamName
    };
  }

  if (!Object.keys(map).length) {
    throw new Error('Không đọc được mapping ID đội -> team từ sheet Info');
  }

  return map;
}

function findHeaderColumn_(headers, names, fallbackIndex) {
  for (var i = 0; i < headers.length; i++) {
    if (names.indexOf(headers[i]) !== -1) return i;
  }
  return fallbackIndex;
}

function normalizeHeader_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[đ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeTeamKey_(value) {
  return normalizeHeader_(value);
}

function writeTeamH2HByGameweek_(rows, sheetName) {
  var sheet = ensureSheet_(sheetName);

  sheet.clearContents();

  var headers = [
    'Gameweek',
    'Team',
    'Opponent',
    'Team GW Score',
    'Opponent GW Score',
    'Score Diff',
    'H2H Points',
    'Result',
    'Kickoff Time',
    'Last Updated'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBackground('#1D2330')
    .setFontColor('#FFFFFF');

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function syncMonthlyTeamSummaries_(teamH2HRows, fantasyRows, infoSheetName) {
  var entryTeamMap = getEntryTeamMap_(infoSheetName);
  var teamsByKey = getTeamsByKey_(entryTeamMap);
  var teamScoresByGw = buildTeamScoresByGw_(fantasyRows, entryTeamMap);
  var monthly = buildMonthlyTeamH2H_(teamH2HRows, teamsByKey);
  var updatedCells = 0;

  SpreadsheetApp.getActiveSpreadsheet().getSheets().forEach(function(sheet) {
    var month = parseMonthSheetName_(sheet.getName());
    if (!month || !monthly[month]) return;

    updatedCells += writeMonthlySummaryTables_(
      sheet,
      monthly[month],
      teamScoresByGw,
      teamsByKey
    );
  });

  return updatedCells;
}

function buildMonthlyTeamH2H_(teamH2HRows, teamsByKey) {
  var monthly = {};

  teamH2HRows.forEach(function(row) {
    var month = getMonthFromDateValue_(row[8]);
    var gw = Number(row[0]);
    var teamName = String(row[1] || '').trim();
    var teamKey = normalizeTeamKey_(teamName);
    var h2hPoints = Number(row[6]);
    var diff = Number(row[5]) || 0;

    if (!month || !gw || !teamKey || isNaN(h2hPoints)) return;

    if (!monthly[month]) {
      monthly[month] = {
        gwSet: {},
        h2hByTeam: {},
        diffByTeam: {}
      };
    }

    if (!teamsByKey[teamKey]) {
      teamsByKey[teamKey] = { key: teamKey, name: teamName };
    }

    monthly[month].gwSet[gw] = true;
    if (!monthly[month].h2hByTeam[teamKey]) monthly[month].h2hByTeam[teamKey] = {};
    if (!monthly[month].diffByTeam[teamKey]) monthly[month].diffByTeam[teamKey] = {};

    monthly[month].h2hByTeam[teamKey][gw] = h2hPoints;
    monthly[month].diffByTeam[teamKey][gw] = diff;
  });

  return monthly;
}

function writeMonthlySummaryTables_(sheet, monthData, teamScoresByGw, teamsByKey) {
  var gwList = Object.keys(monthData.gwSet).map(function(gw) {
    return Number(gw);
  }).sort(function(a, b) { return a - b; });

  if (!gwList.length) return 0;

  var classicRows = buildMonthlyTeamRows_(gwList, teamsByKey, function(teamKey, gw) {
    return getTeamGwScore_(teamScoresByGw, gw, teamKey);
  });
  var h2hRows = buildMonthlyTeamRows_(gwList, teamsByKey, function(teamKey, gw) {
    return getNestedNumber_(monthData.h2hByTeam, teamKey, gw);
  }, function(teamKey) {
    return sumTeamGwValues_(gwList, monthData.diffByTeam, teamKey);
  });
  var diffRows = buildMonthlyTeamRows_(gwList, teamsByKey, function(teamKey, gw) {
    return getNestedNumber_(monthData.diffByTeam, teamKey, gw);
  });

  var updated = 0;
  updated += writeMonthlySummaryTable_(sheet, 1, 'CLASSIC', gwList, classicRows, 'Tổng Classic', '');
  updated += writeMonthlySummaryTable_(sheet, 9, 'H2H', gwList, h2hRows, 'Tổng H2H', 'Hiệu số');
  updated += writeMonthlySummaryTable_(sheet, 17, 'HIỆU SỐ', gwList, diffRows, 'Hiệu số', '');

  return updated;
}

function buildMonthlyTeamRows_(gwList, teamsByKey, valueGetter, extraGetter) {
  var rows = [];

  Object.keys(teamsByKey).forEach(function(teamKey) {
    var team = teamsByKey[teamKey];
    var total = 0;
    var valuesByGw = {};

    gwList.forEach(function(gw) {
      var value = valueGetter(teamKey, gw);
      valuesByGw[gw] = value;
      if (isRealNumber_(value)) total += Number(value);
    });

    rows.push({
      key: teamKey,
      name: team.name,
      valuesByGw: valuesByGw,
      total: total,
      extra: extraGetter ? extraGetter(teamKey) : ''
    });
  });

  rows.sort(function(a, b) {
    if (b.total !== a.total) return b.total - a.total;
    if (isRealNumber_(b.extra) && isRealNumber_(a.extra) && Number(b.extra) !== Number(a.extra)) {
      return Number(b.extra) - Number(a.extra);
    }
    return a.name.localeCompare(b.name);
  });

  return rows;
}

function writeMonthlySummaryTable_(sheet, startRow, title, gwList, rows, totalHeader, extraHeader) {
  var startCol = 13; // M
  var width = 8;
  var gwColumns = gwList.slice(0, extraHeader ? 4 : 5);
  var hasExtra = Boolean(extraHeader) && gwColumns.length <= 4;
  var values = [];
  var titleRow = ['', title];
  var headerRow = ['Xếp hạng', 'Tên đội'];

  gwColumns.forEach(function(gw) {
    titleRow.push(gw);
    headerRow.push('GW' + gw);
  });

  headerRow.push(totalHeader);
  titleRow.push('');

  if (hasExtra) {
    headerRow.push(extraHeader);
    titleRow.push('');
  }

  while (titleRow.length < width) titleRow.push('');
  while (headerRow.length < width) headerRow.push('');

  values.push(titleRow.slice(0, width));
  values.push(headerRow.slice(0, width));

  rows.slice(0, 4).forEach(function(team, index) {
    var row = [index + 1, team.name];

    gwColumns.forEach(function(gw) {
      row.push(team.valuesByGw.hasOwnProperty(gw) ? team.valuesByGw[gw] : '');
    });

    row.push(team.total);

    if (hasExtra) {
      row.push(team.extra);
    }

    while (row.length < width) row.push('');
    values.push(row.slice(0, width));
  });

  while (values.length < 6) {
    values.push(['', '', '', '', '', '', '', '']);
  }

  sheet.getRange(startRow, startCol, values.length, width).setValues(values);
  sheet.getRange(startRow, startCol, 1, width)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBackground('#FFF200');
  sheet.getRange(startRow + 1, startCol, 1, width)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBackground('#D9E2F3');

  return rows.length * gwColumns.length;
}

function getTeamsByKey_(entryTeamMap) {
  var teamsByKey = {};

  Object.keys(entryTeamMap).forEach(function(entryId) {
    var team = entryTeamMap[entryId];
    if (!teamsByKey[team.key]) {
      teamsByKey[team.key] = {
        key: team.key,
        name: team.name
      };
    }
  });

  return teamsByKey;
}

function getNestedNumber_(data, teamKey, gw) {
  if (!data[teamKey] || !data[teamKey].hasOwnProperty(gw)) return '';
  return data[teamKey][gw];
}

function sumTeamGwValues_(gwList, data, teamKey) {
  var total = 0;

  gwList.forEach(function(gw) {
    var value = getNestedNumber_(data, teamKey, gw);
    if (isRealNumber_(value)) total += Number(value);
  });

  return total;
}

function parseMonthSheetName_(sheetName) {
  var match = String(sheetName || '').match(/^Tháng (\d+)$/);
  if (!match) return 0;
  return Number(match[1]);
}

function getMonthFromDateValue_(value) {
  if (!value) return 0;

  var date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return 0;

  return date.getMonth() + 1;
}

function getMatchEntryId_(match, side) {
  return (
    match['entry_' + side + '_entry'] ||
    match['entry_' + side + '_id'] ||
    match['entry_' + side] ||
    ''
  );
}

function getActualScoreForMatch_(actualMap, entryId, gw, fallbackScore) {
  var key = String(entryId) + '|' + String(gw);

  if (entryId && actualMap.hasOwnProperty(key)) {
    return actualMap[key];
  }

  if (fallbackScore === null || fallbackScore === undefined || fallbackScore === '') {
    return '';
  }

  return Number(fallbackScore);
}

function formatEntryName_(match, side) {
  var teamName = match['entry_' + side + '_name'] || '';
  var playerName = match['entry_' + side + '_player_name'] || '';

  if (teamName && playerName) return teamName + ' (' + playerName + ')';
  return teamName || playerName || '';
}


/** =========================
 *  TRIGGERS
 *  ========================= */

function setTriggerEvery1Hour() { setTriggerIntervalAndInstall_(1); }
function setTriggerEvery2Hours() { setTriggerIntervalAndInstall_(2); }
function setTriggerEvery4Hours() { setTriggerIntervalAndInstall_(4); }
function setTriggerEvery6Hours() { setTriggerIntervalAndInstall_(6); }
function setTriggerEvery8Hours() { setTriggerIntervalAndInstall_(8); }
function setTriggerEvery12Hours() { setTriggerIntervalAndInstall_(12); }

function setTriggerIntervalAndInstall_(hours) {
  hours = normalizeTriggerHours_(hours);

  ensureBaseSheets_();
  setConfigValue_('TRIGGER_INTERVAL_HOURS', hours);
  installFPLRefreshTrigger_(hours);

  alertSafe_(
    'Auto refresh updated',
    'Đã cài trigger refreshFPLAll() mỗi ' + hours + ' giờ.'
  );
}

function installFPLRefreshTrigger_(hours) {
  hours = normalizeTriggerHours_(hours);

  var removed = removeFPLRefreshTriggers_();

  ScriptApp.newTrigger('refreshFPLAll')
    .timeBased()
    .everyHours(hours)
    .create();

  updateStatusCell_('Trigger status', '1 active trigger(s), every ' + hours + ' hours');

  appendStatusLog_(
    'refreshFPLAll',
    'Installed',
    '',
    0,
    'Trigger installed: refreshFPLAll() every ' + hours + ' hours; removed old triggers: ' + removed
  );
}

function removeFPLRefreshTriggers() {
  ensureBaseSheets_();

  var removed = removeFPLRefreshTriggers_();

  updateStatusCell_('Trigger status', '0 active trigger(s)');

  appendStatusLog_(
    'refreshFPLAll',
    'Triggers removed',
    '',
    0,
    'All refreshFPLAll triggers removed: ' + removed
  );

  alertSafe_(
    'Auto refresh stopped',
    'Đã xoá ' + removed + ' trigger refreshFPLAll().'
  );
}

function removeFPLRefreshTriggers_() {
  var triggers = ScriptApp.getProjectTriggers();
  var removed = 0;

  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'refreshFPLAll') {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  });

  return removed;
}

function normalizeTriggerHours_(hours) {
  var allowed = [1, 2, 4, 6, 8, 12];

  hours = Number(hours);

  if (allowed.indexOf(hours) === -1) return HTCV.DEFAULTS.TRIGGER_INTERVAL_HOURS;
  return hours;
}


/** =========================
 *  WEB APP (MERGED: HTML + JSON API)
 *  ========================= */

function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};
  var action = String(params.action || '').toLowerCase();

  // Serve HTML dashboard when no action param
  if (!action) {
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('HTCV FPL Dashboard')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // JSON API routes
  try {
    ensureBaseSheets_();

    if (action === 'status') {
      return jsonOutput_(getStatusPayload_());
    }
    if (action === 'sheets') {
      return jsonOutput_({ ok: true, sheets: HTCV.WEB_ALLOWED_SHEETS });
    }
    if (action === 'range') {
      return jsonOutput_(getRangePayload_(params.sheet, params.range));
    }
    if (action === 'dashboard') {
      return jsonOutput_(getDashboardPayload_());
    }
    if (action === 'monthly') {
      return jsonOutput_(getMonthlyPayload_(params.month));
    }
    if (action === 'pool') {
      return jsonOutput_(getPoolPayload_());
    }

    return jsonOutput_({ ok: false, error: 'Unsupported action: ' + action });

  } catch (err) {
    return jsonOutput_({ ok: false, error: err.message });
  }
}

function getStatusPayload_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HTCV.STATUS_SHEET);
  var payload = {
    ok: true,
    status: {}
  };

  if (!sheet) return payload;

  var values = sheet.getRange('A1:B10').getDisplayValues();

  values.forEach(function(row) {
    var key = row[0];
    var value = row[1];

    if (key) payload.status[key] = value;
  });

  return payload;
}

function getRangePayload_(sheetName, rangeA1) {
  if (!sheetName) throw new Error('Missing sheet parameter');

  if (HTCV.WEB_ALLOWED_SHEETS.indexOf(sheetName) === -1) {
    throw new Error('Sheet is not allowed for web API: ' + sheetName);
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  if (!sheet) throw new Error('Sheet not found: ' + sheetName);

  var range = rangeA1 ? sheet.getRange(rangeA1) : sheet.getDataRange();
  var cellCount = range.getNumRows() * range.getNumColumns();

  if (cellCount > 5000) {
    throw new Error('Range too large. Limit is 5,000 cells per request.');
  }

  return {
    ok: true,
    sheet: sheetName,
    range: range.getA1Notation(),
    values: range.getDisplayValues()
  };
}

function getDashboardPayload_() {
  var sheets = HTCV.WEB_ALLOWED_SHEETS;
  var months = [];
  for (var i = 0; i < sheets.length; i++) {
    var match = sheets[i].match(/^Tháng (\d+)$/);
    if (match) months.push(parseInt(match[1], 10));
  }
  months.sort(function(a, b) { return a - b; });

  return {
    ok: true,
    season: getConfigValue_('SEASON', HTCV.DEFAULTS.SEASON),
    status: getStatusPayload_().status,
    info: safeRangeMatrix_('Info', 'A1:F13'),
    teamH2H: safeRangeMatrix_('Giải Team', 'K1:R5'),
    teamClassic: safeRangeMatrix_('Giải Team', 'K8:O12'),
    individualClassic: safeRangeMatrix_('Tổng kết giải', 'A1:M15'),
    individualH2H: safeRangeMatrix_('Tổng kết giải', 'A16:M29'),
    weeklyPrizes: safeRangeMatrix_('Tổng kết giải', 'A30:M70'),
    h2hMatches: safeRangeMatrix_('LichThiDauLeague', 'A1:N300'),
    months: months
  };
}

function getMonthlyPayload_(month) {
  var sheetName = 'Tháng ' + month;
  if (HTCV.WEB_ALLOWED_SHEETS.indexOf(sheetName) === -1) {
    return { ok: false, error: 'Không tìm thấy sheet: ' + sheetName };
  }
  return {
    ok: true,
    month: month,
    data: safeRangeMatrix_(sheetName, 'A1:Z20')
  };
}

function getPoolPayload_() {
  return {
    ok: true,
    pool: safeRangeMatrix_('Pool giải', 'A1:Z20')
  };
}

function safeRangeMatrix_(sheetName, rangeA1) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) return [];

    return sheet.getRange(rangeA1).getDisplayValues();

  } catch (err) {
    return [];
  }
}

function jsonOutput_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}


/** =========================
 *  CONFIG / STATUS / LOG SHEETS
 *  ========================= */

function ensureBaseSheets_() {
  ensureConfigSheet_();
  ensureStatusSheet_();
  ensureApiLogSheet_();
}

function ensureConfigSheet_() {
  var sheet = ensureSheet_(HTCV.CONFIG_SHEET);

  if (sheet.getLastRow() === 0) {
    sheet.getRange('A1').setValue('HTCV FPL 2025-2026 | Config & Refresh Control');
  }

  var existing = sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 1), 1)
    .getValues()
    .map(function(row) { return row[0]; });

  if (existing.indexOf('Key') === -1) {
    sheet.getRange('A3:D3').setValues([['Key', 'Value', 'Notes', 'Editable?']]);
  }

  var rows = [
    ['LEAGUE_ID', HTCV.DEFAULTS.LEAGUE_ID, 'FPL H2H league id', 'Yes'],
    ['SEASON', HTCV.DEFAULTS.SEASON, 'Display / log label', 'Yes'],
    ['FIRST_GW', HTCV.DEFAULTS.FIRST_GW, 'First gameweek to fetch', 'Yes'],
    ['LAST_GW_CAP', HTCV.DEFAULTS.LAST_GW_CAP, 'Maximum gameweek in season', 'Yes'],
    ['REFRESH_MODE', HTCV.DEFAULTS.REFRESH_MODE, 'Refresh all completed/current GWs', 'Yes'],
    ['INFO_SHEET', HTCV.DEFAULTS.INFO_SHEET, 'Team / manager mapping', 'No'],
    ['FANTASYDATA_SHEET', HTCV.DEFAULTS.FANTASYDATA_SHEET, 'Entry GW history source sheet', 'No'],
    ['H2H_MATCHES_SHEET', HTCV.DEFAULTS.H2H_MATCHES_SHEET, 'Normalized all-GW H2H match table', 'No'],
    ['TEAM_H2H_BY_GW_SHEET', HTCV.DEFAULTS.TEAM_H2H_BY_GW_SHEET, 'Team-level H2H points by gameweek', 'No'],
    ['STATUS_SHEET', HTCV.DEFAULTS.STATUS_SHEET, 'Refresh status and log output', 'No'],
    ['API_LOG_SHEET', HTCV.DEFAULTS.API_LOG_SHEET, 'HTTP/API diagnostics', 'No'],
    ['TEAM_IDS_SOURCE', HTCV.DEFAULTS.TEAM_IDS_SOURCE, 'IDs are read dynamically from Info', 'Yes'],
    ['BOOTSTRAP_ENDPOINT', HTCV.DEFAULTS.BOOTSTRAP_ENDPOINT, 'Gameweek metadata / deadlines', 'No'],
    ['FIXTURES_ENDPOINT', HTCV.DEFAULTS.FIXTURES_ENDPOINT, 'Premier League fixture metadata', 'No'],
    ['TRIGGER_INTERVAL_HOURS', HTCV.DEFAULTS.TRIGGER_INTERVAL_HOURS, 'Default auto refresh interval in hours', 'Yes']
  ];

  rows.forEach(function(row) {
    upsertConfigRow_(row[0], row[1], row[2], row[3]);
  });

  sheet.getRange('A1:D1')
    .setFontWeight('bold')
    .setBackground('#1D2330')
    .setFontColor('#FFFFFF');

  sheet.getRange('A3:D3')
    .setFontWeight('bold')
    .setBackground('#E2E3E5');

  sheet.autoResizeColumns(1, 4);
}

function upsertConfigRow_(key, defaultValue, notes, editable) {
  var sheet = ensureSheet_(HTCV.CONFIG_SHEET);
  var lastRow = Math.max(sheet.getLastRow(), 1);
  var values = sheet.getRange(1, 1, lastRow, 1).getValues();

  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === key) {
      if (sheet.getRange(i + 1, 2).getValue() === '') {
        sheet.getRange(i + 1, 2).setValue(defaultValue);
      }

      sheet.getRange(i + 1, 3).setValue(notes);
      sheet.getRange(i + 1, 4).setValue(editable);
      return;
    }
  }

  sheet.appendRow([key, defaultValue, notes, editable]);
}

function ensureStatusSheet_() {
  var sheet = ensureSheet_(HTCV.STATUS_SHEET);

  if (sheet.getLastRow() === 0) {
    sheet.getRange('A1').setValue('HTCV FPL 2025-2026 | Refresh Status');
  }

  var topRows = [
    ['Last refresh', ''],
    ['Last status', 'Not run'],
    ['Latest GW detected', ''],
    ['FantasyData rows', ''],
    ['H2H match rows', ''],
    ['Trigger status', ''],
    ['Message', '']
  ];

  if (sheet.getRange('A3').getValue() !== 'Last refresh') {
    sheet.getRange(3, 1, topRows.length, 2).setValues(topRows);
  }

  if (sheet.getRange('A11').getValue() !== 'Timestamp') {
    sheet.getRange('A11:F11').setValues([[
      'Timestamp',
      'Function',
      'Status',
      'Latest GW',
      'Rows written',
      'Message'
    ]]);
  }

  sheet.getRange('A1:F1')
    .setFontWeight('bold')
    .setBackground('#1D2330')
    .setFontColor('#FFFFFF');

  sheet.getRange('A11:F11')
    .setFontWeight('bold')
    .setBackground('#E2E3E5');

  sheet.autoResizeColumns(1, 6);
}

function ensureApiLogSheet_() {
  var sheet = ensureSheet_(HTCV.API_LOG_SHEET);

  if (sheet.getLastRow() === 0 || sheet.getRange('A1').getValue() !== 'Timestamp') {
    sheet.clearContents();
    sheet.getRange('A1:G1').setValues([[
      'Timestamp',
      'Endpoint Type',
      'URL / Event',
      'HTTP Code',
      'Rows',
      'Status',
      'Message'
    ]]);
  }

  sheet.getRange('A1:G1')
    .setFontWeight('bold')
    .setBackground('#1D2330')
    .setFontColor('#FFFFFF');

  sheet.setFrozenRows(1);
}

function resetApiLog_() {
  HTCV_API_LOG_BUFFER = [];

  var sheet = ensureSheet_(HTCV.API_LOG_SHEET);
  sheet.clearContents();

  sheet.getRange('A1:G1').setValues([[
    'Timestamp',
    'Endpoint Type',
    'URL / Event',
    'HTTP Code',
    'Rows',
    'Status',
    'Message'
  ]]);

  sheet.getRange('A1:G1')
    .setFontWeight('bold')
    .setBackground('#1D2330')
    .setFontColor('#FFFFFF');

  sheet.setFrozenRows(1);
}

function logApi_(endpointType, urlOrEvent, httpCode, rows, status, message) {
  HTCV_API_LOG_BUFFER.push([
    new Date(),
    endpointType,
    String(urlOrEvent),
    httpCode,
    rows,
    status,
    message || ''
  ]);
}

function flushApiLog_() {
  if (!HTCV_API_LOG_BUFFER.length) return;

  var sheet = ensureSheet_(HTCV.API_LOG_SHEET);
  var startRow = sheet.getLastRow() + 1;

  sheet.getRange(startRow, 1, HTCV_API_LOG_BUFFER.length, 7)
    .setValues(HTCV_API_LOG_BUFFER);

  sheet.autoResizeColumns(1, 7);

  HTCV_API_LOG_BUFFER = [];
}

function updateRefreshSummary_(summary) {
  updateStatusCell_('Last refresh', new Date());
  updateStatusCell_('Last status', summary.status);
  updateStatusCell_('Latest GW detected', summary.latestGw);
  updateStatusCell_('FantasyData rows', summary.fantasyRows);
  updateStatusCell_('H2H match rows', summary.h2hRows);
  updateStatusCell_('Message', summary.message);
}

function updateStatusCell_(label, value) {
  var sheet = ensureSheet_(HTCV.STATUS_SHEET);
  var lastRow = Math.max(sheet.getLastRow(), 1);
  var labels = sheet.getRange(1, 1, lastRow, 1).getValues();

  for (var i = 0; i < labels.length; i++) {
    if (labels[i][0] === label) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
}

function appendStatusLog_(fn, status, latestGw, rows, message) {
  var sheet = ensureSheet_(HTCV.STATUS_SHEET);

  if (sheet.getRange('A11').getValue() !== 'Timestamp') {
    sheet.getRange('A11:F11').setValues([[
      'Timestamp',
      'Function',
      'Status',
      'Latest GW',
      'Rows written',
      'Message'
    ]]);
  }

  sheet.appendRow([
    new Date(),
    fn,
    status,
    latestGw,
    rows,
    message
  ]);

  sheet.autoResizeColumns(1, 6);
}


/** =========================
 *  CONFIG READERS
 *  ========================= */

function getConfig_() {
  return {
    LEAGUE_ID: Number(getConfigValue_('LEAGUE_ID', HTCV.DEFAULTS.LEAGUE_ID)),
    SEASON: String(getConfigValue_('SEASON', HTCV.DEFAULTS.SEASON)),
    FIRST_GW: Number(getConfigValue_('FIRST_GW', HTCV.DEFAULTS.FIRST_GW)),
    LAST_GW_CAP: Number(getConfigValue_('LAST_GW_CAP', HTCV.DEFAULTS.LAST_GW_CAP)),
    REFRESH_MODE: String(getConfigValue_('REFRESH_MODE', HTCV.DEFAULTS.REFRESH_MODE)),

    INFO_SHEET: String(getConfigValue_('INFO_SHEET', HTCV.DEFAULTS.INFO_SHEET)),
    FANTASYDATA_SHEET: String(getConfigValue_('FANTASYDATA_SHEET', HTCV.DEFAULTS.FANTASYDATA_SHEET)),
    H2H_MATCHES_SHEET: String(getConfigValue_('H2H_MATCHES_SHEET', HTCV.DEFAULTS.H2H_MATCHES_SHEET)),
    TEAM_H2H_BY_GW_SHEET: String(getConfigValue_('TEAM_H2H_BY_GW_SHEET', HTCV.DEFAULTS.TEAM_H2H_BY_GW_SHEET)),
    STATUS_SHEET: String(getConfigValue_('STATUS_SHEET', HTCV.DEFAULTS.STATUS_SHEET)),
    API_LOG_SHEET: String(getConfigValue_('API_LOG_SHEET', HTCV.DEFAULTS.API_LOG_SHEET)),

    TEAM_IDS_SOURCE: String(getConfigValue_('TEAM_IDS_SOURCE', HTCV.DEFAULTS.TEAM_IDS_SOURCE)),
    TRIGGER_INTERVAL_HOURS: Number(getConfigValue_('TRIGGER_INTERVAL_HOURS', HTCV.DEFAULTS.TRIGGER_INTERVAL_HOURS)),

    BOOTSTRAP_ENDPOINT: String(getConfigValue_('BOOTSTRAP_ENDPOINT', HTCV.DEFAULTS.BOOTSTRAP_ENDPOINT)),
    FIXTURES_ENDPOINT: String(getConfigValue_('FIXTURES_ENDPOINT', HTCV.DEFAULTS.FIXTURES_ENDPOINT))
  };
}

function getConfigValue_(key, defaultValue) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HTCV.CONFIG_SHEET);

  if (!sheet) return defaultValue;

  var lastRow = Math.max(sheet.getLastRow(), 1);
  var values = sheet.getRange(1, 1, lastRow, 2).getValues();

  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === key) {
      return values[i][1] !== '' ? values[i][1] : defaultValue;
    }
  }

  return defaultValue;
}

function setConfigValue_(key, value) {
  var sheet = ensureSheet_(HTCV.CONFIG_SHEET);
  var lastRow = Math.max(sheet.getLastRow(), 1);
  var values = sheet.getRange(1, 1, lastRow, 1).getValues();

  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }

  sheet.appendRow([key, value, 'Auto-created config value', 'Yes']);
}

function getTeamIds_(sourceA1) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var parts = String(sourceA1).split('!');

  if (parts.length !== 2) {
    throw new Error('TEAM_IDS_SOURCE không hợp lệ: ' + sourceA1);
  }

  var sheetName = parts[0].replace(/^'/, '').replace(/'$/, '');
  var rangeA1 = parts[1];
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) throw new Error('Không tìm thấy sheet: ' + sheetName);

  return sheet.getRange(rangeA1)
    .getValues()
    .flat()
    .map(function(v) { return String(v).trim(); })
    .filter(function(v) { return v !== '' && !isNaN(Number(v)); })
    .map(function(v) { return Number(v); });
}


/** =========================
 *  FPL API HELPERS
 *  ========================= */

function fetchJson_(url) {
  var response = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; HTCV-FPL-GoogleAppsScript)'
    }
  });

  var code = response.getResponseCode();
  var text = response.getContentText();

  if (code !== 200) {
    logApi_('HTTP', url, code, 0, 'ERROR', text.substring(0, 300));
    throw new Error('FPL API error ' + code + ': ' + url);
  }

  try {
    return JSON.parse(text);

  } catch (err) {
    logApi_('HTTP', url, code, 0, 'ERROR', 'JSON parse error: ' + err.message);
    throw err;
  }
}

function getLatestGw_(bootstrap, lastGwCap) {
  var events = bootstrap && bootstrap.events ? bootstrap.events : [];
  var latest = 0;

  events.forEach(function(event) {
    var id = Number(event.id);

    if (!id) return;

    if (event.finished || event.data_checked || event.is_current) {
      latest = Math.max(latest, id);
    }
  });

  if (!latest) {
    var now = new Date();

    events.forEach(function(event) {
      var id = Number(event.id);
      var deadline = event.deadline_time ? new Date(event.deadline_time) : null;

      if (id && deadline && deadline <= now) {
        latest = Math.max(latest, id);
      }
    });
  }

  if (!latest) latest = HTCV.DEFAULTS.FIRST_GW;

  return Math.min(latest, Number(lastGwCap || HTCV.DEFAULTS.LAST_GW_CAP));
}


/** =========================
 *  SHEET NAVIGATION
 *  ========================= */

function openFPLStatus() {
  activateSheet_(HTCV.STATUS_SHEET);
}

function openFPLApiLog() {
  activateSheet_(HTCV.API_LOG_SHEET);
}

function activateSheet_(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  if (sheet) {
    sheet.activate();
  }
}


/** =========================
 *  UTILITIES
 *  ========================= */

function ensureSheet_(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  return sheet;
}

function numberOrZero_(value) {
  var n = Number(value);

  if (isNaN(n)) return 0;
  return n;
}

function isRealNumber_(value) {
  return value !== '' && value !== null && value !== undefined && !isNaN(Number(value));
}

function alertSafe_(title, message) {
  try {
    SpreadsheetApp.getUi().alert(title, message, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (err) {
    // Do nothing for time-driven trigger context.
  }
}
