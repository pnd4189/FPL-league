---
phase: 4
title: "Client JavaScript"
status: completed
priority: P1
effort: "3h"
dependencies: [2]
---

# Phase 4: Client JavaScript

## Overview

Tạo `Client.html` chứa toàn bộ JavaScript logic: data fetching, caching, rendering tables, tab switching, filters, loading/error states.

## Requirements

- Functional:
  - Fetch dashboard data từ `?action=dashboard`
  - Fetch monthly data từ `?action=monthly&month=N`
  - Fetch pool data từ `?action=pool`
  - Cache client-side 5 phút
  - Render H2H standings table
  - Render Classic standings table
  - Render H2H matches với dropdown filters (GW, Manager)
  - Render Tổng kết giải (3 bảng: individual Classic, individual H2H, weekly)
  - Render Pool giải
  - Render Monthly data theo tháng được chọn
  - Update status cards
  - Loading/error/empty state management
- Non-functional:
  - Vanilla JS (không dùng framework - Apps Script sandbox)
  - Google Apps Script `google.script.run` API

## Architecture

```
Client.html
├── Cache module (5-min TTL)
├── API module (google.script.run wrappers)
├── Render module (table builders)
│   ├── renderStatusCards()
│   ├── renderH2HStandings()
│   ├── renderH2HMatches()
│   ├── renderClassicStandings()
│   ├── renderMonthly()
│   ├── renderSummary()
│   └── renderPool()
├── Filter module (GW, Manager dropdowns)
├── State module (loading/error/empty)
└── App.init() (entry point)
```

## Related Code Files

- Create: `appscript/Client.html`

## Implementation Steps

### 4.1 Cache Module

```javascript
var Cache = {
  TTL: 5 * 60 * 1000, // 5 phút
  store: {},

  get: function(key) {
    var entry = this.store[key];
    if (entry && Date.now() - entry.ts < this.TTL) {
      return entry.val;
    }
    return null;
  },

  set: function(key, val) {
    this.store[key] = { val: val, ts: Date.now() };
  },

  clear: function() {
    this.store = {};
  }
};
```

### 4.2 API Module

```javascript
var API = {
  fetchDashboard: function(callback) {
    var cached = Cache.get('dashboard');
    if (cached) return callback(cached);

    showLoading();
    google.script.run
      .withSuccessHandler(function(data) {
        Cache.set('dashboard', data);
        hideLoading();
        callback(data);
      })
      .withFailureHandler(function(err) {
        showError('Không thể tải dữ liệu: ' + err.message);
      })
      .getDashboardPayload_();
  },

  fetchMonthly: function(month, callback) {
    var cacheKey = 'monthly-' + month;
    var cached = Cache.get(cacheKey);
    if (cached) return callback(cached);

    showLoading();
    google.script.run
      .withSuccessHandler(function(data) {
        Cache.set(cacheKey, data);
        hideLoading();
        callback(data);
      })
      .withFailureHandler(function(err) {
        showError('Không thể tải dữ liệu tháng: ' + err.message);
      })
      .getMonthlyPayload_(month);
  },

  fetchPool: function(callback) {
    var cached = Cache.get('pool');
    if (cached) return callback(cached);

    showLoading();
    google.script.run
      .withSuccessHandler(function(data) {
        Cache.set('pool', data);
        hideLoading();
        callback(data);
      })
      .withFailureHandler(function(err) {
        showError('Không thể tải Pool giải: ' + err.message);
      })
      .getPoolPayload_();
  }
};
```

### 4.3 Render Module - Helper Functions

```javascript
function buildTable(headers, rows, options) {
  options = options || {};
  var html = '<div class="table-wrap"><table class="data-table">';

  // Header
  html += '<thead><tr>';
  headers.forEach(function(h) {
    html += '<th>' + escapeHtml(h) + '</th>';
  });
  html += '</tr></thead>';

  // Body
  html += '<tbody>';
  if (rows.length === 0) {
    html += '<tr><td colspan="' + headers.length + '" style="text-align:center">Không có dữ liệu</td></tr>';
  } else {
    rows.forEach(function(row, idx) {
      html += '<tr>';
      row.forEach(function(cell) {
        html += '<td>' + escapeHtml(String(cell)) + '</td>';
      });
      html += '</tr>';
    });
  }
  html += '</tbody></table></div>';

  return html;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
```

### 4.4 Render Status Cards

```javascript
function renderStatusCards(status, season) {
  document.getElementById('season-label').textContent = season || '';

  var latestGw = status['Latest GW detected'] || '--';
  var lastRefresh = status['Last refresh'] || '--';
  var triggerStatus = status['Trigger status'] || '--';

  document.getElementById('val-gw').textContent = latestGw;
  document.getElementById('val-refresh').textContent = formatTime(lastRefresh);
  document.getElementById('val-trigger').textContent = triggerStatus.includes('active') ? 'OK' : 'Off';

  // Đếm teams từ info data
  // Sẽ set sau khi có dashboard data
}

function formatTime(timeStr) {
  if (!timeStr || timeStr === '--') return '--';
  try {
    var d = new Date(timeStr);
    var hours = Math.floor((Date.now() - d.getTime()) / 3600000);
    if (hours < 1) return 'Vừa xong';
    if (hours < 24) return hours + 'h trước';
    return Math.floor(hours / 24) + ' ngày';
  } catch (e) {
    return timeStr;
  }
}
```

### 4.5 Render H2H Standings

```javascript
function renderH2HStandings(teamH2H) {
  if (!teamH2H || teamH2H.length < 2) {
    document.getElementById('h2h-standings').innerHTML = '<p class="empty-msg">Chưa có dữ liệu H2H</p>';
    return;
  }

  var headers = ['Xếp hạng', 'Tên đội', 'Điểm H2H', 'Hiệu số', 'Thắng', 'Thua', 'Tổng Classic'];
  var rows = [];

  // teamH2H[0] là header row, từ [1] là data
  for (var i = 1; i < teamH2H.length; i++) {
    var row = teamH2H[i];
    if (row[0] && row[0].trim()) { // Có STT
      rows.push(row);
    }
  }

  var html = '<h2>Bảng xếp hạng H2H</h2>';
  html += buildTable(headers, rows);
  document.getElementById('h2h-standings').innerHTML = html;
}
```

### 4.6 Render H2H Matches với Filters

```javascript
function renderH2HMatches(matches) {
  if (!matches || matches.length < 2) {
    document.getElementById('h2h-matches-table').innerHTML = '<p class="empty-msg">Chưa có dữ liệu trận đấu</p>';
    return;
  }

  // Populate filter dropdowns
  populateGWFilter(matches);
  populateManagerFilter(matches);

  // Render table
  filterAndRenderMatches(matches);
}

function populateGWFilter(matches) {
  var gwSet = {};
  for (var i = 1; i < matches.length; i++) {
    var gw = matches[i][0]; // Cột Gameweek
    if (gw) gwSet[gw] = true;
  }

  var select = document.getElementById('filter-gw');
  select.innerHTML = '<option value="">Tất cả vòng</option>';
  Object.keys(gwSet).sort(function(a,b) { return Number(a) - Number(b); }).forEach(function(gw) {
    select.innerHTML += '<option value="' + gw + '">Vòng ' + gw + '</option>';
  });

  select.addEventListener('change', function() {
    filterAndRenderMatches(matches);
  });
}

function populateManagerFilter(matches) {
  var managerSet = {};
  for (var i = 1; i < matches.length; i++) {
    var home = matches[i][2]; // Đội Nhà
    var away = matches[i][5]; // Đội Khách
    if (home) managerSet[home] = true;
    if (away) managerSet[away] = true;
  }

  var select = document.getElementById('filter-manager');
  select.innerHTML = '<option value="">Tất cả đội</option>';
  Object.keys(managerSet).sort().forEach(function(m) {
    select.innerHTML += '<option value="' + escapeHtml(m) + '">' + escapeHtml(m) + '</option>';
  });

  select.addEventListener('change', function() {
    filterAndRenderMatches(matches);
  });
}

function filterAndRenderMatches(matches) {
  var gwFilter = document.getElementById('filter-gw').value;
  var managerFilter = document.getElementById('filter-manager').value;

  var headers = ['Vòng', 'Đội Nhà', 'Điểm', 'Điểm', 'Đội Khách', 'Kết quả'];
  var rows = [];

  for (var i = 1; i < matches.length; i++) {
    var row = matches[i];
    var gw = String(row[0]);
    var home = row[2];
    var homeScore = row[3];
    var away = row[5];
    var awayScore = row[6];
    var result = row[8];

    if (gwFilter && gw !== gwFilter) continue;
    if (managerFilter && home !== managerFilter && away !== managerFilter) continue;

    rows.push([gw, home, homeScore, awayScore, away, result]);
  }

  var html = buildTable(headers, rows);
  document.getElementById('h2h-matches-table').innerHTML = html;
}
```

### 4.7 Render Classic Standings

```javascript
function renderClassicStandings(teamClassic) {
  if (!teamClassic || teamClassic.length < 2) {
    document.getElementById('classic-standings').innerHTML = '<p class="empty-msg">Chưa có dữ liệu Classic</p>';
    return;
  }

  var headers = ['Xếp hạng', 'Tên đội', 'Điểm vòng đấu', 'Tổng Classic'];
  var rows = [];

  for (var i = 1; i < teamClassic.length; i++) {
    var row = teamClassic[i];
    if (row[0] && row[0].trim()) {
      rows.push(row);
    }
  }

  var html = '<h2>Bảng xếp hạng Classic</h2>';
  html += buildTable(headers, rows);
  document.getElementById('classic-standings').innerHTML = html;
}
```

### 4.8 Render Tổng kết giải

```javascript
function renderSummary(data) {
  // Individual Classic
  if (data.individualClassic && data.individualClassic.length > 0) {
    var html = '<h2>Giải cá nhân Classic</h2>';
    html += buildTable(data.individualClassic[0], data.individualClassic.slice(1));
    document.getElementById('summary-individual-classic').innerHTML = html;
  }

  // Individual H2H
  if (data.individualH2H && data.individualH2H.length > 0) {
    var html2 = '<h2>Giải cá nhân H2H</h2>';
    html2 += buildTable(data.individualH2H[0], data.individualH2H.slice(1));
    document.getElementById('summary-individual-h2h').innerHTML = html2;
  }

  // Weekly prizes
  if (data.weeklyPrizes && data.weeklyPrizes.length > 0) {
    var html3 = '<h2>Giải tuần</h2>';
    html3 += buildTable(data.weeklyPrizes[0], data.weeklyPrizes.slice(1));
    document.getElementById('summary-weekly').innerHTML = html3;
  }
}
```

### 4.9 Render Pool giải

```javascript
function renderPool(poolData) {
  if (!poolData || poolData.length === 0) {
    document.getElementById('pool-data').innerHTML = '<p class="empty-msg">Không có dữ liệu Pool giải</p>';
    return;
  }

  var html = '<h2>Pool giải</h2>';
  html += buildTable(poolData[0], poolData.slice(1));
  document.getElementById('pool-data').innerHTML = html;
}
```

### 4.10 Render Monthly

```javascript
function renderMonthly(data) {
  if (!data || !data.data || data.data.length === 0) {
    document.getElementById('monthly-data').innerHTML = '<p class="empty-msg">Không có dữ liệu tháng</p>';
    return;
  }

  var rows = data.data;

  // Tách bảng Classic và H2H từ monthly sheet
  // Classic: columns A-I (index 0-8)
  // H2H: columns K-R (index 10-17) approximately

  var html = '<h2>Tháng ' + data.month + '</h2>';

  // Classic table
  var classicHeaders = rows[1] ? rows[1].slice(0, 9) : [];
  var classicRows = [];
  for (var i = 2; i < rows.length; i++) {
    if (rows[i][0] && rows[i][0].trim()) {
      classicRows.push(rows[i].slice(0, 9));
    }
  }
  html += '<h3>Classic</h3>';
  html += buildTable(classicHeaders, classicRows);

  // H2H table (skip to H2H section)
  var h2hStart = -1;
  for (var j = 0; j < rows.length; j++) {
    if (rows[j][10] === 'Xếp hạng' || rows[j][11] === 'Xếp hạng') {
      h2hStart = j;
      break;
    }
  }

  if (h2hStart >= 0) {
    var h2hHeaders = rows[h2hStart].slice(10, 18);
    var h2hRows = [];
    for (var k = h2hStart + 1; k < rows.length; k++) {
      if (rows[k][10] && String(rows[k][10]).trim()) {
        h2hRows.push(rows[k].slice(10, 18));
      }
    }
    html += '<h3>H2H</h3>';
    html += buildTable(h2hHeaders, h2hRows);
  }

  document.getElementById('monthly-data').innerHTML = html;
}
```

### 4.11 State Management

```javascript
function showLoading() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('error').classList.add('hidden');
  document.getElementById('empty').classList.add('hidden');
}

function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
}

function showError(msg) {
  hideLoading();
  document.getElementById('error').classList.remove('hidden');
  document.getElementById('error-msg').textContent = msg;
}

function showEmpty() {
  hideLoading();
  document.getElementById('empty').classList.remove('hidden');
}
```

### 4.12 App Init

```javascript
var App = {
  data: null,

  init: function() {
    this.bindTabs();
    this.bindMonthSelect();
    this.loadDashboard();
  },

  bindTabs: function() {
    var self = this;
    document.querySelectorAll('.tab').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
        document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
        this.classList.add('active');
        document.getElementById('tab-' + this.dataset.tab).classList.add('active');

        // Lazy load tab data
        var tab = this.dataset.tab;
        if (tab === 'monthly' && !self.monthlyLoaded) {
          // Wait for user to select month
        } else if (tab === 'pool' && !self.poolLoaded) {
          self.loadPool();
        }
      });
    });
  },

  bindMonthSelect: function() {
    var self = this;
    var select = document.getElementById('month-select');
    var months = [8, 9, 10, 11, 12, 1, 2, 3, 4, 5];
    months.forEach(function(m) {
      var opt = document.createElement('option');
      opt.value = m;
      opt.textContent = 'Tháng ' + m;
      select.appendChild(opt);
    });

    select.addEventListener('change', function() {
      if (this.value) {
        self.loadMonthly(this.value);
      }
    });
  },

  loadDashboard: function() {
    var self = this;
    API.fetchDashboard(function(data) {
      self.data = data;
      self.renderAll(data);
    });
  },

  renderAll: function(data) {
    renderStatusCards(data.status, data.season);
    document.getElementById('val-teams').textContent = data.info ? data.info.length - 1 : '--';

    renderH2HStandings(data.teamH2H);
    renderClassicStandings(data.teamClassic);
    renderH2HMatches(data.h2hMatches);
    renderSummary(data);
  },

  loadMonthly: function(month) {
    API.fetchMonthly(month, function(data) {
      renderMonthly(data);
    });
  },

  loadPool: function() {
    var self = this;
    API.fetchPool(function(data) {
      renderPool(data);
      self.poolLoaded = true;
    });
  },

  retry: function() {
    Cache.clear();
    this.loadDashboard();
  }
};

// Start
document.addEventListener('DOMContentLoaded', function() {
  App.init();
});
```

## Success Criteria

- [ ] Dashboard load data từ `?action=dashboard` và render đầy đủ
- [ ] Status cards hiển thị GW, thời gian, trigger status
- [ ] H2H standings table hiển thị đúng
- [ ] H2H matches table với filter theo GW và Manager
- [ ] Classic standings table hiển thị đúng
- [ ] Tổng kết giải hiển thị 3 bảng (individual Classic, H2H, weekly)
- [ ] Pool giải load khi click tab
- [ ] Monthly load khi chọn tháng từ dropdown
- [ ] Cache hoạt động (không fetch lại trong 5 phút)
- [ ] Loading spinner hiển thị khi đang fetch
- [ ] Error message hiển thị khi fetch fail
- [ ] Tab switching hoạt động

## Risk Assessment

- **Risk:** `google.script.run` không khả dụng trong context test local
- **Mitigation:** Test trực tiếp trong Apps Script editor sau khi deploy

- **Risk:** Data format từ sheet có thể thay đổi giữa các mùa
- **Mitigation:** Defensive parsing - check null/empty trước khi render

## Next Steps

- Phase 5: Documentation
