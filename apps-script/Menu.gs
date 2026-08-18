/**
 * Menu.gs — Custom Google Sheets menu & interactive triggers
 * HTCV FPL 2026-2027
 */

const REFRESH_BUTTON_CELL = "B31";
const REFRESH_STATUS_CELL = "C31";

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🏆 FPL HTCV")
    .addItem("🔄 Refresh All Data", "refreshAllFromMenu")
    .addItem("⚡ Refresh Live Scores", "refreshLiveNow")
    .addSeparator()
    .addItem("📊 Refresh Classic Only", "updateClassicStandings")
    .addItem("⚔️ Refresh H2H Only", "updateH2HStandings")
    .addItem("🏆 Refresh Weekly Winners", "updateWeeklyWinners")
    .addItem("📅 Refresh Monthly Awards", "updateMonthlyAwards")
    .addSeparator()
    .addItem("⏰ Install Auto-Refresh (6h + hourly)", "installTrigger")
    .addItem("🛑 Remove Auto-Refresh", "removeTriggers")
    .addSeparator()
    .addItem("🔘 Setup Refresh Button on Dashboard", "setupRefreshButton")
    .addItem("ℹ️ About", "showAbout")
    .addToUi();

  // Reset the refresh button checkbox on open
  resetRefreshButton_();
}

/**
 * onEdit trigger — detects when user clicks the refresh checkbox on Dashboard
 *
 * A full refresh can take minutes, which exceeds the simple-trigger budget, so
 * failures are surfaced in the status cell instead of failing silently.
 */
function onEdit(e) {
  if (!e || !e.range) return;

  const sheet = e.range.getSheet();
  if (sheet.getName() !== "📊 Dashboard") return;
  if (e.range.getA1Notation() !== REFRESH_BUTTON_CELL) return;
  if (e.value !== "TRUE") return;

  const statusCell = sheet.getRange(REFRESH_STATUS_CELL);
  statusCell.setValue("⏳ Đang refresh...");
  SpreadsheetApp.flush();

  try {
    const outcome = runRefreshWithLock_("dashboard checkbox");
    statusCell.setValue(!outcome
      ? "⏳ Đang có refresh khác chạy, thử lại sau"
      : outcome.failed.length
        ? "⚠️ " + outcome.failed.length + " bước lỗi — xem FPL_Status"
        : "✅ Done! " + new Date().toLocaleString("vi-VN"));
  } catch (err) {
    statusCell.setValue("❌ Error: " + err.message + " — dùng menu 🏆 FPL HTCV nếu lặp lại");
  }

  sheet.getRange(REFRESH_BUTTON_CELL).setValue(false);
}

/**
 * Setup the refresh button (checkbox) on Dashboard tab
 */
function setupRefreshButton() {
  const sheet = getSheet("📊 Dashboard");
  if (!sheet) return;

  // Row 31: Refresh button area
  sheet.getRange("A31").setValue("🔄 MANUAL REFRESH →");
  sheet.getRange(REFRESH_BUTTON_CELL).insertCheckboxes();
  sheet.getRange(REFRESH_BUTTON_CELL).setValue(false);
  sheet.getRange(REFRESH_STATUS_CELL).setValue("Click checkbox để refresh data");
  sheet.getRange("D31").setValue("");

  // Style the button area
  const buttonRange = sheet.getRange("A31:D31");
  buttonRange.setFontWeight("bold");
  buttonRange.setBackground("#E8F5E9");
  sheet.getRange("A31").setFontColor("#2E7D32");
  sheet.getRange(REFRESH_BUTTON_CELL).setFontSize(14);

  // Also add a "Last Refresh" indicator
  sheet.getRange("A32").setValue("⏰ Last auto-refresh:");
  sheet.getRange("B32").setValue("");

  SpreadsheetApp.getUi().alert(
    "✅ Refresh Button Ready!",
    "Nút refresh đã được thêm vào Dashboard (dòng 31).\n" +
    "Click checkbox ☑ để refresh data thủ công.\n\n" +
    "Lưu ý: Lần đầu cần authorize quyền cho onEdit trigger.",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Reset refresh button checkbox (called on sheet open)
 */
function resetRefreshButton_() {
  try {
    const sheet = getSheet("📊 Dashboard");
    if (sheet && sheet.getRange(REFRESH_BUTTON_CELL).getValue() === true) {
      sheet.getRange(REFRESH_BUTTON_CELL).setValue(false);
    }
  } catch (e) { /* Ignore errors on open */ }
}

/** Menu action: full refresh, guarded by the same lock as the triggers. */
function refreshAllFromMenu() {
  const outcome = runRefreshWithLock_("menu");
  if (!outcome) {
    SpreadsheetApp.getUi().alert("Đang có refresh khác chạy, thử lại sau vài phút.");
  }
}

function showAbout() {
  const status = getRefreshStatus_().data;
  const ui = SpreadsheetApp.getUi();

  ui.alert("🏆 FPL HTCV Pool Management",
    "Season: " + CONFIG.SEASON + "\n" +
    "Players: " + CONFIG.PLAYERS.length + "\n" +
    "Classic League: " + CONFIG.CLASSIC_LEAGUE_ID + "\n" +
    "H2H League: " + CONFIG.H2H_LEAGUE_ID + "\n\n" +
    "Last Refresh: " + (status.lastRefresh || "chưa chạy") + "\n" +
    "Status: " + status.lastStatus + "\n" +
    "Gameweek: " + status.latestGW + (status.isLive ? " (đang diễn ra)" : "") + "\n" +
    "Trigger: " + status.triggerStatus + "\n\n" +
    "Features:\n" +
    "• Auto-refresh every 6h + hourly settlement check\n" +
    "• Live in-play scoring served to the web app\n" +
    "• Manual refresh via checkbox on Dashboard\n" +
    "• Weekly & Monthly winners auto-calculation",
    ui.ButtonSet.OK);
}
