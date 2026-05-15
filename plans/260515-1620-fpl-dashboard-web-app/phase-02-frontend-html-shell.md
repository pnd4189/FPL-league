---
phase: 2
title: "Frontend HTML Shell"
status: completed
priority: P1
effort: "1h"
dependencies: [1]
---

# Phase 2: Frontend HTML Shell

## Overview

Tạo `Index.html` - HTML shell cho dashboard. Chứa layout structure, tab navigation, status cards, và content containers.

## Requirements

- Functional:
  - Header với tên mùa giải
  - 4 status cards (GW, Last refresh, Trigger, Teams)
  - Tab navigation: H2H, Classic, Tháng, Tổng kết, Pool giải
  - Content containers cho mỗi tab
  - Loading/error/empty states
  - Footer
- Non-functional:
  - Semantic HTML5
  - Accessible (ARIA labels)
  - Mobile-first structure

## Architecture

```
Index.html
├── <header> - Logo + season title
├── <section#status-cards> - 4 cards grid
├── <nav#tabs> - 5 tab buttons
├── <main#content>
│   ├── <div#tab-h2h> - H2H standings + matches
│   ├── <div#tab-classic> - Classic standings
│   ├── <div#tab-monthly> - Monthly dropdown + tables
│   ├── <div#tab-summary> - Tổng kết giải
│   └── <div#tab-pool> - Pool giải
├── <div#loading> - Loading spinner
├── <div#error> - Error message
└── <footer> - Copyright
```

## Related Code Files

- Create: `appscript/Index.html`

## Implementation Steps

### 2.1 HTML skeleton

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <base target="_top">
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>HTCV FPL Dashboard</title>
  <?!= include('Styles'); ?>
</head>
<body>
  <!-- Header -->
  <header id="header">
    <h1>HTCV FPL <span id="season-label"></span></h1>
  </header>

  <!-- Status Cards -->
  <section id="status-cards" class="cards-grid">
    <div class="card" id="card-gw">
      <span class="card-label">Gameweek</span>
      <span class="card-value" id="val-gw">--</span>
    </div>
    <div class="card" id="card-refresh">
      <span class="card-label">Cập nhật</span>
      <span class="card-value" id="val-refresh">--</span>
    </div>
    <div class="card" id="card-trigger">
      <span class="card-label">Trigger</span>
      <span class="card-value" id="val-trigger">--</span>
    </div>
    <div class="card" id="card-teams">
      <span class="card-label">Teams</span>
      <span class="card-value" id="val-teams">--</span>
    </div>
  </section>

  <!-- Tab Navigation -->
  <nav id="tabs" role="tablist">
    <button class="tab active" data-tab="h2h" role="tab">H2H</button>
    <button class="tab" data-tab="classic" role="tab">Classic</button>
    <button class="tab" data-tab="monthly" role="tab">Tháng</button>
    <button class="tab" data-tab="summary" role="tab">Tổng kết</button>
    <button class="tab" data-tab="pool" role="tab">Pool giải</button>
  </nav>

  <!-- Content -->
  <main id="content">
    <div id="tab-h2h" class="tab-panel active" role="tabpanel">
      <div id="h2h-standings"></div>
      <div id="h2h-matches">
        <div class="filters">
          <select id="filter-gw"><option value="">Tất cả vòng</option></select>
          <select id="filter-manager"><option value="">Tất cả đội</option></select>
        </div>
        <div id="h2h-matches-table"></div>
      </div>
    </div>

    <div id="tab-classic" class="tab-panel" role="tabpanel">
      <div id="classic-standings"></div>
    </div>

    <div id="tab-monthly" class="tab-panel" role="tabpanel">
      <select id="month-select">
        <option value="">Chọn tháng</option>
      </select>
      <div id="monthly-data"></div>
    </div>

    <div id="tab-summary" class="tab-panel" role="tabpanel">
      <div id="summary-individual-classic"></div>
      <div id="summary-individual-h2h"></div>
      <div id="summary-weekly"></div>
    </div>

    <div id="tab-pool" class="tab-panel" role="tabpanel">
      <div id="pool-data"></div>
    </div>
  </main>

  <!-- States -->
  <div id="loading" class="state hidden">
    <div class="spinner"></div>
    <p>Đang tải dữ liệu...</p>
  </div>

  <div id="error" class="state hidden">
    <p id="error-msg"></p>
    <button onclick="App.retry()">Thử lại</button>
  </div>

  <div id="empty" class="state hidden">
    <p>Không có dữ liệu</p>
  </div>

  <!-- Footer -->
  <footer>
    <p>HTCV FPL Dashboard &copy; 2025-2026</p>
  </footer>

  <?!= include('Client'); ?>
</body>
</html>
```

### 2.2 Apps Script HTML includes

Trong `Code.gs`, thêm helper function:
```javascript
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
```

### 2.3 Tab switching logic (inline hoặc trong Client.html)

```javascript
document.querySelectorAll('.tab').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var tab = this.dataset.tab;
    // Remove active from all tabs
    document.querySelectorAll('.tab').forEach(function(t) {
      t.classList.remove('active');
    });
    document.querySelectorAll('.tab-panel').forEach(function(p) {
      p.classList.remove('active');
    });
    // Activate selected
    this.classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
  });
});
```

## Success Criteria

- [ ] HTML renders correctly in Apps Script sandbox
- [ ] 5 tabs switch properly
- [ ] Status cards have placeholder values
- [ ] Loading/error/empty states exist
- [ ] Mobile layout works (single column)
- [ ] `<?!= include('Styles'); ?>` and `<?!= include('Client'); ?>` work

## Risk Assessment

- **Risk:** Apps Script HTML sandbox has restrictions (no external CSS/JS)
- **Mitigation:** All CSS/JS embedded via `include()` from separate .html files

## Next Steps

- Phase 3: Styles CSS
- Phase 4: Client JavaScript
