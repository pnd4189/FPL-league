---
phase: 3
title: "Styles CSS"
status: completed
priority: P2
effort: "1.5h"
dependencies: [2]
---

# Phase 3: Styles CSS

## Overview

Tạo `Styles.html` chứa toàn bộ CSS cho dashboard. Light theme, mobile-first, responsive, clean table styling.

## Requirements

- Functional:
  - Light theme: bg `#f8f9fa`, cards `#fff`, accent `#1a73e8`
  - Status cards grid (4 columns desktop, 2 mobile)
  - Tab navigation bar
  - Table styling: sticky header, horizontal scroll, zebra stripes
  - Loading spinner animation
  - Error/empty state styling
  - Mobile-first responsive breakpoints
- Non-functional:
  - Không dùng external CSS libraries (Apps Script sandbox)
  - CSS chỉ trong 1 file `Styles.html`

## Architecture

```
Styles.html
├── CSS Variables (colors, spacing, typography)
├── Reset / Base styles
├── Header
├── Status Cards (.cards-grid, .card)
├── Tab Navigation (#tabs, .tab)
├── Tables (.data-table, sticky header)
├── Filters (.filters)
├- States (#loading, #error, #empty)
├── Footer
└── Responsive (@media queries)
```

## Related Code Files

- Create: `appscript/Styles.html`

## Implementation Steps

### 3.1 CSS Variables & Reset

```css
:root {
  --bg: #f8f9fa;
  --card-bg: #ffffff;
  --header-bg: #1a73e8;
  --header-text: #ffffff;
  --text: #212529;
  --text-muted: #6c757d;
  --border: #dee2e6;
  --table-header: #e9ecef;
  --accent: #1a73e8;
  --accent-hover: #1557b0;
  --success: #28a745;
  --warning: #ffc107;
  --danger: #dc3545;
  --shadow: 0 1px 3px rgba(0,0,0,0.1);
  --radius: 8px;
  --spacing: 16px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
}
```

### 3.2 Header

```css
#header {
  background: var(--header-bg);
  color: var(--header-text);
  padding: var(--spacing);
  text-align: center;
}
#header h1 { font-size: 1.25rem; font-weight: 600; }
```

### 3.3 Status Cards

```css
.cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing);
  padding: var(--spacing);
}
.card {
  background: var(--card-bg);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 12px;
  text-align: center;
}
.card-label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
}
.card-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent);
}
```

### 3.4 Tab Navigation

```css
#tabs {
  display: flex;
  overflow-x: auto;
  background: var(--card-bg);
  border-bottom: 2px solid var(--border);
  padding: 0 var(--spacing);
}
.tab {
  padding: 10px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-muted);
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
}
.tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
.tab:hover { color: var(--text); }
```

### 3.5 Tables

```css
.table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin: var(--spacing);
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  background: var(--card-bg);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}
.data-table thead {
  position: sticky;
  top: 0;
  z-index: 1;
}
.data-table th {
  background: var(--table-header);
  font-weight: 600;
  text-align: left;
  padding: 10px 12px;
  white-space: nowrap;
}
.data-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}
.data-table tbody tr:nth-child(even) {
  background: #f8f9fa;
}
.data-table tbody tr:hover {
  background: #e8f0fe;
}
```

### 3.6 Filters

```css
.filters {
  display: flex;
  gap: 12px;
  padding: var(--spacing);
  flex-wrap: wrap;
}
.filters select {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card-bg);
  font-size: 0.875rem;
}
```

### 3.7 States

```css
.state {
  text-align: center;
  padding: 48px var(--spacing);
  color: var(--text-muted);
}
.state.hidden { display: none; }
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}
@keyframes spin { to { transform: rotate(360deg); } }
#error { color: var(--danger); }
#error button {
  margin-top: 12px;
  padding: 8px 24px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
}
```

### 3.8 Footer

```css
footer {
  text-align: center;
  padding: var(--spacing);
  color: var(--text-muted);
  font-size: 0.75rem;
}
```

### 3.9 Responsive

```css
@media (max-width: 768px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .card-value { font-size: 1.25rem; }
  .tab { padding: 8px 12px; font-size: 0.8rem; }
  .data-table { font-size: 0.8rem; }
  .data-table th, .data-table td { padding: 6px 8px; }
}

@media (max-width: 480px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    padding: 8px;
  }
  #header h1 { font-size: 1rem; }
}
```

## Success Criteria

- [ ] Light theme renders correctly
- [ ] Cards display in 4-column grid (desktop) / 2-column (mobile)
- [ ] Tabs scroll horizontally on mobile
- [ ] Tables have sticky headers
- [ ] Tables scroll horizontally on mobile
- [ ] Loading spinner animates
- [ ] Zebra stripes on table rows

## Risk Assessment

- **Risk:** Sticky header + horizontal scroll conflict
- **Mitigation:** Use `position: sticky` on `thead` within `.table-wrap` container

## Next Steps

- Phase 4: Client JavaScript
