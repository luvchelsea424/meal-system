// ── Utils.gs ──────────────────────────────────────────────────────────────────
// Shared helpers used by all handlers.
// This script must be bound to the Google Spreadsheet (created via
// Extensions → Apps Script inside the spreadsheet).

function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function getOrCreateTodayEntriesSheet() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('today_entries');
  if (!sheet) {
    sheet = ss.insertSheet('today_entries');
    sheet.appendRow(['date', 'token', 'scanned_at', 'grade', 'class', 'number', 'name']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function generateUUID() {
  return Utilities.getUuid();
}

// Returns today's date string in KST (Korea Standard Time).
function today() {
  return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Reads the ADMIN_PASSWORD script property (set in Project Settings → Script Properties).
function checkAdminPassword(password) {
  var stored = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  return Boolean(stored) && password === stored;
}

// Converts a sheet's data range into an array of plain objects keyed by header row.
function sheetToObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  return data.slice(1).map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) { obj[h] = row[i]; });
    return obj;
  });
}

// Returns the 0-based index of a column name in the header row, or -1 if not found.
function colIndex(sheet, name) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headers.indexOf(name);
}
